const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Op } = require('sequelize');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const AuthService = require('../src/services/AuthService');
const userSchema = require('../src/utils/userSchema');
const { checkRoleAssignment } = require('../src/utils/roles');
const Access = require('../src/services/AccessControlService');
const storage = require('../src/services/StorageService');
const { PERMISSION_KEYS } = require('../src/utils/permissions');

// PPT slides 1 and 7: Super Admin › User Management row actions and
// Roles & Permissions. Every action goes through /api/admin/users/*.

const MEMBER = { id: '77777777-7777-4777-8777-777777777777', email: 'member@example.test', name: 'Member', display_name: 'Mem', app_role: 'user', role: 'user', status: 'active' };
const SUB = { id: '66666666-6666-4666-8666-666666666666', email: 'sub@example.test', app_role: 'sub_admin', role: 'sub_admin', status: 'active' };
const OTHER_SUPER = { id: '88888888-8888-4888-8888-888888888888', email: 'sa2@example.test', app_role: 'super_admin', role: 'super_admin', status: 'active' };
const BANNED = { id: '99999999-9999-4999-8999-999999999999', email: 'banned@example.test', app_role: 'user', role: 'user', status: 'banned' };
const SUB_ROLE = { id: 'role-sub', name: 'sub_admin' };
const CUSTOM_ROLE = { id: 'role-cs', name: 'Customer Support', description: 'Support desk' };

const as = (user) => ({ Authorization: bearer(user) });

let audits;
let userUpdates;
let queries;
let sanctions;
let revoked;
let rolePermissions;
let permRows;
let profileWrites;

/** Sub-admin role grants: role_id -> permission names. */
function stubAccessTables(grants = {}) {
  permRows = [];
  const links = [];
  for (const [roleId, keys] of Object.entries(grants)) {
    for (const key of keys) {
      let p = permRows.find((r) => r.name === key);
      if (!p) { p = { id: `perm-${key}`, name: key }; permRows.push(p); }
      links.push({ role_id: roleId, permission_id: p.id });
    }
  }
  mock.method(db.Role, 'findAll', async () => [SUB_ROLE, CUSTOM_ROLE]);
  mock.method(db.Role, 'findByPk', async (id) => [SUB_ROLE, CUSTOM_ROLE].find((r) => r.id === id) || null);
  mock.method(db.RolePermission, 'findAll', async ({ where }) => links.filter((l) => [].concat(where.role_id).includes(l.role_id)));
  mock.method(db.Permission, 'findAll', async (opts = {}) => {
    if (opts.where && opts.where.id) return permRows.filter((p) => [].concat(opts.where.id).includes(p.id));
    if (opts.where && opts.where.name) return permRows.filter((p) => [].concat(opts.where.name).includes(p.name));
    return permRows;
  });
  mock.method(db.Permission, 'findOrCreate', async ({ where, defaults }) => {
    const found = permRows.find((p) => p.name === where.name);
    if (found) return [found, false];
    const row = { id: `perm-${where.name}`, ...defaults };
    permRows.push(row);
    return [row, true];
  });
  mock.method(db.Role, 'findOrCreate', async ({ defaults }) => [defaults, true]);
  rolePermissions = links;
}

beforeEach(() => {
  audits = [];
  userUpdates = [];
  queries = [];
  sanctions = [];
  revoked = [];
  userSchema._set([]);
  stubUserLookup({ [MEMBER.id]: MEMBER, [SUB.id]: SUB, [OTHER_SUPER.id]: OTHER_SUPER, [BANNED.id]: BANNED });
  mock.method(db.AuditLog, 'create', async (row) => { audits.push(row); return row; });
  mock.method(db.User, 'update', async (values, opts) => { userUpdates.push({ values, where: opts.where }); return [1]; });
  mock.method(db.User, 'findOne', async () => null);
  mock.method(db.Notification, 'create', async (row) => row);
  mock.method(db.UserSanction, 'create', async (row) => { sanctions.push(row); return { ...row, toJSON: () => row }; });
  mock.method(db.UserSanction, 'update', async () => [1]);
  mock.method(db.UserSanction, 'findAll', async () => []);
  mock.method(db.TrustScoreLog, 'create', async (row) => row);
  mock.method(AuthService, 'revokeAllForUser', async (id) => { revoked.push(id); });
  mock.method(db.sequelize, 'query', async (sql, opts = {}) => {
    queries.push({ sql, replacements: opts.replacements });
    if (/SELECT trust_score FROM users/.test(sql)) return [{ trust_score: 40 }];
    if (/SELECT custom_role_id FROM users/.test(sql)) return [{ custom_role_id: null }];
    return [];
  });
  stubAccessTables({ [SUB_ROLE.id]: [] });
  // deleteUser: one transaction, plus the account's codes, tokens,
  // subscriptions and public expert profiles.
  profileWrites = [];
  mock.method(db.sequelize, 'transaction', async (fn) => fn({ id: 'tx' }));
  mock.method(db.VerificationCode, 'update', async () => [1]);
  mock.method(db.OauthToken, 'update', async () => [1]);
  mock.method(db.Subscription, 'update', async () => [1]);
  mock.method(db.User, 'count', async () => 0);
  mock.method(db.Advisor, 'findAll', async () => []);
  mock.method(db.FinInfluencer, 'findAll', async () => []);
  for (const model of ['Advisor', 'AdvisorPost', 'PortfolioManager', 'FinInfluencer', 'InfluencerPost']) {
    mock.method(db[model], 'update', async (values, opts) => { profileWrites.push({ model, values, where: opts.where, tx: opts.transaction }); return [1]; });
  }
  Access._resetCatalogue();
});
afterEach(() => { mock.restoreAll(); userSchema._reset(); });

describe('GET /api/admin/users', () => {
  test('an ordinary member is refused', async () => {
    const res = await request(app).get('/api/admin/users').set(as(USERS.user));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PERMISSION_DENIED');
  });

  test('pages, filters, hides deleted accounts and returns what the caller may do per row', async () => {
    let seen;
    mock.method(db.User, 'findAndCountAll', async (opts) => {
      seen = opts;
      return { count: 3, rows: [{ ...MEMBER, toJSON: () => ({ ...MEMBER }) }, { ...USERS.admin, toJSON: () => ({ ...USERS.admin }) }, { ...OTHER_SUPER, toJSON: () => ({ ...OTHER_SUPER }) }] };
    });
    const res = await request(app).get('/api/admin/users?page=2&limit=2&search=50%25_off&role=user&status=active').set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(seen.limit, 2);
    assert.equal(seen.offset, 2);
    assert.ok(!seen.attributes.includes('password'));
    const and = seen.where[Op.and];
    assert.deepEqual(and[0], { email: { [Op.notLike]: 'deleted-%@deleted.protocall.invalid' } });
    // LIKE wildcards in the search are escaped.
    assert.equal(and[1][Op.or][0].name[Op.like], '%50\\%\\_off%');
    assert.deepEqual(and[and.length - 1], { status: 'active' });
    assert.equal(res.body.pages, 2);

    const [member, admin, superAdmin] = res.body.data;
    assert.deepEqual(member.actions, { edit: true, role: true, status: true, trust: false, delete: false });
    assert.equal(member.trust_score, null, 'no trust score before migration 017');
    assert.equal(admin.is_self, true);
    assert.deepEqual(admin.actions, { edit: false, role: false, status: false, trust: false, delete: false });
    assert.deepEqual(superAdmin.actions, { edit: false, role: false, status: false, trust: false, delete: false });
  });

  test('a suspended row carries its end date; a super admin may delete others but not super admins', async () => {
    const until = new Date(Date.now() + 86400000);
    const suspended = { ...MEMBER, status: 'suspended' };
    mock.method(db.User, 'findAndCountAll', async () => ({ count: 2, rows: [{ ...suspended, toJSON: () => ({ ...suspended }) }, { ...OTHER_SUPER, toJSON: () => ({ ...OTHER_SUPER }) }] }));
    mock.method(db.UserSanction, 'findAll', async () => [{ user_id: MEMBER.id, ends_at: until }]);
    const res = await request(app).get('/api/admin/users').set(as(USERS.superAdmin));
    assert.equal(res.status, 200);
    assert.equal(new Date(res.body.data[0].suspended_until).getTime(), until.getTime());
    assert.equal(res.body.data[0].actions.delete, true);
    assert.equal(res.body.data[1].actions.delete, false);
    assert.equal(res.body.data[1].actions.status, false);
  });

  test('a sub-admin sees the list only with the users.view permission', async () => {
    mock.method(db.User, 'findAndCountAll', async () => ({ count: 0, rows: [] }));
    assert.equal((await request(app).get('/api/admin/users').set(as(SUB))).status, 403);

    mock.restoreAll();
    stubUserLookup({ [SUB.id]: SUB });
    userSchema._set([]);
    stubAccessTables({ [SUB_ROLE.id]: ['users.view'] });
    mock.method(db.User, 'findAndCountAll', async () => ({ count: 0, rows: [] }));
    const res = await request(app).get('/api/admin/users').set(as(SUB));
    assert.equal(res.status, 200);
    // ...and still cannot edit.
    const edit = await request(app).patch(`/api/admin/users/${MEMBER.id}`).set(as(SUB)).send({ display_name: 'x' });
    assert.equal(edit.status, 403);
  });
});

describe('PATCH /api/admin/users/:id (Edit User)', () => {
  test('writes only whitelisted fields and audits the change', async () => {
    const res = await request(app).patch(`/api/admin/users/${MEMBER.id}`).set(as(USERS.admin))
      .send({ display_name: 'New Name', app_role: 'super_admin', status: 'active', is_premium: true, password: 'x' });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates, [{ values: { display_name: 'New Name' }, where: { id: MEMBER.id } }]);
    assert.equal(audits[0].action, 'user_updated');
    assert.deepEqual(audits[0].old_data, { display_name: 'Mem' });
  });

  test('only a super admin changes an email, and it must be valid and unused', async () => {
    assert.equal((await request(app).patch(`/api/admin/users/${MEMBER.id}`).set(as(USERS.admin)).send({ email: 'new@example.test' })).status, 403);
    assert.equal((await request(app).patch(`/api/admin/users/${MEMBER.id}`).set(as(USERS.superAdmin)).send({ email: 'not-an-email' })).status, 400);
    mock.method(db.User, 'findOne', async () => ({ id: 'someone-else' }));
    assert.equal((await request(app).patch(`/api/admin/users/${MEMBER.id}`).set(as(USERS.superAdmin)).send({ email: 'taken@example.test' })).status, 409);
    assert.equal(userUpdates.length, 0);
  });

  test('an admin cannot edit another admin, a super admin or themselves', async () => {
    for (const target of [USERS.superAdmin, OTHER_SUPER, USERS.admin]) {
      const res = await request(app).patch(`/api/admin/users/${target.id}`).set(as(USERS.admin)).send({ display_name: 'x' });
      assert.equal(res.status, 403, target.email);
    }
    assert.equal(userUpdates.length, 0);
  });
});

describe('PUT /api/admin/users/:id/role (Edit Role / Assign Role)', () => {
  test('an admin assigns a non-admin role; both role columns are written and the change is audited', async () => {
    const res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'advisor' });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates[0], { values: { app_role: 'advisor', role: 'advisor' }, where: { id: MEMBER.id } });
    assert.equal(audits[0].action, 'user_role_changed');
    assert.deepEqual(audits[0].new_data, { role: 'advisor', custom_role_id: null });
  });

  test('only a super admin grants or removes admin / super admin', async () => {
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'admin' })).status, 403);
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'super_admin' })).status, 403);
    assert.equal((await request(app).put(`/api/admin/users/${OTHER_SUPER.id}/role`).set(as(USERS.admin)).send({ role: 'user' })).status, 403);
    assert.equal(userUpdates.length, 0);
    const ok = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.superAdmin)).send({ role: 'admin' });
    assert.equal(ok.status, 200);
  });

  test('nobody changes their own role, super admins included', async () => {
    assert.equal((await request(app).put(`/api/admin/users/${USERS.superAdmin.id}/role`).set(as(USERS.superAdmin)).send({ role: 'user' })).status, 403);
    assert.equal((await request(app).put(`/api/admin/users/${USERS.admin.id}/role`).set(as(USERS.admin)).send({ role: 'super_admin' })).status, 403);
    assert.equal(userUpdates.length, 0);
  });

  test('unknown roles are rejected', async () => {
    const res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.superAdmin)).send({ role: 'god' });
    assert.equal(res.status, 400);
  });

  test('a custom role needs migration 017, then is stored on top of sub_admin', async () => {
    let res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'sub_admin', custom_role_id: CUSTOM_ROLE.id });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'MIGRATION_PENDING');

    userSchema._set(['custom_role_id']);
    res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'sub_admin', custom_role_id: CUSTOM_ROLE.id });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates[0].values, { app_role: 'sub_admin', role: 'sub_admin' });
    const write = queries.find((q) => /UPDATE users SET custom_role_id/.test(q.sql));
    assert.deepEqual(write.replacements, { cid: CUSTOM_ROLE.id, id: MEMBER.id });

    // A built-in role row is not a custom role.
    res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'sub_admin', custom_role_id: SUB_ROLE.id });
    assert.equal(res.status, 404);
  });

  test('a sub-admin with users.roles may hand out non-staff roles only', async () => {
    mock.restoreAll();
    stubUserLookup({ [SUB.id]: SUB, [MEMBER.id]: MEMBER });
    userSchema._set([]);
    stubAccessTables({ [SUB_ROLE.id]: ['users.view', 'users.roles'] });
    mock.method(db.User, 'update', async (values, opts) => { userUpdates.push({ values, where: opts.where }); return [1]; });
    mock.method(db.AuditLog, 'create', async () => ({}));
    mock.method(db.Notification, 'create', async () => ({}));
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(SUB)).send({ role: 'sub_admin' })).status, 403);
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(SUB)).send({ role: 'finfluencer' })).status, 200);
  });

  test('rules: checkRoleAssignment', () => {
    const admin = { id: 'a', app_role: 'admin' };
    const sub = { id: 's', app_role: 'sub_admin' };
    const member = { id: 'm', app_role: 'user' };
    assert.equal(checkRoleAssignment(admin, member, 'sub_admin'), null);
    assert.equal(checkRoleAssignment(admin, { id: 'x', app_role: 'sub_admin' }, 'user'), null);
    assert.equal(checkRoleAssignment(sub, member, 'sub_admin').status, 403);
    assert.equal(checkRoleAssignment(admin, { id: 'x', app_role: 'admin' }, 'user').status, 403);
  });

  test('PUT /api/users/:id no longer lets an admin grant admin either', async () => {
    const res = await request(app).put(`/api/users/${MEMBER.id}`).set(as(USERS.admin)).send({ app_role: 'admin' });
    assert.equal(res.status, 403);
    assert.equal(userUpdates.length, 0);
  });
});

describe('PUT /api/admin/users/:id/trust-score', () => {
  test('answers 503 until migration 017 adds the column', async () => {
    const res = await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score: 60, reason: 'Helpful posts' });
    assert.equal(res.status, 503);
  });

  test('is bounded to 0-100, needs a reason, and writes the score, the log and the audit row', async () => {
    userSchema._set(['trust_score']);
    const logs = mock.method(db.TrustScoreLog, 'create', async (row) => row);
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score: 101, reason: 'x yz' })).status, 400);
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score: -1, reason: 'x yz' })).status, 400);
    assert.equal((await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score: 60 })).status, 400);
    for (const score of ['', null, '  ', true, '12abc', 12.5]) {
      const r = await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score, reason: 'Helpful posts' });
      assert.equal(r.status, 400, JSON.stringify(score));
    }
    assert.equal(queries.filter((q) => /UPDATE users SET trust_score/.test(q.sql)).length, 0);

    const res = await request(app).put(`/api/admin/users/${MEMBER.id}/trust-score`).set(as(USERS.admin)).send({ score: 60, reason: 'Helpful posts' });
    assert.equal(res.status, 200);
    assert.equal(res.body.previous_score, 40);
    const write = queries.find((q) => /UPDATE users SET trust_score/.test(q.sql));
    assert.deepEqual(write.replacements, { score: 60, id: MEMBER.id });
    assert.equal(logs.mock.calls[0].arguments[0].previous_score, 40);
    assert.equal(audits[0].action, 'user_trust_adjusted');
  });
});

describe('POST /api/admin/users/:id/status (Deactivate / Reactivate)', () => {
  test('deactivates through the sanction service: status, history, sessions', async () => {
    const res = await request(app).post(`/api/admin/users/${MEMBER.id}/status`).set(as(USERS.admin)).send({ action: 'deactivate', reason: 'Requested' });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates[0].values, { status: 'inactive' });
    assert.equal(sanctions[0].action, 'deactivate');
    assert.equal(sanctions[0].source, 'user_management');
    assert.deepEqual(revoked, [MEMBER.id]);
  });

  test('reactivates a blocked account', async () => {
    const res = await request(app).post(`/api/admin/users/${BANNED.id}/status`).set(as(USERS.admin)).send({ action: 'reactivate' });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates[0].values, { status: 'active' });
  });

  test('refuses self, super admins, and anything but deactivate / reactivate', async () => {
    assert.equal((await request(app).post(`/api/admin/users/${USERS.admin.id}/status`).set(as(USERS.admin)).send({ action: 'deactivate' })).status, 403);
    assert.equal((await request(app).post(`/api/admin/users/${OTHER_SUPER.id}/status`).set(as(USERS.superAdmin)).send({ action: 'deactivate' })).status, 403);
    assert.equal((await request(app).post(`/api/admin/users/${MEMBER.id}/status`).set(as(USERS.admin)).send({ action: 'ban', reason: 'x' })).status, 400);
    assert.equal(userUpdates.length, 0);
  });

  test('the legacy PUT /api/admin/users/:id status change goes through the same path', async () => {
    const res = await request(app).put(`/api/admin/users/${MEMBER.id}`).set(as(USERS.admin)).send({ status: 'banned' });
    assert.equal(res.status, 200);
    assert.deepEqual(userUpdates[0].values, { status: 'banned' });
    assert.deepEqual(revoked, [MEMBER.id]);
  });
});

describe('DELETE /api/admin/users/:id', () => {
  test('is super-admin only', async () => {
    const res = await request(app).delete(`/api/admin/users/${MEMBER.id}`).set(as(USERS.admin)).send({ confirm: MEMBER.email });
    assert.equal(res.status, 403);
    assert.equal(userUpdates.length, 0);
  });

  test('needs the email typed as confirmation, and never deletes self or a super admin', async () => {
    assert.equal((await request(app).delete(`/api/admin/users/${MEMBER.id}`).set(as(USERS.superAdmin)).send({})).status, 400);
    assert.equal((await request(app).delete(`/api/admin/users/${OTHER_SUPER.id}`).set(as(USERS.superAdmin)).send({ confirm: OTHER_SUPER.email })).status, 403);
    assert.equal((await request(app).delete(`/api/admin/users/${USERS.superAdmin.id}`).set(as(USERS.superAdmin)).send({ confirm: USERS.superAdmin.email })).status, 403);
    assert.equal(userUpdates.length, 0);
  });

  test('anonymises the account instead of deleting the row, and ends its sessions', async () => {
    const destroy = mock.method(db.User, 'destroy', async () => 1);
    const res = await request(app).delete(`/api/admin/users/${MEMBER.id}`).set(as(USERS.superAdmin)).send({ confirm: 'MEMBER@example.test' });
    assert.equal(res.status, 200);
    assert.equal(destroy.mock.callCount(), 0);
    const { values, where } = userUpdates[0];
    assert.deepEqual(where, { id: MEMBER.id });
    assert.equal(values.email, `deleted-${MEMBER.id}@deleted.protocall.invalid`);
    assert.equal(values.name, 'Deleted user');
    assert.equal(values.display_name, 'Deleted user');
    assert.equal(values.profile_image_url, null);
    assert.equal(values.google_id, null);
    assert.equal(values.status, 'inactive');
    assert.equal(values.app_role, 'user');
    assert.match(values.password, /^\$2[aby]\$/);
    assert.deepEqual(revoked, [MEMBER.id]);
    assert.equal(audits.at(-1).action, 'user_deleted');
    assert.equal(db.sequelize.transaction.mock.callCount(), 1);
    assert.doesNotMatch(JSON.stringify(audits.at(-1)), /member@example\.test/i, 'the audit row keeps no personal data');
  });

  test('a deleted advisor / portfolio manager / finfluencer is unpublished, anonymised and their posts archived', async () => {
    mock.method(db.Advisor, 'findAll', async () => [{ id: 'adv-1' }]);
    mock.method(db.FinInfluencer, 'findAll', async () => [{ id: 'fin-1' }]);
    const res = await request(app).delete(`/api/admin/users/${MEMBER.id}`).set(as(USERS.superAdmin)).send({ confirm: MEMBER.email });
    assert.equal(res.status, 200);
    const by = (model) => profileWrites.filter((w) => w.model === model);
    const [advisor] = by('Advisor');
    assert.deepEqual(advisor.where, { id: ['adv-1'] });
    assert.equal(advisor.values.status, 'suspended');
    assert.equal(advisor.values.display_name, 'Deleted user');
    assert.equal(advisor.values.profile_image_url, null);
    assert.equal(advisor.values.verified, false);
    assert.deepEqual(by('AdvisorPost')[0], { model: 'AdvisorPost', values: { status: 'archived' }, where: { advisor_id: ['adv-1'] }, tx: { id: 'tx' } });
    const [pm] = by('PortfolioManager');
    assert.deepEqual(pm.where, { user_id: MEMBER.id });
    assert.equal(pm.values.status, 'suspended');
    assert.equal(by('FinInfluencer')[0].values.status, 'inactive');
    assert.deepEqual(by('InfluencerPost')[0].where, { influencer_id: ['fin-1'] });
    assert.ok(profileWrites.every((w) => w.tx && w.tx.id === 'tx'), 'inside the delete transaction');
  });
});

describe('Roles & Permissions', () => {
  test('GET /api/admin/access/me lists the caller\'s permissions and sections', async () => {
    const admin = await request(app).get('/api/admin/access/me').set(as(USERS.admin));
    assert.equal(admin.status, 200);
    assert.ok(admin.body.permissions.includes('users.delete') === false);
    assert.ok(admin.body.sections.includes('users'));
    const member = await request(app).get('/api/admin/access/me').set(as(USERS.user));
    assert.deepEqual(member.body.permissions, []);
    assert.equal(member.body.is_staff, false);
  });

  test('a sub-admin\'s custom role decides their permissions', async () => {
    mock.restoreAll();
    stubUserLookup({ [SUB.id]: SUB });
    userSchema._set(['custom_role_id']);
    stubAccessTables({ [SUB_ROLE.id]: ['users.view', 'users.edit'], [CUSTOM_ROLE.id]: ['users.view', 'users.trust'] });
    mock.method(db.sequelize, 'query', async () => [{ custom_role_id: CUSTOM_ROLE.id }]);
    const res = await request(app).get('/api/admin/access/me').set(as(SUB));
    assert.deepEqual(res.body.permissions, ['users.view', 'users.trust']);
    assert.deepEqual(res.body.sections, ['users']);
    assert.deepEqual(res.body.custom_role, { id: CUSTOM_ROLE.id, name: CUSTOM_ROLE.name });
  });

  test('matrix toggles are super-admin only and persist as role_permissions rows', async () => {
    const created = mock.method(db.RolePermission, 'create', async (row) => { rolePermissions.push(row); return row; });

    const denied = await request(app).put(`/api/admin/access/roles/${CUSTOM_ROLE.id}/permissions/users.view`).set(as(USERS.admin)).send({ granted: true });
    assert.equal(denied.status, 403);

    const res = await request(app).put(`/api/admin/access/roles/${CUSTOM_ROLE.id}/permissions/users.view`).set(as(USERS.superAdmin)).send({ granted: true });
    assert.equal(res.status, 200);
    assert.equal(created.mock.callCount(), 1);
    assert.equal(created.mock.calls[0].arguments[0].role_id, CUSTOM_ROLE.id);
    assert.equal(audits.at(-1).action, 'role_permission_granted');

    assert.equal((await request(app).put(`/api/admin/access/roles/${CUSTOM_ROLE.id}/permissions/users.delete`).set(as(USERS.superAdmin)).send({ granted: true })).status, 400);
    assert.equal((await request(app).put(`/api/admin/access/roles/${CUSTOM_ROLE.id}/permissions/users.view`).set(as(USERS.superAdmin)).send({ granted: 'yes' })).status, 400);
  });

  test('custom roles cannot take a built-in name and cannot be deleted while assigned', async () => {
    assert.equal((await request(app).post('/api/admin/access/roles').set(as(USERS.superAdmin)).send({ name: 'Super Admin' })).status, 409);
    assert.equal((await request(app).post('/api/admin/access/roles').set(as(USERS.superAdmin)).send({ name: 'customer support' })).status, 409);
    assert.equal((await request(app).post('/api/admin/access/roles').set(as(USERS.admin)).send({ name: 'Ops' })).status, 403);
    assert.equal((await request(app).delete(`/api/admin/access/roles/${SUB_ROLE.id}`).set(as(USERS.superAdmin))).status, 403);

    userSchema._set(['custom_role_id']);
    mock.method(db.sequelize, 'query', async () => [{ role_id: CUSTOM_ROLE.id, n: 2 }]);
    const res = await request(app).delete(`/api/admin/access/roles/${CUSTOM_ROLE.id}`).set(as(USERS.superAdmin));
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ROLE_IN_USE');
  });

  test('generic role CRUD writes are super-admin only', async () => {
    const res = await request(app).post('/api/roles').set(as(USERS.admin)).send({ name: 'x' });
    assert.equal(res.status, 403);
    const perm = await request(app).post('/api/roles/permissions').set(as(USERS.admin)).send({ role_id: 'r', permission_id: 'p' });
    assert.equal(perm.status, 403);
    assert.equal((await request(app).get('/api/roles/all')).status, 401);
  });

  test('trust score logs are read-only for everyone, admins included', async () => {
    const created = mock.method(db.TrustScoreLog, 'create', async (row) => row);
    const destroyed = mock.method(db.TrustScoreLog, 'destroy', async () => 1);
    for (const user of [USERS.user, USERS.admin, USERS.superAdmin]) {
      assert.equal((await request(app).post('/api/users/trust-score-logs').set(as(user)).send({ user_id: MEMBER.id, score: 100 })).status, 404);
      assert.equal((await request(app).put('/api/users/trust-score-logs/x').set(as(user)).send({ score: 0 })).status, 404);
      assert.equal((await request(app).delete('/api/users/trust-score-logs/x').set(as(user))).status, 404);
    }
    assert.equal(created.mock.callCount(), 0);
    assert.equal(destroyed.mock.callCount(), 0);

    // A member reads only their own entries.
    let seen;
    mock.method(db.TrustScoreLog, 'findAll', async (opts) => { seen = opts; return []; });
    assert.equal((await request(app).get(`/api/users/trust-score-logs?user_id=${MEMBER.id}`).set(as(USERS.user))).status, 200);
    assert.equal(seen.where.user_id, USERS.user.id);
  });

  test('two first loads of the screen seed the catalogue once (no duplicate rows)', async () => {
    const seeds = mock.method(db.Permission, 'findOrCreate', async ({ where, defaults }) => {
      await new Promise((r) => setImmediate(r));
      const row = { id: `perm-${where.name}`, ...defaults };
      permRows.push(row);
      return [row, true];
    });
    mock.method(db.Role, 'findAll', async () => [CUSTOM_ROLE]); // no sub_admin row yet
    const roleSeeds = mock.method(db.Role, 'findOrCreate', async ({ defaults }) => [{ id: 'role-sub-new', ...defaults }, true]);
    mock.method(db.RoleTemplate, 'findAll', async () => []);
    const [a, b] = await Promise.all([
      request(app).get('/api/admin/access/matrix').set(as(USERS.superAdmin)),
      request(app).get('/api/admin/access/templates').set(as(USERS.superAdmin)),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(seeds.mock.callCount(), PERMISSION_KEYS.length, 'one findOrCreate per key, not one per request');
    assert.equal(roleSeeds.mock.callCount(), 1);
    assert.deepEqual(new Set(permRows.map((p) => p.name)).size, permRows.length);
  });

  test('the matrix lists only enforced permissions and names the admin-only sections', async () => {
    mock.method(db.RoleTemplate, 'findAll', async () => []);
    const res = await request(app).get('/api/admin/access/matrix').set(as(USERS.admin));
    assert.equal(res.status, 200);
    const keys = res.body.categories.flatMap((c) => c.permissions.map((p) => p.key));
    assert.deepEqual(keys, ['users.view', 'users.edit', 'users.roles', 'users.status', 'users.trust']);
    assert.ok(res.body.admin_only_sections.some((s) => s.section === 'content'));
    assert.equal(res.body.can_edit, false);
    // Role counts use the effective role (app_role || role).
    const countWhere = db.User.count.mock.calls[0].arguments[0].where;
    assert.deepEqual(countWhere[Op.or], [{ app_role: 'super_admin' }, { app_role: null, role: 'super_admin' }, { app_role: '', role: 'super_admin' }]);
  });
});

describe('sub_admin is not implicit staff (H-1) and only users.* is grantable (B1)', () => {
  const ALL_USERS_PERMS = ['users.view', 'users.edit', 'users.roles', 'users.status', 'users.trust'];
  const asSub = (grants) => {
    mock.restoreAll();
    stubUserLookup({ [SUB.id]: SUB, [MEMBER.id]: MEMBER, [BANNED.id]: BANNED });
    userSchema._set([]);
    stubAccessTables({ [SUB_ROLE.id]: grants });
    mock.method(db.User, 'update', async (values, opts) => { userUpdates.push({ values, where: opts.where }); return [1]; });
    mock.method(db.UserSanction, 'create', async (row) => ({ ...row, toJSON: () => row }));
    mock.method(db.UserSanction, 'update', async () => [1]);
    mock.method(db.UserSanction, 'findAll', async () => []);
    mock.method(db.AuditLog, 'create', async () => ({}));
    mock.method(db.Notification, 'create', async () => ({}));
    mock.method(AuthService, 'revokeAllForUser', async () => {});
  };

  test('a granted section works for a sub-admin and an ungranted one is refused', async () => {
    asSub(['users.view']);
    mock.method(db.User, 'findAndCountAll', async () => ({ count: 0, rows: [] }));
    assert.equal((await request(app).get('/api/admin/users').set(as(SUB))).status, 200);
    assert.equal((await request(app).post(`/api/admin/users/${MEMBER.id}/status`).set(as(SUB)).send({ action: 'deactivate' })).status, 403);
  });

  test('every other admin section stays admin-only for a sub-admin, whatever they were granted', async () => {
    asSub(ALL_USERS_PERMS);
    const me = await request(app).get('/api/admin/access/me').set(as(SUB));
    assert.deepEqual(me.body.sections, ['users']);
    assert.equal((await request(app).get('/api/admin/dashboard-stats').set(as(SUB))).status, 403);
    assert.equal((await request(app).get('/api/admin/subscription-analytics').set(as(SUB))).status, 403);
    assert.equal((await request(app).get('/api/admin/access/matrix').set(as(SUB))).status, 403);
  });

  test('generic CRUD confines a sub-admin to their own rows (no staff bypass)', async () => {
    asSub(ALL_USERS_PERMS);
    let seen;
    mock.method(db.UserInvestment, 'findAll', async (opts) => { seen = opts; return []; });
    const res = await request(app).get(`/api/users/investments?user_id=${MEMBER.id}`).set(as(SUB));
    assert.equal(res.status, 200);
    assert.equal(seen.where.user_id, SUB.id);
  });

  test('private KYC / SEBI files are not readable by a sub-admin', () => {
    const key = `private/${MEMBER.id}/sebi/doc.pdf`;
    assert.equal(storage.canReadKey(key, SUB), false);
    assert.equal(storage.canReadKey(key, USERS.admin), true);
    assert.equal(storage.canReadKey(key, MEMBER), true);
  });

  test('a sub-admin with users.status cannot lift a block; an admin can', async () => {
    asSub(ALL_USERS_PERMS);
    mock.method(db.User, 'findAndCountAll', async () => ({ count: 1, rows: [{ ...BANNED, toJSON: () => ({ ...BANNED }) }] }));
    const list = await request(app).get('/api/admin/users').set(as(SUB));
    assert.equal(list.body.data[0].actions.status, false);
    let res = await request(app).post(`/api/admin/users/${BANNED.id}/status`).set(as(SUB)).send({ action: 'reactivate' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BLOCK_ADMIN_ONLY');
    res = await request(app).put(`/api/admin/users/${BANNED.id}`).set(as(SUB)).send({ status: 'active' });
    assert.equal(res.status, 403, 'the legacy route too');
    assert.equal(userUpdates.length, 0);

    res = await request(app).post(`/api/admin/users/${BANNED.id}/status`).set(as(USERS.admin)).send({ action: 'reactivate' });
    assert.equal(res.status, 200);
  });
});

test('assigning sub_admin before the app_role ENUM is widened answers 503, not 500', async () => {
  mock.method(db.User, 'update', async () => { throw new Error("Data truncated for column 'app_role' at row 1"); });
  const res = await request(app).put(`/api/admin/users/${MEMBER.id}/role`).set(as(USERS.admin)).send({ role: 'sub_admin' });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, 'MIGRATION_PENDING');
});
