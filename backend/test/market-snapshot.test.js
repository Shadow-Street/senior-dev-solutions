const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { FinDataService, redisClient } = require('../src/services/FinDataService');
const { DhanProvider, InstrumentMaster } = require('../src/services/DhanProvider');
const {
  MarketSnapshotService, isMarketOpen, msUntilNextOpen, OPEN_INTERVAL_MS, CLOSED_INTERVAL_MS,
} = require('../src/services/MarketSnapshotService');

const jsonRes = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
// IST wall clock -> epoch ms. 2026-11-06 is a Friday.
const ist = (y, mo, d, h, mi, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s) - 5.5 * 3600 * 1000;
const FRI_OPEN = ist(2026, 11, 6, 10, 0);

let savedDhan;
let savedSnapshot;
beforeEach(() => {
  savedDhan = FinDataService.dhan;
  savedSnapshot = FinDataService.snapshot;
  mock.method(redisClient, 'get', async () => null);
  mock.method(redisClient, 'setEx', async () => 'OK');
  for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, () => {});
});
afterEach(() => {
  mock.restoreAll();
  FinDataService.dhan = savedDhan;
  FinDataService.snapshot = savedSnapshot;
});

/** A provider over a synthetic NSE universe of `count` EQ symbols (+ the curated large caps and indices). */
function universeProvider({ count = 2500, quoteIntervalMs = 0, active = true, series = (i) => (i % 10 === 0 ? 'BE' : 'EQ') } = {}) {
  const master = new InstrumentMaster({ cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'snap-')) });
  master.loadedAt = Date.now();
  for (let i = 1; i <= count; i++) {
    master.map.set(`equity:NSE:ZZ${i}`, {
      securityId: String(100000 + i), segment: 'NSE_EQ', instrument: 'EQUITY', name: `Zed Company ${i}`, exchange: 'NSE', series: series(i), fromMaster: true,
    });
  }
  // A bond-like series in the master must never enter the universe.
  master.map.set('equity:NSE:BOND1', { securityId: '999', segment: 'NSE_EQ', instrument: 'EQUITY', name: 'Bond', exchange: 'NSE', series: 'SG', fromMaster: true });
  return new DhanProvider({
    credentials: () => (active ? { clientId: '1', accessToken: 'tok-aaaaaaaaaaaaaaaaaaaa', version: 1 } : null),
    quoteIntervalMs, master,
  });
}

/** Deterministic quote per securityId: price, change and volume vary with the id. */
function quoteFor(id) {
  const price = 100 + (id % 50);
  const net = (id % 9) - 4; // -4..+4
  return { last_price: price, net_change: net, volume: (id % 97) * 10000, ohlc: { open: price, close: price - net, high: price + 1, low: price - 1 } };
}
const respond = (body) => {
  const data = {};
  for (const [segment, ids] of Object.entries(body)) {
    data[segment] = Object.fromEntries(ids.map((id) => [String(id), quoteFor(id)]));
  }
  return jsonRes(200, { status: 'success', data });
};

function stubFetch(handler) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, opts = {}) => {
    const call = { url: String(url), body: opts.body ? JSON.parse(opts.body) : null, at: Date.now() };
    calls.push(call);
    return handler(call, calls.length);
  });
  return calls;
}

function fakeTimers() {
  const t = { calls: [], cleared: [] };
  t.setTimeout = (fn, ms) => { const h = { fn, ms, unref() { h.unrefd = true; } }; t.calls.push(h); return h; };
  t.clearTimeout = (h) => t.cleared.push(h);
  return t;
}

const makeSnapshot = (provider, nowRef = { t: FRI_OPEN }, timers = fakeTimers()) => {
  const svc = new MarketSnapshotService({ getProvider: () => provider, now: () => nowRef.t, timers });
  return { svc, nowRef, timers };
};

// ---- universe + batching ----

test('universe: NSE EQ and BE only (no bonds), plus the five indices', () => {
  const p = universeProvider({ count: 30 });
  const u = p.master.universe();
  const symbols = u.map((x) => x.symbol);
  assert.ok(symbols.includes('ZZ1.NS') && symbols.includes('ZZ10.NS'), 'EQ and BE both in');
  assert.ok(!symbols.includes('BOND1.NS'));
  assert.ok(symbols.includes('RELIANCE.NS'), 'curated large caps stay in');
  for (const idx of ['^NSEI', '^NSEBANK', '^BSESN', '^CNXIT', '^CNXAUTO']) assert.ok(symbols.includes(idx), idx);
  assert.ok(!symbols.some((s) => s.endsWith('.BO')));
});

test('2,500 symbols -> 3 requests of at most 1000, serialised and spaced', async () => {
  const p = universeProvider({ count: 2500, quoteIntervalMs: 60 });
  let inFlight = 0;
  let maxInFlight = 0;
  const calls = stubFetch(async (c) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return respond(c.body);
  });
  const { svc } = makeSnapshot(p);
  assert.equal(await svc.refresh(), true);
  assert.equal(calls.length, 3);
  const sizes = calls.map((c) => Object.values(c.body).flat().length);
  assert.ok(sizes.every((n) => n <= 1000), JSON.stringify(sizes));
  assert.equal(sizes.reduce((a, b) => a + b, 0), svc.universeSize);
  assert.equal(maxInFlight, 1);
  // 60 ms configured; allow scheduler jitter (the timestamp is taken when fetch is called, not when the gate released).
  assert.ok(calls[1].at - calls[0].at >= 40 && calls[2].at - calls[1].at >= 40, 'requests spaced');
  assert.ok(calls.every((c) => c.url.endsWith('/marketfeed/quote')));
  assert.equal(svc.snapshot.quotes.size, svc.universeSize);
});

test('the default quote spacing is 1.1 s', () => {
  const p = new DhanProvider({ credentials: () => null });
  assert.equal(p.quoteGate.minIntervalMs, 1100);
});

// ---- views ----

test('views: gainers, losers, most active, trending, stocks, heatmap and indices', async () => {
  const p = universeProvider({ count: 400 });
  stubFetch((c) => respond(c.body));
  const { svc } = makeSnapshot(p);
  await svc.refresh();
  const v = svc.getViews();

  assert.ok(v.gainers.length > 0 && v.gainers.length <= 10);
  assert.ok(v.gainers.every((s) => s.change_percent > 0));
  assert.deepEqual(v.gainers.map((s) => s.change_percent), [...v.gainers.map((s) => s.change_percent)].sort((a, b) => b - a));
  assert.ok(v.losers.length > 0 && v.losers.every((s) => s.change_percent < 0));
  assert.deepEqual(v.losers.map((s) => s.change_percent), [...v.losers.map((s) => s.change_percent)].sort((a, b) => a - b));
  assert.deepEqual(v.most_active.map((s) => s.volume), [...v.most_active.map((s) => s.volume)].sort((a, b) => b - a));
  assert.equal(v.most_active.length, 20);
  assert.equal(v.stocks.length, 30);
  assert.equal(v.heatmap.length, 60);
  assert.ok(v.trending.length > 0);
  // BE-series symbols are fetched but never ranked.
  const be = new Set(Array.from({ length: 40 }, (_, i) => `ZZ${(i + 1) * 10}.NS`));
  for (const list of [v.gainers, v.losers, v.most_active, v.trending, v.stocks]) {
    assert.ok(list.every((s) => !be.has(s.symbol)), 'BE excluded from rankings');
  }
  assert.ok(svc.snapshot.quotes.has('ZZ10.NS'), 'but present in the snapshot');
  // Existing field names are kept.
  for (const k of ['symbol', 'name', 'current_price', 'change', 'change_percent', 'currency', 'volume']) assert.ok(k in v.gainers[0], k);
  assert.deepEqual(v.indices.map((i) => i.label), ['NIFTY 50', 'BANK NIFTY', 'SENSEX', 'NIFTY IT', 'NIFTY AUTO']);
  assert.equal(v.indices[0].symbol, '^NSEI');
});

// ---- failure handling ----

test('a failed batch keeps the previous values for its symbols; the others are updated', async () => {
  const p = universeProvider({ count: 2500 });
  let round = 1;
  const calls = stubFetch((c, n) => {
    if (round === 2 && n === 5) return jsonRes(500, {});
    const res = respond(c.body);
    return round === 2
      ? res.json().then((j) => {
        for (const seg of Object.values(j.data)) for (const q of Object.values(seg)) q.last_price += 1000;
        return jsonRes(200, j);
      })
      : res;
  });
  const { svc } = makeSnapshot(p);
  await svc.refresh();
  const total = svc.snapshot.quotes.size;
  round = 2;
  await svc.refresh();

  const symbolForId = (id) => [...svc.snapshot.quotes.values()].find((q) => q.symbol.startsWith('ZZ') && 100000 + Number(q.symbol.slice(2, -3)) === id);
  const failedId = Object.values(calls[4].body).flat().find((id) => id > 100000);
  const okId = Object.values(calls[3].body).flat().find((id) => id > 100000);
  assert.equal(symbolForId(failedId).regularMarketPrice, quoteFor(failedId).last_price, 'old value kept for the failed batch');
  assert.equal(symbolForId(okId).regularMarketPrice, quoteFor(okId).last_price + 1000, 'updated elsewhere');
  assert.equal(svc.snapshot.quotes.size, total, 'no symbol lost');
  assert.match(svc.lastError, /could not be refreshed/);
});

test('auth failure: one request only, snapshot untouched, no hammering', async () => {
  const p = universeProvider({ count: 2500 });
  let allow = true;
  const calls = stubFetch((c) => (allow ? respond(c.body) : jsonRes(401, { errorCode: 'DH-901' })));
  const { svc } = makeSnapshot(p);
  await svc.refresh();
  const keep = svc.snapshot;
  calls.length = 0;
  allow = false;
  assert.equal(await svc.refresh(), false);
  assert.equal(calls.length, 1, 'aborted after the first rejected batch');
  assert.equal(svc.snapshot, keep);
  assert.match(svc.lastError, /rejected/);
  // Dhan is now standing down: further ticks make no calls at all.
  await svc.tick();
  await svc.tick();
  assert.equal(calls.length, 1);
});

test('inactive / lapsed provider: no calls, idle re-check', async () => {
  const p = universeProvider({ count: 100, active: false });
  const calls = stubFetch(() => { throw new Error('must not be called'); });
  const { svc } = makeSnapshot(p);
  assert.equal(await svc.refresh(), false);
  await svc.tick();
  assert.equal(calls.length, 0);
  assert.equal(svc.nextDelay(), 60 * 1000);
  assert.equal(svc.getViews(), null);
});

// ---- staleness ----

test('stale handling: flagged after ~2.5 intervals, per-symbol reads fall through', async () => {
  const p = universeProvider({ count: 50 });
  stubFetch((c) => respond(c.body));
  const { svc, nowRef } = makeSnapshot(p);
  await svc.refresh();
  assert.equal(svc.isStale(), false);
  assert.ok(svc.getQuote('ZZ1.NS'));
  nowRef.t += 2 * 60 * 1000;
  assert.equal(svc.isStale(), false);
  nowRef.t += 2 * 60 * 1000; // 4 min old during market hours
  assert.equal(svc.isStale(), true);
  assert.equal(svc.getQuote('ZZ1.NS'), undefined);
  assert.equal(svc.getInfo().stale, true);
  assert.ok(svc.getViews(), 'the last data is still served, flagged stale');
});

// ---- schedule ----

test('market hours: Mon-Fri 09:15 inclusive to 15:30 exclusive IST', () => {
  assert.equal(isMarketOpen(ist(2026, 11, 6, 9, 14, 59)), false);
  assert.equal(isMarketOpen(ist(2026, 11, 6, 9, 15)), true);
  assert.equal(isMarketOpen(ist(2026, 11, 6, 15, 29, 59)), true);
  assert.equal(isMarketOpen(ist(2026, 11, 6, 15, 30)), false);
  assert.equal(isMarketOpen(ist(2026, 11, 7, 11, 0)), false, 'Saturday');
  assert.equal(isMarketOpen(ist(2026, 11, 8, 11, 0)), false, 'Sunday');
  assert.equal(isMarketOpen(ist(2026, 11, 9, 11, 0)), true, 'Monday');
});

test('cadence: 60 s while open, 15 min otherwise, never sleeping past the next open', () => {
  const p = universeProvider({ count: 5 });
  const { svc, nowRef } = makeSnapshot(p);
  assert.equal(svc.intervalFor(FRI_OPEN), OPEN_INTERVAL_MS);
  assert.equal(svc.nextDelay(), OPEN_INTERVAL_MS);
  nowRef.t = ist(2026, 11, 6, 20, 0);
  assert.equal(svc.nextDelay(), CLOSED_INTERVAL_MS);
  nowRef.t = ist(2026, 11, 9, 9, 10); // Monday 09:10 -> open in 5 min
  assert.equal(svc.nextDelay(), 5 * 60 * 1000);
  assert.equal(msUntilNextOpen(ist(2026, 11, 6, 16, 0)), ist(2026, 11, 9, 9, 15) - ist(2026, 11, 6, 16, 0), 'Friday evening -> Monday 09:15');
});

test('isDue: interval, a post-close snapshot, and a fresh one at the next open', async () => {
  const p = universeProvider({ count: 20 });
  stubFetch((c) => respond(c.body));
  const { svc, nowRef } = makeSnapshot(p);
  assert.equal(svc.isDue(), true, 'no snapshot yet');
  await svc.refresh();
  assert.equal(svc.isDue(), false);
  nowRef.t += 30 * 1000;
  assert.equal(svc.isDue(), false);
  nowRef.t += 30 * 1000;
  assert.equal(svc.isDue(), true, '60 s while open');

  await svc.refresh(); // captured while open
  nowRef.t = ist(2026, 11, 6, 15, 30, 5); // seconds after the close
  assert.equal(svc.isDue(), true, 'closing snapshot');
  await svc.refresh();
  assert.equal(svc.isDue(), false);
  nowRef.t += 10 * 60 * 1000;
  assert.equal(svc.isDue(), false, '15 min while closed');
  nowRef.t += 5 * 60 * 1000;
  assert.equal(svc.isDue(), true);

  await svc.refresh();
  nowRef.t = ist(2026, 11, 9, 9, 15, 1); // Monday open
  assert.equal(svc.isDue(), true, 'first snapshot of the new session');
});

test('start() uses one unref-ed injected timer and reschedules; stop() clears it', async () => {
  const p = universeProvider({ count: 20 });
  const calls = stubFetch((c) => respond(c.body));
  const { svc, timers } = makeSnapshot(p);
  svc.start({ initialDelayMs: 10 });
  svc.start();
  assert.equal(timers.calls.length, 1);
  assert.equal(timers.calls[0].unrefd, true);
  await timers.calls[0].fn();
  assert.ok(calls.length >= 1, 'tick refreshed');
  assert.equal(timers.calls.length, 2);
  assert.equal(timers.calls[1].ms, OPEN_INTERVAL_MS);
  svc.stop();
  assert.equal(timers.cleared.length, 1);
});

// ---- HTTP surface ----

test('/stocks/market-data: Dhan active + snapshot -> same shape plus universe size, snapshot time, stale flag; no provider call per request', async () => {
  const p = universeProvider({ count: 300 });
  const calls = stubFetch((c) => respond(c.body));
  const { svc } = makeSnapshot(p, { t: Date.now() });
  await svc.refresh();
  FinDataService.dhan = p;
  FinDataService.snapshot = svc;
  const before = calls.length;

  const res = await request(app).get('/api/stocks/market-data');
  assert.equal(res.status, 200);
  for (const k of ['stocks', 'gainers', 'losers', 'indices', 'meta']) assert.ok(k in res.body, k);
  assert.ok(Array.isArray(res.body.stocks) && res.body.stocks.length > 0);
  assert.equal(res.body.meta.provider, 'DhanProvider');
  assert.equal(res.body.meta.universe_size, svc.universeSize);
  assert.ok(res.body.meta.snapshot_at);
  assert.equal(res.body.meta.stale, false);
  assert.ok(res.body.most_active.length > 0 && res.body.trending.length > 0 && res.body.heatmap.length > 0);
  assert.equal(calls.length, before, 'served from memory');

  const trending = await request(app).get('/api/stocks/trending');
  assert.equal(trending.status, 200);
  assert.deepEqual(trending.body.map((s) => s.symbol), res.body.trending.map((s) => s.symbol));
  assert.equal(calls.length, before);
});

test('/stocks/market-data when Dhan is inactive: exactly the legacy MARKET_SYMBOLS path', async () => {
  FinDataService.dhan = universeProvider({ count: 5, active: false });
  const bulk = mock.method(FinDataService, 'getBulkQuotes', async (symbols) => Object.fromEntries(symbols.map((s) => [s, { symbol: s, name: s, current_price: 10, change: 1, change_percent: 2 }])));
  const res = await request(app).get('/api/stocks/market-data');
  assert.equal(res.status, 200);
  assert.ok(bulk.mock.callCount() >= 1, 'legacy providers asked');
  assert.ok('stocks' in res.body && 'meta' in res.body);
  assert.equal(res.body.meta.universe_size, undefined);
  assert.notEqual(res.body.meta.provider, 'DhanProvider');
});

test('a lapsed provider falls back to the legacy path even though an old snapshot exists', async () => {
  const p = universeProvider({ count: 50 });
  stubFetch((c) => respond(c.body));
  const { svc } = makeSnapshot(p, { t: Date.now() });
  await svc.refresh();
  let active = true;
  const lapsing = new DhanProvider({ credentials: () => (active ? { clientId: '1', accessToken: 'tok-aaaaaaaaaaaaaaaaaaaa', version: 1 } : null), master: p.master });
  FinDataService.dhan = lapsing;
  FinDataService.snapshot = svc;
  active = false;
  const bulk = mock.method(FinDataService, 'getBulkQuotes', async () => ({}));
  const res = await request(app).get('/api/stocks/market-data');
  assert.equal(res.status, 200);
  assert.equal(bulk.mock.callCount() >= 1, true);
  assert.notEqual(res.body.meta.provider, 'DhanProvider');
});

test('per-symbol price comes from the snapshot when fresh (no Dhan call), for any NSE symbol', async () => {
  const p = universeProvider({ count: 100 });
  const calls = stubFetch((c) => respond(c.body));
  const { svc } = makeSnapshot(p, { t: Date.now() });
  await svc.refresh();
  FinDataService.dhan = p;
  FinDataService.snapshot = svc;
  const before = calls.length;
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'create', async (v) => v);
  const res = await request(app).get('/api/stocks/ZZ42.NS/price');
  assert.equal(res.status, 200);
  assert.equal(res.body.symbol, 'ZZ42.NS');
  assert.equal(res.body.current_price, quoteFor(100042).last_price);
  assert.equal(res.body.currency, 'INR');
  assert.equal(calls.length, before);
});

test('search-live searches the whole instrument master by symbol and name when Dhan is active', async () => {
  const p = universeProvider({ count: 20, active: true });
  p.master.map.set('equity:NSE:INFY', { securityId: '1594', segment: 'NSE_EQ', instrument: 'EQUITY', name: 'Infosys', exchange: 'NSE', series: 'EQ', fromMaster: true });
  p.master.map.set('equity:BSE:INFY', { securityId: '500209', segment: 'BSE_EQ', instrument: 'EQUITY', name: 'Infosys', exchange: 'BSE', series: 'A', fromMaster: true });
  p.master.map.set('equity:NSE:ZZZ99', { securityId: '4', segment: 'NSE_EQ', instrument: 'EQUITY', name: 'Zed Zed Infotech', exchange: 'NSE', series: 'EQ', fromMaster: true });
  p.master.map.set('equity:NSE:BONDX', { securityId: '5', segment: 'NSE_EQ', instrument: 'EQUITY', name: 'Infosys Bond', exchange: 'NSE', series: 'SG', fromMaster: true });
  FinDataService.dhan = p;

  let res = await request(app).get('/api/stocks/search-live').query({ q: 'infy' });
  assert.equal(res.status, 200);
  assert.equal(res.body[0].symbol, 'INFY.NS', 'exact symbol, NSE first');
  assert.ok(res.body.some((r) => r.symbol === 'INFY.BO'));
  assert.ok(!res.body.some((r) => r.symbol === 'BONDX.NS'), 'bond series not searchable');

  res = await request(app).get('/api/stocks/search-live').query({ q: 'tata consultancy' });
  assert.equal(res.body[0].symbol, 'TCS.NS', 'by company name (curated)');
  res = await request(app).get('/api/stocks/search-live').query({ q: 'nifty' });
  assert.ok(res.body.some((r) => r.symbol === '^NSEI' && r.type === 'INDEX'));
  assert.deepEqual(Object.keys(res.body[0]).sort(), ['exchange', 'name', 'symbol', 'type']);

  const long = await request(app).get('/api/stocks/search-live').query({ q: 'x'.repeat(500) });
  assert.equal(long.status, 400, 'over-long queries are refused before any search');
});

test('search-live with Dhan inactive keeps using the existing DB/provider search', async () => {
  FinDataService.dhan = universeProvider({ count: 5, active: false });
  const found = [{ symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ', type: 'EQUITY' }];
  mock.method(db.Stock, 'findAll', async () => found.map((f) => ({ ...f })));
  const res = await request(app).get('/api/stocks/search-live').query({ q: 'aapl' });
  assert.equal(res.status, 200);
  assert.equal(res.body[0].symbol, 'AAPL');
});
