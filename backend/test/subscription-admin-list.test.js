const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { cyclePrice, effectiveStatus } = require('../src/routes/subscriptionAdmin.routes');

// PPT slide 6: the admin list showed "Jan 1, 1970" and "₹/mo"; past 100 users
// it showed "Unknown User". The list is now joined and paged on the server.
const FREE = { id: 'p-free', name: 'Free', price: 0, price_monthly: 0, price_annually: 0, advisor_id: null };
const PREMIUM = { id: 'p-prem', name: 'Premium', price: 199, price_monthly: 199, price_annually: 1999, advisor_id: null };
const PAST = new Date(Date.now() - 86400000);

let subWhere;
beforeEach(() => {
  stubUserLookup();
  subWhere = [];
  mock.method(db.Subscription, 'count', async () => 3);
  mock.method(db.Subscription, 'findAll', async (opts) => {
    subWhere.push(opts);
    return [
      { id: 's1', user_id: 'u1', plan_id: 'p-free', status: 'active', start_date: '2026-11-09', end_date: null, billing_cycle: 'monthly' },
      { id: 's2', user_id: 'u2', plan_id: 'p-prem', status: 'active', start_date: '2026-10-01', end_date: PAST, billing_cycle: 'annually', cancelAtPeriodEnd: false },
    ];
  });
  mock.method(db.User, 'findAll', async () => [{ id: 'u1', name: 'Armaan', email: 'a@example.test' }, { id: 'u2', display_name: 'Priya', email: 'p@example.test' }]);
  mock.method(db.SubscriptionPlan, 'findAll', async () => [FREE, PREMIUM]);
});
afterEach(() => mock.restoreAll());

const list = (user, query = '') => request(app).get(`/api/subscriptions/admin/users${query}`).set('Authorization', bearer(user));

describe('GET /api/subscriptions/admin/users', () => {
  test('admin only', async () => {
    assert.equal((await request(app).get('/api/subscriptions/admin/users')).status, 401);
    assert.equal((await list(USERS.user)).status, 403);
  });

  test('joins user and plan, prices by cycle, reports ended "active" rows as expired', async () => {
    const res = await list(USERS.admin);
    assert.equal(res.status, 200);
    const [free, prem] = res.body.items;
    assert.deepEqual(free.user, { id: 'u1', name: 'Armaan', email: 'a@example.test' });
    assert.equal(free.price, 0);
    assert.equal(free.end_date, null);
    assert.equal(free.status, 'active');
    assert.equal(prem.user.name, 'Priya');
    assert.equal(prem.price, 1999);
    assert.equal(prem.billing_cycle, 'annually');
    assert.equal(prem.status, 'expired');
    assert.deepEqual(Object.keys(res.body.counts).sort(), ['active', 'cancelled', 'cancelling', 'expired']);
    assert.equal(res.body.total, 3);
  });

  test('limit is bounded and page offsets apply', async () => {
    await list(USERS.admin, '?limit=5000&page=3');
    assert.equal(subWhere[0].limit, 100);
    assert.equal(subWhere[0].offset, 200);
  });
});

describe('helpers', () => {
  test('cyclePrice falls back to 12 x monthly and handles missing plans', () => {
    assert.equal(cyclePrice({ price_monthly: 100 }, 'annually'), 1200);
    assert.equal(cyclePrice({ price: 50 }, 'monthly'), 50);
    assert.equal(cyclePrice(null, 'monthly'), null);
  });
  test('effectiveStatus', () => {
    assert.equal(effectiveStatus({ status: 'active', end_date: PAST }, new Date()), 'expired');
    assert.equal(effectiveStatus({ status: 'active', cancelAtPeriodEnd: true }, new Date()), 'cancelling');
    assert.equal(effectiveStatus({ status: 'cancelled' }, new Date()), 'cancelled');
  });
});
