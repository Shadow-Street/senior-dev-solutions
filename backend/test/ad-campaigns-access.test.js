const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');

const VENDOR = { id: '55555555-5555-4555-8555-555555555555', email: 'v@example.test', app_role: 'vendor', role: 'vendor', status: 'active' };
const VENDOR2 = { id: '66666666-6666-4666-8666-666666666666', email: 'v2@example.test', app_role: 'vendor', role: 'vendor', status: 'active' };
const ADVISOR = { id: '44444444-4444-4444-8444-444444444444', email: 'a@example.test', app_role: 'advisor', role: 'advisor', status: 'active' };

let campaigns;
beforeEach(() => {
  stubUserLookup({ [VENDOR.id]: { ...VENDOR }, [VENDOR2.id]: { ...VENDOR2 }, [ADVISOR.id]: { ...ADVISOR } });
  campaigns = fakeTable().install(mock, db.AdCampaign);
  mock.method(db.PlatformSetting, 'findOne', async () => null); // ads enabled by default
});
afterEach(() => mock.restoreAll());

const as = (u, method, path, body) => {
  const r = request(app)[method](path);
  if (u) r.set('Authorization', bearer(u));
  return body === undefined ? r : r.send(body);
};
const mine = () => campaigns.add({ name: 'Mine', advertiser_id: VENDOR.id, status: 'draft' });
const theirs = () => campaigns.add({ name: 'Theirs', advertiser_id: VENDOR2.id, status: 'active' });

describe('campaign CRUD is limited to admins and vendors', () => {
  test('401 anonymous; 403 plain user and advisor on every verb; nothing changes', async () => {
    const row = theirs();
    row.destroy = async () => { campaigns.rows.splice(campaigns.rows.indexOf(row), 1); };
    for (const [m, p, body] of [
      ['get', '/api/ads/campaigns'], ['get', `/api/ads/campaigns/${row.id}`],
      ['post', '/api/ads/campaigns', { name: 'x', status: 'active' }],
      ['put', `/api/ads/campaigns/${row.id}`, { status: 'paused' }],
      ['delete', `/api/ads/campaigns/${row.id}`],
    ]) {
      assert.equal((await as(null, m, p, body)).status, 401, `${m} anon`);
      assert.equal((await as(USERS.user, m, p, body)).status, 403, `${m} user`);
      assert.equal((await as(ADVISOR, m, p, body)).status, 403, `${m} advisor`);
    }
    assert.equal(campaigns.rows.length, 1);
    assert.equal(row.status, 'active');
  });

  test('/active stays public and still serves only active, in-window campaigns', async () => {
    campaigns.add({ name: 'Live', status: 'active', start_date: new Date(Date.now() - 1000), end_date: null });
    campaigns.add({ name: 'Pending', status: 'pending', start_date: new Date(Date.now() - 1000), end_date: null });
    const res = await as(null, 'get', '/api/ads/campaigns/active');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((c) => c.name), ['Live']);
  });
});

describe('vendors', () => {
  test('list shows only their own campaigns; admins see all', async () => {
    mine(); theirs();
    const v = await as(VENDOR, 'get', '/api/ads/campaigns?vendor_id=anything');
    assert.deepEqual(v.body.map((c) => c.name), ['Mine']);
    const a = await as(USERS.admin, 'get', '/api/ads/campaigns');
    assert.equal(a.body.length, 2);
  });

  test('cannot read, edit or delete another vendor\'s campaign (404)', async () => {
    const row = theirs();
    row.destroy = async () => { campaigns.rows.splice(campaigns.rows.indexOf(row), 1); };
    assert.equal((await as(VENDOR, 'get', `/api/ads/campaigns/${row.id}`)).status, 404);
    assert.equal((await as(VENDOR, 'put', `/api/ads/campaigns/${row.id}`, { name: 'hijack' })).status, 404);
    assert.equal((await as(VENDOR, 'delete', `/api/ads/campaigns/${row.id}`)).status, 404);
    assert.equal(row.name, 'Theirs');
    assert.equal(campaigns.rows.length, 1);
  });

  test('a created campaign is owned by the caller and starts pending, whatever the body says', async () => {
    const res = await as(VENDOR, 'post', '/api/ads/campaigns', {
      name: 'New', advertiser_id: VENDOR2.id, status: 'active', priority: 99, impressions: 1e6, spent: 0,
    });
    assert.equal(res.status, 201);
    const row = campaigns.rows[0];
    assert.equal(row.advertiser_id, VENDOR.id);
    assert.equal(row.status, 'pending');
    assert.equal(row.priority, undefined);
    assert.equal(row.impressions, undefined);
  });

  test('cannot activate their own campaign or change delivery fields; cannot reassign it', async () => {
    const row = mine();
    const res = await as(VENDOR, 'put', `/api/ads/campaigns/${row.id}`, { name: 'Renamed', status: 'active', priority: 99, advertiser_id: VENDOR2.id });
    assert.equal(res.status, 200);
    assert.equal(row.name, 'Renamed');
    assert.equal(row.status, 'draft');
    assert.equal(row.priority, undefined);
    assert.equal(row.advertiser_id, VENDOR.id);
  });

  test('editing an approved campaign sends it back to pending (no swap-after-approval)', async () => {
    const row = campaigns.add({ name: 'Approved', advertiser_id: VENDOR.id, status: 'active' });
    assert.equal((await as(VENDOR, 'put', `/api/ads/campaigns/${row.id}`, { name: 'Different creative' })).status, 200);
    assert.equal(row.status, 'pending');
  });

  test('can delete their own campaign', async () => {
    const row = mine();
    row.destroy = async () => { campaigns.rows.splice(campaigns.rows.indexOf(row), 1); };
    assert.equal((await as(VENDOR, 'delete', `/api/ads/campaigns/${row.id}`)).status, 200);
    assert.equal(campaigns.rows.length, 0);
  });

  test('bulk routes stay admin-only', async () => {
    for (const [m, body] of [['post', [{ name: 'x', status: 'active' }]], ['put', { ids: [], data: { status: 'active' } }], ['delete', { ids: [] }]]) {
      assert.equal((await as(VENDOR, m, '/api/ads/campaigns/bulk', body)).status, 403, m);
    }
  });
});

describe('admins', () => {
  test('can create an active campaign, activate a vendor\'s, and delete', async () => {
    const created = await as(USERS.admin, 'post', '/api/ads/campaigns', { name: 'House', status: 'active', priority: 5 });
    assert.equal(created.status, 201);
    assert.equal(campaigns.rows[0].status, 'active');
    assert.equal(campaigns.rows[0].advertiser_id, USERS.admin.id);

    const row = mine();
    row.destroy = async () => { campaigns.rows.splice(campaigns.rows.indexOf(row), 1); };
    assert.equal((await as(USERS.superAdmin, 'put', `/api/ads/campaigns/${row.id}`, { status: 'active' })).status, 200);
    assert.equal(row.status, 'active');
    assert.equal((await as(USERS.admin, 'delete', `/api/ads/campaigns/${row.id}`)).status, 200);
  });
});
