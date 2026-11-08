const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const SubscriptionService = require('../src/services/SubscriptionService');

const U = USERS.user;
const DAY = 86400000;
let t;
beforeEach(() => {
  stubUserLookup();
  t = {
    plans: fakeTable([
      { id: 'pr', name: 'Premium', price: 999, price_monthly: 999, price_annually: 9990, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: 'fr', name: 'Free', price: 0, price_monthly: 0, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan),
    subs: fakeTable().install(mock, db.Subscription),
    txns: fakeTable().install(mock, db.SubscriptionTransaction),
  };
});
afterEach(() => mock.restoreAll());

const get = (u) => request(app).get('/api/subscriptions/my-billing').set('Authorization', bearer(u));

describe('GET /subscriptions/my-billing', () => {
  test('requires a login', async () => {
    assert.equal((await request(app).get('/api/subscriptions/my-billing')).status, 401);
  });

  test('a user with nothing is on Free: no dates, no payment, no NaN-prone fields', async () => {
    const res = await get(U);
    assert.equal(res.status, 200);
    assert.deepEqual([res.body.subscription.plan_name, res.body.subscription.is_free, res.body.subscription.billing_cycle, res.body.subscription.end_date, res.body.last_payment], ['Free', true, null, null, null]);
  });

  test('a paid plan: details, last payment with masked reference, amounts as numbers', async () => {
    const sub = t.subs.add({ user_id: U.id, plan_id: 'pr', status: 'active', plan_type: 'Premium', billing_cycle: 'annually', auto_renew: true,
      start_date: new Date(Date.now() - DAY), end_date: new Date(Date.now() + 300 * DAY), advisor_id: null, finfluencer_id: null });
    t.txns.add({ subscription_id: sub.id, user_id: U.id, status: 'completed', transaction_type: 'charge', amount: '4995.00', discount_applied: '4995.00', coupon_used: 'NEW50', payment_method: 'razorpay', transaction_id: 'pay_Nabcdef123456', date: new Date() });
    const res = await get(U);
    assert.deepEqual([res.body.subscription.plan_name, res.body.subscription.billing_cycle, res.body.subscription.renews, res.body.subscription.list_price_annually], ['Premium', 'annually', true, 9990]);
    assert.deepEqual([res.body.last_payment.amount, res.body.last_payment.coupon_used, res.body.last_payment.gateway], [4995, 'NEW50', 'razorpay']);
    assert.equal(res.body.last_payment.reference, 'pay_••••3456');
    assert.ok(!JSON.stringify(res.body).includes('Nabcdef'), 'the full payment id never leaves the server');
  });

  test('only the caller\'s own payments are shown', async () => {
    const sub = t.subs.add({ user_id: U.id, plan_id: 'pr', status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + DAY), advisor_id: null, finfluencer_id: null });
    t.txns.add({ subscription_id: sub.id, user_id: 'someone-else', status: 'completed', transaction_type: 'charge', amount: 1, transaction_id: 'pay_other_xxxx', date: new Date() });
    assert.equal((await get(U)).body.last_payment, null);
  });

  test('a free coupon activation shows a zero amount and the coupon gateway', async () => {
    const sub = t.subs.add({ user_id: U.id, plan_id: 'pr', status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + DAY), advisor_id: null, finfluencer_id: null });
    t.txns.add({ subscription_id: sub.id, user_id: U.id, status: 'completed', transaction_type: 'charge', amount: '0.00', discount_applied: '999.00', coupon_used: 'FREE100', payment_method: 'coupon', transaction_id: 'coupon_1234-5678-abcd', date: new Date() });
    const lp = (await get(U)).body.last_payment;
    assert.deepEqual([lp.amount, lp.gateway, lp.coupon_used], [0, 'coupon', 'FREE100']);
  });
});

test('maskReference keeps only a prefix and the last four characters', () => {
  assert.equal(SubscriptionService.maskReference('pay_Nabcdef123456'), 'pay_••••3456');
  assert.equal(SubscriptionService.maskReference('abc'), '••••');
  assert.equal(SubscriptionService.maskReference(null), null);
});
