const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, USERS, bearer, stubUserLookup } = require('./helpers');
const Marketaux = require('../src/services/MarketauxService');

const KEY = 'mx-secret-key-12345';
const AUTH = bearer(USERS.user);
const authedGet = (path) => request(app).get(path).set('Authorization', AUTH);
const anonGet = (path) => request(app).get(path);

const article = (over = {}) => ({
  uuid: 'u-1',
  title: 'Reliance posts record profit',
  description: 'Strong quarter',
  snippet: 'snippet text',
  url: 'https://example.com/a',
  image_url: 'https://example.com/a.jpg',
  language: 'en',
  published_at: '2026-11-01T10:00:00.000000Z',
  source: 'example.com',
  entities: [{ symbol: 'RELIANCE.NS', name: 'Reliance', exchange: 'NSE', industry: 'Energy', match_score: 9, sentiment_score: 0.6, highlights: [{ highlight: '<em>x</em>' }] }],
  ...over,
});

function stubFetch(handler) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, opts) => {
    calls.push({ url: new URL(String(url)), opts });
    return handler(calls.length, url);
  });
  return calls;
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (data = [article()], meta = {}) => json(200, { meta: { found: 100, returned: data.length, limit: 12, page: 1, ...meta }, data });

beforeEach(() => {
  stubUserLookup();
  Marketaux._resetForTests();
  delete process.env.MARKETAUX_DAILY_BUDGET;
  delete process.env.MARKETAUX_BURST_PER_MINUTE;
  process.env.MARKETAUX_API_KEY = KEY;
  delete process.env.MARKETAUX_MAX_LIMIT;
  delete process.env.MARKETAUX_CACHE_TTL_SECONDS;
});
afterEach(() => {
  mock.restoreAll();
  process.env.MARKETAUX_API_KEY = '';
});

test('without MARKETAUX_API_KEY the feed answers 200 { configured:false } and calls nothing', async () => {
  process.env.MARKETAUX_API_KEY = '';
  const calls = stubFetch(() => ok());
  const res = await authedGet('/api/news/feed');
  assert.equal(res.status, 200);
  assert.equal(res.body.configured, false);
  assert.deepEqual(res.body.articles, []);
  assert.equal(calls.length, 0);
});

test('maps query parameters to Marketaux with Indian defaults', async () => {
  const calls = stubFetch(() => ok());
  const res = await authedGet('/api/news/feed')
    .query({ q: 'rate cut', symbols: 'reliance.ns,tcs.ns', industries: 'Technology', sentiment: 'positive', range: '7d', limit: 5, page: 2 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(calls.length, 1);
  const p = calls[0].url.searchParams;
  assert.equal(calls[0].url.origin + calls[0].url.pathname, 'https://api.marketaux.com/v1/news/all');
  assert.equal(p.get('countries'), 'in');
  assert.equal(p.get('language'), 'en');
  assert.equal(p.get('filter_entities'), 'true');
  assert.equal(p.get('search'), 'rate cut');
  assert.equal(p.get('symbols'), 'RELIANCE.NS,TCS.NS');
  assert.equal(p.get('industries'), 'Technology');
  assert.equal(p.get('sentiment_gte'), '0.1');
  assert.match(p.get('published_after'), /^\d{4}-\d{2}-\d{2}T\d{2}$/);
  assert.equal(p.get('limit'), '5');
  assert.equal(p.get('page'), '2');
  assert.equal(p.get('api_token'), KEY);
});

test('bounds: limit is clamped, bad input is a 400, upstream is not called', async () => {
  const calls = stubFetch(() => ok());
  await authedGet('/api/news/feed').query({ limit: 9999 });
  assert.equal(calls[0].url.searchParams.get('limit'), '50');

  process.env.MARKETAUX_MAX_LIMIT = '3';
  await authedGet('/api/news/feed').query({ limit: 40 });
  assert.equal(calls[1].url.searchParams.get('limit'), '3');

  const before = calls.length;
  for (const query of [
    { page: 0 },
    { page: 'abc' },
    { limit: 0 },
    { q: 'x'.repeat(101) },
    { symbols: 'AAA,BBB;DROP' },
    { symbols: Array.from({ length: 11 }, (_, i) => `S${i}`).join(',') },
    { sentiment: 'bullish' },
    { range: '10y' },
    { industries: 'tech<script>' },
  ]) {
    const res = await authedGet('/api/news/feed').query(query);
    assert.equal(res.status, 400, JSON.stringify(query));
    assert.ok(res.body.error);
  }
  assert.equal(calls.length, before);
});

test('page is capped at 100', async () => {
  const calls = stubFetch(() => ok());
  await authedGet('/api/news/feed').query({ page: 5000 });
  assert.equal(calls[0].url.searchParams.get('page'), '100');
});

test('identical queries are served from cache; a different query refetches', async () => {
  const calls = stubFetch(() => ok());
  const a = await authedGet('/api/news/feed').query({ q: 'nifty' });
  const b = await authedGet('/api/news/feed').query({ q: 'nifty' });
  assert.equal(calls.length, 1);
  assert.equal(a.body.meta.cached, false);
  assert.equal(b.body.meta.cached, true);
  await authedGet('/api/news/feed').query({ q: 'sensex' });
  assert.equal(calls.length, 2);
});

test('concurrent identical queries share one upstream request', async () => {
  const calls = stubFetch(async () => { await new Promise(r => setTimeout(r, 30)); return ok(); });
  await Promise.all([1, 2, 3].map(() => authedGet('/api/news/feed').query({ q: 'bank' })));
  assert.equal(calls.length, 1);
});

test('articles are sanitised: only http(s) links, no highlights, no raw upstream fields', async () => {
  stubFetch(() => ok([
    article(),
    article({ uuid: 'u-2', title: 'bad link', url: 'javascript:alert(1)' }),
    article({ uuid: 'u-3', title: 'bad image', image_url: 'data:text/html,x' }),
    article({ uuid: 'u-4', title: '' }),
  ]));
  const res = await authedGet('/api/news/feed');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.articles.map(a => a.id), ['u-1', 'u-3']);
  assert.equal(res.body.articles[1].image_url, null);
  const first = res.body.articles[0];
  assert.equal(first.sentiment, 'positive');
  assert.equal(first.entities[0].symbol, 'RELIANCE.NS');
  assert.equal(first.entities[0].highlights, undefined);
  assert.equal(first.keywords, undefined);
  assert.ok(!JSON.stringify(res.body).includes('<em>'));
});

test('upstream failure is generic, never leaks the key, and is not logged with it', async () => {
  const logs = [];
  for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, (...a) => logs.push(a.join(' ')));
  stubFetch(() => json(500, { error: { message: `boom ${KEY}` } }));
  const res = await authedGet('/api/news/feed').query({ q: 'fail' });
  assert.equal(res.status, 502);
  assert.deepEqual(Object.keys(res.body).sort(), ['code', 'error']);
  assert.ok(!JSON.stringify(res.body).includes(KEY));
  assert.ok(logs.some(l => l.includes('[Marketaux]')));
  assert.ok(!logs.join('\n').includes(KEY));
});

test('network errors and quota exhaustion map to 502 / 503', async () => {
  stubFetch(() => { throw new TypeError(`fetch failed https://api.marketaux.com/?api_token=${KEY}`); });
  let res = await authedGet('/api/news/feed').query({ q: 'net' });
  assert.equal(res.status, 502);
  assert.ok(!JSON.stringify(res.body).includes(KEY));

  mock.restoreAll();
  stubUserLookup();
  stubFetch(() => json(402, { error: { code: 'usage_limit_reached' } }));
  res = await authedGet('/api/news/feed').query({ q: 'quota' });
  assert.equal(res.status, 503);
});

test('an expired entry is served stale when the provider fails', async () => {
  process.env.MARKETAUX_CACHE_TTL_SECONDS = '0';
  let n = 0;
  stubFetch(() => (++n === 1 ? ok() : json(429, {})));
  const first = await authedGet('/api/news/feed').query({ q: 'stale' });
  assert.equal(first.status, 200);
  const second = await authedGet('/api/news/feed').query({ q: 'stale' });
  assert.equal(second.status, 200);
  assert.equal(second.body.meta.stale, true);
  assert.equal(second.body.articles.length, 1);
});

test('has_more reflects the upstream paging meta', async () => {
  stubFetch(() => ok([article()], { found: 50, returned: 12, limit: 12, page: 1 }));
  const res = await authedGet('/api/news/feed');
  assert.equal(res.body.meta.has_more, true);
  assert.equal(res.body.meta.found, 50);
});

test('/news/latest returns the flat array shape the dashboard reads when configured', async () => {
  stubFetch(() => ok());
  const res = await authedGet('/api/news/latest').query({ limit: 4, category: 'business' });
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-news-source'], 'marketaux');
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body[0].title, 'Reliance posts record profit');
  assert.equal(res.body[0].summary, 'Strong quarter');
  assert.equal(res.body[0].image_url, 'https://example.com/a.jpg');
  assert.ok(res.body[0].published_at);
});

test('/news/stock/:symbol queries Marketaux by symbol and validates it', async () => {
  const calls = stubFetch(() => ok());
  const res = await authedGet('/api/news/stock/reliance');
  assert.equal(res.status, 200);
  assert.equal(calls[0].url.searchParams.get('symbols'), 'RELIANCE.NS');
  const bad = await authedGet('/api/news/stock/' + encodeURIComponent('A;B'));
  assert.equal(bad.status, 400);
});

// ---- upstream budget ----

test('daily budget: upstream calls stop once spent; cached pages still serve; new queries get 503', async () => {
  process.env.MARKETAUX_DAILY_BUDGET = '2';
  process.env.MARKETAUX_BURST_PER_MINUTE = '100';
  const calls = stubFetch(() => ok());
  assert.equal((await authedGet('/api/news/feed').query({ q: 'a1' })).status, 200);
  assert.equal((await authedGet('/api/news/feed').query({ q: 'a2' })).status, 200);
  assert.equal(calls.length, 2);

  const spent = await authedGet('/api/news/feed').query({ q: 'a3' });
  assert.equal(spent.status, 503);
  assert.equal(spent.body.code, 'news_unavailable');
  assert.equal(calls.length, 2, 'no third upstream request');

  const cached = await authedGet('/api/news/feed').query({ q: 'a1' });
  assert.equal(cached.status, 200);
  assert.equal(calls.length, 2);
});

test('daily budget: an expired entry is served stale once the budget is spent', async () => {
  process.env.MARKETAUX_DAILY_BUDGET = '1';
  process.env.MARKETAUX_CACHE_TTL_SECONDS = '0';
  const calls = stubFetch(() => ok());
  await authedGet('/api/news/feed').query({ q: 'keep' });
  const again = await authedGet('/api/news/feed').query({ q: 'keep' });
  assert.equal(again.status, 200);
  assert.equal(again.body.meta.stale, true);
  assert.equal(calls.length, 1);
});

test('burst cap: too many upstream calls within a minute are refused', async () => {
  process.env.MARKETAUX_BURST_PER_MINUTE = '2';
  const calls = stubFetch(() => ok());
  await authedGet('/api/news/feed').query({ q: 'b1' });
  await authedGet('/api/news/feed').query({ q: 'b2' });
  const res = await authedGet('/api/news/feed').query({ q: 'b3' });
  assert.equal(res.status, 503);
  assert.equal(calls.length, 2);
});

test('a 402 from the provider blocks further upstream calls for the day', async () => {
  const calls = stubFetch(() => json(402, {}));
  assert.equal((await authedGet('/api/news/feed').query({ q: 'z1' })).status, 503);
  assert.equal((await authedGet('/api/news/feed').query({ q: 'z2' })).status, 503);
  assert.equal(calls.length, 1);
});

test('concurrent identical queries spend the budget once', async () => {
  process.env.MARKETAUX_DAILY_BUDGET = '1';
  const calls = stubFetch(async () => { await new Promise(r => setTimeout(r, 20)); return ok(); });
  const results = await Promise.all([1, 2, 3].map(() => authedGet('/api/news/feed').query({ q: 'same' })));
  assert.deepEqual(results.map(r => r.status), [200, 200, 200]);
  assert.equal(calls.length, 1);
});

// ---- anonymous restriction ----

test('anonymous: default first page is allowed and shares one canonical cache entry', async () => {
  const calls = stubFetch(() => ok());
  const a = await anonGet('/api/news/feed');
  const b = await anonGet('/api/news/feed').query({ limit: 7 });
  const c = await anonGet('/api/news/feed').query({ sentiment: 'positive' });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(c.status, 200);
  assert.equal(calls[0].url.searchParams.get('limit'), '12');
  assert.equal(calls.length, 2, 'limit is ignored for anonymous callers; sentiment is an enumerated filter');
});

test('anonymous: free-text search, page > 1, symbols and industries never reach the provider', async () => {
  const calls = stubFetch(() => ok());
  for (const query of [{ q: 'nifty' }, { page: 2 }, { symbols: 'TCS.NS' }, { industries: 'Energy' }]) {
    const res = await anonGet('/api/news/feed').query(query);
    assert.equal(res.status, 401, JSON.stringify(query));
    assert.equal(res.body.code, 'login_required');
  }
  assert.equal(calls.length, 0);
});

test('anonymous: a result already cached by a signed-in user is served', async () => {
  const calls = stubFetch(() => ok());
  await authedGet('/api/news/feed').query({ q: 'shared' });
  const res = await anonGet('/api/news/feed').query({ q: 'shared' });
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.cached, true);
  assert.equal(calls.length, 1);
});

test('anonymous: /news/latest keeps working with one canonical upstream request regardless of limit', async () => {
  const calls = stubFetch(() => ok());
  const r1 = await anonGet('/api/news/latest').query({ limit: 4, category: 'business' });
  const r2 = await anonGet('/api/news/latest').query({ limit: 9 });
  assert.equal(r1.status, 200);
  assert.ok(Array.isArray(r1.body));
  assert.equal(r2.status, 200);
  assert.equal(calls.length, 1);
  assert.ok(r1.body.length <= 4);
});

test('anonymous: /news/stock/:symbol needs a session unless cached', async () => {
  const calls = stubFetch(() => ok());
  const anon = await anonGet('/api/news/stock/tcs');
  assert.equal(anon.status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await authedGet('/api/news/stock/tcs')).status, 200);
  assert.equal((await anonGet('/api/news/stock/tcs')).status, 200);
  assert.equal(calls.length, 1);
});
