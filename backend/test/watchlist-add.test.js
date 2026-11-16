const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// Dashboard "Watch" (PPT slide 3) adds through POST /api/watchlists.
let stored;
beforeEach(() => {
  stubUserLookup();
  stored = { id: 'w1', user_id: USERS.user.id, stocks: ['TCS'], is_default: true };
  mock.method(db.Watchlist, 'findOne', async () => ({ ...stored }));
  mock.method(db.Watchlist, 'update', async (values) => { stored = { ...stored, ...values }; return [1]; });
});
afterEach(() => mock.restoreAll());

const add = (body) => request(app).post('/api/watchlists').set('Authorization', bearer(USERS.user)).send(body);

test('adds a symbol once, normalised to upper case', async () => {
  const res = await add({ stock_symbol: ' reliance ' });
  assert.equal(res.status, 200);
  assert.deepEqual(stored.stocks, ['TCS', 'RELIANCE']);
  await add({ symbol: 'RELIANCE' });
  assert.deepEqual(stored.stocks, ['TCS', 'RELIANCE']);
});

test('rejects anything that is not a stock symbol', async () => {
  for (const bad of ['', '   ', { a: 1 }, 'DROP TABLE', '<script>', 'X'.repeat(40)]) {
    const res = await add({ stock_symbol: bad });
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
  assert.deepEqual(stored.stocks, ['TCS']);
});

test('a full watchlist refuses new symbols', async () => {
  stored.stocks = Array.from({ length: 200 }, (_, i) => `S${i}`);
  const res = await add({ stock_symbol: 'INFY' });
  assert.equal(res.status, 409);
});

test('requires sign-in', async () => {
  const res = await request(app).post('/api/watchlists').send({ stock_symbol: 'INFY' });
  assert.equal(res.status, 401);
});
