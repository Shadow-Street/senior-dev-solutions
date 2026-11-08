const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');

// Guessing promo codes is rate limited on the two routes that answer "is this a
// real code": validate and create-order. Separate file = separate process =
// fresh counters.

const OTHER = { id: '77777777-7777-4777-8777-777777777777', email: 'other@example.test', app_role: 'user', role: 'user', status: 'active' };
const PLAN = 'p0000000-0000-4000-8000-000000000001';

beforeEach(() => {
  stubUserLookup({ [OTHER.id]: OTHER });
  fakeTable([{ id: PLAN, name: 'Premium', price: 999, price_monthly: 999, price_annually: 9990, is_active: true, advisor_id: null, finfluencer_id: null }]).install(mock, db.SubscriptionPlan);
  fakeTable([{ id: 'c1', code: 'REAL10', discount_percent: 10, is_active: true, uses_count: 0, applicable_to: 'all' }]).install(mock, db.PromoCode);
  fakeTable().install(mock, db.Subscription);
});
afterEach(() => mock.restoreAll());

const guess = (user, code) => request(app).post('/api/subscriptions/promo-codes/validate')
  .set('Authorization', bearer(user)).send({ code, planId: PLAN, cycle: 'monthly' });

test('every unknown, switched-off or expired code gets the same generic answer', async () => {
  const a = await guess(OTHER, 'NOPE1');
  const b = await guess(OTHER, 'NOPE2');
  assert.equal(a.status, 400);
  assert.deepEqual(a.body, { error: 'This promo code is not valid', reason: 'invalid' });
  assert.deepEqual(b.body, a.body);
});

test('failed guesses are throttled per account: the 21st attempt is 429, and a different account is unaffected', async () => {
  let last;
  for (let i = 0; i < 20; i++) last = await guess(USERS.user, `GUESS${i}`);
  assert.equal(last.status, 400);
  const blocked = await guess(USERS.user, 'GUESS21');
  assert.equal(blocked.status, 429);
  assert.deepEqual(Object.keys(blocked.body), ['error']);
  assert.equal((await guess(USERS.superAdmin, 'GUESS1')).status, 400, 'another account has its own allowance (the per-IP budget is larger)');
});

test('a customer who gets the code right is never throttled by successes', async () => {
  const fresh = { id: '99999999-9999-4999-8999-999999999999', email: 'f@example.test', app_role: 'user', role: 'user', status: 'active' };
  stubUserLookup({ [fresh.id]: fresh });
  for (let i = 0; i < 30; i++) {
    const res = await guess(fresh, 'REAL10');
    assert.equal(res.status, 200, `attempt ${i}`);
  }
});

test('create-order is throttled the same way (a bad coupon is also a guess)', async () => {
  const guessUser = { id: '88888888-8888-4888-8888-888888888889', email: 'g@example.test', app_role: 'user', role: 'user', status: 'active' };
  stubUserLookup({ [guessUser.id]: guessUser });
  const order = (code) => request(app).post('/api/payments/create-order').set('Authorization', bearer(guessUser)).send({ planId: PLAN, cycle: 'monthly', couponCode: code });
  let status;
  for (let i = 0; i < 20; i++) status = (await order(`NOPE${i}`)).status;
  assert.equal(status, 400);
  assert.equal((await order('NOPE21')).status, 429);
});

test('/payments/verify has a per-account budget (every call counts, it can cost two gateway calls)', async () => {
  const payer = { id: '66666666-6666-4666-8666-666666666667', email: 'p@example.test', app_role: 'user', role: 'user', status: 'active' };
  stubUserLookup({ [payer.id]: payer });
  const call = () => request(app).post('/api/payments/verify').set('Authorization', bearer(payer)).send({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 'bad' });
  let status;
  for (let i = 0; i < 60; i++) status = (await call()).status;
  assert.equal(status, 400);
  const blocked = await call();
  assert.equal(blocked.status, 429);
  assert.deepEqual(Object.keys(blocked.body), ['error']);
  assert.equal((await request(app).post('/api/payments/verify').set('Authorization', bearer(USERS.admin)).send({})).status, 400, 'other accounts are unaffected');
});
