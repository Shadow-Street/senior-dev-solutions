/**
 * User Management actions behind /api/admin/users (Super Admin › User
 * Management): list, edit details, assign / revoke roles, adjust trust score,
 * deactivate / reactivate (via UserSanctionService) and delete (anonymise).
 *
 * Who may act on whom ("manage"):
 *   - nobody acts on their own account here (profile settings cover that);
 *   - a super admin manages everyone else;
 *   - otherwise only someone of a strictly higher staff rank:
 *       admin -> sub_admin and non-staff; sub_admin -> non-staff only.
 * On top of that each action needs its permission (users.edit, users.roles,
 * users.status, users.trust) and role changes follow checkRoleAssignment.
 * Delete is super-admin only and never touches a super admin.
 *
 * Every action writes an audit_logs row.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');
const db = require('../models');
const { effectiveRole, isSuperAdmin, staffRank, checkRoleAssignment, ASSIGNABLE_ROLES, ROLE_LABELS } = require('../utils/roles');
const { userColumns, hasUserColumn, MigrationPendingError, LEGACY_PII_COLUMNS } = require('../utils/userSchema');
const Access = require('./AccessControlService');
const Sanctions = require('./UserSanctionService');

const { AccessError, audit } = Access;

const TOMBSTONE_DOMAIN = 'deleted.protocall.invalid';
const TOMBSTONE_PATTERN = `deleted-%@${TOMBSTONE_DOMAIN}`;
const isTombstone = (user) => Boolean(user && typeof user.email === 'string' && user.email.endsWith(`@${TOMBSTONE_DOMAIN}`));

const LIST_ATTRIBUTES = ['id', 'name', 'display_name', 'email', 'app_role', 'role', 'status', 'profile_image_url', 'email_verified', 'created_at'];
const STATUSES = ['active', 'inactive', 'suspended', 'banned', 'pending'];
const STAFF_SANCTION_TARGETS = new Set(['admin', 'sub_admin', 'super_admin']);
const DEFAULT_TRUST = 50;

const plain = (row) => (row && typeof row.toJSON === 'function' ? row.toJSON() : { ...row });
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** True when `actor` outranks `target` (or is a super admin), and it is not themselves. */
function mayManage(actor, target) {
  if (!actor || !target || String(actor.id) === String(target.id)) return false;
  if (isSuperAdmin(actor)) return true;
  return staffRank(actor) > staffRank(target);
}

/** Mirrors UserSanctionService.assertMaySanction without throwing. */
function maySanction(actor, target) {
  if (!actor || !target || String(actor.id) === String(target.id)) return false;
  const role = effectiveRole(target);
  if (role === 'super_admin') return false;
  if (STAFF_SANCTION_TARGETS.has(role) && !isSuperAdmin(actor)) return false;
  return true;
}

/**
 * A block (status banned) is a moderation decision; only an admin or super
 * admin may lift it. A sub-admin with users.status deactivates and
 * reactivates, but cannot undo a block.
 */
function mayLiftBlock(actor, target) {
  return target?.status !== 'banned' || staffRank(actor) >= 2;
}

/** Throws unless `actor` may reactivate `target` (see mayLiftBlock). */
function assertMayReactivate(actor, target) {
  if (!mayLiftBlock(actor, target)) throw new AccessError(403, 'Only an admin can lift a block.', 'BLOCK_ADMIN_ONLY');
}

/** What the signed-in admin may do with one row; drives the row's action menu. */
function allowedActions(actor, permissions, target, { trustAvailable }) {
  const none = { edit: false, role: false, status: false, trust: false, delete: false };
  if (!actor || !target || isTombstone(target) || String(actor.id) === String(target.id)) return none;
  const manage = mayManage(actor, target);
  return {
    edit: manage && permissions.has('users.edit'),
    role: manage && permissions.has('users.roles'),
    status: permissions.has('users.status') && maySanction(actor, target) && mayLiftBlock(actor, target),
    trust: manage && permissions.has('users.trust') && trustAvailable,
    delete: isSuperAdmin(actor) && effectiveRole(target) !== 'super_admin',
  };
}

async function extraColumns(ids) {
  const present = await userColumns();
  const cols = ['trust_score', 'custom_role_id'].filter((c) => present.has(c));
  const out = new Map();
  if (!ids.length || !cols.length) return out;
  // Column names come from the fixed list above, never from the request.
  const rows = await db.sequelize.query(`SELECT id, ${cols.join(', ')} FROM users WHERE id IN (:ids)`, {
    replacements: { ids },
    type: QueryTypes.SELECT,
  });
  for (const r of rows) out.set(r.id, r);
  return out;
}

async function openSuspensions(ids) {
  const out = new Map();
  if (!ids.length) return out;
  try {
    const rows = await db.UserSanction.findAll({
      where: { user_id: ids, action: 'suspend', lifted_at: null },
      order: [['created_at', 'DESC']],
    });
    for (const r of rows) if (!out.has(r.user_id)) out.set(r.user_id, r.ends_at || null);
  } catch (e) {
    console.error('[AdminUserService] could not read suspensions:', e.message);
  }
  return out;
}

async function loadTarget(id) {
  const user = await db.User.findByPk(id, { attributes: { exclude: ['password'] } });
  if (!user || isTombstone(user)) throw new AccessError(404, 'User not found');
  return user;
}

const contextOf = (req) => ({ ip: req.ip, userAgent: req.get ? req.get('user-agent') : undefined });

// --------------------------------------------------------------------------
// List
// --------------------------------------------------------------------------

async function list(actor, query = {}) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const and = [{ email: { [Op.notLike]: TOMBSTONE_PATTERN } }];

  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
  if (search) {
    const like = { [Op.like]: `%${escapeLike(search)}%` };
    and.push({ [Op.or]: [{ name: like }, { display_name: like }, { email: like }] });
  }

  const role = typeof query.role === 'string' ? query.role : '';
  if (ASSIGNABLE_ROLES.includes(role)) {
    and.push({ [Op.or]: [{ app_role: role }, { app_role: null, role }, { app_role: '', role }] });
  } else if (role === 'custom') {
    if (!(await hasUserColumn('custom_role_id'))) return { data: [], total: 0, page, limit, pages: 1 };
    // A custom role only means something on a sub_admin (see AccessControlService.accessFor).
    const rows = await db.sequelize.query("SELECT id FROM users WHERE custom_role_id IS NOT NULL AND COALESCE(NULLIF(app_role, ''), role) = 'sub_admin'", { type: QueryTypes.SELECT });
    and.push({ id: rows.map((r) => r.id) });
  }

  const status = typeof query.status === 'string' ? query.status : '';
  if (STATUSES.includes(status)) and.push({ status });

  const { count, rows } = await db.User.findAndCountAll({
    where: { [Op.and]: and },
    attributes: LIST_ATTRIBUTES,
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const users = rows.map(plain);
  const ids = users.map((u) => u.id);
  const present = await userColumns();
  const trustAvailable = present.has('trust_score');
  const [extra, suspensions, permissions] = await Promise.all([
    extraColumns(ids),
    openSuspensions(users.filter((u) => u.status === 'suspended').map((u) => u.id)),
    Access.permissionsFor(actor),
  ]);
  const customIds = [...new Set([...extra.values()].map((e) => e.custom_role_id).filter(Boolean))];
  const customRows = customIds.length ? await db.Role.findAll({ where: { id: customIds } }) : [];
  const customById = new Map(customRows.map((r) => [r.id, r]));

  const data = users.map((u) => {
    const e = extra.get(u.id) || {};
    const roleKey = effectiveRole(u);
    const custom = e.custom_role_id && roleKey === 'sub_admin' ? customById.get(e.custom_role_id) : null;
    return {
      ...u,
      effective_role: roleKey,
      role_label: ROLE_LABELS[roleKey] || roleKey,
      custom_role: custom ? { id: custom.id, name: custom.name } : null,
      trust_score: trustAvailable ? (e.trust_score === null || e.trust_score === undefined ? DEFAULT_TRUST : Number(e.trust_score)) : null,
      suspended_until: u.status === 'suspended' ? suspensions.get(u.id) || null : null,
      is_self: String(u.id) === String(actor.id),
      actions: allowedActions(actor, permissions, u, { trustAvailable }),
    };
  });

  return {
    data,
    total: count,
    page,
    limit,
    pages: Math.max(Math.ceil(count / limit), 1),
    features: { trust_score: trustAvailable, custom_roles: present.has('custom_role_id') },
  };
}

// --------------------------------------------------------------------------
// Edit details
// --------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function editDetails(actor, id, body = {}, context) {
  const target = await loadTarget(id);
  if (!mayManage(actor, target)) throw new AccessError(403, 'You cannot edit this account.');

  const patch = {};
  for (const field of ['name', 'display_name']) {
    if (body[field] === undefined) continue;
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (value.length < 1 || value.length > 100) throw new AccessError(400, `${field === 'name' ? 'Full name' : 'Display name'} must be 1-100 characters.`);
    if (value !== target[field]) patch[field] = value;
  }
  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email !== String(target.email || '').toLowerCase()) {
      // Changing someone's email and then requesting a reset hands over their account.
      if (!isSuperAdmin(actor)) throw new AccessError(403, 'Only a super admin can change an email address.');
      if (!EMAIL_RE.test(email) || email.length > 150 || email.endsWith(`@${TOMBSTONE_DOMAIN}`)) throw new AccessError(400, 'Enter a valid email address.');
      const clash = await db.User.findOne({ where: { email } });
      if (clash && String(clash.id) !== String(target.id)) throw new AccessError(409, 'Another account already uses that email.');
      patch.email = email;
    }
  }
  if (!Object.keys(patch).length) return { user: { id: target.id }, changed: [] };

  const before = Object.fromEntries(Object.keys(patch).map((k) => [k, target[k]]));
  await db.User.update(patch, { where: { id: target.id } });
  await audit(actor, 'user_updated', 'user', target.id, {
    oldData: before,
    newData: patch,
    description: `Updated ${Object.keys(patch).join(', ')} for user ${target.id}`,
    context,
  });
  return { user: { id: target.id, ...patch }, changed: Object.keys(patch) };
}

// --------------------------------------------------------------------------
// Roles
// --------------------------------------------------------------------------

async function setRole(actor, id, body = {}, context) {
  const target = await loadTarget(id);
  const newRole = typeof body.role === 'string' ? body.role.trim() : '';
  const refused = checkRoleAssignment(actor, target, newRole);
  if (refused) throw new AccessError(refused.status, refused.error);
  if (!isSuperAdmin(actor) && !mayManage(actor, target)) throw new AccessError(403, 'You cannot change this account\'s role.');

  const columnReady = await hasUserColumn('custom_role_id');
  let customRole = null;
  const wantsCustom = body.custom_role_id !== undefined && body.custom_role_id !== null && body.custom_role_id !== '';
  if (wantsCustom) {
    if (newRole !== 'sub_admin') throw new AccessError(400, 'A custom role is assigned on top of the Sub Admin role.');
    if (!columnReady) throw new MigrationPendingError('Assigning custom roles');
    if (staffRank(actor) < 2) throw new AccessError(403, 'Only an admin can assign custom roles.');
    customRole = await db.Role.findByPk(String(body.custom_role_id));
    if (!customRole || Access.builtInKey(customRole.name)) throw new AccessError(404, 'Custom role not found');
  }

  const previousRole = effectiveRole(target);
  const previousCustom = columnReady ? await Access.customRoleIdOf(target.id) : null;
  const nextCustom = customRole ? customRole.id : null;
  if (previousRole === newRole && previousCustom === nextCustom && target.role === newRole) {
    return { user: { id: target.id, app_role: newRole, custom_role: customRole ? { id: customRole.id, name: customRole.name } : null }, changed: false };
  }

  // Both columns, so app_role || role can never disagree with what was chosen.
  try {
    await db.User.update({ app_role: newRole, role: newRole }, { where: { id: target.id } });
  } catch (e) {
    // Databases built from migration 001 have app_role as an ENUM without
    // sub_admin / portfolio_manager until migration 017 widens it.
    if (/Data truncated|Incorrect .*value|enum/i.test(String(e.message))) throw new MigrationPendingError('This role');
    throw e;
  }
  if (columnReady && previousCustom !== nextCustom) {
    await db.sequelize.query('UPDATE users SET custom_role_id = :cid WHERE id = :id', {
      replacements: { cid: nextCustom, id: target.id },
      type: QueryTypes.UPDATE,
    });
  }

  const label = customRole ? `${ROLE_LABELS[newRole]} (${customRole.name})` : ROLE_LABELS[newRole];
  await audit(actor, 'user_role_changed', 'user', target.id, {
    oldData: { role: previousRole, custom_role_id: previousCustom },
    newData: { role: newRole, custom_role_id: nextCustom },
    description: `Changed role of user ${target.id} from ${ROLE_LABELS[previousRole] || previousRole || 'none'} to ${label}`,
    context,
  });
  try {
    await db.Notification.create({
      user_id: target.id,
      type: 'account_role_changed',
      title: 'Your account role has changed',
      message: `An administrator changed your role to ${label}.`,
      is_read: false,
      priority: 'normal',
      data: { role: newRole },
    });
  } catch (e) {
    console.error('[AdminUserService] role notification failed:', e.message);
  }
  return { user: { id: target.id, app_role: newRole, custom_role: customRole ? { id: customRole.id, name: customRole.name } : null }, changed: true };
}

// --------------------------------------------------------------------------
// Trust score
// --------------------------------------------------------------------------

async function adjustTrust(actor, id, body = {}, context) {
  const target = await loadTarget(id);
  if (!mayManage(actor, target)) throw new AccessError(403, 'You cannot adjust this account\'s trust score.');
  if (!(await hasUserColumn('trust_score'))) throw new MigrationPendingError('Trust scores');

  // Only a real number (or a numeric string): Number('') and Number(null) are 0.
  const raw = body.score;
  const score = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN);
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new AccessError(400, 'Trust score must be a whole number from 0 to 100.');
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (reason.length < 3) throw new AccessError(400, 'Give a reason for the change.');

  const rows = await db.sequelize.query('SELECT trust_score FROM users WHERE id = :id LIMIT 1', {
    replacements: { id: target.id },
    type: QueryTypes.SELECT,
  });
  const previous = rows[0] && rows[0].trust_score !== null && rows[0].trust_score !== undefined ? Number(rows[0].trust_score) : DEFAULT_TRUST;
  if (previous === score) throw new AccessError(409, 'The trust score is already at that value.');

  await db.sequelize.query('UPDATE users SET trust_score = :score WHERE id = :id', {
    replacements: { score, id: target.id },
    type: QueryTypes.UPDATE,
  });
  try {
    await db.TrustScoreLog.create({
      user_id: target.id,
      score,
      previous_score: previous,
      reason,
      action_type: 'admin_adjustment',
      created_at: new Date(),
    });
  } catch (e) {
    console.error('[AdminUserService] trust log failed:', e.message);
  }
  await audit(actor, 'user_trust_adjusted', 'user', target.id, {
    oldData: { trust_score: previous },
    newData: { trust_score: score },
    description: `Trust score of user ${target.id} changed from ${previous} to ${score}: ${reason}`,
    context,
  });
  return { user: { id: target.id, trust_score: score }, previous_score: previous };
}

// --------------------------------------------------------------------------
// Deactivate / reactivate
// --------------------------------------------------------------------------

async function changeStatus(actor, id, body = {}, { context, wsService } = {}) {
  const action = body.action;
  if (!['deactivate', 'reactivate'].includes(action)) throw new AccessError(400, 'Action must be deactivate or reactivate.');
  const target = await loadTarget(id);
  if (action === 'reactivate') assertMayReactivate(actor, target);
  return Sanctions.apply(target.id, action, actor, {
    reason: body.reason,
    source: 'user_management',
    context,
    wsService,
  });
}

// --------------------------------------------------------------------------
// Delete (anonymise)
// --------------------------------------------------------------------------

/**
 * Deleting a user anonymises the account instead of removing the row:
 * payments, subscriptions, invoices, refunds and audit history reference
 * users.id and must stay intact (and financial records must be kept). The
 * person's identifying data is scrubbed, the account can never sign in again
 * (unusable password, no Google link, status inactive, sessions revoked), and
 * it disappears from User Management. Irreversible.
 */
async function deleteUser(actor, id, body = {}, { context, wsService } = {}) {
  if (!isSuperAdmin(actor)) throw new AccessError(403, 'Only a super admin can delete users.');
  const target = await loadTarget(id);
  if (String(target.id) === String(actor.id)) throw new AccessError(403, 'You cannot delete your own account.');
  if (effectiveRole(target) === 'super_admin') throw new AccessError(403, 'Super admin accounts cannot be deleted.');
  const confirm = typeof body.confirm === 'string' ? body.confirm.trim().toLowerCase() : '';
  if (!confirm || confirm !== String(target.email || '').toLowerCase()) {
    throw new AccessError(400, 'Type the user\'s email address to confirm.', 'CONFIRMATION_REQUIRED');
  }

  const previousRole = effectiveRole(target);
  const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const present = await userColumns();
  const extra = [...LEGACY_PII_COLUMNS, 'custom_role_id'].filter((c) => present.has(c));
  // One transaction for everything stored on the account itself, so a
  // failure never leaves a half-anonymised user.
  await db.sequelize.transaction(async (transaction) => {
  await db.User.update(
    {
      name: 'Deleted user',
      display_name: 'Deleted user',
      email: `deleted-${target.id}@${TOMBSTONE_DOMAIN}`,
      profile_image_url: null,
      google_id: null,
      password,
      status: 'inactive',
      app_role: 'user',
      role: 'user',
      email_verified: false,
      is_premium: false,
    },
    { where: { id: target.id }, transaction }
  );
  if (extra.length) {
    // Fixed column names only; values are NULL.
    await db.sequelize.query(`UPDATE users SET ${extra.map((c) => `${c} = NULL`).join(', ')} WHERE id = :id`, {
      replacements: { id: target.id },
      type: QueryTypes.UPDATE,
      transaction,
    });
  }
  // Outstanding sign-up and reset codes would otherwise still work (and they
  // carry the old email).
  await db.VerificationCode.update({ consumed_at: new Date() }, { where: { user_id: target.id, consumed_at: null }, transaction });
  await unpublishProfiles(target.id, transaction);
  });

  // Best-effort clean-up outside the account row. Financial and KYC records
  // (payments, subscriptions, advisor/SEBI rows, withdrawals) are kept under
  // retention and point at the anonymised id.
  try {
    await db.OauthToken.update({ ip_address: null, user_agent: null }, { where: { user_id: target.id } });
  } catch (e) { console.error('[AdminUserService] token scrub failed:', e.message); }
  try {
    // A deleted member must not be charged again.
    await db.Subscription.update({ auto_renew: false, cancelAtPeriodEnd: true }, { where: { user_id: target.id, status: 'active' } });
  } catch (e) { console.error('[AdminUserService] subscription stop failed:', e.message); }

  const AuthService = require('./AuthService');
  try { await AuthService.revokeAllForUser(target.id); } catch (e) { console.error('[AdminUserService] revoke failed:', e.message); }
  try { if (wsService && wsService.disconnectUser) wsService.disconnectUser(target.id, 4003, 'Account deleted'); } catch (e) { console.error('[AdminUserService] socket close failed:', e.message); }

  await audit(actor, 'user_deleted', 'user', target.id, {
    oldData: { role: previousRole },
    newData: { anonymised: true },
    description: `Deleted (anonymised) user ${target.id}`,
    context,
  });
  return { user: { id: target.id }, anonymised: true };
}

/**
 * Public expert profiles carry the person's name, photo and bio and stay
 * listed while approved. On delete they are unpublished and anonymised and
 * their posts archived. SEBI numbers and documents stay on the (now hidden)
 * row for regulatory retention.
 */
async function unpublishProfiles(userId, transaction) {
  const gone = 'Deleted user';
  const advisors = await db.Advisor.findAll({ where: { user_id: userId }, attributes: ['id'], transaction });
  if (advisors.length) {
    const ids = advisors.map((a) => a.id);
    await db.Advisor.update(
      { status: 'suspended', verified: false, name: gone, display_name: gone, avatar_url: null, profile_image_url: null, bio: null },
      { where: { id: ids }, transaction }
    );
    await db.AdvisorPost.update({ status: 'archived' }, { where: { advisor_id: ids }, transaction });
  }
  await db.PortfolioManager.update(
    { status: 'suspended', display_name: gone, bio: null, profile_image_url: null, is_featured: false },
    { where: { user_id: userId }, transaction }
  );
  const influencers = await db.FinInfluencer.findAll({ where: { user_id: userId }, attributes: ['id'], transaction });
  if (influencers.length) {
    const ids = influencers.map((f) => f.id);
    await db.FinInfluencer.update(
      { status: 'inactive', name: gone, avatar_url: null, bio: null, social_links: null, is_featured: false },
      { where: { id: ids }, transaction }
    );
    await db.InfluencerPost.update({ status: 'archived' }, { where: { influencer_id: ids }, transaction });
  }
}

module.exports = {
  list,
  assertMayReactivate,
  editDetails,
  setRole,
  adjustTrust,
  changeStatus,
  deleteUser,
  allowedActions,
  mayManage,
  contextOf,
  isTombstone,
  TOMBSTONE_DOMAIN,
};
