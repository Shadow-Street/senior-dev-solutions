const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// BE-11 review L3: the bank-details rate limit is per signed-in admin, not per
// IP. Its own file because the limiter state lives for the whole process.
const crypto = require('crypto');
const savedKey = process.env.BANK_DATA_KEY;
beforeEach(() => {
  process.env.BANK_DATA_KEY = crypto.randomBytes(32).toString('base64');
  stubUserLookup();
  mock.method(db.PayoutRequest, 'findOne', async () => null); // 404s are enough to be counted
});
afterEach(() => {
  mock.restoreAll();
  if (savedKey === undefined) delete process.env.BANK_DATA_KEY; else process.env.BANK_DATA_KEY = savedKey;
});

test('one admin exhausting their budget does not lock out another admin on the same IP', async () => {
  const id = 'aaaaaaaa-0000-4000-8000-000000000001';
  const hit = (u) => request(app).get(`/api/admin/withdrawals/${id}/bank-details`).set('Authorization', bearer(u));
  let last;
  for (let i = 0; i < 30; i++) last = await hit(USERS.admin);
  assert.equal(last.status, 404, 'within budget');
  assert.equal((await hit(USERS.admin)).status, 429, 'admin one is limited');
  assert.equal((await hit(USERS.superAdmin)).status, 404, 'admin two is unaffected');
});
