const { test, afterEach, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const mdCrypto = require('../src/utils/marketDataCrypto');
const { dhanCredentials } = require('../src/services/DhanCredentialService');
const { FinDataService } = require('../src/services/FinDataService');

const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const CLIENT_ID = '1100003626';
const HOUR = 3600 * 1000;
const NOW = Date.now();
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (expMs, tag = 'a') => `${b64u({ alg: 'HS512' })}.${b64u({ exp: Math.floor(expMs / 1000), tag })}.${tag.repeat(24)}`;
const jsonRes = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const profileOk = () => ({ dhanClientId: CLIENT_ID, tokenValidity: '31/12/2099 10:00', dataPlan: 'Active', dataValidity: '2099-01-01 00:00:00.0' });

// Distinct admins so the per-admin write rate limit (10 / 15 min) is never shared between tests.
const ADMINS = Array.from({ length: 8 }, (_, i) => ({
  id: `4000000${i}-0000-4000-8000-000000000000`, email: `admin${i}@example.test`, app_role: i % 2 ? 'super_admin' : 'admin', role: 'admin', status: 'active',
}));
const ADVISOR = { id: '55555555-5555-4555-8555-555555555555', email: 'adv@example.test', app_role: 'advisor', role: 'user', status: 'active' };
let nextAdmin = 0;
const takeAdmin = () => ADMINS[nextAdmin++ % ADMINS.length];

function memoryStore() {
  const st = { row: null };
  st.get = async () => (st.row ? { ...st.row } : null);
  st.transaction = async (fn) => {
    let cur = st.row ? { ...st.row } : null;
    let wrote = false;
    const out = await fn({ read: async () => (cur ? { ...cur } : null), write: async (patch) => { cur = { provider: 'dhan', ...(cur || {}), ...patch }; wrote = true; } });
    if (wrote) st.row = cur;
    return out;
  };
  return st;
}

let store;
let audits;
let logs;
const saved = {};

beforeEach(() => {
  process.env.MARKET_DATA_KEY = KEY;
  store = memoryStore();
  Object.assign(saved, {
    storeOverride: dhanCredentials.storeOverride, notifierOverride: dhanCredentials.notifierOverride,
    state: dhanCredentials.state, token: dhanCredentials.token, loadProblem: dhanCredentials.loadProblem,
  });
  dhanCredentials.storeOverride = store;
  dhanCredentials.notifierOverride = { notifyLapse: async () => {} };
  dhanCredentials.state = null;
  dhanCredentials.token = null;
  dhanCredentials.loadProblem = null;
  audits = [];
  mock.method(db.AuditLog, 'create', async (row) => { audits.push(row); return row; });
  stubUserLookup({ [ADVISOR.id]: ADVISOR, ...Object.fromEntries(ADMINS.map((a) => [a.id, a])) });
  logs = [];
  for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, (...a) => logs.push(a.join(' ')));
});
afterEach(() => {
  mock.restoreAll();
  process.env.MARKET_DATA_KEY = '';
  Object.assign(dhanCredentials, saved);
});

const as = (user, method, path) => request(app)[method](path).set('Authorization', bearer(user));

// ---- access control ----

test('401 without a token on every market-data admin route', async () => {
  for (const [method, path] of [['get', '/dhan'], ['put', '/dhan'], ['post', '/dhan/renew'], ['post', '/dhan/test']]) {
    const res = await request(app)[method](`/api/admin/market-data${path}`);
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('403 for a regular user and for an advisor on every route (and nothing is called)', async () => {
  const fetchCalls = [];
  mock.method(globalThis, 'fetch', async (u) => { fetchCalls.push(String(u)); return jsonRes(200, profileOk()); });
  for (const who of [USERS.user, ADVISOR]) {
    for (const [method, path] of [['get', '/dhan'], ['put', '/dhan'], ['post', '/dhan/renew'], ['post', '/dhan/test']]) {
      const res = await as(who, method, `/api/admin/market-data${path}`).send({ clientId: CLIENT_ID, accessToken: jwt(NOW + HOUR) });
      assert.equal(res.status, 403, `${who.app_role} ${method} ${path}`);
    }
  }
  assert.equal(fetchCalls.length, 0);
  assert.equal(store.row, null);
  assert.equal(audits.length, 0);
});

// ---- status ----

test('GET status for admin and super_admin: not configured, then configured - never any token', async () => {
  const admin = takeAdmin();
  const superAdmin = takeAdmin();
  let res = await as(admin, 'get', '/api/admin/market-data/dhan');
  assert.equal(res.status, 200);
  assert.equal(res.body.configured, false);
  assert.equal(res.body.status, 'not_configured');
  assert.equal(res.body.provider_active, false);
  assert.equal(res.body.encryption_available, true);
  for (const k of ['universe_size', 'snapshot_at', 'market_open', 'expires_at', 'last_renewed_at', 'last_error']) assert.ok(k in res.body, k);
  assert.equal(res.headers['cache-control'], 'no-store');

  const token = jwt(NOW + 12 * HOUR, 'g');
  mock.method(globalThis, 'fetch', async () => jsonRes(200, profileOk()));
  await as(superAdmin, 'put', '/api/admin/market-data/dhan').send({ clientId: CLIENT_ID, accessToken: token });
  res = await as(superAdmin, 'get', '/api/admin/market-data/dhan');
  assert.equal(res.status, 200);
  assert.equal(res.body.configured, true);
  assert.equal(res.body.client_id_masked, '******3626');
  assert.equal(res.body.active, true);
  assert.equal(res.body.provider_active, true);
  assert.ok(res.body.expires_at);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes(token) && !text.includes(CLIENT_ID));
});

test('GET status explains a missing encryption key', async () => {
  process.env.MARKET_DATA_KEY = '';
  const res = await as(takeAdmin(), 'get', '/api/admin/market-data/dhan');
  assert.equal(res.status, 200);
  assert.equal(res.body.encryption_available, false);
  assert.equal(res.body.disabled_reason, 'encryption_key_missing');
  assert.equal(res.body.active, false);
});

// ---- PUT ----

test('PUT validates the body before touching Dhan', async () => {
  const calls = [];
  mock.method(globalThis, 'fetch', async (u) => { calls.push(String(u)); return jsonRes(200, profileOk()); });
  const admin = takeAdmin();
  for (const body of [{}, { clientId: CLIENT_ID }, { accessToken: jwt(NOW + HOUR) }, { clientId: 123, accessToken: jwt(NOW + HOUR) }, { clientId: 'abc', accessToken: jwt(NOW + HOUR) }, { clientId: CLIENT_ID, accessToken: 'short' }]) {
    const res = await as(admin, 'put', '/api/admin/market-data/dhan').send(body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.ok(res.body.error);
  }
  assert.equal(calls.length, 0);
  assert.equal(store.row, null);
});

test('PUT stores a verified token encrypted, audits it, and never echoes it', async () => {
  const token = jwt(NOW + 12 * HOUR, 'v');
  mock.method(globalThis, 'fetch', async () => jsonRes(200, profileOk()));
  const admin = takeAdmin();
  const res = await as(admin, 'put', '/api/admin/market-data/dhan').send({ clientId: CLIENT_ID, accessToken: token });
  assert.equal(res.status, 200);
  assert.equal(res.body.active, true);
  assert.equal(res.body.client_id_masked, '******3626');
  assert.ok(!JSON.stringify(res.body).includes(token));
  assert.ok(store.row.access_token_encrypted.startsWith('v1:'));
  assert.ok(!JSON.stringify(store.row).includes(token));
  assert.equal(mdCrypto.decryptSecret(store.row.access_token_encrypted, 'provider_credentials:dhan'), token);
  assert.equal(store.row.updated_by, admin.id);
  assert.equal(dhanCredentials.getCredentials().accessToken, token, 'provider can use it immediately');

  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'market_data.dhan.update');
  assert.equal(audits[0].user_id, admin.id);
  assert.ok(!JSON.stringify(audits).includes(token));
  assert.ok(!JSON.stringify(audits).includes(CLIENT_ID));
  assert.ok(!logs.join('\n').includes(token));
});

test('PUT: a token Dhan rejects is not stored, the error is generic, and the attempt is audited', async () => {
  const token = jwt(NOW + 12 * HOUR, 'b');
  mock.method(globalThis, 'fetch', async () => jsonRes(401, { errorCode: 'DH-901', errorMessage: `invalid ${token}` }));
  const res = await as(takeAdmin(), 'put', '/api/admin/market-data/dhan').send({ clientId: CLIENT_ID, accessToken: token });
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'invalid_credentials');
  assert.ok(!JSON.stringify(res.body).includes(token));
  assert.equal(store.row, null);
  assert.equal(dhanCredentials.getCredentials(), null);
  assert.equal(audits[0].action, 'market_data.dhan.update_rejected');
  assert.ok(!JSON.stringify(audits).includes(token));
  assert.ok(!logs.join('\n').includes(token));
});

test('PUT without MARKET_DATA_KEY answers 503 and stores nothing', async () => {
  process.env.MARKET_DATA_KEY = '';
  const calls = [];
  mock.method(globalThis, 'fetch', async (u) => { calls.push(u); return jsonRes(200, profileOk()); });
  const res = await as(takeAdmin(), 'put', '/api/admin/market-data/dhan').send({ clientId: CLIENT_ID, accessToken: jwt(NOW + HOUR) });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, 'crypto_unavailable');
  assert.equal(store.row, null);
  assert.equal(calls.length, 0);
});

// ---- renew / test ----

test('POST renew: 409 when nothing is stored; renews a stored token and audits without secrets', async () => {
  const admin = takeAdmin();
  let res = await as(admin, 'post', '/api/admin/market-data/dhan/renew');
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'not_configured');

  const oldToken = jwt(NOW + 2 * HOUR, 'o');
  const newToken = jwt(NOW + 26 * HOUR, 'n');
  store.row = {
    provider: 'dhan', client_id: CLIENT_ID, status: 'active', expires_at: new Date(NOW + 2 * HOUR),
    access_token_encrypted: mdCrypto.encryptSecret(oldToken, 'provider_credentials:dhan'),
  };
  mock.method(globalThis, 'fetch', async () => jsonRes(200, { accessToken: newToken, expiryTime: '2099-01-01T00:00:00' }));
  res = await as(admin, 'post', '/api/admin/market-data/dhan/renew');
  assert.equal(res.status, 200);
  assert.ok(res.body.last_renewed_at);
  const text = JSON.stringify([res.body, audits]);
  assert.ok(!text.includes(oldToken) && !text.includes(newToken));
  assert.equal(audits.at(-1).action, 'market_data.dhan.renew');
});

test('POST renew: a lapsed credential answers 409 with the paste-a-new-token guidance', async () => {
  const token = jwt(NOW + 2 * HOUR, 'x');
  store.row = {
    provider: 'dhan', client_id: CLIENT_ID, status: 'active', expires_at: new Date(NOW + 2 * HOUR),
    access_token_encrypted: mdCrypto.encryptSecret(token, 'provider_credentials:dhan'),
  };
  mock.method(globalThis, 'fetch', async () => jsonRes(401, {}));
  const res = await as(takeAdmin(), 'post', '/api/admin/market-data/dhan/renew');
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'lapsed');
  assert.match(res.body.error, /web\.dhan\.co/);
  assert.equal(res.body.status, 'lapsed');
  assert.ok(!JSON.stringify(res.body).includes(token));
});

test('POST test: reports ok with validity, or the reason, without any secret', async () => {
  const admin = takeAdmin();
  let res = await as(admin, 'post', '/api/admin/market-data/dhan/test');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.reason, 'not_configured');

  const token = jwt(NOW + 12 * HOUR, 't');
  mock.method(globalThis, 'fetch', async () => jsonRes(200, profileOk()));
  await as(admin, 'put', '/api/admin/market-data/dhan').send({ clientId: CLIENT_ID, accessToken: token });
  res = await as(admin, 'post', '/api/admin/market-data/dhan/test');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data_plan, 'Active');
  assert.ok(!JSON.stringify(res.body).includes(token));

  mock.restoreAll();
  stubUserLookup({ [ADVISOR.id]: ADVISOR, ...Object.fromEntries(ADMINS.map((a) => [a.id, a])) });
  mock.method(db.AuditLog, 'create', async (row) => row);
  mock.method(globalThis, 'fetch', async () => jsonRes(200, { ...profileOk(), dataPlan: 'Deactive' }));
  res = await as(admin, 'post', '/api/admin/market-data/dhan/test');
  assert.equal(res.body.ok, false);
  assert.equal(res.body.reason, 'subscription_inactive');
});

test('provider status reflects the live provider', async () => {
  const res = await as(takeAdmin(), 'get', '/api/admin/market-data/dhan');
  assert.equal(res.body.provider_active, FinDataService.dhanActive);
});
