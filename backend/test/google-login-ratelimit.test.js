const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const { app } = require('./helpers');

// /api/auth/google shares the auth limiter (20 failed attempts per 15 minutes
// per IP; successes are not counted). Separate file = separate process =
// fresh counters.
afterEach(() => mock.restoreAll());

test('repeated failed Google sign-ins are throttled with 429', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => { throw new Error('invalid'); });
  const statuses = [];
  for (let i = 0; i < 21; i += 1) {
    statuses.push((await request(app).post('/api/auth/google').send({ token: `forged-${i}` })).status);
  }
  assert.deepEqual(statuses.slice(0, 20), Array(20).fill(401));
  assert.equal(statuses[20], 429);
});
