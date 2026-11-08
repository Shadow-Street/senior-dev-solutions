const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('./helpers');
const { FinDataService } = require('../src/services/FinDataService');

afterEach(() => mock.restoreAll());

test('public stock search routes share a per-IP limit (30 per minute)', async () => {
  mock.method(FinDataService, 'searchStocks', async () => []);
  mock.method(db.Stock, 'findAll', async () => []);
  let last;
  for (let i = 0; i < 31; i++) last = await request(app).get('/api/stocks/search-live').query({ q: 'tcs' });
  assert.equal(last.status, 429);
  assert.deepEqual(Object.keys(last.body), ['error']);
  const other = await request(app).get('/api/stocks/search').query({ q: 'tcs' });
  assert.equal(other.status, 429, 'the second route is covered by the same limiter');
});
