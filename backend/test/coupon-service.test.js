const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const CouponService = require('../src/services/CouponService');

const { CouponError } = CouponService;
const DAY = 24 * 3600 * 1000;

let promos;
let txns;
beforeEach(() => {
  promos = fakeTable().install(mock, db.PromoCode);
  txns = fakeTable().install(mock, db.SubscriptionTransaction);
});
afterEach(() => mock.restoreAll());

const code = (over = {}) => promos.add({
  code: 'NEW50', discount_percent: 50, discount_amount: null, is_active: true, uses_count: 0,
  max_uses: null, expires_at: null, applicable_to: 'all', min_order_amount: null,
  one_time_per_user: false, applies_to_renewal: true, ...over,
});
const check = (c = 'NEW50', { user = 'u1', amount = 999, plan = 'plan-premium', renewal = false } = {}) =>
  CouponService.validateCoupon(c, user, amount, plan, renewal);
const rejects = (promise, reason) => assert.rejects(promise, (e) => e instanceof CouponError && e.reason === reason);

test('percentage discount: the price is a real number, never NaN', async () => {
  code();
  const r = await check();
  assert.equal(r.discountAmount, 499.5);
  assert.equal(r.finalAmount, 499.5);
  assert.ok(Number.isFinite(r.finalAmount) && Number.isFinite(r.discountAmount));
});

test('codes are case- and whitespace-insensitive', async () => {
  code();
  assert.equal((await check('  new50 ')).finalAmount, 499.5);
});

test('flat discount is in rupees and is capped so the price never goes negative', async () => {
  code({ code: 'FLAT', discount_percent: null, discount_amount: '200.00' });
  assert.equal((await check('FLAT', { amount: 999 })).finalAmount, 799);
  // A flat code worth the price or more is refused: it would give the plan away with none of
  // the safeguards of a deliberate 100% code.
  code({ code: 'HUGE', discount_percent: null, discount_amount: '5000' });
  await rejects(check('HUGE', { amount: 999 }), 'flat_exceeds_price');
  code({ code: 'EXACT', discount_percent: null, discount_amount: '999' });
  await rejects(check('EXACT', { amount: 999 }), 'flat_exceeds_price');
  // ...and one that leaves under the Rs 1 Razorpay minimum cannot be charged, so it is refused.
  code({ code: 'LEAVES50P', discount_percent: null, discount_amount: '998.50' });
  await rejects(check('LEAVES50P', { amount: 999 }), 'below_minimum');
});

test('a percentage above 100 is clamped; a full discount prices the plan at exactly 0', async () => {
  code({ code: 'ALL', discount_percent: 150 });
  const r = await check('ALL');
  assert.deepEqual([r.discountAmount, r.finalAmount], [999, 0]);
  code({ code: 'HUNDRED', discount_percent: 100 });
  assert.equal((await check('HUNDRED')).finalAmount, 0);
});

test('percentage maths is exact in paise (no float drift)', async () => {
  code({ code: 'P15', discount_percent: 15 });
  const r = await check('P15', { amount: 333.33 });
  assert.equal(r.discountAmount, 50);
  assert.equal(r.finalAmount, 283.33);
});

test('unknown, inactive and expired codes are refused with a customer-facing reason', async () => {
  // all three look the same to the caller
  await rejects(check('NOPE'), 'invalid');
  code({ is_active: false });
  await rejects(check(), 'invalid');
  promos.rows.length = 0;
  code({ expires_at: new Date(Date.now() - DAY) });
  await rejects(check(), 'invalid');
  await assert.rejects(check(), (e) => e.message === 'This promo code is not valid');
  promos.rows.length = 0;
  code({ expires_at: new Date(Date.now() + DAY) });
  assert.equal((await check()).isValid, true);
});

test('global usage limit', async () => {
  code({ max_uses: 3, uses_count: 3 });
  await rejects(check(), 'exhausted');
  promos.rows[0].uses_count = 2;
  assert.equal((await check()).isValid, true);
});

test('one-time-per-user counts only completed payments by that user', async () => {
  code({ one_time_per_user: true });
  txns.add({ user_id: 'u1', coupon_used: 'NEW50', status: 'pending' });
  txns.add({ user_id: 'someone-else', coupon_used: 'NEW50', status: 'completed' });
  assert.equal((await check()).isValid, true);
  txns.add({ user_id: 'u1', coupon_used: 'NEW50', status: 'completed' });
  await rejects(check(), 'already_used');
});

test('plan eligibility: a restricted code works only on its plans; empty/all means every plan', async () => {
  code({ applicable_to: ['plan-vip'] });
  await rejects(check('NEW50', { plan: 'plan-premium' }), 'plan');
  assert.equal((await check('NEW50', { plan: 'plan-vip' })).isValid, true);
  promos.rows[0].applicable_to = JSON.stringify(['plan-vip']);
  await rejects(check('NEW50', { plan: 'plan-premium' }), 'plan');
  promos.rows[0].applicable_to = [];
  assert.equal((await check()).isValid, true);
  promos.rows[0].applicable_to = 'all';
  assert.equal((await check()).isValid, true);
});

test('renewals and the minimum order amount', async () => {
  code({ applies_to_renewal: false, min_order_amount: '500' });
  await rejects(check('NEW50', { renewal: true }), 'renewal');
  await rejects(check('NEW50', { amount: 499 }), 'minimum');
  assert.equal((await check('NEW50', { amount: 500 })).isValid, true);
});

test('free plans and missing codes are refused', async () => {
  code();
  await rejects(check('NEW50', { amount: 0 }), 'free_plan');
  await rejects(check(''), 'missing');
});

test('a code with no discount configured is refused rather than treated as free', async () => {
  code({ discount_percent: null, discount_amount: null });
  await rejects(check(), 'misconfigured');
});

test('advisor plans: an "all plans" code does not reach them, a code that lists the plan does', async () => {
  code({ applicable_to: 'all' });
  await assert.rejects(CouponService.validateCoupon('NEW50', 'u1', 500, 'adv-plan', false, { requireExplicitPlan: true }), (e) => e.reason === 'plan');
  promos.rows[0].applicable_to = ['adv-plan'];
  const r = await CouponService.validateCoupon('NEW50', 'u1', 500, 'adv-plan', false, { requireExplicitPlan: true });
  assert.equal(r.finalAmount, 250);
});
