const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers');

afterEach(() => mock.restoreAll());

test('news endpoints are rate limited per IP', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('no network in tests'); });
  let last;
  for (let i = 0; i < 61; i++) last = await request(app).get('/api/news/feed');
  assert.equal(last.status, 429);
  assert.deepEqual(Object.keys(last.body), ['error']);
});
