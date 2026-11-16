/**
 * Roles & Permissions: the permission catalogue, the role / permission
 * matrix, custom roles, role templates and the permission check every
 * permission-gated admin route uses.
 *
 * Storage (existing tables):
 *   permissions                 one row per catalogue key (name = key, module = category)
 *   roles                       the "sub_admin" row plus one row per custom role
 *   role_permissions            role_id -> permission_id grants
 *   role_templates (+ _permissions)  reusable permission presets for new roles
 *   users.custom_role_id        (migration 017) custom role held by a sub_admin
 *
 * super_admin and admin always hold every permission (shown locked in the
 * matrix); user / advisor / finfluencer / portfolio_manager hold none.
 */
const { Op, QueryTypes } = require('sequelize');
const db = require('../models');
const { effectiveRole, isSuperAdmin, staffRank, ASSIGNABLE_ROLES, ROLE_LABELS } = require('../utils/roles');
const { PERMISSION_CATALOGUE, PERMISSION_KEYS, PERMISSION_BY_KEY, ADMIN_ONLY_SECTIONS, groupedCatalogue } = require('../utils/permissions');
const { hasUserColumn, MigrationPendingError } = require('../utils/userSchema');

class AccessError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const plain = (row) => (row && typeof row.toJSON === 'function' ? row.toJSON() : row);
const norm = (name) => String(name || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/** The built-in role a roles-table row stands for, or null for a custom role. */
function builtInKey(name) {
  const n = norm(name);
  if (ASSIGNABLE_ROLES.includes(n)) return n;
  const byLabel = Object.entries(ROLE_LABELS).find(([, label]) => norm(label) === n);
  return byLabel ? byLabel[0] : null;
}

/** Best-effort audit row; never fails the action it records. */
async function audit(actor, action, entityType, entityId, { oldData, newData, description, context } = {}) {
  try {
    await db.AuditLog.create({
      user_id: actor ? actor.id : null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_data: oldData === undefined ? null : oldData,
      new_data: newData === undefined ? null : newData,
      description: description ? String(description).slice(0, 1000) : null,
      ip_address: context && context.ip ? String(context.ip).slice(0, 45) : null,
      user_agent: context && context.userAgent ? String(context.userAgent).slice(0, 255) : null,
      created_at: new Date(),
    });
  } catch (e) {
    console.error('[AccessControlService] audit write failed:', e.message);
  }
}

// --------------------------------------------------------------------------
// Catalogue
// --------------------------------------------------------------------------

let catalogueReady = false;
let seeding = null; // the one in-flight seed, shared by concurrent first requests

/**
 * Writes the catalogue rows and the "sub_admin" role row. The Roles &
 * Permissions screen loads the matrix and the templates in parallel, so two
 * first requests used to seed at the same time: duplicate rows on databases
 * built by sync() (no unique key) and a 500 where permissions.name is unique.
 * Now every caller awaits the same promise, and rows are created with
 * findOrCreate, which also absorbs a race with another API process.
 */
async function seedCatalogue() {
  const rows = await db.Permission.findAll();
  const named = new Set(rows.filter((r) => r.name).map((r) => r.name));
  const adopted = new Set();
  for (const entry of PERMISSION_CATALOGUE) {
    const desired = { name: entry.key, module: entry.module, action: entry.key.split('.')[1] || null, description: entry.label };
    const existing = rows.filter((r) => r.name === entry.key);
    if (existing.length) {
      for (const row of existing) {
        if (row.module !== desired.module || row.description !== desired.description) {
          await row.update({ module: desired.module, description: desired.description, action: desired.action });
        }
      }
      continue;
    }
    const legacy = rows.find((r) => !r.name && !adopted.has(r.id) && (entry.aliases || []).includes(r.description));
    if (legacy && !named.has(entry.key)) {
      adopted.add(legacy.id);
      await legacy.update(desired);
      named.add(entry.key);
      continue;
    }
    await db.Permission.findOrCreate({ where: { name: entry.key }, defaults: { ...desired, created_at: new Date() } });
    named.add(entry.key);
  }
  const roles = await db.Role.findAll();
  if (!roles.some((r) => builtInKey(r.name) === 'sub_admin')) {
    await db.Role.findOrCreate({
      where: { name: 'sub_admin' },
      defaults: { name: 'sub_admin', description: 'Staff member with the admin-panel access granted in Roles & Permissions', created_at: new Date() },
    });
  }
}

/**
 * Makes sure every catalogue key has a permissions row and a "sub_admin" role
 * row exists. Idempotent; the writes run once per process.
 * Returns Map key -> [permission ids] (more than one only on databases that
 * already hold duplicate rows; grants on any of them count).
 */
async function ensureCatalogue() {
  if (!catalogueReady) {
    if (!seeding) {
      seeding = seedCatalogue()
        .then(() => { catalogueReady = true; })
        .finally(() => { seeding = null; });
    }
    await seeding;
  }
  const rows = await db.Permission.findAll({ where: { name: PERMISSION_KEYS } });
  const ids = new Map();
  for (const r of rows) {
    if (!ids.has(r.name)) ids.set(r.name, []);
    ids.get(r.name).push(r.id);
  }
  return ids;
}

/** role_id -> [keys], for the given role ids. */
async function keysForRoles(roleIds) {
  const out = new Map(roleIds.map((id) => [id, []]));
  if (!roleIds.length) return out;
  const grants = await db.RolePermission.findAll({ where: { role_id: roleIds } });
  if (!grants.length) return out;
  const perms = await db.Permission.findAll({ where: { id: [...new Set(grants.map((g) => g.permission_id))] } });
  const keyById = new Map(perms.filter((p) => PERMISSION_BY_KEY.has(p.name)).map((p) => [p.id, p.name]));
  for (const g of grants) {
    const key = keyById.get(g.permission_id);
    if (key && out.has(g.role_id) && !out.get(g.role_id).includes(key)) out.get(g.role_id).push(key);
  }
  for (const [id, keys] of out) out.set(id, PERMISSION_KEYS.filter((k) => keys.includes(k)));
  return out;
}

async function subAdminRole() {
  const roles = await db.Role.findAll();
  return roles.find((r) => builtInKey(r.name) === 'sub_admin') || null;
}

/** The custom role id stored for a user, or null (also null before migration 017). */
async function customRoleIdOf(userId) {
  if (!(await hasUserColumn('custom_role_id'))) return null;
  const rows = await db.sequelize.query('SELECT custom_role_id FROM users WHERE id = :id LIMIT 1', {
    replacements: { id: userId },
    type: QueryTypes.SELECT,
  });
  return rows[0] && rows[0].custom_role_id ? rows[0].custom_role_id : null;
}

/**
 * Everything `user` may do in the admin panel, as a Set of catalogue keys,
 * plus the custom role they hold. Fails closed: on any lookup error a
 * sub-admin holds nothing.
 */
async function accessFor(user) {
  const rank = staffRank(user);
  if (rank >= 2) return { permissions: new Set(PERMISSION_KEYS), customRole: null };
  if (rank === 0) return { permissions: new Set(), customRole: null };
  try {
    let role = null;
    const customId = await customRoleIdOf(user.id);
    if (customId) {
      const custom = await db.Role.findByPk(customId);
      if (custom && !builtInKey(custom.name)) role = custom;
    }
    const customRole = role ? { id: role.id, name: role.name } : null;
    if (!role) role = await subAdminRole();
    if (!role) return { permissions: new Set(), customRole };
    const keys = (await keysForRoles([role.id])).get(role.id) || [];
    return { permissions: new Set(keys), customRole };
  } catch (e) {
    console.error('[AccessControlService] permission lookup failed:', e.message);
    return { permissions: new Set(), customRole: null };
  }
}

async function permissionsFor(user) {
  return (await accessFor(user)).permissions;
}

/** What GET /api/admin/access/me returns. */
async function describeAccess(user) {
  const role = effectiveRole(user);
  const { permissions, customRole } = await accessFor(user);
  const keys = PERMISSION_KEYS.filter((k) => permissions.has(k));
  const sections = [...new Set(keys.map((k) => PERMISSION_BY_KEY.get(k).section))];
  return {
    role,
    role_label: ROLE_LABELS[role] || role,
    is_super_admin: isSuperAdmin(user),
    is_staff: staffRank(user) > 0,
    custom_role: customRole,
    permissions: keys,
    sections,
  };
}

// --------------------------------------------------------------------------
// Roles and the matrix
// --------------------------------------------------------------------------

/** Users whose effective role (app_role || role) is `key`. */
async function countUsersByRole(key) {
  try {
    return await db.User.count({ where: roleWhere(key) });
  } catch {
    return null;
  }
}

/** WHERE clause for "effective role is `key`" (app_role wins; role when app_role is blank). */
function roleWhere(key) {
  return { [Op.or]: [{ app_role: key }, { app_role: null, role: key }, { app_role: '', role: key }] };
}

async function countUsersWithCustomRoles(roleIds) {
  const out = new Map(roleIds.map((id) => [id, 0]));
  if (!roleIds.length || !(await hasUserColumn('custom_role_id'))) return out;
  const rows = await db.sequelize.query(
    "SELECT custom_role_id AS role_id, COUNT(*) AS n FROM users WHERE custom_role_id IN (:ids) AND COALESCE(NULLIF(app_role, ''), role) = 'sub_admin' GROUP BY custom_role_id",
    { replacements: { ids: roleIds }, type: QueryTypes.SELECT }
  );
  for (const r of rows) out.set(r.role_id, Number(r.n) || 0);
  return out;
}

/** Custom roles (de-duplicated by name, built-in names excluded), A-Z. */
async function customRoles() {
  const rows = await db.Role.findAll();
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r.name || builtInKey(r.name)) continue;
    const k = norm(r.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function matrix(actor) {
  await ensureCatalogue();
  const sub = await subAdminRole();
  const customs = await customRoles();
  const ids = [sub && sub.id, ...customs.map((r) => r.id)].filter(Boolean);
  const keys = await keysForRoles(ids);
  const counts = await countUsersWithCustomRoles(customs.map((r) => r.id));
  const customAvailable = await hasUserColumn('custom_role_id');

  const roles = [
    { id: null, key: 'super_admin', name: ROLE_LABELS.super_admin, kind: 'system', editable: false, deletable: false, all: true,
      description: 'Full access, including deleting users and managing roles', permissions: PERMISSION_KEYS, user_count: await countUsersByRole('super_admin') },
    { id: null, key: 'admin', name: ROLE_LABELS.admin, kind: 'system', editable: false, deletable: false, all: true,
      description: 'Every admin-panel section; cannot delete users or manage roles', permissions: PERMISSION_KEYS, user_count: await countUsersByRole('admin') },
  ];
  if (sub) {
    roles.push({ id: sub.id, key: 'sub_admin', name: ROLE_LABELS.sub_admin, kind: 'system', editable: true, deletable: false, all: false,
      description: 'Staff with only the sections ticked here (when no custom role is assigned)', permissions: keys.get(sub.id) || [], user_count: await countUsersByRole('sub_admin') });
  }
  for (const r of customs) {
    roles.push({ id: r.id, key: null, name: r.name, kind: 'custom', editable: true, deletable: true, all: false,
      description: r.description || '', permissions: keys.get(r.id) || [], user_count: counts.get(r.id) || 0 });
  }
  return {
    categories: groupedCatalogue(),
    admin_only_sections: ADMIN_ONLY_SECTIONS,
    roles,
    can_edit: isSuperAdmin(actor),
    custom_roles_available: customAvailable,
  };
}

/** Editable role row (sub_admin or custom) or an AccessError. */
async function editableRole(roleId) {
  const role = await db.Role.findByPk(roleId);
  if (!role) throw new AccessError(404, 'Role not found');
  const key = builtInKey(role.name);
  if (key && key !== 'sub_admin') throw new AccessError(403, 'This role\'s permissions are fixed.');
  return { role, isCustom: !key };
}

async function setPermission(actor, roleId, key, granted, context) {
  if (!PERMISSION_BY_KEY.has(key)) throw new AccessError(400, 'Unknown permission');
  const { role } = await editableRole(roleId);
  const ids = await ensureCatalogue();
  const permissionIds = ids.get(key) || [];
  if (!permissionIds.length) throw new AccessError(500, 'Permission catalogue is incomplete');

  const existing = await db.RolePermission.findAll({ where: { role_id: role.id, permission_id: permissionIds } });
  if (granted && !existing.length) {
    await db.RolePermission.create({ role_id: role.id, permission_id: permissionIds[0], created_at: new Date() });
  } else if (!granted && existing.length) {
    for (const row of existing) await row.destroy();
  }
  if (granted !== Boolean(existing.length)) {
    await audit(actor, granted ? 'role_permission_granted' : 'role_permission_revoked', 'role', role.id, {
      newData: { permission: key, granted },
      description: `${granted ? 'Granted' : 'Revoked'} "${PERMISSION_BY_KEY.get(key).label}" ${granted ? 'to' : 'from'} role "${role.name}"`,
      context,
    });
  }
  return { role_id: role.id, permissions: (await keysForRoles([role.id])).get(role.id) || [] };
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _&-]{1,49}$/;

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validKeys(list) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new AccessError(400, 'permissions must be a list');
  const bad = list.filter((k) => !PERMISSION_BY_KEY.has(k));
  if (bad.length) throw new AccessError(400, 'Unknown permission');
  return [...new Set(list)];
}

async function assertRoleName(name, exceptId = null) {
  if (!NAME_RE.test(name)) throw new AccessError(400, 'Role name must be 2-50 letters, numbers, spaces, "-", "_" or "&".');
  if (builtInKey(name)) throw new AccessError(409, 'That name belongs to a built-in role.');
  const clash = (await db.Role.findAll()).find((r) => r.id !== exceptId && norm(r.name) === norm(name));
  if (clash) throw new AccessError(409, 'A role with that name already exists.');
}

async function grantAll(roleId, keys, ids) {
  for (const key of keys) {
    const [permissionId] = ids.get(key) || [];
    if (permissionId) await db.RolePermission.create({ role_id: roleId, permission_id: permissionId, created_at: new Date() });
  }
}

async function createRole(actor, body, context) {
  const name = cleanText(body.name, 50);
  const description = cleanText(body.description, 500);
  let keys = validKeys(body.permissions);
  await assertRoleName(name);
  const ids = await ensureCatalogue();

  let template = null;
  if (body.template_id) {
    template = await db.RoleTemplate.findByPk(body.template_id);
    if (!template) throw new AccessError(404, 'Template not found');
    const tKeys = (await templateKeys([template.id])).get(template.id) || [];
    keys = PERMISSION_KEYS.filter((k) => keys.includes(k) || tKeys.includes(k));
  }

  const role = await db.Role.create({ name, description: description || null, created_at: new Date() });
  await grantAll(role.id, keys, ids);
  await audit(actor, 'role_created', 'role', role.id, {
    newData: { name, permissions: keys, template_id: template ? template.id : null },
    description: `Created role "${name}"${template ? ` from template "${template.name}"` : ''} with ${keys.length} permission(s)`,
    context,
  });
  return { id: role.id, name, description, permissions: keys };
}

async function updateRole(actor, roleId, body, context) {
  const { role, isCustom } = await editableRole(roleId);
  const patch = {};
  if (body.name !== undefined) {
    if (!isCustom) throw new AccessError(403, 'Built-in roles cannot be renamed.');
    const name = cleanText(body.name, 50);
    await assertRoleName(name, role.id);
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = cleanText(body.description, 500) || null;
  if (!Object.keys(patch).length) throw new AccessError(400, 'Nothing to update');
  const before = { name: role.name, description: role.description };
  await role.update({ ...patch, updated_at: new Date() });
  await audit(actor, 'role_updated', 'role', role.id, { oldData: before, newData: patch, description: `Updated role "${patch.name || role.name}"`, context });
  return { id: role.id, name: patch.name || before.name, description: patch.description !== undefined ? patch.description : before.description };
}

async function deleteRole(actor, roleId, context) {
  const { role, isCustom } = await editableRole(roleId);
  if (!isCustom) throw new AccessError(403, 'Built-in roles cannot be deleted.');
  const assigned = (await countUsersWithCustomRoles([role.id])).get(role.id) || 0;
  if (assigned > 0) throw new AccessError(409, `${assigned} user(s) still hold this role. Assign them another role first.`, 'ROLE_IN_USE');
  const grants = await db.RolePermission.findAll({ where: { role_id: role.id } });
  for (const g of grants) await g.destroy();
  await role.destroy();
  await audit(actor, 'role_deleted', 'role', role.id, { oldData: { name: role.name }, description: `Deleted role "${role.name}"`, context });
  return { id: role.id };
}

// --------------------------------------------------------------------------
// Templates
// --------------------------------------------------------------------------

async function templateKeys(templateIds) {
  const out = new Map(templateIds.map((id) => [id, []]));
  if (!templateIds.length) return out;
  const links = await db.RoleTemplatePermission.findAll({ where: { template_id: templateIds } });
  if (!links.length) return out;
  const perms = await db.Permission.findAll({ where: { id: [...new Set(links.map((l) => l.permission_id))] } });
  const keyById = new Map(perms.filter((p) => PERMISSION_BY_KEY.has(p.name)).map((p) => [p.id, p.name]));
  for (const l of links) {
    const key = keyById.get(l.permission_id);
    if (key && out.has(l.template_id) && !out.get(l.template_id).includes(key)) out.get(l.template_id).push(key);
  }
  for (const [id, keys] of out) out.set(id, PERMISSION_KEYS.filter((k) => keys.includes(k)));
  return out;
}

async function listTemplates() {
  await ensureCatalogue();
  const rows = await db.RoleTemplate.findAll({ order: [['created_at', 'DESC']] });
  const keys = await templateKeys(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    is_active: r.is_active !== false,
    created_by_name: r.created_by_name || null,
    created_at: r.created_at,
    permissions: keys.get(r.id) || [],
  }));
}

async function saveTemplate(actor, templateId, body, context) {
  const name = cleanText(body.name, 80);
  if (name.length < 2) throw new AccessError(400, 'Template name must be at least 2 characters.');
  const description = cleanText(body.description, 500);
  const keys = validKeys(body.permissions);
  const ids = await ensureCatalogue();
  const existing = (await db.RoleTemplate.findAll()).find((t) => t.id !== templateId && norm(t.name) === norm(name));
  if (existing) throw new AccessError(409, 'A template with that name already exists.');

  let template;
  if (templateId) {
    template = await db.RoleTemplate.findByPk(templateId);
    if (!template) throw new AccessError(404, 'Template not found');
    await template.update({
      name,
      description: description || null,
      is_active: body.is_active === undefined ? template.is_active : Boolean(body.is_active),
      updated_at: new Date(),
    });
    const links = await db.RoleTemplatePermission.findAll({ where: { template_id: template.id } });
    for (const l of links) await l.destroy();
  } else {
    template = await db.RoleTemplate.create({
      name,
      description: description || null,
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
      created_by: actor.id,
      created_by_name: actor.display_name || actor.name || null,
      created_at: new Date(),
    });
  }
  for (const key of keys) {
    const [permissionId] = ids.get(key) || [];
    if (permissionId) await db.RoleTemplatePermission.create({ template_id: template.id, permission_id: permissionId, created_at: new Date() });
  }
  await audit(actor, templateId ? 'role_template_updated' : 'role_template_created', 'role_template', template.id, {
    newData: { name, permissions: keys },
    description: `${templateId ? 'Updated' : 'Created'} role template "${name}" with ${keys.length} permission(s)`,
    context,
  });
  return { id: template.id, name, description, permissions: keys };
}

async function deleteTemplate(actor, templateId, context) {
  const template = await db.RoleTemplate.findByPk(templateId);
  if (!template) throw new AccessError(404, 'Template not found');
  const links = await db.RoleTemplatePermission.findAll({ where: { template_id: template.id } });
  for (const l of links) await l.destroy();
  await template.destroy();
  await audit(actor, 'role_template_deleted', 'role_template', template.id, { oldData: { name: template.name }, description: `Deleted role template "${template.name}"`, context });
  return { id: template.id };
}

// --------------------------------------------------------------------------
// Assignable roles and the audit trail
// --------------------------------------------------------------------------

const ROLE_DESCRIPTIONS = {
  user: 'Regular member (also used to revoke a role)',
  advisor: 'SEBI-registered stock advisor',
  finfluencer: 'Content creator',
  portfolio_manager: 'SEBI-registered portfolio manager',
  sub_admin: 'Staff with the admin sections granted in Roles & Permissions',
  admin: 'Every admin section; cannot delete users or manage roles',
  super_admin: 'Full control of the platform',
};

async function assignableRoles(actor) {
  const { checkRoleAssignment } = require('../utils/roles');
  // Which roles this caller could hand to an ordinary member.
  const probe = { id: '__probe__', app_role: 'user', role: 'user' };
  const roles = ASSIGNABLE_ROLES.map((key) => ({
    key,
    label: ROLE_LABELS[key],
    description: ROLE_DESCRIPTIONS[key],
    grantable: !checkRoleAssignment(actor, probe, key),
  }));
  const available = await hasUserColumn('custom_role_id');
  const customs = (await customRoles()).map((r) => ({ id: r.id, name: r.name, description: r.description || '' }));
  return {
    roles,
    custom_roles: customs,
    custom_roles_available: available,
    can_assign_custom: available && staffRank(actor) >= 2,
  };
}

const AUDIT_ENTITY_TYPES = ['user', 'role', 'role_template'];

async function auditTrail({ page = 1, limit = 25, entityType } = {}) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 25, 1), 100);
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const types = AUDIT_ENTITY_TYPES.includes(entityType) ? [entityType] : AUDIT_ENTITY_TYPES;
  const { count, rows } = await db.AuditLog.findAndCountAll({
    where: { entity_type: types },
    order: [['created_at', 'DESC']],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });
  const actorIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const actors = actorIds.length
    ? await db.User.findAll({ where: { id: actorIds }, attributes: ['id', 'name', 'display_name', 'email'] })
    : [];
  const byId = new Map(actors.map((a) => [a.id, a]));
  return {
    data: rows.map((r) => {
      const a = byId.get(r.user_id);
      return {
        id: r.id,
        created_at: r.created_at,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        description: r.description,
        actor: a ? { id: a.id, name: a.display_name || a.name || a.email } : null,
      };
    }),
    total: count,
    page: safePage,
    limit: safeLimit,
    pages: Math.max(Math.ceil(count / safeLimit), 1),
  };
}

module.exports = {
  AccessError,
  MigrationPendingError,
  audit,
  builtInKey,
  ensureCatalogue,
  accessFor,
  permissionsFor,
  describeAccess,
  customRoleIdOf,
  customRoles,
  matrix,
  setPermission,
  createRole,
  updateRole,
  deleteRole,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  assignableRoles,
  auditTrail,
  roleWhere,
  _resetCatalogue: () => { catalogueReady = false; seeding = null; },
  plain,
};
