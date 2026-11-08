const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const AuthService = require('../src/services/AuthService');
const SubscriptionService = require('../src/services/SubscriptionService');

const U = USERS.user;
const FREE_ID = 'f0000000-0000-4000-8000-000000000001';
const PREMIUM_ID = 'f0000000-0000-4000-8000-000000000002';
const ADV_PLAN_ID = 'f0000000-0000-4000-8000-000000000003';
const DAY = 86400000;

let t;
beforeEach(() => {
  stubUserLookup();
  t = {
    plans: fakeTable([
      { id: PREMIUM_ID, name: 'Premium', price: 999, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: FREE_ID, name: 'Free', price: 0, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: ADV_PLAN_ID, name: 'Alpha Picks', price: 0, is_active: true, advisor_id: 'adv-1', finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan),
    subs: fakeTable().install(mock, db.Subscription),
  };
});
afterEach(() => mock.restoreAll());

const activeFor = (userId) => t.subs.rows.filter((s) => s.user_id === userId && s.status === 'active' && !s.advisor_id);

describe('Free plan on registration', () => {
  function stubUserCreate() {
    mock.method(db.User, 'findOne', async () => null);
    mock.method(db.User, 'create', async (data) => ({ id: 'new-user-1', ...data }));
  }

  test('email/password registration creates an active, non-expiring Free subscription', async () => {
    stubUserCreate();
    const { user } = await AuthService.register('new@example.test', 'Password1!', 'New Person');
    const subs = activeFor(user.id);
    assert.equal(subs.length, 1);
    assert.deepEqual([subs[0].plan_id, subs[0].plan_type, subs[0].status, subs[0].end_date], [FREE_ID, 'Free', 'active', null]);
  });

  test('registration still succeeds if the Free subscription cannot be written (the read fallback covers it)', async () => {
    stubUserCreate();
    mock.method(db.Subscription, 'findAll', async () => { throw new Error('db down'); });
    const { user } = await AuthService.register('new@example.test', 'Password1!', 'New Person');
    assert.equal(user.id, 'new-user-1');
  });

  test('Google sign-up (new account) gets Free; an existing account does not get a second row', async () => {
    const { OAuth2Client } = require('google-auth-library');
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
      getPayload: () => ({ email: 'g@example.test', email_verified: true, name: 'G User', sub: 'google-1', picture: 'http://x/y.png' }),
    }));
    mock.method(db.OauthToken, 'create', async () => ({}));
    mock.method(db.User, 'findOne', async () => null);
    mock.method(db.User, 'create', async (data) => ({ id: 'google-user-1', ...data, save: async () => {} }));
    await AuthService.googleLogin('id-token', 'user');
    assert.equal(activeFor('google-user-1').length, 1);

    // Signing in again as an existing account: no new row
    mock.method(db.User, 'findOne', async () => ({ id: 'google-user-1', email: 'g@example.test', google_id: 'google-1', save: async () => {} }));
    await AuthService.googleLogin('id-token', 'user');
    assert.equal(activeFor('google-user-1').length, 1);
  });
});

describe('ensureFreeSubscription', () => {
  test('is idempotent', async () => {
    await SubscriptionService.ensureFreeSubscription('u-1');
    await SubscriptionService.ensureFreeSubscription('u-1');
    await SubscriptionService.ensureFreeSubscription('u-1');
    assert.equal(t.subs.rows.length, 1);
  });

  test('does not add Free on top of a live paid plan, but does after it lapses', async () => {
    t.subs.add({ user_id: 'u-1', plan_id: PREMIUM_ID, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + DAY), advisor_id: null, finfluencer_id: null });
    await SubscriptionService.ensureFreeSubscription('u-1');
    assert.equal(t.subs.rows.length, 1);
    t.subs.rows[0].end_date = new Date(Date.now() - DAY); // lapsed, cron has not flipped the status yet
    await SubscriptionService.ensureFreeSubscription('u-1');
    assert.equal(t.subs.rows.length, 2);
  });

  test('an advisor subscription does not count as the user\'s platform plan', async () => {
    t.subs.add({ user_id: 'u-1', plan_id: ADV_PLAN_ID, status: 'active', plan_type: 'Alpha Picks', end_date: new Date(Date.now() + DAY), advisor_id: 'adv-1', finfluencer_id: null });
    await SubscriptionService.ensureFreeSubscription('u-1');
    assert.equal(activeFor('u-1').length, 1);
    assert.equal(activeFor('u-1')[0].plan_type, 'Free');
  });

  test('without a Free plan in the catalogue it creates nothing and does not throw', async () => {
    t.plans.rows.splice(1, 1);
    assert.equal(await SubscriptionService.ensureFreeSubscription('u-1'), null);
    assert.equal(t.subs.rows.length, 0);
  });

  test('a stored Free row can never be bought: activateSubscription refuses advisor plans', async () => {
    await assert.rejects(SubscriptionService.activateSubscription('u-1', ADV_PLAN_ID, 'month'), /Not a platform plan/);
  });
});

describe('GET /subscriptions/my-subscription', () => {
  const get = (u) => request(app).get('/api/subscriptions/my-subscription').set('Authorization', bearer(u));

  test('requires a login', async () => {
    assert.equal((await request(app).get('/api/subscriptions/my-subscription')).status, 401);
  });

  test('a user with no subscription is Free: the row is created on first read, once', async () => {
    const first = await get(U);
    assert.equal(first.status, 200);
    assert.deepEqual([first.body.plan_type, first.body.status, first.body.is_free], ['Free', 'active', true]);
    assert.equal(t.subs.rows.length, 1);
    await get(U);
    assert.equal(t.subs.rows.length, 1, 'second read must not create another');
  });

  test('a live paid plan wins over a stray Free row', async () => {
    t.subs.add({ user_id: U.id, plan_id: FREE_ID, status: 'active', plan_type: 'Free', end_date: null, advisor_id: null, finfluencer_id: null });
    t.subs.add({ user_id: U.id, plan_id: PREMIUM_ID, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + 10 * DAY), advisor_id: null, finfluencer_id: null });
    const res = await get(U);
    assert.equal(res.body.plan_type, 'Premium');
    assert.equal(res.body.is_free, false);
  });

  test('an expired paid plan falls back to Free', async () => {
    t.subs.add({ user_id: U.id, plan_id: PREMIUM_ID, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() - DAY), advisor_id: null, finfluencer_id: null });
    const res = await get(U);
    assert.equal(res.body.plan_type, 'Free');
  });

  test('an advisor subscription is never reported as the current plan', async () => {
    t.subs.add({ user_id: U.id, plan_id: ADV_PLAN_ID, status: 'active', plan_type: 'Alpha Picks', end_date: new Date(Date.now() + 10 * DAY), advisor_id: 'adv-1', finfluencer_id: null });
    const res = await get(U);
    assert.equal(res.body.plan_type, 'Free');
  });

  test('users only ever see their own subscription', async () => {
    t.subs.add({ user_id: 'someone-else', plan_id: PREMIUM_ID, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + 10 * DAY), advisor_id: null, finfluencer_id: null });
    assert.equal((await get(U)).body.plan_type, 'Free');
  });

  test('with no Free plan in the catalogue the answer is still Free (virtual), never an error or null', async () => {
    t.plans.rows.splice(1, 1);
    const res = await get(U);
    assert.equal(res.status, 200);
    assert.deepEqual([res.body.plan_type, res.body.status, res.body.is_free, res.body.virtual], ['Free', 'active', true, true]);
  });
});

describe('subscription writes are staff-only (no self-granted plans)', () => {
  const as = (u, method, path, body = {}) => request(app)[method](path).set('Authorization', bearer(u)).send(body);

  test('a customer cannot create or edit a Subscription row', async () => {
    const own = t.subs.add({ user_id: U.id, plan_id: FREE_ID, status: 'active', plan_type: 'Free' });
    const create = await as(U, 'post', '/api/subscriptions', { user_id: U.id, plan_id: PREMIUM_ID, status: 'active', plan_type: 'VIP' });
    assert.equal(create.status, 403);
    const edit = await as(U, 'put', `/api/subscriptions/${own.id}`, { plan_id: PREMIUM_ID, plan_type: 'VIP', end_date: '2099-01-01' });
    assert.equal(edit.status, 403);
    assert.equal(own.plan_type, 'Free');
    assert.equal(t.subs.rows.length, 1);
  });

  test('a customer cannot create an advisor subscription without paying', async () => {
    const res = await as(U, 'post', '/api/advisors/subscriptions', { user_id: U.id, advisor_id: 'adv-1', plan_id: ADV_PLAN_ID, status: 'active' });
    assert.equal(res.status, 403);
    assert.equal(t.subs.rows.length, 0);
  });

  test('a customer cannot forge payment history', async () => {
    mock.method(db.SubscriptionTransaction, 'create', async () => { throw new Error('should not be reached'); });
    const res = await as(U, 'post', '/api/subscriptions/transactions', { user_id: U.id, amount: 1, status: 'completed', coupon_used: 'NEW50' });
    assert.equal(res.status, 403);
  });

  test('a customer can still read their own advisor subscriptions (AdvisorProfile uses this)', async () => {
    t.subs.add({ user_id: U.id, advisor_id: 'adv-1', plan_id: ADV_PLAN_ID, status: 'active' });
    t.subs.add({ user_id: 'someone-else', advisor_id: 'adv-1', plan_id: ADV_PLAN_ID, status: 'active' });
    const res = await request(app).get('/api/advisors/subscriptions').query({ advisor_id: 'adv-1', status: 'active' }).set('Authorization', bearer(U));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => r.user_id), [U.id]);
  });

  test('staff can still write (super-admin subscription tools)', async () => {
    const res = await as(USERS.superAdmin, 'post', '/api/subscriptions', { user_id: U.id, plan_id: PREMIUM_ID, status: 'active' });
    assert.equal(res.status, 201);
  });
});

describe('GET /subscriptions/plans (public catalogue)', () => {
  test('anonymous and customers see active platform plans only, no advisor plans', async () => {
    t.plans.add({ id: 'inactive', name: 'Old', price: 5, is_active: false, advisor_id: null, finfluencer_id: null });
    const res = await request(app).get('/api/subscriptions/plans');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((p) => p.name).sort(), ['Free', 'Premium']);
  });

  test('staff see everything for the plan editor', async () => {
    t.plans.add({ id: 'inactive', name: 'Old', price: 5, is_active: false, advisor_id: null, finfluencer_id: null });
    const res = await request(app).get('/api/subscriptions/plans').set('Authorization', bearer(USERS.admin));
    assert.equal(res.body.length, 4);
  });
});
