const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { db } = require('./helpers');
const { FinDataService, redisClient } = require('../src/services/FinDataService');
const { DhanProvider, InstrumentMaster, RateGate, parseSymbol, isIndianSymbol } = require('../src/services/DhanProvider');

const CLIENT_ID = '1000000001';
const TOKEN = 'dhan-secret-token-abc';

const HEADER = 'SEM_EXM_EXCH_ID,SEM_SEGMENT,SEM_SMST_SECURITY_ID,SEM_INSTRUMENT_NAME,SEM_EXPIRY_CODE,SEM_TRADING_SYMBOL,SEM_LOT_UNITS,SEM_CUSTOM_SYMBOL,SEM_EXPIRY_DATE,SEM_STRIKE_PRICE,SEM_OPTION_TYPE,SEM_TICK_SIZE,SEM_EXPIRY_FLAG,SEM_EXCH_INSTRUMENT_TYPE,SEM_SERIES,SM_SYMBOL_NAME';
const MASTER_CSV = [
  HEADER,
  'NSE,E,7777,EQUITY,0,ACME,1.0,Acme Ltd,,,,10.0000,NA,ES,BE,ACME LTD',
  'NSE,E,8888,EQUITY,0,ACME,1.0,Acme Ltd,,,,10.0000,NA,ES,EQ,ACME LTD',
  'BSE,E,500001,EQUITY,0,ACME,1.0,Acme Ltd,,,,5.0000,NA,ES,A,ACME LTD',
  'NSE,E,2885,EQUITY,0,RELIANCE,1.0,Reliance Industries Ltd,,,,10.0000,NA,ES,EQ,RELIANCE',
  'NSE,I,13,INDEX,0,NIFTY,1.0,Nifty 50,0001-01-01,,XX,0.0500,,INDEX,X,NIFTY',
  'NSE,D,49081,OPTIDX,0,NIFTY-Nov2026-25000-CE,75.0,x,2026-11-27,25000,CE,0.05,M,OP,,NIFTY',
  'MCX,M,1,FUTCOM,0,GOLD,1.0,x,2026-11-27,,XX,1,M,FUT,,GOLD',
].join('\n');

const jsonRes = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dhan-test-'));

/** A provider with tiny rate-limit gaps and a master that never hits the network. */
function makeProvider(opts = {}) {
  const master = new InstrumentMaster({ cacheDir: tmpDir() });
  master.loadedAt = Date.now(); // treat curated seed as loaded
  return new DhanProvider({ clientId: CLIENT_ID, accessToken: TOKEN, quoteIntervalMs: 0, dataIntervalMs: 0, master, ...opts });
}

function stubFetch(handler) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, opts = {}) => {
    const call = { url: String(url), opts, body: opts.body ? JSON.parse(opts.body) : null, at: Date.now() };
    calls.push(call);
    return handler(call, calls.length);
  });
  return calls;
}

const quoteBody = (data) => ({ status: 'success', data });
const NOW_Q = { last_price: 110, net_change: 10, volume: 5000, ohlc: { open: 101, close: 100, high: 112, low: 99 } };

let savedDhan;
beforeEach(() => {
  savedDhan = FinDataService.dhan;
  // Keep the suite hermetic even if a Redis happens to be listening locally.
  mock.method(redisClient, 'get', async () => null);
  mock.method(redisClient, 'setEx', async () => 'OK');
});
afterEach(() => { mock.restoreAll(); FinDataService.dhan = savedDhan; });

// ---- enablement ----

test('Dhan is inactive without stored credentials, whatever the environment says', () => {
  // The provider reads credentials from the encrypted store, not from env vars.
  process.env.DHAN_CLIENT_ID = CLIENT_ID;
  process.env.DHAN_ACCESS_TOKEN = TOKEN;
  try {
    assert.ok(FinDataService.dhan instanceof DhanProvider);
    assert.equal(FinDataService.dhan.isActive(), false);
    assert.equal(FinDataService.dhan.canServe('TCS.NS'), false);
    assert.equal(FinDataService.dhanActive, false);
  } finally {
    process.env.DHAN_CLIENT_ID = '';
    process.env.DHAN_ACCESS_TOKEN = '';
  }
});

test('a provider whose credential source returns null never calls Dhan', async () => {
  const p = new DhanProvider({ credentials: () => null, quoteIntervalMs: 0, master: makeProvider().master });
  const calls = stubFetch(() => { throw new Error('should not be called'); });
  assert.equal(p.canServe('TCS.NS'), false);
  await assert.rejects(p.getBulkQuotes(['TCS.NS']), /Dhan auth failed/);
  assert.equal(calls.length, 0);
});

test('a new credential version lifts an earlier stand-down', async () => {
  let creds = { clientId: CLIENT_ID, accessToken: 'old-token-aaaaaaaaaaaaaaaa', version: 1 };
  const p = new DhanProvider({ credentials: () => creds, quoteIntervalMs: 0, master: makeProvider().master });
  mock.method(console, 'error', () => {});
  stubFetch(() => jsonRes(401, {}));
  await assert.rejects(p.getBulkQuotes(['TCS.NS']), /Dhan auth failed/);
  assert.equal(p.canServe('TCS.NS'), false);
  creds = { clientId: CLIENT_ID, accessToken: 'new-token-bbbbbbbbbbbbbbbb', version: 2 };
  assert.equal(p.canServe('TCS.NS'), true);
});

test('only Indian symbols are served by Dhan', () => {
  const p = makeProvider();
  for (const s of ['TCS.NS', 'tcs.bo', '^NSEI', '^BSESN', 'M&M.NS']) assert.equal(p.canServe(s), true, s);
  for (const s of ['AAPL', 'TCS', 'SPY', 'BRK-B', '', null]) assert.equal(p.canServe(s), false, String(s));
  assert.equal(isIndianSymbol('INFY.NS'), true);
  assert.deepEqual(parseSymbol('INFY.BO'), { exchange: 'BSE', key: 'INFY', kind: 'equity' });
});

// ---- symbol -> securityId ----

test('curated map resolves large caps without any download', async () => {
  const p = makeProvider();
  const fetchCalls = stubFetch(() => { throw new Error('should not be called'); });
  const r = await p.master.resolve('TCS.NS');
  assert.equal(r.securityId, '11536');
  assert.equal(r.segment, 'NSE_EQ');
  assert.equal((await p.master.resolve('^NSEI')).segment, 'IDX_I');
  assert.equal((await p.master.resolve('^BSESN')).securityId, '51');
  assert.equal(await p.master.resolve('AAPL'), null);
  assert.equal(fetchCalls.length, 0);
});

test('instrument master: downloads once, keeps cash equities + indices, prefers EQ series, caches to disk', async () => {
  const dir = tmpDir();
  const calls = stubFetch(() => new Response(MASTER_CSV));
  const m = new InstrumentMaster({ cacheDir: dir });

  const acme = await m.resolve('ACME.NS');
  assert.equal(acme.securityId, '8888', 'EQ series wins over BE');
  assert.equal(acme.segment, 'NSE_EQ');
  assert.equal((await m.resolve('ACME.BO')).securityId, '500001');
  assert.equal((await m.resolve('ACME.BO')).segment, 'BSE_EQ');
  assert.equal((await m.resolve('RELIANCE.NS')).name, 'Reliance Industries Ltd', 'master overrides curated seed');
  assert.equal((await m.resolve('^NSEI')).securityId, '13');
  assert.equal(await m.resolve('GOLD.NS'), null, 'commodities/derivatives are not loaded');
  assert.equal(calls.length, 1, 'second resolve does not re-download');

  // Persisted file is picked up by a fresh instance without a download.
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(fs.existsSync(path.join(dir, 'instrument-master.json')));
  const m2 = new InstrumentMaster({ cacheDir: dir });
  assert.equal((await m2.resolve('ACME.NS')).securityId, '8888');
  assert.equal(calls.length, 1);
});

test('instrument master: failed download falls back to curated symbols and does not hammer', async () => {
  const calls = stubFetch(() => new Response('nope', { status: 503 }));
  const m = new InstrumentMaster({ cacheDir: tmpDir() });
  assert.equal((await m.resolve('INFY.NS')).securityId, '1594');
  assert.equal(await m.resolve('ACME.NS'), null);
  assert.equal(calls.length, 1, 'retry is deferred, not per request');
});

// ---- quotes ----

test('getBulkQuotes sends auth headers, batches into ONE request and maps the Yahoo shape', async () => {
  const p = makeProvider();
  const calls = stubFetch(() => jsonRes(200, quoteBody({
    NSE_EQ: { 11536: NOW_Q, 2885: { ...NOW_Q, last_price: 55, net_change: -5, ohlc: { open: 60, close: 60, high: 61, low: 54 } } },
    IDX_I: { 13: { last_price: 25000, net_change: 100, ohlc: { open: 24900, close: 24900, high: 25050, low: 24850 } } },
  })));

  const quotes = await p.getBulkQuotes(['TCS.NS', 'RELIANCE.NS', '^NSEI', 'AAPL']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.dhan.co/v2/marketfeed/quote');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers['access-token'], TOKEN);
  assert.equal(calls[0].opts.headers['client-id'], CLIENT_ID);
  assert.deepEqual(calls[0].body, { NSE_EQ: [11536, 2885], IDX_I: [13] });

  assert.equal(quotes.length, 3);
  const tcs = quotes.find(q => q.symbol === 'TCS.NS');
  assert.equal(tcs.regularMarketPrice, 110);
  assert.equal(tcs.regularMarketChange, 10);
  assert.equal(tcs.regularMarketPreviousClose, 100);
  assert.equal(tcs.regularMarketChangePercent, 10);
  assert.equal(tcs.regularMarketOpen, 101);
  assert.equal(tcs.regularMarketDayHigh, 112);
  assert.equal(tcs.regularMarketDayLow, 99);
  assert.equal(tcs.regularMarketVolume, 5000);
  assert.equal(tcs.currency, 'INR');
  assert.equal(tcs.exchange, 'NSE');
  assert.equal(tcs.longName, 'Tata Consultancy Services');
  const rel = quotes.find(q => q.symbol === 'RELIANCE.NS');
  assert.equal(rel.regularMarketChange, -5);

  // formatStockData (the existing downstream) accepts it unchanged.
  const formatted = FinDataService.formatStockData(tcs);
  assert.equal(formatted.current_price, 110);
  assert.equal(formatted.change_percent, 10);
});

test('quotes are cached for a few seconds (no second request)', async () => {
  const p = makeProvider({ quoteTtlMs: 5000 });
  const calls = stubFetch(() => jsonRes(200, quoteBody({ NSE_EQ: { 11536: NOW_Q } })));
  await p.getBulkQuotes(['TCS.NS']);
  const again = await p.getBulkQuotes(['TCS.NS']);
  assert.equal(calls.length, 1);
  assert.equal(again[0].regularMarketPrice, 110);
});

test('requests are serialised and spaced to respect 1 request/second', async () => {
  const p = makeProvider({ quoteIntervalMs: 60 });
  let inFlight = 0;
  let maxInFlight = 0;
  const calls = stubFetch(async (call) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight--;
    const ids = Object.values(call.body).flat();
    const data = { NSE_EQ: Object.fromEntries(ids.map((id) => [id, NOW_Q])) };
    return jsonRes(200, quoteBody(data));
  });
  await Promise.all([
    p.getBulkQuotes(['TCS.NS']),
    p.getBulkQuotes(['INFY.NS']),
    p.getBulkQuotes(['SBIN.NS']),
  ]);
  assert.equal(calls.length, 3);
  assert.equal(maxInFlight, 1);
  assert.ok(calls[1].at - calls[0].at >= 40, 'second call waited');
  assert.ok(calls[2].at - calls[1].at >= 40, 'third call waited');
});

test('RateGate spaces task starts', async () => {
  const gate = new RateGate(40);
  const starts = [];
  await Promise.all([1, 2, 3].map(() => gate.schedule(async () => { starts.push(Date.now()); })));
  assert.ok(starts[1] - starts[0] >= 35 && starts[2] - starts[1] >= 35);
});

test('more than 1000 instruments are split into several requests', async () => {
  const p = makeProvider();
  const ids = [];
  for (let i = 0; i < 1001; i++) {
    const key = `ZZ${i}`;
    p.master.map.set(`equity:NSE:${key}`, { securityId: String(90000 + i), segment: 'NSE_EQ', instrument: 'EQUITY', name: key, exchange: 'NSE' });
    ids.push(`${key}.NS`);
  }
  const calls = stubFetch(() => jsonRes(200, quoteBody({})));
  await p.getBulkQuotes(ids);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.NSE_EQ.length, 1000);
  assert.equal(calls[1].body.NSE_EQ.length, 1);
});

// ---- failures ----

test('401 throws, logs once without secrets, and stands down so no more requests are made', async () => {
  const logs = [];
  for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, (...a) => logs.push(a.join(' ')));
  const p = makeProvider();
  const calls = stubFetch(() => jsonRes(401, { errorType: 'Invalid_Authentication', errorCode: 'DH-901', errorMessage: `token ${TOKEN} expired` }));

  await assert.rejects(p.getBulkQuotes(['TCS.NS']), /Dhan auth failed/);
  assert.equal(p.canServe('TCS.NS'), false);
  assert.equal(p.canServe('INFY.NS'), false);
  assert.equal(calls.length, 1);

  p.disabledUntil = 0; // cooldown elapsed, token still bad: fails again but is not logged again
  await assert.rejects(p.getBulkQuotes(['INFY.NS']), /Dhan auth failed/);
  assert.equal(logs.filter((l) => l.includes('[Dhan]')).length, 1, 'logged once');
  assert.ok(!logs.join('\n').includes(TOKEN));
  assert.ok(!logs.join('\n').includes(CLIENT_ID));
});

test('auth error codes inside a 200/failed body also stand the provider down', async () => {
  const p = makeProvider();
  stubFetch(() => jsonRes(400, { status: 'failed', data: { 807: 'Access token is expired' } }));
  await assert.rejects(p.getBulkQuotes(['TCS.NS']), /Dhan auth failed/);
  assert.equal(p.canServe('TCS.NS'), false);
});

test('rate-limit responses surface as 429 so the chain can switch provider', async () => {
  const p = makeProvider();
  stubFetch(() => jsonRes(429, { errorCode: 'DH-904' }));
  await assert.rejects(p.getBulkQuotes(['TCS.NS']), /429/);
});

// ---- FinDataService chain ----

const stockRecord = () => ({ symbol: 'x', update: async () => {} });

test('chain without Dhan behaves as before: Indian symbols go to the active provider', async () => {
  FinDataService.dhan = null;
  const fetchCalls = stubFetch(() => { throw new Error('Dhan must not be called'); });
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'create', async (v) => v);
  mock.method(FinDataService.activeProvider, 'getQuote', async (s) => ({ symbol: s, regularMarketPrice: 42, longName: 'Yahoo' }));
  const out = await FinDataService.getStockPrice('TCS.NS');
  assert.equal(out.current_price, 42);
  assert.equal(fetchCalls.length, 0);
});

test('chain with Dhan: Indian symbol is quoted by Dhan, US symbol is not', async () => {
  FinDataService.dhan = makeProvider();
  const fetchCalls = stubFetch(() => jsonRes(200, quoteBody({ NSE_EQ: { 11536: NOW_Q } })));
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'create', async (v) => v);
  const active = mock.method(FinDataService.activeProvider, 'getQuote', async (s) => ({ symbol: s, regularMarketPrice: 7 }));

  const indian = await FinDataService.getStockPrice('TCS.NS');
  assert.equal(indian.current_price, 110);
  assert.equal(indian.currency, 'INR');
  assert.equal(active.mock.callCount(), 0);

  const us = await FinDataService.getStockPrice('AAPL');
  assert.equal(us.current_price, 7);
  assert.equal(fetchCalls.length, 1, 'Dhan only saw the Indian symbol');
});

test('chain: Dhan 401 falls back to the next provider and the response is still served', async () => {
  FinDataService.dhan = makeProvider();
  mock.method(console, 'error', () => {});
  mock.method(console, 'warn', () => {});
  stubFetch(() => jsonRes(401, { errorCode: 'DH-901' }));
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'create', async (v) => v);
  mock.method(FinDataService.activeProvider, 'getQuote', async (s) => ({ symbol: s, regularMarketPrice: 99, longName: 'Fallback' }));
  const out = await FinDataService.getStockPrice('TCS.NS');
  assert.equal(out.current_price, 99);
  assert.equal(out.name, 'Fallback');
});

test('bulk: Dhan answers Indian symbols in one batch, the rest go to the active provider', async () => {
  FinDataService.dhan = makeProvider();
  const fetchCalls = stubFetch(() => jsonRes(200, quoteBody({ NSE_EQ: { 11536: NOW_Q, 1594: { ...NOW_Q, last_price: 200 } } })));
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'findOrCreate', async ({ where }) => [{ symbol: where.symbol, update: async () => {} }, true]);
  const bulk = mock.method(FinDataService.activeProvider, 'getBulkQuotes', async (syms) => syms.map((s) => ({ symbol: s, regularMarketPrice: 5 })));

  const out = await FinDataService.getBulkQuotes(['TCS.NS', 'INFY.NS', 'AAPL']);
  assert.equal(fetchCalls.length, 1);
  assert.deepEqual(bulk.mock.calls[0].arguments[0], ['AAPL']);
  assert.equal(out['TCS.NS'].current_price, 110);
  assert.equal(out['INFY.NS'].current_price, 200);
  assert.equal(out.AAPL.current_price, 5);
});

test('bulk: Dhan outage still returns data from the active provider for all symbols', async () => {
  FinDataService.dhan = makeProvider();
  mock.method(console, 'error', () => {});
  mock.method(console, 'warn', () => {});
  stubFetch(() => jsonRes(401, {}));
  mock.method(db.Stock, 'findOne', async () => null);
  mock.method(db.Stock, 'findOrCreate', async ({ where }) => [{ symbol: where.symbol, update: async () => {} }, true]);
  const bulk = mock.method(FinDataService.activeProvider, 'getBulkQuotes', async (syms) => syms.map((s) => ({ symbol: s, regularMarketPrice: 5 })));
  const out = await FinDataService.getBulkQuotes(['TCS.NS', 'AAPL']);
  assert.deepEqual(bulk.mock.calls[0].arguments[0], ['TCS.NS', 'AAPL']);
  assert.equal(out['TCS.NS'].current_price, 5);
});

// ---- candles ----

test('intraday candles: IST window, interval mapping and shape', async () => {
  const p = makeProvider();
  const calls = stubFetch(() => jsonRes(200, {
    open: [1, 2], high: [3, 4], low: [0.5, 1.5], close: [2, 3], volume: [10, 20], timestamp: [1700000000, 1700000300],
  }));
  const to = 1700003600;
  const series = await p.getCandles('TCS.NS', '5', to - 3600, to);
  assert.equal(calls[0].url, 'https://api.dhan.co/v2/charts/intraday');
  assert.deepEqual(calls[0].body, {
    securityId: '11536', exchangeSegment: 'NSE_EQ', instrument: 'EQUITY', interval: '5', oi: false,
    fromDate: '2023-11-15 03:43:20', toDate: '2023-11-15 04:43:20',
  });
  assert.deepEqual(series[0], { time: 1700000000000, open: 1, high: 3, low: 0.5, close: 2, volume: 10 });
  assert.equal(series.length, 2);
});

test('daily candles use the historical endpoint; 30-minute maps to 25', async () => {
  const p = makeProvider();
  const calls = stubFetch(() => jsonRes(200, { open: [1], high: [1], low: [1], close: [1], volume: [1], timestamp: [1700000000] }));
  await p.getCandles('^NSEI', 'D', 1700000000, 1700086400);
  assert.equal(calls[0].url, 'https://api.dhan.co/v2/charts/historical');
  assert.equal(calls[0].body.exchangeSegment, 'IDX_I');
  assert.equal(calls[0].body.instrument, 'INDEX');
  assert.equal(calls[0].body.fromDate, '2023-11-15');
  await p.getCandles('TCS.NS', '30', 1700000000, 1700086400);
  assert.equal(calls[1].body.interval, '25');
});

test('FinDataService.getCandles uses Dhan for Indian symbols and falls through on failure', async () => {
  FinDataService.dhan = makeProvider();
  stubFetch(() => jsonRes(200, { open: [1], high: [1], low: [1], close: [1], volume: [1], timestamp: [1700000000] }));
  const ok = await FinDataService.getCandles('TCS.NS', '5', 1700000000, 1700003600);
  assert.equal(ok.length, 1);

  mock.restoreAll();
  mock.method(redisClient, 'get', async () => null);
  mock.method(redisClient, 'setEx', async () => 'OK');
  mock.method(console, 'error', () => {});
  mock.method(console, 'warn', () => {});
  FinDataService.dhan = makeProvider();
  stubFetch(() => jsonRes(401, {}));
  const fallback = await FinDataService.getCandles('TCS.NS', '5', 1700000000, 1700003600);
  assert.deepEqual(fallback, [], 'no Finnhub key in tests, so the existing path returns []');
});

test('candles endpoint validates symbol, resolution and range', async () => {
  const request = require('supertest');
  const { app } = require('./helpers');
  for (const q of ['resolution=7', 'resolution=5;x', 'from=abc', 'to=1e9x']) {
    const res = await request(app).get(`/api/stocks/TCS.NS/candles?${q}`);
    assert.equal(res.status, 400, q);
  }
});

// ---- instrument cache hardening ----

const ACME_ROWS = (id = '8888') => [{ k: 'equity', e: 'NSE', s: 'ACME', id, n: 'Acme Ltd', q: 'EQ' }];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('cache dir is created private (0700) and the cache file is owner-only (0600)', async () => {
  const dir = path.join(tmpDir(), 'nested', 'cache');
  stubFetch(() => new Response(MASTER_CSV));
  const m = new InstrumentMaster({ cacheDir: dir });
  await m.resolve('ACME.NS');
  await wait(80);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(dir, 'instrument-master.json')).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(dir), ['instrument-master.json'], 'no stray temp files');
});

test('an existing but too-open directory that we own is tightened and used', async () => {
  const dir = tmpDir();
  fs.chmodSync(dir, 0o777);
  stubFetch(() => new Response(MASTER_CSV));
  const m = new InstrumentMaster({ cacheDir: dir });
  await m.resolve('ACME.NS');
  await wait(80);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.ok(fs.existsSync(path.join(dir, 'instrument-master.json')));
});

test('a cache dir owned by another user is never read or written (memory only)', async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'instrument-master.json'), JSON.stringify(ACME_ROWS('666')), { mode: 0o600 });
  const realLstat = fs.promises.lstat;
  mock.method(fs.promises, 'lstat', async (p, ...rest) => {
    if (p === dir) return { isDirectory: () => true, isSymbolicLink: () => false, uid: process.getuid() + 1, mode: 0o40700 };
    return realLstat(p, ...rest);
  });
  const calls = stubFetch(() => new Response(MASTER_CSV));
  const m = new InstrumentMaster({ cacheDir: dir });
  assert.equal((await m.resolve('ACME.NS')).securityId, '8888', 'poisoned file ignored; real master used');
  await wait(80);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'instrument-master.json'), 'utf8'))[0].id, '666', 'file untouched');
});

test('a symlinked cache dir is not trusted', async () => {
  const target = tmpDir();
  const link = path.join(tmpDir(), 'link');
  fs.symlinkSync(target, link);
  stubFetch(() => new Response(MASTER_CSV));
  const m = new InstrumentMaster({ cacheDir: link });
  assert.equal((await m.resolve('ACME.NS')).securityId, '8888');
  await wait(80);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('tampered cache files are rejected: bad row, unknown exchange, group-writable', async () => {
  const bad = [
    [{ ...ACME_ROWS('777')[0], id: '12ab' }],
    [{ ...ACME_ROWS('777')[0], e: 'MCX' }],
    [{ ...ACME_ROWS('777')[0], k: 'future' }],
    [...ACME_ROWS('777'), { nope: true }],
    { not: 'an array' },
  ];
  for (const content of bad) {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'instrument-master.json'), JSON.stringify(content), { mode: 0o600 });
    mock.restoreAll();
    const calls = stubFetch(() => new Response(MASTER_CSV));
    const m = new InstrumentMaster({ cacheDir: dir });
    assert.equal((await m.resolve('ACME.NS')).securityId, '8888', JSON.stringify(content));
    assert.equal(calls.length, 1, 'fell back to a real download');
  }

  const dir = tmpDir();
  const file = path.join(dir, 'instrument-master.json');
  fs.writeFileSync(file, JSON.stringify(ACME_ROWS('777')));
  fs.chmodSync(file, 0o666);
  mock.restoreAll();
  stubFetch(() => new Response(MASTER_CSV));
  assert.equal((await new InstrumentMaster({ cacheDir: dir }).resolve('ACME.NS')).securityId, '8888');
});

test('a valid, owner-only cache file is used without downloading', async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'instrument-master.json'), JSON.stringify(ACME_ROWS('4242')), { mode: 0o600 });
  const calls = stubFetch(() => { throw new Error('no download expected'); });
  assert.equal((await new InstrumentMaster({ cacheDir: dir }).resolve('ACME.NS')).securityId, '4242');
  assert.equal(calls.length, 0);
});

test('isValidRow enforces shape, numeric securityId and known segment', () => {
  const ok = ACME_ROWS()[0];
  assert.equal(InstrumentMaster.isValidRow(ok), true);
  for (const bad of [null, 'x', { ...ok, id: 8888 }, { ...ok, id: '-1' }, { ...ok, id: '1234567890' }, { ...ok, e: 'MCX' },
    { ...ok, k: 'option' }, { ...ok, s: '' }, { ...ok, s: 'a b;c' }, { ...ok, n: 'x'.repeat(201) }, { ...ok, q: undefined }]) {
    assert.equal(InstrumentMaster.isValidRow(bad), false, JSON.stringify(bad));
  }
});

test('download is capped: oversize body, oversize content-length and over-long lines abort cleanly', async () => {
  const warn = [];
  mock.method(console, 'warn', (...a) => warn.push(a.join(' ')));

  // body larger than the cap
  stubFetch(() => new Response(MASTER_CSV));
  let m = new InstrumentMaster({ cacheDir: tmpDir(), maxBytes: 100 });
  assert.equal((await m.resolve('ACME.NS')), null, 'download rejected, curated map only');
  assert.equal((await m.resolve('TCS.NS')).securityId, '11536');

  // declared content-length over the cap: rejected before streaming
  mock.restoreAll();
  warn.length = 0;
  mock.method(console, 'warn', (...a) => warn.push(a.join(' ')));
  stubFetch(() => new Response('SEM_EXM_EXCH_ID\n', { headers: { 'content-length': String(65 * 1024 * 1024) } }));
  m = new InstrumentMaster({ cacheDir: tmpDir() });
  assert.equal(await m.resolve('ACME.NS'), null);
  assert.ok(warn.some((l) => l.includes('too large')), 'oversize content-length refused');

  // a single enormous line without a newline
  mock.restoreAll();
  warn.length = 0;
  mock.method(console, 'warn', (...a) => warn.push(a.join(' ')));
  stubFetch(() => new Response('x'.repeat(10000)));
  m = new InstrumentMaster({ cacheDir: tmpDir(), maxLineLength: 1000 });
  assert.equal(await m.resolve('ACME.NS'), null);
  assert.equal((await m.resolve('INFY.NS')).securityId, '1594');
  assert.ok(warn.some((l) => l.includes('line too long')));
});
