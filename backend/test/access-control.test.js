const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

beforeEach(() => stubUserLookup());
afterEach(() => mock.restoreAll());

// --- C-1: privilege escalation through PUT /api/users/:id -------------------

test('PUT /api/users/:own-id strips privilege fields from a self-edit', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.user))
    .send({ display_name: 'New name', app_role: 'super_admin', role: 'admin', is_premium: true, email_verified: true, status: 'active' });

  assert.equal(res.status, 200);
  assert.equal(update.mock.callCount(), 1);
  const [written] = update.mock.calls[0].arguments;
  assert.deepEqual(written, { display_name: 'New name' });
});

test('PUT /api/users/:other-id is forbidden for a normal user', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.admin.id}`)
    .set('Authorization', bearer(USERS.user))
    .send({ display_name: 'x' });
  assert.equal(res.status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('an admin cannot grant super_admin', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ app_role: 'super_admin' });
  assert.equal(res.status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('an admin cannot edit a super admin account', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.superAdmin.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ app_role: 'user' });
  assert.equal(res.status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('a super admin can change another user\'s role', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.superAdmin))
    .send({ app_role: 'admin' });
  assert.equal(res.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0], { app_role: 'admin' });
});

// --- C-2: entity export ------------------------------------------------------

test('POST /api/exports is admin-only', async () => {
  const res = await request(app)
    .post('/api/exports')
    .set('Authorization', bearer(USERS.user))
    .send({ entity: 'User', format: 'json' });
  assert.equal(res.status, 403);
});

test('POST /api/exports never selects password or token columns', async () => {
  const findAll = mock.method(db.User, 'findAll', async () => [{ id: 'u1', email: 'a@example.test' }]);
  const res = await request(app)
    .post('/api/exports')
    .set('Authorization', bearer(USERS.admin))
    .send({ entity: 'User', format: 'json', filters: { password: 'x', email: { $ne: null } } });
  assert.equal(res.status, 200);
  const [opts] = findAll.mock.calls[0].arguments;
  assert.ok(!opts.attributes.includes('password'), 'password column must not be exported');
  assert.deepEqual(opts.where, {}, 'secret-column and operator-object filters are dropped');
});

test('POST /api/exports refuses credential-bearing entities and non-models', async () => {
  for (const entity of ['PlatformSetting', 'OauthToken', 'VerificationCode']) {
    const res = await request(app).post('/api/exports').set('Authorization', bearer(USERS.admin)).send({ entity });
    assert.ok([400, 403].includes(res.status), `${entity} → ${res.status}`);
  }
  const res = await request(app).post('/api/exports').set('Authorization', bearer(USERS.admin)).send({ entity: 'sequelize' });
  assert.equal(res.status, 400);
});

test('CSV export neutralises spreadsheet formulas', async () => {
  mock.method(db.User, 'findAll', async () => [{ id: 'u1', name: '=HYPERLINK("http://evil")' }]);
  const res = await request(app)
    .post('/api/exports')
    .set('Authorization', bearer(USERS.admin))
    .send({ entity: 'User', format: 'csv' });
  assert.equal(res.status, 200);
  assert.match(res.text, /"'=HYPERLINK/);
});

// --- C-5: generic bulk endpoints ---------------------------------------------

test('POST /<resource>/bulk is forbidden for non-staff', async () => {
  const bulkCreate = mock.method(db.Notification, 'bulkCreate', async () => []);
  const res = await request(app)
    .post('/api/notifications/bulk')
    .set('Authorization', bearer(USERS.user))
    .send([{ user_id: USERS.admin.id, title: 'phish' }]);
  assert.equal(res.status, 403);
  assert.equal(bulkCreate.mock.callCount(), 0);
});

test('POST /<resource>/bulk still works for staff', async () => {
  const bulkCreate = mock.method(db.Notification, 'bulkCreate', async (rows) => rows);
  const res = await request(app)
    .post('/api/notifications/bulk')
    .set('Authorization', bearer(USERS.admin))
    .send([{ user_id: USERS.user.id, title: 'hello' }]);
  assert.equal(res.status, 201);
  assert.equal(bulkCreate.mock.callCount(), 1);
});

test('DELETE /<resource>/bulk reaches the bulk handler (not /:id) and is staff-only', async () => {
  const destroy = mock.method(db.Notification, 'destroy', async () => 0);
  const findByPk = mock.method(db.Notification, 'findByPk', async () => null);
  const res = await request(app)
    .delete('/api/notifications/bulk')
    .set('Authorization', bearer(USERS.user))
    .send({ ids: ['a'] });
  assert.equal(res.status, 403);
  assert.equal(findByPk.mock.callCount(), 0, 'request must not be routed to delete /:id');
  assert.equal(destroy.mock.callCount(), 0);
});

// --- H-3 / H-6: configuration writes -----------------------------------------

test('feature writes require authentication', async () => {
  for (const [method, path] of [['post', '/api/features'], ['put', '/api/features/x'], ['delete', '/api/features/1']]) {
    const res = await request(app)[method](path).send({ feature_key: 'x' });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('feature writes require admin', async () => {
  const res = await request(app).post('/api/features').set('Authorization', bearer(USERS.user)).send({ feature_key: 'x' });
  assert.equal(res.status, 403);
});

test('POST /api/localization/bulk requires admin', async () => {
  const upsert = mock.method(db.Localization, 'upsert', async () => [{}]);
  let res = await request(app).post('/api/localization/bulk').send({ translations: [{ key: 'k', language: 'en', value: '<b>x</b>' }] });
  assert.equal(res.status, 401);
  res = await request(app).post('/api/localization/bulk').set('Authorization', bearer(USERS.user)).send({ translations: [] });
  assert.equal(res.status, 403);
  assert.equal(upsert.mock.callCount(), 0);
});

test('PUT /api/platform/settings/key/:key requires admin', async () => {
  const upsert = mock.method(db.PlatformSetting, 'upsert', async () => [{}]);
  const res = await request(app)
    .put('/api/platform/settings/key/advisorApprovalRequired')
    .set('Authorization', bearer(USERS.user))
    .send({ value: 'false' });
  assert.equal(res.status, 403);
  assert.equal(upsert.mock.callCount(), 0);
});

// --- Review follow-ups: role column games, email takeover, sub_admin bulk ---

const LEGACY_SUPER = { id: '44444444-4444-4444-8444-444444444444', email: 'legacy@example.test', app_role: null, role: 'super_admin' };
const OTHER_ADMIN = { id: '55555555-5555-4555-8555-555555555555', email: 'other-admin@example.test', app_role: 'admin', role: 'admin' };
const SUB_ADMIN = { id: '66666666-6666-4666-8666-666666666666', email: 'sub@example.test', app_role: 'sub_admin', role: 'user' };

test('an admin cannot promote themselves through their own id', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.admin.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ app_role: 'super_admin', display_name: 'me' });
  assert.equal(res.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0], { display_name: 'me' });
});

test('an admin cannot blank app_role to let role decide', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  const res = await request(app)
    .put(`/api/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ app_role: null });
  assert.equal(res.status, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('an admin cannot set role=super_admin through either user endpoint', async () => {
  const update = mock.method(db.User, 'update', async () => [1]);
  let res = await request(app)
    .put(`/api/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ role: 'super_admin' });
  assert.equal(res.status, 403);
  assert.equal(update.mock.callCount(), 0);

  res = await request(app)
    .put(`/api/admin/users/${USERS.user.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ role: 'super_admin' });
  assert.equal(res.status, 403);
});

test('a legacy super admin (role only) is protected from admins', async () => {
  mock.restoreAll();
  stubUserLookup({ [LEGACY_SUPER.id]: LEGACY_SUPER });
  const update = mock.method(db.User, 'update', async () => [1]);
  let res = await request(app)
    .put(`/api/users/${LEGACY_SUPER.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ display_name: 'x' });
  assert.equal(res.status, 403);
  assert.equal(update.mock.callCount(), 0);

  res = await request(app)
    .put(`/api/admin/users/${LEGACY_SUPER.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ status: 'banned' });
  assert.equal(res.status, 403);
});

test('only a super admin can change another user\'s email', async () => {
  mock.restoreAll();
  stubUserLookup({ [OTHER_ADMIN.id]: OTHER_ADMIN });
  const update = mock.method(db.User, 'update', async () => [1]);
  await request(app)
    .put(`/api/users/${OTHER_ADMIN.id}`)
    .set('Authorization', bearer(USERS.admin))
    .send({ email: 'attacker@example.test', display_name: 'x' });
  assert.deepEqual(update.mock.calls[0].arguments[0], { display_name: 'x' });

  await request(app)
    .put(`/api/users/${OTHER_ADMIN.id}`)
    .set('Authorization', bearer(USERS.superAdmin))
    .send({ email: 'new@example.test' });
  assert.deepEqual(update.mock.calls[1].arguments[0], { email: 'new@example.test' });
});

test('PUT /<resource>/bulk reaches the bulk handler and refuses non-admins', async () => {
  const update = mock.method(db.Notification, 'update', async () => [0]);
  const findByPk = mock.method(db.Notification, 'findByPk', async () => null);
  const res = await request(app)
    .put('/api/notifications/bulk')
    .set('Authorization', bearer(USERS.user))
    .send({ ids: ['a'], data: { title: 'x' } });
  assert.equal(res.status, 403);
  assert.equal(findByPk.mock.callCount(), 0, 'request must not be routed to update /:id');
  assert.equal(update.mock.callCount(), 0);
});

test('sub_admin cannot use bulk tooling', async () => {
  mock.restoreAll();
  stubUserLookup({ [SUB_ADMIN.id]: SUB_ADMIN });
  const bulkCreate = mock.method(db.Notification, 'bulkCreate', async () => []);
  const res = await request(app)
    .post('/api/notifications/bulk')
    .set('Authorization', bearer(SUB_ADMIN))
    .send([{ title: 'x' }]);
  assert.equal(res.status, 403);
  assert.equal(bulkCreate.mock.callCount(), 0);
});

test('CSV export keeps negative amounts as numbers', async () => {
  mock.method(db.User, 'findAll', async () => [{ id: 'u1', name: '-250.50' }]);
  const res = await request(app)
    .post('/api/exports')
    .set('Authorization', bearer(USERS.admin))
    .send({ entity: 'User', format: 'csv' });
  assert.equal(res.status, 200);
  assert.match(res.text, /^u1,-250\.50$/m);
});
