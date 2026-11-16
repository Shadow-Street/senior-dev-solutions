const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

afterEach(() => mock.restoreAll());

// The ledger feeds Financials: no generic writes, not even for a super admin.
test('generic writes to /subscriptions/transactions are refused for everyone', async () => {
  stubUserLookup();
  const create = mock.method(db.SubscriptionTransaction, 'create', async () => ({}));
  for (const [method, path] of [['post', '/'], ['put', '/t1'], ['delete', '/t1'], ['post', '/bulk'], ['delete', '/bulk']]) {
    const res = await request(app)[method](`/api/subscriptions/transactions${path}`)
      .set('Authorization', bearer(USERS.superAdmin)).send({ amount: 1, status: 'completed' });
    assert.equal(res.status, 405, `${method} ${path}`);
  }
  assert.equal(create.mock.callCount(), 0);
});
