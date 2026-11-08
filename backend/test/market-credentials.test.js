const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('./helpers');
const mdCrypto = require('../src/utils/marketDataCrypto');
const {
  DhanCredentialService, CredentialError, maskClientId, decodeJwtExp, parseDhanTime, resolveExpiry,
} = require('../src/services/DhanCredentialService');
const { DhanProvider } = require('../src/services/DhanProvider');

const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const CLIENT_ID = '1100003626';
const HOUR = 3600 * 1000;
const T0 = Date.UTC(2026, 10, 6, 6, 0, 0); // 06 Nov 2026 06:00 UTC

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** A JWT-looking token whose exp is `ms` (signature is junk: nobody verifies it). */
const jwt = (expMs, tag = 'a') => `${b64u({ alg: 'HS512' })}.${b64u({ exp: Math.floor(expMs / 1000), tag })}.${tag.repeat(24)}`;
const jsonRes = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** In-memory credential table. transaction() serialises callers like SELECT ... FOR UPDATE. */
function fakeStore(initial = null) {
  const st = { row: initial ? { ...initial } : null, tail: Promise.resolve(), failWrite: false, failCommit: false, txCount: 0 };
  st.get = async () => (st.row ? { ...st.row } : null);
  st.transaction = async (fn) => {
    const prev = st.tail;
    let release;
    st.tail = new Promise((r) => { release = r; });
    await prev;
    st.txCount += 1;
    let current = st.row ? { ...st.row } : null;
    let wrote = false;
    try {
      const out = await fn({
        read: async () => (current ? { ...current } : null),
        write: async (patch) => {
          if (st.failWrite) throw new Error('db down');
          current = { provider: 'dhan', ...(current || {}), ...patch };
          wrote = true;
        },
      });
      if (st.failCommit) throw new Error('commit failed');
      if (wrote) st.row = current;
      return out;
    } finally {
      release();
    }
  };
  return st;
}

function fakeNotifier() {
  const n = { calls: [], fail: false };
  n.notifyLapse = async (arg) => { n.calls.push(arg); if (n.fail) throw new Error('smtp down'); };
  return n;
}

const rowFor = (token, expiresAt, extra = {}) => ({
  provider: 'dhan',
  client_id: CLIENT_ID,
  access_token_encrypted: mdCrypto.encryptSecret(token, 'provider_credentials:dhan'),
  status: 'active',
  expires_at: new Date(expiresAt),
  last_renewed_at: null,
  last_error: null,
  last_error_at: null,
  lapsed_notified_at: null,
  ...extra,
});

let clock;
let logs;
function fakeTimers() {
  const t = { calls: [], cleared: [] };
  t.setTimeout = (fn, ms) => { const h = { fn, ms, unref: () => { h.unrefd = true; } }; t.calls.push(h); return h; };
  t.clearTimeout = (h) => t.cleared.push(h);
  return t;
}
const makeService = (store, extra = {}) => new DhanCredentialService({
  store, notifier: extra.notifier || fakeNotifier(), now: () => clock, timers: extra.timers || fakeTimers(),
  random: () => 0.5, env: extra.env || {}, ...extra.opts,
});

function stubFetch(handler) {
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, opts = {}) => {
    const call = { url: String(url), method: opts.method || 'GET', headers: opts.headers || {} };
    calls.push(call);
    return handler(call, calls.length);
  });
  return calls;
}

beforeEach(() => {
  process.env.MARKET_DATA_KEY = KEY;
  clock = T0;
  logs = [];
  for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, (...a) => logs.push(a.join(' ')));
});
afterEach(() => {
  mock.restoreAll();
  process.env.MARKET_DATA_KEY = '';
});

const noSecretIn = (text, ...secrets) => secrets.forEach((s) => assert.ok(!String(text).includes(s), 'secret leaked'));

// ---- encryption ----

test('AES-256-GCM round trip, bound to its AAD, tamper-evident', () => {
  const enc = mdCrypto.encryptSecret('super-secret-token', 'aad-1');
  assert.match(enc, /^v1:/);
  assert.ok(!enc.includes('super-secret-token'));
  assert.equal(mdCrypto.decryptSecret(enc, 'aad-1'), 'super-secret-token');
  assert.notEqual(mdCrypto.encryptSecret('super-secret-token', 'aad-1'), enc, 'fresh IV each time');
  assert.throws(() => mdCrypto.decryptSecret(enc, 'aad-2'));
  const flipped = `${enc.slice(0, -4)}${enc.endsWith('AAAA') ? 'BBBB' : 'AAAA'}`;
  assert.throws(() => mdCrypto.decryptSecret(flipped, 'aad-1'));
});

test('accepts a base64 key and fails closed without a valid key', () => {
  process.env.MARKET_DATA_KEY = Buffer.alloc(32, 7).toString('base64');
  assert.equal(mdCrypto.isMarketDataCryptoAvailable(), true);
  for (const bad of ['', 'short', 'zz'.repeat(32), Buffer.alloc(16).toString('base64')]) {
    process.env.MARKET_DATA_KEY = bad;
    assert.equal(mdCrypto.isMarketDataCryptoAvailable(), false, bad);
    assert.throws(() => mdCrypto.encryptSecret('x', 'a'), mdCrypto.MarketDataCryptoUnavailableError);
    assert.throws(() => mdCrypto.decryptSecret('v1:AAAA', 'a'), mdCrypto.MarketDataCryptoUnavailableError);
  }
});

// ---- parsing helpers ----

test('expiry helpers: JWT exp, Dhan IST timestamps, earliest future instant wins', () => {
  assert.equal(decodeJwtExp(jwt(T0 + 5 * HOUR)), T0 + 5 * HOUR);
  assert.equal(decodeJwtExp('not-a-jwt'), null);
  // 06:00 UTC == 11:30 IST
  assert.equal(parseDhanTime('06/11/2026 11:30'), T0);
  assert.equal(parseDhanTime('2026-11-06T11:30:00.000'), T0);
  assert.equal(parseDhanTime('2026-11-06T06:00:00Z'), T0);
  assert.equal(parseDhanTime('garbage'), null);
  assert.equal(resolveExpiry({ token: jwt(T0 + 9 * HOUR), stated: '06/11/2026 22:30', now: T0 }), T0 + 9 * HOUR);
  assert.equal(resolveExpiry({ token: 'x', stated: '06/11/2020 10:00', now: T0 }), null, 'past values are ignored');
  assert.equal(maskClientId(CLIENT_ID), '******3626');
});

// ---- bootstrap ----

test('bootstrap imports DHAN_* once into the encrypted store and says so, without logging the token', async () => {
  const token = jwt(T0 + 20 * HOUR, 'e');
  const store = fakeStore();
  const svc = makeService(store, { env: { DHAN_CLIENT_ID: CLIENT_ID, DHAN_ACCESS_TOKEN: token } });
  assert.equal(await svc.bootstrapFromEnv(), true);
  assert.ok(store.row.access_token_encrypted.startsWith('v1:'));
  noSecretIn(JSON.stringify(store.row), token);
  assert.equal(new Date(store.row.expires_at).getTime(), T0 + 20 * HOUR);
  assert.equal(svc.getCredentials().accessToken, token);
  assert.ok(logs.some((l) => /superseded/.test(l)), 'logs that the env token is superseded');
  noSecretIn(logs.join('\n'), token);

  // Second boot: the row exists, nothing is imported or overwritten.
  const svc2 = makeService(store, { env: { DHAN_CLIENT_ID: CLIENT_ID, DHAN_ACCESS_TOKEN: jwt(T0 + 2 * HOUR, 'z') } });
  assert.equal(await svc2.bootstrapFromEnv(), false);
  assert.equal(store.txCount, 1);
});

test('bootstrap does nothing without MARKET_DATA_KEY (fail closed)', async () => {
  process.env.MARKET_DATA_KEY = '';
  const store = fakeStore();
  const svc = makeService(store, { env: { DHAN_CLIENT_ID: CLIENT_ID, DHAN_ACCESS_TOKEN: jwt(T0 + HOUR) } });
  assert.equal(await svc.bootstrapFromEnv(), false);
  assert.equal(store.row, null);
  await svc.load();
  assert.equal(svc.getCredentials(), null);
  assert.equal(svc.disabledReason(), 'encryption_key_missing');
});

// ---- reading / status ----

test('provider reads from the store: active with a good row, inactive otherwise', async () => {
  const token = jwt(T0 + 10 * HOUR);
  const svc = makeService(fakeStore(rowFor(token, T0 + 10 * HOUR)));
  assert.equal(svc.getCredentials(), null, 'nothing before load()');
  await svc.load();
  const provider = new DhanProvider({ credentials: () => svc.getCredentials() });
  assert.equal(provider.canServe('TCS.NS'), true);
  clock = T0 + 10 * HOUR; // reached expiry
  assert.equal(svc.getCredentials(), null);
  assert.equal(provider.canServe('TCS.NS'), false);
  assert.equal(svc.disabledReason(), 'expired');
});

test('a ciphertext that cannot be decrypted (wrong key) disables Dhan with a clear reason', async () => {
  const store = fakeStore(rowFor(jwt(T0 + 10 * HOUR), T0 + 10 * HOUR));
  process.env.MARKET_DATA_KEY = 'ff'.repeat(32);
  const svc = makeService(store);
  await svc.load();
  assert.equal(svc.getCredentials(), null);
  assert.equal(svc.getStatus().disabled_reason, 'decrypt_failed');
});

test('status never contains the token or the full client id', async () => {
  const token = jwt(T0 + 10 * HOUR, 's');
  const svc = makeService(fakeStore(rowFor(token, T0 + 10 * HOUR)));
  await svc.load();
  const status = svc.getStatus();
  assert.equal(status.client_id_masked, '******3626');
  noSecretIn(JSON.stringify(status), token, CLIENT_ID, 'accessToken', 'access_token');
});

// ---- admin paste ----

const profileOk = (extra = {}) => ({ dhanClientId: CLIENT_ID, tokenValidity: '06/11/2026 22:30', dataPlan: 'Active', dataValidity: '2027-01-01 00:00:00.0', ...extra });

test('setCredentials verifies against /profile, stores encrypted, activates', async () => {
  const token = jwt(T0 + 12 * HOUR, 'p');
  const store = fakeStore();
  const calls = stubFetch(() => jsonRes(200, profileOk()));
  const svc = makeService(store);
  const status = await svc.setCredentials({ clientId: CLIENT_ID, accessToken: token, actorId: 'admin-1' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/profile'));
  assert.equal(calls[0].headers['access-token'], token);
  assert.equal(status.active, true);
  assert.equal(store.row.updated_by, 'admin-1');
  noSecretIn(JSON.stringify(store.row), token);
  noSecretIn(JSON.stringify(status), token);
  // profile says 22:30 IST (= T0 + 11 h), the JWT says T0 + 12 h: the earlier one wins.
  assert.equal(new Date(store.row.expires_at).getTime(), T0 + 11 * HOUR, 'earliest of JWT exp and profile validity');
});

test('setCredentials: a token Dhan rejects (or that fails any check) is NOT stored', async () => {
  const token = jwt(T0 + 12 * HOUR, 'q');
  const cases = [
    [jsonRes(401, { errorCode: 'DH-901' }), 'invalid_credentials'],
    [jsonRes(200, profileOk({ dhanClientId: '999999999' })), 'client_mismatch'],
    [jsonRes(200, profileOk({ dataPlan: 'Deactive' })), 'subscription_inactive'],
    [jsonRes(503, {}), 'upstream_unavailable'],
  ];
  for (const [response, code] of cases) {
    mock.restoreAll();
    stubFetch(() => response.clone());
    const store = fakeStore();
    const svc = makeService(store);
    await assert.rejects(svc.setCredentials({ clientId: CLIENT_ID, accessToken: token }), (e) => e instanceof CredentialError && e.code === code);
    assert.equal(store.row, null, code);
    assert.equal(svc.getCredentials(), null);
  }
  // Format problems never reach Dhan at all.
  mock.restoreAll();
  const calls = stubFetch(() => jsonRes(200, profileOk()));
  const svc = makeService(fakeStore());
  await assert.rejects(svc.setCredentials({ clientId: 'abc', accessToken: token }), /numeric/);
  await assert.rejects(svc.setCredentials({ clientId: CLIENT_ID, accessToken: 'short' }), /format/);
  assert.equal(calls.length, 0);
});

test('setCredentials without MARKET_DATA_KEY refuses (503) and stores nothing', async () => {
  process.env.MARKET_DATA_KEY = '';
  const calls = stubFetch(() => jsonRes(200, profileOk()));
  const store = fakeStore();
  await assert.rejects(makeService(store).setCredentials({ clientId: CLIENT_ID, accessToken: jwt(T0 + HOUR) }),
    (e) => e.code === 'crypto_unavailable' && e.status === 503);
  assert.equal(store.row, null);
  assert.equal(calls.length, 0);
});

// ---- renewal ----

const renewBody = (token, stated) => ({ dhanClientId: CLIENT_ID, accessToken: token, expiryTime: stated });

test('renew: calls RenewToken with the current token, persists the new one atomically', async () => {
  const oldToken = jwt(T0 + 2 * HOUR, 'o');
  const newToken = jwt(T0 + 26 * HOUR, 'n');
  const store = fakeStore(rowFor(oldToken, T0 + 2 * HOUR));
  const calls = stubFetch(() => jsonRes(200, renewBody(newToken, '2026-11-07T11:30:00.000')));
  const svc = makeService(store);
  await svc.load();
  const v = svc.version;
  const status = await svc.renew();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.ok(calls[0].url.endsWith('/RenewToken'));
  assert.equal(calls[0].headers['access-token'], oldToken);
  assert.equal(calls[0].headers.dhanClientId, CLIENT_ID);
  assert.equal(svc.getCredentials().accessToken, newToken);
  assert.ok(svc.version > v);
  assert.equal(status.last_renewed_at, new Date(T0).toISOString());
  // JWT exp is T0 + 26 h but Dhan states 11:30 IST next day (= T0 + 24 h): the earlier wins.
  assert.equal(status.expires_at, new Date(T0 + 24 * HOUR).toISOString());
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), newToken);
  noSecretIn(JSON.stringify(status), oldToken, newToken);
  noSecretIn(logs.join('\n'), oldToken, newToken);
});

test('renew: falls back to the token response expiryTime, then to 23 h, when the new token has no exp', async () => {
  const opaque = 'opaque-token-without-jwt-structure-1';
  const store = fakeStore(rowFor(jwt(T0 + HOUR), T0 + HOUR));
  stubFetch(() => jsonRes(200, { data: { access_token: opaque, expiryTime: '2026-11-07T11:30:00' } }));
  const svc = makeService(store);
  await svc.load();
  await svc.renew();
  assert.equal(svc.getCredentials().accessToken, opaque);
  assert.equal(svc.state.expiresAt, T0 + 24 * HOUR);

  mock.restoreAll();
  stubFetch(() => jsonRes(200, { token: opaque }));
  await svc.renew({ force: true });
  assert.equal(svc.state.expiresAt, T0 + 23 * HOUR);
});

test('scheduler tick renews only inside the 4 h window', async () => {
  const calls = stubFetch(() => jsonRes(200, renewBody(jwt(T0 + 30 * HOUR, 'r'))));
  const svc = makeService(fakeStore(rowFor(jwt(T0 + 10 * HOUR), T0 + 10 * HOUR)));
  await svc.tick();
  assert.equal(calls.length, 0, '10 h left: nothing to do');
  clock = T0 + 7 * HOUR; // 3 h left
  await svc.tick();
  assert.equal(calls.length, 1);
  assert.equal(svc.state.expiresAt, T0 + 30 * HOUR);
});

test('transient failure while still valid: retried with growing backoff, credential kept', async () => {
  const token = jwt(T0 + 2 * HOUR, 't');
  const notifier = fakeNotifier();
  const svc = makeService(fakeStore(rowFor(token, T0 + 2 * HOUR)), { notifier });
  let n = 0;
  const calls = stubFetch(() => (++n < 3 ? jsonRes(503, {}) : jsonRes(200, renewBody(jwt(T0 + 26 * HOUR, 'k')))));
  assert.equal(svc.nextDelay(), 15 * 60 * 1000, 'jitter source 0.5 -> exactly the base interval');
  await svc.tick();
  assert.equal(svc.getCredentials().accessToken, token, 'still using the valid token');
  assert.equal(svc.nextDelay(), 60 * 1000);
  await svc.tick();
  assert.equal(svc.nextDelay(), 120 * 1000);
  assert.equal(svc.getStatus().last_error.includes('temporarily unavailable'), true);
  await svc.tick();
  assert.equal(calls.length, 3);
  assert.equal(svc.nextDelay(), 15 * 60 * 1000, 'success resets the backoff');
  assert.equal(notifier.calls.length, 0, 'no alert for transient errors');
  assert.equal(svc.getStatus().status, 'active');
});

test('rejected renewal: lapses, disables Dhan, alerts admins exactly once', async () => {
  const token = jwt(T0 + 2 * HOUR, 'l');
  const notifier = fakeNotifier();
  const store = fakeStore(rowFor(token, T0 + 2 * HOUR));
  const calls = stubFetch(() => jsonRes(401, { errorCode: 'DH-901', errorMessage: `bad ${token}` }));
  const svc = makeService(store, { notifier });
  await svc.load();
  const provider = new DhanProvider({ credentials: () => svc.getCredentials() });
  assert.equal(provider.canServe('TCS.NS'), true);

  await svc.tick();
  assert.equal(svc.getStatus().status, 'lapsed');
  assert.equal(svc.getStatus().disabled_reason, 'lapsed');
  assert.equal(svc.getCredentials(), null);
  assert.equal(provider.canServe('TCS.NS'), false, 'provider disabled -> existing providers take over');
  assert.equal(store.row.status, 'lapsed');
  assert.ok(store.row.lapsed_notified_at);
  assert.equal(notifier.calls.length, 1);
  assert.equal(notifier.calls[0].clientIdMasked, '******3626');
  noSecretIn(JSON.stringify(notifier.calls), token, CLIENT_ID);
  noSecretIn(logs.join('\n'), token);

  // Ticking again, or an admin pressing "renew", neither calls Dhan nor alerts again.
  await svc.tick();
  await svc.tick();
  await svc.renew({ force: true });
  assert.equal(calls.length, 1);
  assert.equal(notifier.calls.length, 1);

  // A restart (fresh process, same row) does not alert again either.
  const svc2 = makeService(store, { notifier });
  await svc2.load();
  await svc2.tick();
  assert.equal(notifier.calls.length, 1);
  assert.equal(calls.length, 1);
});

test('expired token: lapsed without calling Dhan; a pasted token re-arms the alert for the next lapse', async () => {
  const notifier = fakeNotifier();
  const store = fakeStore(rowFor(jwt(T0 - HOUR), T0 - HOUR));
  const calls = stubFetch((c) => (c.url.endsWith('/profile') ? jsonRes(200, profileOk()) : jsonRes(401, {})));
  const svc = makeService(store, { notifier });
  await svc.tick();
  assert.equal(calls.length, 0, 'an expired token cannot be renewed, so Dhan is not called');
  assert.equal(svc.getStatus().status, 'lapsed');
  assert.equal(notifier.calls.length, 1);

  await svc.setCredentials({ clientId: CLIENT_ID, accessToken: jwt(T0 + 3 * HOUR, 'm') });
  assert.equal(svc.getStatus().status, 'active');
  assert.equal(store.row.lapsed_notified_at, null);
  await svc.tick(); // 3 h left -> renewal attempt, rejected -> second lapse
  assert.equal(svc.getStatus().status, 'lapsed');
  assert.equal(notifier.calls.length, 2, 'a new lapse alerts again');
});

test('a failing alert channel does not break the lapse handling, is not marked as sent, and is retried', async () => {
  const notifier = fakeNotifier();
  notifier.fail = true;
  stubFetch(() => jsonRes(401, {}));
  const store = fakeStore(rowFor(jwt(T0 + HOUR), T0 + HOUR));
  const svc = makeService(store, { notifier });
  await svc.tick();
  assert.equal(svc.getStatus().status, 'lapsed');
  assert.ok(logs.some((l) => /lapse alert failed/.test(l)));
  assert.equal(store.row.lapsed_notified_at ?? null, null, 'not recorded as sent when the send failed');
  assert.equal(notifier.calls.length, 1);

  await svc.tick(); // next tick retries
  assert.equal(notifier.calls.length, 2);
  assert.equal(store.row.lapsed_notified_at ?? null, null);

  notifier.fail = false;
  await svc.tick();
  assert.equal(notifier.calls.length, 3);
  assert.ok(store.row.lapsed_notified_at, 'recorded after a successful send');
  await svc.tick();
  await svc.tick();
  assert.equal(notifier.calls.length, 3, 'no repeat once delivered');
});

test('unreadable renewal response after Dhan accepted it: lapsed (the old token is already dead)', async () => {
  const notifier = fakeNotifier();
  stubFetch(() => jsonRes(200, { somethingElse: true }));
  const svc = makeService(fakeStore(rowFor(jwt(T0 + HOUR), T0 + HOUR)), { notifier });
  await svc.tick();
  assert.equal(svc.getStatus().status, 'lapsed');
  assert.equal(notifier.calls.length, 1);
});

// ---- concurrency ----

test('single flight inside one process: simultaneous renew() calls make one Dhan request', async () => {
  const calls = stubFetch(async () => { await new Promise((r) => setTimeout(r, 20)); return jsonRes(200, renewBody(jwt(T0 + 26 * HOUR, 'c'))); });
  const svc = makeService(fakeStore(rowFor(jwt(T0 + HOUR), T0 + HOUR)));
  await svc.load();
  await Promise.all([svc.renew(), svc.renew(), svc.renew()]);
  assert.equal(calls.length, 1);
});

test('two processes sharing the row: the lock makes the second adopt the first renewal', async () => {
  const store = fakeStore(rowFor(jwt(T0 + HOUR, 'x'), T0 + HOUR));
  const newToken = jwt(T0 + 25 * HOUR, 'y');
  const calls = stubFetch(async () => { await new Promise((r) => setTimeout(r, 20)); return jsonRes(200, renewBody(newToken)); });
  const a = makeService(store);
  const b = makeService(store);
  await Promise.all([a.load(), b.load()]);
  await Promise.all([a.tick(), b.tick()]);
  assert.equal(calls.length, 1, 'exactly one RenewToken call');
  assert.equal(a.getCredentials().accessToken, newToken);
  assert.equal(b.getCredentials().accessToken, newToken);
});

test('renewed upstream but the DB write fails: new token kept in memory and saved on the next tick', async () => {
  const store = fakeStore(rowFor(jwt(T0 + HOUR, 'x'), T0 + HOUR));
  const newToken = jwt(T0 + 25 * HOUR, 'w');
  const calls = stubFetch(() => jsonRes(200, renewBody(newToken)));
  const svc = makeService(store);
  await svc.load();
  store.failCommit = true;
  await assert.rejects(svc.renew(), (e) => e.code === 'persist_failed');
  assert.equal(svc.getCredentials().accessToken, newToken, 'provider keeps working with the new token');
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan') !== newToken, true);

  store.failCommit = false;
  await svc.tick();
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), newToken);
  assert.equal(calls.length, 1, 'persisting did not renew again');
  assert.equal(svc.needsPersist, false);
});

// ---- timers ----

test('start() schedules one unref-ed timer, runs ticks on it, stop() clears it', async () => {
  const timers = fakeTimers();
  const svc = makeService(fakeStore(rowFor(jwt(T0 + 10 * HOUR), T0 + 10 * HOUR)), { timers });
  svc.start({ initialDelayMs: 1234 });
  svc.start(); // idempotent
  assert.equal(timers.calls.length, 1);
  assert.equal(timers.calls[0].ms, 1234);
  assert.equal(timers.calls[0].unrefd, true);
  await timers.calls[0].fn();
  assert.equal(timers.calls.length, 2, 'next check scheduled after a tick');
  assert.equal(timers.calls[1].ms, 15 * 60 * 1000);
  svc.stop();
  assert.equal(timers.cleared.length, 1);
  await timers.calls[1].fn();
  assert.equal(timers.calls.length, 2, 'nothing is rescheduled after stop()');
});

// ---- store + notifier defaults ----

test('the default store takes a row lock (SELECT ... FOR UPDATE) inside a transaction', async () => {
  const seen = [];
  const fakeTx = { LOCK: { UPDATE: 'UPDATE' } };
  mock.method(db.sequelize, 'transaction', async (fn) => fn(fakeTx));
  const row = { get: () => rowFor('tok-aaaaaaaaaaaaaaaaaaaaaa', T0 + HOUR), update: async (patch, opts) => seen.push(['update', opts.transaction === fakeTx, patch.status]) };
  mock.method(db.ProviderCredential, 'findOne', async (opts) => { seen.push(['findOne', opts.lock, opts.transaction === fakeTx, opts.where.provider]); return row; });
  const svc = new DhanCredentialService();
  await svc.store.transaction(async (tx) => { await tx.read(); await tx.write({ status: 'lapsed' }); });
  assert.deepEqual(seen[0], ['findOne', 'UPDATE', true, 'dhan']);
  assert.deepEqual(seen[1], ['update', true, 'lapsed']);
});

test('default notifier: in-app notification + email to every admin, no token in either', async () => {
  const admins = [{ id: 'u1', email: 'a@example.test', app_role: 'admin', role: 'user' }, { id: 'u2', email: 'b@example.test', app_role: 'super_admin', role: 'admin' }];
  mock.method(db.User, 'findAll', async () => admins);
  const created = [];
  mock.method(db.Notification, 'bulkCreate', async (rows) => { created.push(...rows); return rows; });
  const EmailService = require('../src/services/EmailService');
  const sent = [];
  mock.method(EmailService, 'sendEmail', async (to, subject, html) => { sent.push({ to, subject, html }); });

  const svc = new DhanCredentialService();
  await svc.notifier.notifyLapse({ reason: 'Renewal rejected by Dhan', clientIdMasked: '******3626' });
  assert.deepEqual(created.map((c) => c.user_id), ['u1', 'u2']);
  assert.equal(created[0].type, 'market_data_lapsed');
  assert.equal(created[0].priority, 'high');
  assert.match(created[0].message, /web\.dhan\.co/);
  assert.deepEqual(sent.map((s) => s.to), ['a@example.test', 'b@example.test']);
  noSecretIn(JSON.stringify([created, sent]), CLIENT_ID);
});

test('a renewed token waiting to be saved never overwrites a token pasted in the meantime', async () => {
  const t1 = jwt(T0 + HOUR, 'one');
  const t2 = jwt(T0 + 25 * HOUR, 'two');
  const t3 = jwt(T0 + 30 * HOUR, 'tri');
  const store = fakeStore(rowFor(t1, T0 + HOUR));
  stubFetch((c) => (c.url.endsWith('/profile') ? jsonRes(200, profileOk()) : jsonRes(200, renewBody(t2))));
  const a = makeService(store);
  const admin = makeService(store);
  await a.load();

  store.failCommit = true;
  await assert.rejects(a.renew(), (e) => e.code === 'persist_failed');
  assert.equal(a.getCredentials().accessToken, t2, 'A keeps working with T2 in memory');
  store.failCommit = false;

  await admin.setCredentials({ clientId: CLIENT_ID, accessToken: t3 }); // admin pastes T3
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), t3);

  await a.tick(); // would previously have written T2 over T3
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), t3, 'T3 survives');
  assert.equal(a.getCredentials().accessToken, t3, 'A dropped its stale token and adopted the stored one');
  assert.equal(a.needsPersist, false);
  assert.equal(a.unpersisted, null);
  assert.ok(logs.some((l) => /newer token was stored/.test(l)));
});

test('the compare-and-set still saves the renewed token when the row is unchanged', async () => {
  const t1 = jwt(T0 + HOUR, 'one');
  const t2 = jwt(T0 + 25 * HOUR, 'two');
  const store = fakeStore(rowFor(t1, T0 + HOUR));
  stubFetch(() => jsonRes(200, renewBody(t2)));
  const svc = makeService(store);
  await svc.load();
  store.failCommit = true;
  await assert.rejects(svc.renew(), (e) => e.code === 'persist_failed');
  store.failCommit = false;
  await svc.tick();
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), t2);
});

test('default notifier: admins are chosen by effective role (app_role || role), including a super_admin with an empty app_role', async () => {
  const users = [
    { id: 'sa', email: 'sa@example.test', app_role: '', role: 'super_admin' },
    { id: 'ad', email: 'ad@example.test', app_role: 'admin', role: 'user' },
    { id: 'sa2', email: 'sa2@example.test', app_role: null, role: 'super_admin' },
    { id: 'demoted', email: 'd@example.test', app_role: 'user', role: 'admin' }, // effective role is user
    { id: 'plain', email: 'p@example.test', app_role: 'user', role: 'user' },
  ];
  let where;
  mock.method(db.User, 'findAll', async (opts) => { where = opts.where; return users; });
  const created = [];
  mock.method(db.Notification, 'bulkCreate', async (rows) => { created.push(...rows); return rows; });
  const EmailService = require('../src/services/EmailService');
  const sent = [];
  mock.method(EmailService, 'sendEmail', async (to) => { sent.push(to); });
  await new DhanCredentialService().notifier.notifyLapse({ reason: 'x', clientIdMasked: '******3626' });
  assert.deepEqual(created.map((c) => c.user_id).sort(), ['ad', 'sa', 'sa2']);
  assert.deepEqual(sent.sort(), ['ad@example.test', 'sa2@example.test', 'sa@example.test']);
  // The prefilter must be able to match a role-only super_admin.
  assert.match(require('node:util').inspect(where, { depth: 8 }), /role:/);
});
