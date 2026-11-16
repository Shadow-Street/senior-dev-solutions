const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const AuthService = require('../src/services/AuthService');
const Sanctions = require('../src/services/UserSanctionService');
const { accountBlock } = require('../src/utils/accountStatus');

// SEC-21 + PPT slides 1/7/9: deactivated, suspended and blocked accounts lose
// access everywhere, and every sanction leaves a history row.
const TARGET = { id: '44444444-4444-4444-8444-444444444444', email: 't@example.test', app_role: 'user', role: 'user', status: 'active' };
const OTHER_ADMIN = { id: '55555555-5555-4555-8555-555555555555', email: 'a2@example.test', app_role: 'admin', role: 'admin', status: 'active' };
const HOUR = 60 * 60 * 1000;

let sanctions;
let userUpdates;
let notifications;
let revoked;
beforeEach(() => {
  sanctions = [];
  userUpdates = [];
  notifications = [];
  revoked = [];
  mock.method(db.UserSanction, 'create', async (row) => { sanctions.push(row); return { ...row, toJSON: () => row }; });
  mock.method(db.UserSanction, 'update', async () => [1]);
  mock.method(db.User, 'update', async (values, opts) => { userUpdates.push({ values, where: opts.where }); return [1]; });
  mock.method(db.Notification, 'create', async (row) => { notifications.push(row); return row; });
  mock.method(db.AuditLog, 'create', async () => ({}));
  mock.method(AuthService, 'revokeAllForUser', async (id) => { revoked.push(id); });
});
afterEach(() => mock.restoreAll());

describe('accountBlock', () => {
  test('active passes; inactive, banned and unknown states are refused', async () => {
    assert.equal(await accountBlock({ id: 'u', status: 'active' }), null);
    assert.equal((await accountBlock({ id: 'u', status: 'inactive' })).code, 'ACCOUNT_DEACTIVATED');
    assert.equal((await accountBlock({ id: 'u', status: 'banned' })).code, 'ACCOUNT_BLOCKED');
    assert.equal((await accountBlock({ id: 'u', status: 'pending' })).code, 'ACCOUNT_INACTIVE');
  });

  test('a running suspension is refused with its end date', async () => {
    const until = new Date(Date.now() + 48 * HOUR);
    mock.method(db.UserSanction, 'findAll', async () => [{ id: 's1', ends_at: until }]);
    const block = await accountBlock({ id: 'u', status: 'suspended' });
    assert.equal(block.code, 'ACCOUNT_SUSPENDED');
    assert.equal(block.until, until.toISOString());
    assert.equal(userUpdates.length, 0);
  });

  test('an ended suspension is lifted and the account works again', async () => {
    mock.method(db.UserSanction, 'findAll', async () => [{ id: 's1', ends_at: new Date(Date.now() - HOUR) }]);
    mock.method(db.UserSanction, 'count', async () => 0);
    const user = { id: 'u', status: 'suspended' };
    assert.equal(await accountBlock(user), null);
    assert.equal(user.status, 'active');
    assert.deepEqual(userUpdates[0], { values: { status: 'active' }, where: { id: 'u', status: 'suspended' } });
    assert.equal(sanctions[0].action, 'reactivate');
    assert.equal(sanctions[0].source, 'system');
  });

  test('overlapping suspensions: the latest end date wins', async () => {
    const long = new Date(Date.now() + 29 * 24 * HOUR);
    mock.method(db.UserSanction, 'findAll', async () => [
      { id: 'long', ends_at: long },
      { id: 'short', ends_at: new Date(Date.now() - HOUR) },
    ]);
    const block = await accountBlock({ id: 'u', status: 'suspended' });
    assert.equal(block.code, 'ACCOUNT_SUSPENDED');
    assert.equal(block.until, long.toISOString());
    assert.equal(userUpdates.length, 0);
  });

  test('a re-suspension during the lift is not undone', async () => {
    mock.method(db.UserSanction, 'findAll', async () => [{ id: 's1', ends_at: new Date(Date.now() - HOUR) }]);
    mock.method(db.UserSanction, 'count', async () => 1); // a new suspension appeared meanwhile
    const block = await accountBlock({ id: 'u', status: 'suspended' });
    assert.equal(block.code, 'ACCOUNT_SUSPENDED');
    assert.equal(userUpdates.length, 0);
  });

  test('fails closed when the suspension cannot be read', async () => {
    mock.method(db.UserSanction, 'findAll', async () => { throw new Error("Table 'user_sanctions' doesn't exist"); });
    assert.equal((await accountBlock({ id: 'u', status: 'suspended' })).code, 'ACCOUNT_SUSPENDED');
  });
});

describe('enforcement', () => {
  test('a blocked user is refused on every authenticated request, with a reason code', async () => {
    stubUserLookup({ [TARGET.id]: { ...TARGET, status: 'banned' } });
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(TARGET));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
  });

  test('no session is issued to a deactivated account (password, Google, OTP and refresh all use issueTokens)', async () => {
    const created = mock.method(db.OauthToken, 'create', async () => ({}));
    await assert.rejects(() => AuthService.issueTokens({ ...TARGET, status: 'inactive' }), { code: 'ACCOUNT_DEACTIVATED' });
    assert.equal(created.mock.callCount(), 0);
  });

  test('login with the right password answers 403 with the block, not a generic error', async () => {
    mock.method(AuthService, 'login', async () => {
      throw Object.assign(new Error('This account has been blocked for violating the community guidelines.'), { code: 'ACCOUNT_BLOCKED' });
    });
    const res = await request(app).post('/api/auth/login').send({ email: 't@example.test', password: 'x' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
  });
});

describe('UserSanctionService.apply', () => {
  beforeEach(() => stubUserLookup({ [TARGET.id]: TARGET, [OTHER_ADMIN.id]: OTHER_ADMIN }));

  test('nobody sanctions themselves or a super admin; only a super admin sanctions staff', async () => {
    await assert.rejects(() => Sanctions.apply(USERS.admin.id, 'deactivate', USERS.admin), { status: 403, code: 'SELF' });
    await assert.rejects(() => Sanctions.apply(USERS.superAdmin.id, 'ban', USERS.admin, { reason: 'x' }), { status: 403, code: 'PROTECTED' });
    await assert.rejects(() => Sanctions.apply(OTHER_ADMIN.id, 'deactivate', USERS.admin), { status: 403, code: 'PROTECTED' });
    const ok = await Sanctions.apply(OTHER_ADMIN.id, 'deactivate', USERS.superAdmin);
    assert.equal(ok.user.status, 'inactive');
  });

  test('warn / suspend / ban need a reason; suspension length is 1..365 days', async () => {
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'warn', USERS.admin, {}), { status: 400 });
    for (const days of [0, 366, 1.5, 'abc', undefined]) {
      await assert.rejects(() => Sanctions.apply(TARGET.id, 'suspend', USERS.admin, { reason: 'spam', days }), { status: 400 }, String(days));
    }
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'suspend', USERS.admin, { reason: 'spam', until: '2000-01-01' }), { status: 400 });
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'nuke', USERS.admin, { reason: 'x' }), { status: 400 });
  });

  test('suspend: status, history with end date, sessions revoked, sockets closed, user notified', async () => {
    const ws = { disconnectUser: mock.fn(() => 1) };
    const out = await Sanctions.apply(TARGET.id, 'suspend', USERS.admin, { reason: 'Spam links', days: 7, source: 'moderation', reportId: 'r1', wsService: ws });
    assert.equal(out.user.status, 'suspended');
    assert.deepEqual(userUpdates[0], { values: { status: 'suspended' }, where: { id: TARGET.id } });
    assert.equal(sanctions[0].action, 'suspend');
    assert.equal(sanctions[0].source, 'moderation');
    assert.equal(sanctions[0].report_id, 'r1');
    assert.equal(sanctions[0].actor_id, USERS.admin.id);
    const days = (new Date(sanctions[0].ends_at) - Date.now()) / (24 * HOUR);
    assert.ok(days > 6.9 && days <= 7, String(days));
    assert.deepEqual(revoked, [TARGET.id]);
    assert.equal(ws.disconnectUser.mock.callCount(), 1);
    assert.equal(notifications[0].user_id, TARGET.id);
    assert.equal(notifications[0].type, 'account_suspend');
  });

  test('warn records history and notifies, without touching status or sessions', async () => {
    await Sanctions.apply(TARGET.id, 'warn', USERS.admin, { reason: 'Abusive language' });
    assert.equal(userUpdates.length, 0);
    assert.deepEqual(revoked, []);
    assert.equal(sanctions[0].action, 'warn');
    assert.match(notifications[0].message, /Abusive language/);
  });

  test('reactivate restores a deactivated account and closes open sanctions; an active account is a 409', async () => {
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'reactivate', USERS.admin), { status: 409 });
    db.User.findByPk.mock.restore();
    stubUserLookup({ [TARGET.id]: { ...TARGET, status: 'inactive' } });
    const out = await Sanctions.apply(TARGET.id, 'reactivate', USERS.admin);
    assert.equal(out.user.status, 'active');
    assert.equal(db.UserSanction.update.mock.callCount(), 1);
    assert.equal(sanctions[0].action, 'reactivate');
  });

  test('a failed status change leaves no history row behind', async () => {
    db.User.update.mock.restore();
    mock.method(db.User, 'update', async () => { throw new Error('connection lost'); });
    db.UserSanction.create.mock.restore();
    mock.method(db.UserSanction, 'create', async (row) => ({ id: 'sanction-1', ...row }));
    const destroyed = [];
    mock.method(db.UserSanction, 'destroy', async (opts) => { destroyed.push(opts.where); return 1; });
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'deactivate', USERS.admin));
    assert.deepEqual(destroyed, [{ id: 'sanction-1' }]);
    assert.deepEqual(revoked, [], 'no side effects for an action that did not happen');
  });

  test('a database without migration 016 answers 503 instead of a crash', async () => {
    db.User.update.mock.restore();
    mock.method(db.User, 'update', async () => { throw new Error("Data truncated for column 'status' at row 1"); });
    await assert.rejects(() => Sanctions.apply(TARGET.id, 'suspend', USERS.admin, { reason: 'x', days: 1 }), { status: 503, code: 'MIGRATION_PENDING' });
  });
});
