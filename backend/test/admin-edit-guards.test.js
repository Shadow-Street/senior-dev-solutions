const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const Sanctions = require('../src/services/UserSanctionService');
const { accountBlock } = require('../src/utils/accountStatus');

// Re-verification follow-ups for the accounts review (H-2, M-1, N-1, N-4).
const MEMBER = { id: '66666666-6666-4666-8666-666666666666', email: 'm@example.test', app_role: 'user', role: 'user', status: 'active' };
const DELETED = { id: '77777777-7777-4777-8777-777777777777', email: 'deleted-77777777-7777-4777-8777-777777777777@deleted.protocall.invalid', app_role: 'user', role: 'user', status: 'inactive' };
const SUB = { id: '88888888-8888-4888-8888-888888888888', email: 'sub@example.test', app_role: 'sub_admin', role: 'sub_admin', status: 'active' };

let updates;
beforeEach(() => {
  stubUserLookup({ [MEMBER.id]: MEMBER, [DELETED.id]: DELETED, [SUB.id]: SUB });
  updates = [];
  mock.method(db.User, 'update', async (values, opts) => { updates.push({ values, where: opts.where }); return [1]; });
  mock.method(db.AuditLog, 'create', async () => ({}));
  mock.method(db.UserSanction, 'create', async (row) => ({ id: 's1', ...row }));
  mock.method(db.Notification, 'create', async () => ({}));
});
afterEach(() => mock.restoreAll());

const put = (actor, id, body) => request(app).put(`/api/users/${id}`).set('Authorization', bearer(actor)).send(body);

test('H-2: an admin cannot write google_id or status on another user', async () => {
  for (const body of [{ google_id: 'attacker-google-sub' }, { status: 'banned' }, { email_verified: true }, { is_premium: true }]) {
    const res = await put(USERS.admin, MEMBER.id, body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(updates.length, 0, 'nothing written');
});

test('N-4: a refused role change writes nothing, not even the profile fields sent with it', async () => {
  const res = await put(USERS.admin, MEMBER.id, { display_name: 'Renamed', app_role: 'super_admin' });
  assert.equal(res.status, 403);
  assert.equal(updates.length, 0);
});

test('M-1: no sanction can touch a deleted (anonymised) account', async () => {
  await assert.rejects(() => Sanctions.apply(DELETED.id, 'reactivate', USERS.superAdmin), { status: 410, code: 'DELETED' });
  assert.equal(updates.length, 0);
});

test('M-1: a sub_admin cannot block through the legacy admin route', async () => {
  const res = await request(app).put(`/api/admin/users/${MEMBER.id}`).set('Authorization', bearer(SUB)).send({ status: 'banned' });
  assert.equal(res.status, 403);
  assert.equal(updates.filter((u) => u.values.status === 'banned').length, 0);
});

test('N-1: a block that lands while a suspension expires is honoured', async () => {
  mock.method(db.UserSanction, 'findAll', async () => [{ id: 'old', ends_at: new Date(Date.now() - 1000) }]);
  mock.method(db.UserSanction, 'update', async () => [1]);
  mock.method(db.UserSanction, 'count', async () => 0);
  db.User.update.mock.restore();
  mock.method(db.User, 'update', async () => [0]); // status was no longer 'suspended'
  db.User.findByPk.mock.restore();
  mock.method(db.User, 'findByPk', async () => ({ id: MEMBER.id, status: 'banned' }));
  const block = await accountBlock({ id: MEMBER.id, status: 'suspended' });
  assert.equal(block.code, 'ACCOUNT_BLOCKED');
});
