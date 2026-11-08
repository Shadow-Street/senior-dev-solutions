const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const { parseAdsEnabled, coerceBoolean } = require('../src/utils/adsSetting');

let settings;
let audits;
let campaigns;
const ADVISOR = { id: '44444444-4444-4444-8444-444444444444', email: 'adv@example.test', app_role: 'advisor', role: 'advisor', status: 'active' };

beforeEach(() => {
  stubUserLookup({ [ADVISOR.id]: { ...ADVISOR } });
  settings = fakeTable().install(mock, db.PlatformSetting);
  audits = fakeTable().install(mock, db.AuditLog);
  campaigns = fakeTable().install(mock, db.AdCampaign);
  // No database: run the transaction callback inline.
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
});
afterEach(() => mock.restoreAll());

const put = (u, body) => {
  const r = request(app).put('/api/platform/settings/ads-status');
  if (u) r.set('Authorization', bearer(u));
  return r.send(body);
};
const getStatus = () => request(app).get('/api/platform/settings/ads-status');

describe('parseAdsEnabled / coerceBoolean', () => {
  test('missing means enabled; only explicit true values enable; junk fails closed', () => {
    for (const v of [undefined, null, '', true, 'true', 'TRUE', '1', 1]) assert.equal(parseAdsEnabled(v), true, String(v));
    for (const v of [false, 'false', '0', 0, 'banana']) assert.equal(parseAdsEnabled(v), false, String(v));
  });
  test('admin input must be a real boolean', () => {
    assert.equal(coerceBoolean(true), true);
    assert.equal(coerceBoolean('false'), false);
    for (const v of [undefined, null, 'yes', 1, 0, {}, []]) assert.equal(coerceBoolean(v), null, String(v));
  });
});

describe('GET /api/platform/settings/ads-status (public)', () => {
  test('anonymous read defaults to enabled when the setting is missing', async () => {
    const res = await getStatus();
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { enabled: true });
  });

  test('reflects the stored value without a token', async () => {
    settings.add({ key: 'ads_enabled', value: 'false' });
    assert.deepEqual((await getStatus()).body, { enabled: false });
    settings.rows[0].value = 'true';
    assert.deepEqual((await getStatus()).body, { enabled: true });
  });

  test('does not leak other settings', async () => {
    settings.add({ key: 'ads_enabled', value: 'true' });
    settings.add({ key: 'razorpay_key_secret', value: 'shh' });
    assert.deepEqual(Object.keys((await getStatus()).body), ['enabled']);
  });
});

describe('PUT /api/platform/settings/ads-status (admin only)', () => {
  test('401 anonymous, 403 user and advisor; nothing is written', async () => {
    assert.equal((await put(null, { enabled: false })).status, 401);
    assert.equal((await put(USERS.user, { enabled: false })).status, 403);
    assert.equal((await put(ADVISOR, { enabled: false })).status, 403);
    assert.equal(settings.rows.length, 0);
    assert.equal(audits.rows.length, 0);
  });

  test('400 for anything that is not a boolean', async () => {
    for (const body of [{}, { enabled: 'maybe' }, { enabled: 1 }, { enabled: null }, { enabled: {} }]) {
      assert.equal((await put(USERS.admin, body)).status, 400, JSON.stringify(body));
    }
    assert.equal(settings.rows.length, 0);
  });

  test('admin and super_admin can disable and re-enable; stored as text, audited', async () => {
    let res = await put(USERS.admin, { enabled: false, key: 'other', value: 'x' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { enabled: false });
    assert.equal(settings.rows.length, 1);
    assert.equal(settings.rows[0].key, 'ads_enabled');
    assert.equal(settings.rows[0].value, 'false');
    assert.deepEqual((await getStatus()).body, { enabled: false });

    res = await put(USERS.superAdmin, { enabled: true });
    assert.deepEqual(res.body, { enabled: true });
    assert.equal(settings.rows.length, 1, 'upserts one row');
    assert.deepEqual((await getStatus()).body, { enabled: true });

    assert.equal(audits.rows.length, 2);
    assert.equal(audits.rows[0].action, 'ads_enabled_changed');
    assert.equal(audits.rows[0].user_id, USERS.admin.id);
    assert.deepEqual(audits.rows[0].old_data, { enabled: true });
    assert.deepEqual(audits.rows[0].new_data, { enabled: false });
    assert.deepEqual(audits.rows[1].old_data, { enabled: false });
  });

  test('a failing audit write does not fail the change', async () => {
    mock.method(db.AuditLog, 'create', async () => { throw new Error('audit down'); });
    const res = await put(USERS.admin, { enabled: false });
    assert.equal(res.status, 200);
    assert.equal(settings.rows[0].value, 'false');
  });

  test('the generic key writer cannot bypass validation for ads_enabled', async () => {
    const res = await request(app).put('/api/platform/settings/key/ads_enabled')
      .set('Authorization', bearer(USERS.admin)).send({ value: 'banana' });
    assert.equal(res.status, 400);
    assert.equal(settings.rows.length, 0);
  });
});

describe('ad serving honours the switch', () => {
  const live = () => campaigns.add({ title: 'Live', status: 'active', start_date: new Date(Date.now() - 1000), end_date: null, priority: 1 });

  test('GET /api/ads/campaigns/active serves campaigns while enabled (default)', async () => {
    live();
    const res = await request(app).get('/api/ads/campaigns/active');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
  });

  test('GET /api/ads/campaigns/active returns [] while disabled', async () => {
    live();
    settings.add({ key: 'ads_enabled', value: 'false' });
    const res = await request(app).get('/api/ads/campaigns/active');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
    assert.equal(campaigns.calls.filter(([m]) => m === 'findAll').length, 0, 'does not even query campaigns');
  });
});

describe('generic platform settings CRUD cannot touch ads_enabled', () => {
  const as = (u, method, path, body) => {
    const r = request(app)[method](path);
    if (u) r.set('Authorization', bearer(u));
    return body === undefined ? r : r.send(body);
  };

  test('create by key is refused (403), nothing written', async () => {
    const res = await as(USERS.admin, 'post', '/api/platform/settings', { key: 'ads_enabled', value: 'banana' });
    assert.equal(res.status, 403);
    assert.equal(settings.rows.length, 0);
  });

  test('update and delete by id are refused when the row is ads_enabled', async () => {
    const row = settings.add({ key: 'ads_enabled', value: 'false' });
    row.destroy = async () => { settings.rows.splice(settings.rows.indexOf(row), 1); };

    assert.equal((await as(USERS.admin, 'put', `/api/platform/settings/${row.id}`, { value: 'true' })).status, 403);
    assert.equal((await as(USERS.superAdmin, 'delete', `/api/platform/settings/${row.id}`)).status, 403);
    assert.equal(settings.rows.length, 1, 'row survives');
    assert.equal(row.value, 'false', 'value unchanged');
    assert.deepEqual((await getStatus()).body, { enabled: false }, 'ads stay off');
  });

  test('renaming another row into ads_enabled is refused', async () => {
    const other = settings.add({ key: 'site_name', value: 'x' });
    const res = await as(USERS.admin, 'put', `/api/platform/settings/${other.id}`, { key: 'ads_enabled', value: 'true' });
    assert.equal(res.status, 403);
    assert.equal(other.key, 'site_name');
  });

  test('bulk update / delete with a single (non-array) id cannot reach it', async () => {
    const row = settings.add({ key: 'ads_enabled', value: 'false' });
    assert.equal((await as(USERS.admin, 'put', '/api/platform/settings/bulk', { ids: row.id, data: { value: 'true' } })).status, 403);
    assert.equal((await as(USERS.admin, 'delete', '/api/platform/settings/bulk', { ids: row.id })).status, 403);
    assert.equal(row.value, 'false');
    assert.equal(settings.rows.length, 1);
  });

  test('bulk create / update / delete cannot reach it either', async () => {
    const row = settings.add({ key: 'ads_enabled', value: 'false' });
    assert.equal((await as(USERS.admin, 'post', '/api/platform/settings/bulk', [{ key: 'ads_enabled', value: 'true' }])).status, 403);
    assert.equal((await as(USERS.admin, 'put', '/api/platform/settings/bulk', { ids: [row.id], data: { value: 'true' } })).status, 403);
    assert.equal((await as(USERS.admin, 'delete', '/api/platform/settings/bulk', { ids: [row.id] })).status, 403);
    assert.equal(row.value, 'false');
    assert.equal(settings.rows.length, 1);
  });

  test('other settings stay writable by admins, and still need admin', async () => {
    const other = settings.add({ key: 'site_name', value: 'old' });
    const ok = await as(USERS.admin, 'put', `/api/platform/settings/${other.id}`, { value: 'new' });
    assert.equal(ok.status, 200);
    assert.equal(other.value, 'new');
    assert.equal((await as(USERS.user, 'put', `/api/platform/settings/${other.id}`, { value: 'hack' })).status, 403);
    assert.equal((await as(null, 'delete', `/api/platform/settings/${other.id}`)).status, 401);
  });

  test('the write path works without a UNIQUE(key) index: duplicates are all updated, none created', async () => {
    const a = settings.add({ key: 'ads_enabled', value: 'true' });
    const b = settings.add({ key: 'ads_enabled', value: 'true' });
    assert.equal((await put(USERS.admin, { enabled: false })).status, 200);
    assert.equal(a.value, 'false');
    assert.equal(b.value, 'false');
    assert.equal(settings.rows.length, 2);
  });
});
