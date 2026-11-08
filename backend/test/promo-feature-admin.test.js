const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');

let promos;
let features;
beforeEach(() => {
  stubUserLookup();
  promos = fakeTable().install(mock, db.PromoCode);
  features = fakeTable().install(mock, db.FeatureConfig);
});
afterEach(() => mock.restoreAll());

const as = (u, method, path, body) => {
  const r = request(app)[method](path);
  if (u) r.set('Authorization', bearer(u));
  return body === undefined ? r : r.send(body);
};

describe('promo code admin API', () => {
  const NEW = { code: 'summer25', discount_percent: 25, max_uses: 100, expires_at: '2030-01-01T00:00:00.000Z', is_active: true };

  test('401 anonymous, 403 customer, for every verb', async () => {
    const row = promos.add({ code: 'X1', discount_percent: 5 });
    for (const [m, p] of [['get', '/api/subscriptions/promo-codes'], ['post', '/api/subscriptions/promo-codes'], ['put', `/api/subscriptions/promo-codes/${row.id}`], ['delete', `/api/subscriptions/promo-codes/${row.id}`]]) {
      assert.equal((await as(null, m, p, {})).status, 401, `${m} anon`);
      assert.equal((await as(USERS.user, m, p, {})).status, 403, `${m} user`);
    }
    assert.equal(promos.rows.length, 1);
  });

  test('create stores the real model columns, upper-cases the code and stamps created_by', async () => {
    const res = await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { ...NEW, uses_count: 99, created_by: 'spoof', id: 'spoof' });
    assert.equal(res.status, 201);
    const row = promos.rows[0];
    assert.equal(row.code, 'SUMMER25');
    assert.equal(row.discount_percent, 25);
    assert.equal(row.discount_amount, null);
    assert.equal(row.max_uses, 100);
    assert.equal(row.uses_count, 0, 'client cannot pre-spend or reset usage');
    assert.equal(row.created_by, USERS.admin.id);
    assert.notEqual(row.id, 'spoof');
    assert.ok(row.expires_at instanceof Date);
    // the list shape the admin table reads
    const list = await as(USERS.admin, 'get', '/api/subscriptions/promo-codes');
    assert.deepEqual(
      ['code', 'discount_percent', 'max_uses', 'uses_count', 'expires_at', 'is_active'].every((k) => k in list.body[0]),
      true
    );
  });

  test('flat-amount codes; percent and flat are mutually exclusive; one is required', async () => {
    assert.equal((await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { code: 'FLAT100', discount_amount: 100 })).status, 201);
    assert.equal(promos.rows[0].discount_amount, 100);
    assert.equal(promos.rows[0].discount_percent, null);
    for (const body of [
      { code: 'BOTH', discount_percent: 10, discount_amount: 10 },
      { code: 'NONE' },
      { code: 'ZERO', discount_percent: 0 },
      { code: 'OVER', discount_percent: 101 },
      { code: 'NEG', discount_amount: -5 },
      { code: 'NAN', discount_percent: 'abc' },
      { code: 'FRAC', discount_percent: 12.5 },
    ]) {
      const res = await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    assert.equal(promos.rows.length, 1);
  });

  test('rejects bad codes, dates, limits and duplicates', async () => {
    for (const body of [
      { ...NEW, code: 'a b' }, { ...NEW, code: 'x' }, { ...NEW, code: '<script>' },
      { ...NEW, expires_at: 'not a date' }, { ...NEW, max_uses: 0 }, { ...NEW, max_uses: -1 },
      { ...NEW, is_active: 'yes' }, { ...NEW, applicable_to: 'premium' }, { ...NEW, min_order_amount: -1 },
    ]) {
      assert.equal((await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', NEW)).status, 201);
    assert.equal((await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { ...NEW, code: 'SUMMER25' })).status, 409);
  });

  test('blank expiry and limit mean "no expiry" / "unlimited"', async () => {
    const res = await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { code: 'FOREVER', discount_percent: 10, expires_at: '', max_uses: '' });
    assert.equal(res.status, 201);
    assert.equal(promos.rows[0].expires_at, null);
    assert.equal(promos.rows[0].max_uses, null);
  });

  test('plan restriction is stored as a list, or "all"', async () => {
    await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { code: 'ONLYVIP', discount_percent: 10, applicable_to: ['plan-vip', 'plan-vip'] });
    assert.deepEqual(promos.rows[0].applicable_to, ['plan-vip']);
    await as(USERS.admin, 'post', '/api/subscriptions/promo-codes', { code: 'EVERY', discount_percent: 10, applicable_to: [] });
    assert.equal(promos.rows[1].applicable_to, 'all');
  });

  test('update whitelists fields: usage and creator cannot be changed; switching percent to flat works', async () => {
    const row = promos.add({ code: 'EDIT', discount_percent: 10, discount_amount: null, uses_count: 4, created_by: 'someone', is_active: true });
    const res = await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${row.id}`, {
      code: 'EDIT', discount_percent: null, discount_amount: 75, is_active: false, uses_count: 0, created_by: 'me', id: 'x',
    });
    assert.equal(res.status, 200);
    assert.deepEqual([row.discount_percent, row.discount_amount, row.is_active, row.uses_count, row.created_by], [null, 75, false, 4, 'someone']);
  });

  test('update cannot set the limit below redemptions already made, or collide with another code', async () => {
    const a = promos.add({ code: 'AAA', discount_percent: 10, uses_count: 5 });
    promos.add({ code: 'BBB', discount_percent: 10 });
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${a.id}`, { max_uses: 3 })).status, 400);
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${a.id}`, { code: 'BBB' })).status, 409);
    assert.equal((await as(USERS.admin, 'put', '/api/subscriptions/promo-codes/missing', { is_active: false })).status, 404);
  });

  test('delete', async () => {
    const row = promos.add({ code: 'DEL', discount_percent: 10 });
    assert.equal((await as(USERS.admin, 'delete', `/api/subscriptions/promo-codes/${row.id}`)).status, 200);
    assert.equal(promos.rows.length, 0);
  });
});

describe('100% promo codes need a limit (admin API)', () => {
  const post = (body) => as(USERS.admin, 'post', '/api/subscriptions/promo-codes', body);

  test('create: refused without max_uses or one_time_per_user, accepted with either', async () => {
    const bare = await post({ code: 'GIFT', discount_percent: 100 });
    assert.equal(bare.status, 400);
    assert.match(bare.body.error, /needs a usage limit/);
    assert.equal(promos.rows.length, 0);
    assert.equal((await post({ code: 'GIFT', discount_percent: 100, one_time_per_user: false })).status, 400);
    assert.equal((await post({ code: 'GIFT1', discount_percent: 100, max_uses: 50 })).status, 201);
    assert.equal((await post({ code: 'GIFT2', discount_percent: 100, one_time_per_user: true })).status, 201);
    assert.equal((await post({ code: 'HALF', discount_percent: 99 })).status, 201, 'only 100% is restricted');
  });

  test('update: cannot turn a code into an unlimited 100% code, by any route', async () => {
    const half = promos.add({ code: 'HALF', discount_percent: 50, max_uses: null, one_time_per_user: false });
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${half.id}`, { discount_percent: 100 })).status, 400);
    assert.equal(half.discount_percent, 50);
    // limited code: removing the limit is refused
    const gift = promos.add({ code: 'GIFT', discount_percent: 100, max_uses: 10, one_time_per_user: false });
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${gift.id}`, { max_uses: '' })).status, 400);
    assert.equal(gift.max_uses, 10);
    // ...but swapping one limit for the other is fine, and so is lowering the percentage
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${gift.id}`, { max_uses: '', one_time_per_user: true })).status, 200);
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${gift.id}`, { discount_percent: 40, one_time_per_user: false })).status, 200);
  });

  test('update: setting both limits and the percentage together works', async () => {
    const half = promos.add({ code: 'HALF', discount_percent: 50 });
    assert.equal((await as(USERS.admin, 'put', `/api/subscriptions/promo-codes/${half.id}`, { discount_percent: 100, max_uses: 20 })).status, 200);
    assert.equal(half.discount_percent, 100);
  });
});

describe('feature configuration API (Add New Feature)', () => {
  const NEW = { feature_key: 'ai_stock_insights', feature_name: 'AI Stock Insights', description: 'Daily AI notes', tier: 'premium' };

  test('401 anonymous / 403 customer on create, update and delete; reads stay public', async () => {
    const row = features.add({ feature_key: 'existing', feature_name: 'Existing', tier: 'basic', access_level: 'free' });
    assert.equal((await as(null, 'post', '/api/features', NEW)).status, 401);
    assert.equal((await as(USERS.user, 'post', '/api/features', NEW)).status, 403);
    assert.equal((await as(USERS.user, 'put', `/api/features/${row.id}`, { tier: 'vip' })).status, 403);
    assert.equal((await as(USERS.user, 'delete', `/api/features/${row.id}`)).status, 403);
    assert.equal((await as(null, 'get', '/api/features')).status, 200);
  });

  test('the default Basic tier now saves (access_level was being set to the invalid value "basic")', async () => {
    const res = await as(USERS.superAdmin, 'post', '/api/features', { feature_key: 'basic_thing', feature_name: 'Basic Thing', tier: 'basic' });
    assert.equal(res.status, 201);
    assert.deepEqual([features.rows[0].tier, features.rows[0].access_level], ['basic', 'free']);
  });

  test('premium and vip map to the matching access_level; tier defaults to basic', async () => {
    await as(USERS.admin, 'post', '/api/features', NEW);
    await as(USERS.admin, 'post', '/api/features', { feature_key: 'vip_thing', feature_name: 'VIP', tier: 'vip' });
    await as(USERS.admin, 'post', '/api/features', { feature_key: 'plain', feature_name: 'Plain' });
    assert.deepEqual(features.rows.map((r) => [r.tier, r.access_level]), [['premium', 'premium'], ['vip', 'vip'], ['basic', 'free']]);
  });

  test('the created feature appears in the list the plan editors read', async () => {
    await as(USERS.admin, 'post', '/api/features', NEW);
    const list = await as(null, 'get', '/api/features');
    assert.deepEqual(list.body.map((f) => f.feature_key), ['ai_stock_insights']);
  });

  test('validation: key format, name, tier, duplicates, and no stray columns', async () => {
    for (const body of [
      { ...NEW, feature_key: 'Has Space' }, { ...NEW, feature_key: '' }, { ...NEW, feature_key: '1starts_with_digit' },
      { ...NEW, feature_name: '' }, { ...NEW, tier: 'gold' }, { ...NEW, is_enabled: 'yes' },
    ]) {
      assert.equal((await as(USERS.admin, 'post', '/api/features', body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await as(USERS.admin, 'post', '/api/features', { ...NEW, id: 'spoof', status: 'live', module_type: 'feature' })).status, 201);
    assert.notEqual(features.rows[0].id, 'spoof');
    assert.equal('status' in features.rows[0], false);
    assert.equal((await as(USERS.admin, 'post', '/api/features', NEW)).status, 409);
  });

  test('edit by row id (what the admin UI sends) or by key; key is immutable; tier and access_level move together', async () => {
    const row = features.add({ feature_key: 'edit_me', feature_name: 'Edit Me', tier: 'basic', access_level: 'free' });
    const byId = await as(USERS.admin, 'put', `/api/features/${row.id}`, { feature_name: 'Edited', tier: 'vip', feature_key: 'hijack', id: 'spoof' });
    assert.equal(byId.status, 200);
    assert.deepEqual([row.feature_name, row.tier, row.access_level, row.feature_key], ['Edited', 'vip', 'vip', 'edit_me']);
    const byKey = await as(USERS.admin, 'put', '/api/features/edit_me', { is_enabled: false });
    assert.equal(byKey.status, 200);
    assert.equal(row.is_enabled, false);
    assert.equal((await as(USERS.admin, 'put', '/api/features/nope', { tier: 'vip' })).status, 404);
    assert.equal((await as(USERS.admin, 'put', `/api/features/${row.id}`, { tier: 'gold' })).status, 400);
  });
});

describe('feature list filters', () => {
  test('?feature_key= returns only that key (the admin form used to see the whole table and call every key a duplicate)', async () => {
    features.add({ feature_key: 'one', feature_name: 'One', tier: 'basic', access_level: 'free' });
    features.add({ feature_key: 'two', feature_name: 'Two', tier: 'vip', access_level: 'vip' });
    const res = await as(null, 'get', '/api/features?feature_key=two');
    assert.deepEqual(res.body.map((f) => f.feature_key), ['two']);
    const none = await as(null, 'get', '/api/features?feature_key=nope');
    assert.deepEqual(none.body, []);
  });
});
