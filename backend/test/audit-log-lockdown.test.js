const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// SEC-28: audit entries hold admin IPs and payment/refund ids. Staff-only to
// read, append-only, and attributed to the caller.
let created;
beforeEach(() => {
  stubUserLookup();
  created = [];
  mock.method(db.AuditLog, 'findAll', async () => [{ id: 'a1', action: 'refund.started' }]);
  mock.method(db.AuditLog, 'create', async (row) => { created.push(row); return row; });
  mock.method(db.AuditLog, 'update', async () => [1]);
  mock.method(db.AuditLog, 'destroy', async () => 1);
});
afterEach(() => mock.restoreAll());

const as = (u) => (r) => r.set('Authorization', bearer(u));

test('members can neither read nor write audit entries', async () => {
  for (const path of ['/api/audit/logs/user/' + USERS.admin.id, '/api/audit/logs/entity/user/' + USERS.admin.id, '/api/audit/logs']) {
    assert.equal((await as(USERS.user)(request(app).get(path))).status, 403, path);
  }
  assert.equal((await as(USERS.user)(request(app).post('/api/audit/logs/log')).send({ action: 'x' })).status, 403);
  assert.equal(created.length, 0);
});

test('entries are attributed to the caller, whatever the body claims', async () => {
  const res = await as(USERS.admin)(request(app).post('/api/audit/logs'))
    .send({ action: 'USER_INVITED', user_id: USERS.superAdmin.id, admin_id: 'forged', details: 'Invited x', ip_address: '1.1.1.1' });
  assert.equal(res.status, 201);
  assert.equal(created[0].user_id, USERS.admin.id);
  assert.equal(created[0].description, 'Invited x');
  assert.notEqual(created[0].ip_address, '1.1.1.1');
});

test('nobody can edit or delete an entry, not even a super admin', async () => {
  for (const [method, path] of [['put', '/api/audit/logs/a1'], ['delete', '/api/audit/logs/a1'], ['delete', '/api/audit/logs/bulk'], ['put', '/api/audit/logs/bulk']]) {
    const res = await as(USERS.superAdmin)(request(app)[method](path)).send({ action: 'tampered' });
    assert.equal(res.status, 405, `${method} ${path}`);
  }
  assert.equal(db.AuditLog.update.mock.callCount(), 0);
  assert.equal(db.AuditLog.destroy.mock.callCount(), 0);
});
