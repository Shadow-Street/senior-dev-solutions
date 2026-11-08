const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, bearer, stubUserLookup, USERS } = require('./helpers');

beforeEach(() => stubUserLookup());
afterEach(() => mock.restoreAll());

test('market-data admin writes are rate limited per admin', async () => {
  let last;
  for (let i = 0; i < 11; i++) {
    last = await request(app).put('/api/admin/market-data/dhan').set('Authorization', bearer(USERS.admin)).send({});
  }
  assert.equal(last.status, 429);
  // A different admin has their own budget.
  const other = await request(app).put('/api/admin/market-data/dhan').set('Authorization', bearer(USERS.superAdmin)).send({});
  assert.equal(other.status, 400);
});
