const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('./helpers');
const { FinDataService } = require('../src/services/FinDataService');
const { parseSearchQuery } = require('../src/utils/searchQuery');

let savedDhan;
beforeEach(() => {
  savedDhan = FinDataService.dhan;
  FinDataService.searchCache.clear();
});
afterEach(() => {
  mock.restoreAll();
  FinDataService.dhan = savedDhan;
});

test('parseSearchQuery: 1-50 chars of letters, digits, space, & . - only', () => {
  for (const ok of ['t', 'TCS', 'TCS.NS', 'M&M', 'BAJAJ-AUTO', 'tata consultancy', ' trimmed ', 'a'.repeat(50)]) {
    assert.equal(typeof parseSearchQuery(ok), 'string', ok);
  }
  assert.equal(parseSearchQuery(' trimmed '), 'trimmed');
  for (const bad of [undefined, null, '', '   ', 'a'.repeat(51), '%', '_', 'a%b', "a';--", '<script>', 'a/b', ['a', 'b'], { a: 1 }, 5]) {
    assert.equal(parseSearchQuery(bad), null, JSON.stringify(bad));
  }
});

test('/stocks/search-live and /stocks/search reject bad q with 400 and query nothing', async () => {
  const dbSearch = mock.method(db.Stock, 'findAll', async () => []);
  const live = mock.method(FinDataService, 'searchStocks', async () => []);
  const bad = ['', '%', 'a'.repeat(51), "x';DROP", 'a_b'];
  for (const path of ['/api/stocks/search-live', '/api/stocks/search']) {
    const missing = await request(app).get(path);
    assert.equal(missing.status, 400, `${path} without q`);
    for (const q of bad) {
      const res = await request(app).get(path).query({ q });
      assert.equal(res.status, 400, `${path} q=${q}`);
      assert.ok(res.body.error);
    }
    const repeated = await request(app).get(`${path}?q=a&q=b`);
    assert.equal(repeated.status, 400, `${path} repeated q`);
  }
  assert.equal(dbSearch.mock.callCount(), 0);
  assert.equal(live.mock.callCount(), 0);
});

test('valid queries pass through (and /search no longer searches for "undefined")', async () => {
  const dbSearch = mock.method(db.Stock, 'findAll', async () => [{ symbol: 'TCS.NS' }]);
  let res = await request(app).get('/api/stocks/search').query({ q: 'M&M' });
  assert.equal(res.status, 200);
  const pattern = require('node:util').inspect(dbSearch.mock.calls[0].arguments[0].where, { depth: 8 });
  assert.ok(pattern.includes('%M&M%'));
  assert.ok(!pattern.includes('undefined'));

  const live = mock.method(FinDataService, 'searchStocks', async (q) => [{ symbol: q }]);
  res = await request(app).get('/api/stocks/search-live').query({ q: 'tata consultancy' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [{ symbol: 'tata consultancy' }]);
  assert.equal(live.mock.callCount(), 1);
});

test('searching never writes to the stocks table; repeat queries come from a bounded in-memory cache', async () => {
  FinDataService.dhan = null;
  mock.method(db.Stock, 'findAll', async () => []);
  const writes = [
    mock.method(db.Stock, 'findOrCreate', async () => [{}, true]),
    mock.method(db.Stock, 'create', async () => ({})),
    mock.method(db.Stock, 'bulkCreate', async () => []),
    mock.method(db.Stock, 'upsert', async () => []),
  ];
  const search = mock.method(FinDataService.activeProvider, 'search', async () => [
    { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ', type: 'EQUITY' },
  ]);
  const first = await request(app).get('/api/stocks/search-live').query({ q: 'apple' });
  const second = await request(app).get('/api/stocks/search-live').query({ q: 'APPLE' });
  assert.equal(first.status, 200);
  assert.equal(first.body[0].symbol, 'AAPL');
  assert.deepEqual(second.body, first.body);
  assert.equal(search.mock.callCount(), 1, 'second call served from the cache');
  for (const w of writes) assert.equal(w.mock.callCount(), 0);

  for (let i = 0; i < FinDataService.SEARCH_CACHE_MAX + 25; i++) FinDataService.rememberSearch(`q${i}`, [{ symbol: 'X' }]);
  assert.ok(FinDataService.searchCache.size <= FinDataService.SEARCH_CACHE_MAX);
});
