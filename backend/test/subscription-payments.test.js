const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const PaymentController = require('../src/controllers/paymentController');
const EmailService = require('../src/services/EmailService');
const InvoiceService = require('../src/services/InvoiceService');

const U = USERS.user;
const OTHER = { id: '77777777-7777-4777-8777-777777777777', email: 'other@example.test', app_role: 'user', role: 'user', status: 'active' };
const ADVISOR_USER = { id: '88888888-8888-4888-8888-888888888888', email: 'adv@example.test', app_role: 'advisor', role: 'user', status: 'active' };

const PREMIUM = 'p0000000-0000-4000-8000-000000000001';
const FREE = 'p0000000-0000-4000-8000-000000000002';
const ADV_PLAN = 'p0000000-0000-4000-8000-000000000003';
const ADV_ID = 'a0000000-0000-4000-8000-0000000000aa';

let t;
let razorpayOrders; // orders "created" at the gateway, by id
let createCalls;
let increments; // PromoCode / Advisor increments

const sign = (orderId, paymentId, secret = process.env.RAZORPAY_KEY_SECRET) =>
  crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

function setup() {
  stubUserLookup({ [OTHER.id]: OTHER, [ADVISOR_USER.id]: ADVISOR_USER });
  t = {
    plans: fakeTable([
      { id: PREMIUM, name: 'Premium', price: 999, price_monthly: 999, price_annually: 9990, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: FREE, name: 'Free', price: 0, price_monthly: 0, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: ADV_PLAN, name: 'Alpha Picks', price: 500, price_monthly: 0, price_annually: 0, interval: 'monthly', is_active: true, advisor_id: ADV_ID, finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan),
    advisors: fakeTable([{ id: ADV_ID, user_id: ADVISOR_USER.id, status: 'approved', follower_count: 0 }]).install(mock, db.Advisor),
    promos: fakeTable([
      { id: 'c1', code: 'NEW50', discount_percent: 50, discount_amount: null, is_active: true, uses_count: 0, max_uses: null, expires_at: null, applicable_to: 'all', one_time_per_user: false, applies_to_renewal: true },
      { id: 'c2', code: 'OLD', discount_percent: 10, is_active: true, uses_count: 0, expires_at: new Date(Date.now() - 1000), applicable_to: 'all' },
    ]).install(mock, db.PromoCode),
    subs: fakeTable().install(mock, db.Subscription),
    txns: fakeTable().install(mock, db.SubscriptionTransaction),
    funds: fakeTable().install(mock, db.FundTransaction),
    commissions: fakeTable().install(mock, db.CommissionTracking),
    commSettings: fakeTable().install(mock, db.CommissionSettings),
    platform: fakeTable().install(mock, db.PlatformSetting),
    users: null,
  };
  t.advisors.rows[0].id = ADV_ID;
  mock.method(db.User, 'update', async () => [1]);
  mock.method(db.User, 'findByPk', async (id) => {
    const all = { [U.id]: U, [OTHER.id]: OTHER, [ADVISOR_USER.id]: ADVISOR_USER, [USERS.admin.id]: USERS.admin, [USERS.superAdmin.id]: USERS.superAdmin };
    return all[id] ? { ...all[id], name: 'Test' } : null;
  });
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: {} }));
  mock.method(db.User, 'findOne', async (opts) => ({ id: opts.where.id }));

  increments = [];
  mock.method(db.PromoCode, 'increment', async (field, opts) => {
    increments.push(['promo', opts.where.id]);
    const row = t.promos.rows.find((r) => r.id === opts.where.id);
    if (row) row.uses_count += 1;
  });
  mock.method(db.Advisor, 'increment', async (field, opts) => {
    increments.push(['advisor', opts.where.id]);
    t.advisors.rows[0].follower_count += opts.by;
  });

  razorpayOrders = {};
  createCalls = [];
  mock.method(PaymentController.razorpay.orders, 'create', async (opts) => {
    createCalls.push(opts);
    const id = `order_${createCalls.length}`;
    razorpayOrders[id] = { id, ...opts };
    return razorpayOrders[id];
  });
  mock.method(PaymentController.razorpay.orders, 'fetch', async (id) => {
    if (!razorpayOrders[id]) throw new Error('not found');
    return razorpayOrders[id];
  });
  // The gateway's view of a payment: by default captured, for the most recently created order.
  mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => {
    const order = razorpayOrders[`order_${createCalls.length}`];
    return { id, order_id: order && order.id, amount: order && order.amount, currency: 'INR', status: 'captured' };
  });
  mock.method(InvoiceService, 'generateInvoice', async () => null);
  mock.method(EmailService, 'sendEmail', async () => true);
}

beforeEach(setup);
afterEach(() => mock.restoreAll());

const auth = (u) => ({ Authorization: bearer(u) });
const createOrder = (u, body) => request(app).post('/api/payments/create-order').set(auth(u)).send(body);
const verify = (u, body) => request(app).post('/api/payments/verify').set(auth(u)).send(body);
const validate = (u, body) => request(app).post('/api/subscriptions/promo-codes/validate').set(auth(u)).send(body);

// ---------------------------------------------------------------- validate
describe('POST /subscriptions/promo-codes/validate', () => {
  test('requires a login', async () => {
    const res = await request(app).post('/api/subscriptions/promo-codes/validate').send({ code: 'NEW50', planId: PREMIUM, cycle: 'monthly' });
    assert.equal(res.status, 401);
  });

  test('returns server-computed numbers for the plan and cycle (the NaN fix)', async () => {
    const monthly = await validate(U, { code: 'new50', planId: PREMIUM, cycle: 'monthly' });
    assert.equal(monthly.status, 200);
    assert.deepEqual(
      [monthly.body.originalAmount, monthly.body.discountAmount, monthly.body.finalAmount, monthly.body.discountType, monthly.body.discountPercent],
      [999, 499.5, 499.5, 'percent', 50]
    );
    assert.match(monthly.body.message, /NEW50 applied: 50% off/);

    const annual = await validate(U, { code: 'NEW50', planId: PREMIUM, cycle: 'annually' });
    assert.deepEqual([annual.body.originalAmount, annual.body.finalAmount], [9990, 4995]);
  });

  test('ignores any amount the client sends', async () => {
    const res = await validate(U, { code: 'NEW50', planId: PREMIUM, cycle: 'monthly', cartAmount: 1, amount: 1 });
    assert.equal(res.body.originalAmount, 999);
  });

  test('refuses with a specific message: expired, unknown, free plan, bad cycle, missing code', async () => {
    const expired = await validate(U, { code: 'OLD', planId: PREMIUM, cycle: 'monthly' });
    const unknown = await validate(U, { code: 'NOPE', planId: PREMIUM, cycle: 'monthly' });
    // expired / unknown / switched-off answer identically: no oracle for which codes exist
    assert.equal(expired.body.error, 'This promo code is not valid');
    assert.deepEqual(expired.body, unknown.body);
    t.promos.add({ id: 'c9', code: 'OFF', discount_percent: 5, is_active: false, applicable_to: 'all' });
    assert.deepEqual((await validate(U, { code: 'OFF', planId: PREMIUM, cycle: 'monthly' })).body, unknown.body);
    assert.match((await validate(U, { code: 'NEW50', planId: FREE, cycle: 'monthly' })).body.error, /free/);
    assert.equal((await validate(U, { code: 'NEW50', planId: PREMIUM, cycle: 'weekly' })).status, 400);
    assert.equal((await validate(U, { code: '', planId: PREMIUM, cycle: 'monthly' })).status, 400);
    assert.equal((await validate(U, { code: 'NEW50', planId: 'missing', cycle: 'monthly' })).status, 404);
  });

  test('validating never consumes a use', async () => {
    await validate(U, { code: 'NEW50', planId: PREMIUM, cycle: 'monthly' });
    assert.equal(t.promos.rows[0].uses_count, 0);
    assert.deepEqual(increments, []);
  });
});

// ------------------------------------------------------------ create-order
describe('POST /payments/create-order', () => {
  test('requires a login', async () => {
    const res = await request(app).post('/api/payments/create-order').send({ planId: PREMIUM, cycle: 'monthly' });
    assert.equal(res.status, 401);
  });

  test('amount comes from the plan row, not the client', async () => {
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', amount: 1, price: 1, finalAmount: 1 });
    assert.equal(res.status, 200);
    assert.equal(createCalls[0].amount, 99900);
    assert.equal(res.body.amount, 99900);
    assert.equal(res.body.pricing.finalAmount, 999);
  });

  test('applies the coupon server-side for both cycles', async () => {
    const monthly = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    assert.equal(createCalls[0].amount, 49950);
    assert.equal(createCalls[0].notes.couponCode, 'NEW50');
    assert.equal(createCalls[0].notes.userId, U.id);
    assert.equal(monthly.body.discount.discountAmount, 499.5);
    await createOrder(U, { planId: PREMIUM, cycle: 'annually', couponCode: 'NEW50' });
    assert.equal(createCalls[1].amount, 499500);
  });

  test('the order is created with the same price the validate endpoint quoted', async () => {
    const quote = await validate(U, { code: 'NEW50', planId: PREMIUM, cycle: 'annually' });
    await createOrder(U, { planId: PREMIUM, cycle: 'annually', couponCode: 'NEW50' });
    assert.equal(createCalls[0].amount, Math.round(quote.body.finalAmount * 100));
  });

  test('a bad coupon blocks the order (no silent full-price charge) and creates nothing at the gateway', async () => {
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'OLD' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'This promo code is not valid');
    assert.equal(createCalls.length, 0);
  });

  test('an unknown cycle is rejected instead of silently billing yearly', async () => {
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'whenever' });
    assert.equal(res.status, 400);
    assert.equal(createCalls.length, 0);
  });

  test('free and unknown plans cannot be ordered', async () => {
    assert.equal((await createOrder(U, { planId: FREE, cycle: 'monthly' })).status, 400);
    assert.equal((await createOrder(U, { planId: 'nope', cycle: 'monthly' })).status, 404);
    assert.equal((await createOrder(U, { cycle: 'monthly' })).status, 400);
    assert.equal(createCalls.length, 0);
  });

  test('inactive plans cannot be ordered', async () => {
    t.plans.rows[0].is_active = false;
    assert.equal((await createOrder(U, { planId: PREMIUM, cycle: 'monthly' })).status, 404);
  });

  test('advisor plan: price from the DB, kind recorded, cycle forced to monthly', async () => {
    const res = await createOrder(U, { planId: ADV_PLAN, cycle: 'annually', amount: 1 });
    assert.equal(res.status, 200);
    assert.equal(createCalls[0].amount, 50000);
    assert.equal(createCalls[0].notes.kind, 'advisor');
  });

  test('advisor plan: not your own, not an unapproved advisor, not twice', async () => {
    assert.equal((await createOrder(ADVISOR_USER, { planId: ADV_PLAN })).status, 400);
    t.advisors.rows[0].status = 'suspended';
    assert.equal((await createOrder(U, { planId: ADV_PLAN })).status, 404);
    t.advisors.rows[0].status = 'approved';
    t.subs.add({ user_id: U.id, advisor_id: ADV_ID, plan_id: ADV_PLAN, status: 'active', end_date: new Date(Date.now() + 86400000 * 5) });
    assert.equal((await createOrder(U, { planId: ADV_PLAN })).status, 409);
  });

  test('gateway failure is a generic 500, no internals', async () => {
    mock.method(PaymentController.razorpay.orders, 'create', async () => { throw new Error('secret gateway detail'); });
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly' });
    assert.equal(res.status, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /secret gateway detail/);
  });
});

// ------------------------------------------------------------------ verify
describe('POST /payments/verify', () => {
  async function orderFor(user, body) {
    const res = await createOrder(user, body);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.order_id;
  }

  test('requires a login and the three payment fields', async () => {
    assert.equal((await request(app).post('/api/payments/verify').send({})).status, 401);
    assert.equal((await verify(U, { razorpay_order_id: 'o' })).status, 400);
  });

  test('a wrong signature changes nothing: no subscription, no payment record, no coupon use', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1', 'wrong-secret') });
    assert.equal(res.status, 400);
    assert.equal(t.subs.rows.length, 0);
    assert.equal(t.txns.rows.length, 0);
    assert.equal(t.funds.rows.length, 0);
    assert.equal(t.promos.rows[0].uses_count, 0);
  });

  test('malformed signatures are rejected cleanly (constant-time compare must not throw)', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly' });
    const good = sign(orderId, 'pay_1');
    for (const bad of [good.slice(0, 10), `${good.slice(0, 63)}z`, `${good.slice(0, 62)}é`, 'x'.repeat(200), 12345]) {
      const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: bad });
      assert.ok([400].includes(res.status), `signature ${String(bad).slice(0, 12)} -> ${res.status}`);
    }
    assert.equal(t.subs.rows.length, 0);
  });

  test('another user cannot claim someone else\'s paid order (SEC-36)', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly' });
    const res = await verify(OTHER, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') });
    assert.equal(res.status, 403);
    assert.equal(t.subs.rows.length, 0);
    assert.equal(t.txns.rows.length, 0);
  });

  test('a replay of the owner\'s payment by another account is refused after the first claim', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly' });
    const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') };
    assert.equal((await verify(U, body)).status, 200);
    assert.equal((await verify(OTHER, body)).status, 403);
    assert.equal(t.subs.rows.filter((s) => s.user_id === OTHER.id).length, 0);
  });

  test('platform plan: verified payment activates it, records the amount from the order, redeems the coupon once', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.kind, 'platform');

    const sub = t.subs.rows[0];
    assert.deepEqual([sub.user_id, sub.plan_id, sub.status, sub.plan_type, sub.advisor_id ?? null], [U.id, PREMIUM, 'active', 'Premium', null]);
    assert.equal(t.txns.rows[0].amount, 499.5);
    assert.equal(t.txns.rows[0].coupon_used, 'NEW50');
    assert.equal(t.txns.rows[0].transaction_id, 'pay_1');
    assert.equal(t.funds.rows[0].amount, 499.5);
    assert.equal(t.promos.rows[0].uses_count, 1);
    assert.equal(t.commissions.rows.length, 0, 'platform plans pay no advisor commission');
  });

  test('verifying the same payment twice is idempotent: one subscription, one transaction, one coupon use', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') };
    const first = await verify(U, body);
    const second = await verify(U, body);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.alreadyProcessed, true);
    assert.equal(t.subs.rows.length, 1);
    assert.equal(t.txns.rows.length, 1);
    assert.equal(t.funds.rows.length, 1);
    assert.equal(t.promos.rows[0].uses_count, 1);
  });

  test('concurrent verifications of one payment also collapse to one activation', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') };
    const [a, b] = await Promise.all([verify(U, body), verify(U, body)]);
    assert.deepEqual([a.status, b.status], [200, 200]);
    assert.equal(t.subs.rows.length, 1);
    assert.equal(t.txns.rows.length, 1);
    assert.equal(t.promos.rows[0].uses_count, 1);
  });

  test('buying Premium replaces the Free row but leaves advisor subscriptions alone', async () => {
    t.subs.add({ user_id: U.id, plan_id: FREE, status: 'active', plan_type: 'Free', end_date: null, advisor_id: null, finfluencer_id: null });
    const advSub = t.subs.add({ user_id: U.id, plan_id: ADV_PLAN, status: 'active', plan_type: 'Alpha Picks', end_date: new Date(Date.now() + 86400000 * 9), advisor_id: ADV_ID, finfluencer_id: null });
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly' });
    await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') });
    assert.equal(t.subs.rows[0].status, 'cancelled', 'Free replaced');
    assert.equal(advSub.status, 'active', 'advisor subscription untouched');
    assert.equal(t.subs.rows.filter((s) => s.status === 'active' && !s.advisor_id).length, 1);
  });

  test('a failure while recording the payment is a generic 500 that rolls the whole transaction back', async () => {
    const orderId = await orderFor(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    let rolledBack = false;
    mock.method(db.sequelize, 'transaction', async (cb) => {
      try { return await cb({ LOCK: {} }); } catch (e) { rolledBack = true; throw e; }
    });
    mock.method(db.FundTransaction, 'create', async () => { throw new Error('db exploded: secret'); });
    const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') });
    assert.equal(res.status, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /secret/);
    assert.equal(rolledBack, true, 'the error must propagate out of the transaction so the DB undoes the coupon use and subscription');
  });

  describe('advisor plan', () => {
    const pay = async (user = U, paymentId = 'pay_a1') => {
      const orderId = await orderFor(user, { planId: ADV_PLAN });
      return verify(user, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sign(orderId, paymentId) });
    };

    test('creates the AdvisorSubscription server-side, without touching the platform plan or is_premium', async () => {
      const userUpdates = [];
      mock.method(db.User, 'update', async (patch) => { userUpdates.push(patch); return [1]; });
      const platform = t.subs.add({ user_id: U.id, plan_id: PREMIUM, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + 86400000 * 20), advisor_id: null, finfluencer_id: null });

      const res = await pay();
      assert.equal(res.status, 200);
      assert.equal(res.body.kind, 'advisor');
      const advSub = t.subs.rows.find((s) => s.advisor_id === ADV_ID);
      assert.deepEqual([advSub.user_id, advSub.plan_id, advSub.status, advSub.type], [U.id, ADV_PLAN, 'active', 'advisor']);
      assert.ok(new Date(advSub.end_date) > new Date(Date.now() + 29 * 86400000));
      assert.equal(platform.status, 'active');
      assert.deepEqual(userUpdates, [], 'advisor purchase must not change is_premium or role');
      assert.equal(t.txns.rows[0].amount, 500);
      assert.equal(t.advisors.rows[0].follower_count, 1);
    });

    test('records the advisor commission once, from the verified amount', async () => {
      await pay();
      assert.equal(t.commissions.rows.length, 1);
      const c = t.commissions.rows[0];
      assert.equal(c.reference_id, 'pay_a1');
      assert.equal(c.advisor_id, ADV_ID);
      assert.equal(c.metadata.gross_amount, 500);
      assert.equal(c.amount, 400); // 20% default platform fee
      assert.equal(c.status, 'pending');
    });

    test('retrying the verification does not duplicate the subscription, payment, follower or commission', async () => {
      const orderId = await orderFor(U, { planId: ADV_PLAN });
      const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_a1', razorpay_signature: sign(orderId, 'pay_a1') };
      await verify(U, body);
      const again = await verify(U, body);
      assert.equal(again.body.alreadyProcessed, true);
      assert.equal(t.subs.rows.filter((s) => s.advisor_id === ADV_ID).length, 1);
      assert.equal(t.txns.rows.length, 1);
      assert.equal(t.commissions.rows.length, 1);
      assert.equal(t.advisors.rows[0].follower_count, 1);
    });

    test('a repeat commission failure is repaired by the retry (commission is idempotent on the payment id)', async () => {
      const orderId = await orderFor(U, { planId: ADV_PLAN });
      const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_a1', razorpay_signature: sign(orderId, 'pay_a1') };
      const real = db.CommissionTracking.create;
      mock.method(db.CommissionTracking, 'create', async () => { throw new Error('transient'); });
      assert.equal((await verify(U, body)).status, 200, 'a commission problem never fails the verified payment');
      assert.equal(t.commissions.rows.length, 0);
      db.CommissionTracking.create.mock.restore();
      mock.method(db.CommissionTracking, 'create', real);
      await verify(U, body);
      assert.equal(t.commissions.rows.length, 1);
    });

    test('a second payment (renewal) extends the same subscription', async () => {
      await pay(U, 'pay_a1');
      const first = t.subs.rows.find((s) => s.advisor_id === ADV_ID);
      const firstEnd = new Date(first.end_date).getTime();
      // While the period is live a second order for the same plan is refused (409);
      // once it has lapsed a new payment renews the same row.
      first.end_date = new Date(Date.now() - 1000);
      const res = await pay(U, 'pay_a2');
      assert.equal(res.status, 200);
      assert.equal(t.subs.rows.filter((s) => s.advisor_id === ADV_ID).length, 1);
      assert.ok(new Date(first.end_date).getTime() > Date.now() + 28 * 86400000);
      assert.ok(firstEnd > Date.now());
      assert.equal(t.commissions.rows.length, 2, 'each payment earns its own commission');
    });
  });
});

describe('atomicity', () => {
  test('every write of a verified payment goes through the one transaction', async () => {
    const tx = { id: 'the-transaction' };
    mock.method(db.sequelize, 'transaction', async (cb) => cb(tx));
    const seen = {};
    const spy = (model, name, label) => {
      const original = model[name];
      mock.method(model, name, async (...args) => {
        const opts = args[args.length - 1];
        (seen[label] ||= []).push(opts && opts.transaction);
        return original.apply(model, args);
      });
    };
    spy(db.Subscription, 'create', 'subscription');
    spy(db.FundTransaction, 'create', 'fund');
    spy(db.SubscriptionTransaction, 'create', 'txn');
    spy(db.PromoCode, 'increment', 'coupon');

    const order = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    const orderId = order.body.order_id;
    const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_9', razorpay_signature: sign(orderId, 'pay_9') });
    assert.equal(res.status, 200);
    for (const label of ['subscription', 'fund', 'txn', 'coupon']) {
      assert.deepEqual(seen[label], [tx], `${label} write must use the shared transaction`);
    }
  });
});

describe('promo codes on advisor plans', () => {
  test('a generic code cannot discount an advisor plan (the advisor would fund it); a code that lists the plan can', async () => {
    const generic = await createOrder(U, { planId: ADV_PLAN, couponCode: 'NEW50' });
    assert.equal(generic.status, 400);
    assert.equal(createCalls.length, 0);
    t.promos.add({ id: 'c3', code: 'ADV20', discount_percent: 20, is_active: true, uses_count: 0, applicable_to: [ADV_PLAN] });
    const listed = await createOrder(U, { planId: ADV_PLAN, couponCode: 'ADV20' });
    assert.equal(listed.status, 200);
    assert.equal(createCalls[0].amount, 40000);
  });
});

describe('payment capture is confirmed with the gateway', () => {
  async function paidOrder() {
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly' });
    return res.body.order_id;
  }
  const body = (orderId) => ({ razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') });
  const gateway = (over) => mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => {
    const order = razorpayOrders[`order_${createCalls.length}`];
    return { id, order_id: order.id, amount: order.amount, currency: 'INR', status: 'captured', ...over };
  });

  test('orders ask Razorpay to auto-capture', async () => {
    await paidOrder();
    assert.equal(createCalls[0].payment_capture, 1);
  });

  test('a valid signature on a payment that is not captured activates nothing', async () => {
    for (const status of ['failed', 'created', 'refunded']) {
      const orderId = await paidOrder();
      gateway({ status });
      const res = await verify(U, body(orderId));
      assert.equal(res.status, 400, status);
    }
    assert.equal(t.subs.rows.length, 0);
    assert.equal(t.txns.rows.length, 0);
  });

  test('"authorized" (auto-capture still settling) is a retryable 409, not a failure and not an activation', async () => {
    const orderId = await paidOrder();
    gateway({ status: 'authorized' });
    const res = await verify(U, body(orderId));
    assert.equal(res.status, 409);
    assert.equal(res.body.pending, true);
    assert.equal(t.subs.rows.length, 0);
    gateway({ status: 'captured' });
    assert.equal((await verify(U, body(orderId))).status, 200);
  });

  test('the payment must belong to this order and match its amount exactly', async () => {
    const orderId = await paidOrder();
    gateway({ order_id: 'order_someone_elses' });
    assert.equal((await verify(U, body(orderId))).status, 400);
    gateway({ amount: 100 });
    assert.equal((await verify(U, body(orderId))).status, 400);
    assert.equal(t.subs.rows.length, 0);
  });

  test('an unknown payment id is a clean 400', async () => {
    const orderId = await paidOrder();
    mock.method(PaymentController.razorpay.payments, 'fetch', async () => { throw new Error('no such payment'); });
    assert.equal((await verify(U, body(orderId))).status, 400);
  });
});

describe('promo limits at redemption time', () => {
  const pay = async (user, paymentId, orderId) => verify(user, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sign(orderId, paymentId) });

  test('many unpaid orders for a one-use code: every paid customer is served, the overage is recorded, uses are counted', async () => {
    t.promos.add({ id: 'c5', code: 'ONCE', discount_percent: 10, is_active: true, uses_count: 0, max_uses: 1, applicable_to: 'all' });
    const audit = fakeTable().install(mock, db.AuditLog);
    // both orders are created while the code still has a use left
    const a = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'ONCE' })).body.order_id;
    const b = (await createOrder(OTHER, { planId: PREMIUM, cycle: 'monthly', couponCode: 'ONCE' })).body.order_id;
    assert.ok(a && b);

    mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => {
      const orderId = id === 'pay_a' ? a : b;
      return { id, order_id: orderId, amount: razorpayOrders[orderId].amount, currency: 'INR', status: 'captured' };
    });
    assert.equal((await pay(U, 'pay_a', a)).status, 200);
    assert.equal(audit.rows.length, 0, 'the first redemption is within the limit');
    assert.equal((await pay(OTHER, 'pay_b', b)).status, 200, 'the second customer has paid; they are not failed');

    const row = t.promos.rows.find((r) => r.code === 'ONCE');
    assert.equal(row.uses_count, 2);
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].action, 'promo_redemption_overage');
    assert.equal(audit.rows[0].user_id, OTHER.id);
    assert.equal(audit.rows[0].new_data.reason, 'exhausted');
    assert.equal(audit.rows[0].new_data.payment_id, 'pay_b');
    assert.equal(t.subs.rows.filter((s) => s.user_id === OTHER.id).length, 1);
  });

  test('a code switched off or expired between order and payment is flagged, not refused', async () => {
    const audit = fakeTable().install(mock, db.AuditLog);
    const orderId = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' })).body.order_id;
    t.promos.rows[0].is_active = false;
    assert.equal((await pay(U, 'pay_1', orderId)).status, 200);
    assert.equal(audit.rows[0].new_data.reason, 'inactive');
    assert.equal(t.promos.rows[0].uses_count, 1);
  });

  test('a one-time-per-user code used twice by one customer through parallel orders is flagged', async () => {
    t.promos.rows[0].one_time_per_user = true;
    const audit = fakeTable().install(mock, db.AuditLog);
    const a = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' })).body.order_id;
    const b = (await createOrder(U, { planId: PREMIUM, cycle: 'annually', couponCode: 'NEW50' })).body.order_id;
    mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => {
      const orderId = id === 'pay_a' ? a : b;
      return { id, order_id: orderId, amount: razorpayOrders[orderId].amount, currency: 'INR', status: 'captured' };
    });
    await pay(U, 'pay_a', a);
    await pay(U, 'pay_b', b);
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].new_data.reason, 'already_used');
  });

  test('the promo row is locked (SELECT ... FOR UPDATE) before the limits are re-checked', async () => {
    const seen = [];
    mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'FOR-UPDATE' } }));
    const original = db.PromoCode.findOne;
    mock.method(db.PromoCode, 'findOne', async (opts) => { seen.push(opts.lock); return original.call(db.PromoCode, opts); });
    const orderId = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' })).body.order_id;
    seen.length = 0;
    await pay(U, 'pay_1', orderId);
    assert.ok(seen.includes('FOR-UPDATE'), 'fulfilment must read the promo row with a write lock');
  });
});

describe('cross-process race on the same payment', () => {
  test('losing the unique-index race returns success with the winner\'s result, not a 500', async () => {
    const orderId = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly' })).body.order_id;
    const winner = t.subs.add({ user_id: U.id, plan_id: PREMIUM, status: 'active', plan_type: 'Premium', advisor_id: null, finfluencer_id: null });
    // The other process commits between our lookup and our insert.
    let lookups = 0;
    const lookup = db.SubscriptionTransaction.findOne;
    mock.method(db.SubscriptionTransaction, 'findOne', async (opts) => {
      lookups += 1;
      if (lookups === 1) return null;
      return t.txns.rows.find((r) => r.transaction_id === opts.where.transaction_id) || null;
    });
    mock.method(db.SubscriptionTransaction, 'create', async (data) => {
      t.txns.add({ ...data, subscription_id: winner.id }); // what the winning process wrote
      const e = new Error('Duplicate entry'); e.name = 'SequelizeUniqueConstraintError'; throw e;
    });
    const res = await verify(U, { razorpay_order_id: orderId, razorpay_payment_id: 'pay_race', razorpay_signature: sign(orderId, 'pay_race') });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.alreadyProcessed, true);
    assert.equal(lookup === undefined, false);
  });
});

describe('payment.captured webhook fulfils a payment whose buyer closed the tab', () => {
  const hook = (paymentId, orderId, amount) => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: orderId, amount, status: 'captured' } } } });
    return request(app).post('/api/payments/webhook').set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex')).send(raw);
  };
  const order = async (body = { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' }) => {
    const res = await createOrder(U, body);
    return { id: res.body.order_id, amount: res.body.amount };
  };

  test('activates the plan from the order\'s notes with no /verify call', async () => {
    const o = await order();
    const res = await hook('pay_w1', o.id, o.amount);
    assert.equal(res.status, 200);
    assert.deepEqual([t.subs.rows[0].user_id, t.subs.rows[0].plan_id, t.subs.rows[0].status], [U.id, PREMIUM, 'active']);
    assert.equal(t.txns.rows[0].amount, 499.5);
    assert.equal(t.promos.rows[0].uses_count, 1);
  });

  test('a later /verify for the same payment is a no-op (and the other order of arrival too)', async () => {
    const o = await order();
    await hook('pay_w1', o.id, o.amount);
    const v = await verify(U, { razorpay_order_id: o.id, razorpay_payment_id: 'pay_w1', razorpay_signature: sign(o.id, 'pay_w1') });
    assert.equal(v.status, 200);
    assert.equal(v.body.alreadyProcessed, true);
    // redelivery of the webhook as well
    await hook('pay_w1', o.id, o.amount);
    assert.equal(t.subs.rows.length, 1);
    assert.equal(t.txns.rows.length, 1);
    assert.equal(t.funds.rows.length, 1);
    assert.equal(t.promos.rows[0].uses_count, 1);

    // verify first, then the webhook
    const o2 = await order({ planId: PREMIUM, cycle: 'annually' });
    await verify(U, { razorpay_order_id: o2.id, razorpay_payment_id: 'pay_w2', razorpay_signature: sign(o2.id, 'pay_w2') });
    await hook('pay_w2', o2.id, o2.amount);
    assert.equal(t.txns.rows.filter((r) => r.transaction_id === 'pay_w2').length, 1);
  });

  test('advisor plans: the commission is recorded once however the payment arrives', async () => {
    const o = await order({ planId: ADV_PLAN });
    await hook('pay_wa', o.id, o.amount);
    await verify(U, { razorpay_order_id: o.id, razorpay_payment_id: 'pay_wa', razorpay_signature: sign(o.id, 'pay_wa') });
    assert.equal(t.commissions.rows.length, 1);
    assert.equal(t.subs.rows.filter((s) => s.advisor_id === ADV_ID).length, 1);
  });

  test('is checked against the gateway: an unsigned, uncaptured or mismatched event activates nothing', async () => {
    const o = await order();
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: o.id, amount: o.amount } } } });
    const unsigned = await request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'f'.repeat(64)).send(raw);
    assert.equal(unsigned.status, 400);
    mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => ({ id, order_id: o.id, amount: o.amount, currency: 'INR', status: 'authorized' }));
    await hook('pay_x', o.id, o.amount);
    mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => ({ id, order_id: o.id, amount: 1, currency: 'INR', status: 'captured' }));
    await hook('pay_x', o.id, o.amount);
    assert.equal(t.subs.rows.length, 0);
  });

  test('orders that are not ours (no plan notes) are ignored, and a permanent refusal is acknowledged', async () => {
    razorpayOrders.order_ext = { id: 'order_ext', amount: 5000, currency: 'INR', notes: {} };
    mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => ({ id, order_id: 'order_ext', amount: 5000, currency: 'INR', status: 'captured' }));
    assert.equal((await hook('pay_ext', 'order_ext', 5000)).status, 200);
    assert.equal(t.subs.rows.length, 0);
    const o = await order();
    t.plans.rows.splice(0, 3); // plan deleted before the webhook arrives
    assert.equal((await hook('pay_gone', o.id, o.amount)).status, 200, 'no endless Razorpay retries for a permanent failure');
  });
});

describe('verify is cheap and bounded', () => {
  test('a replay is answered from the database: no gateway calls', async () => {
    const orderId = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly' })).body.order_id;
    const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') };
    await verify(U, body);
    let gatewayCalls = 0;
    mock.method(PaymentController.razorpay.orders, 'fetch', async () => { gatewayCalls += 1; throw new Error('should not be called'); });
    mock.method(PaymentController.razorpay.payments, 'fetch', async () => { gatewayCalls += 1; throw new Error('should not be called'); });
    const again = await verify(U, body);
    assert.equal(again.status, 200);
    assert.equal(again.body.alreadyProcessed, true);
    assert.equal(gatewayCalls, 0);
  });

  test('a replay by another account is refused without any gateway call', async () => {
    const orderId = (await createOrder(U, { planId: PREMIUM, cycle: 'monthly' })).body.order_id;
    const body = { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') };
    await verify(U, body);
    mock.method(PaymentController.razorpay.orders, 'fetch', async () => { throw new Error('should not be called'); });
    assert.equal((await verify(OTHER, body)).status, 403);
  });

  test('the transaction_id unique index has the same name in the model as in migration 013', () => {
    const fs = require('fs');
    const sql = fs.readFileSync(require('path').join(__dirname, '../src/migrations/013_free_plan_backfill_and_payment_idempotency.sql'), 'utf8');
    const attr = db.SubscriptionTransaction.rawAttributes.transaction_id;
    assert.equal(attr.unique, 'uq_subscription_txn_payment');
    assert.ok(sql.includes('`uq_subscription_txn_payment`'));
  });
});

describe('100% promo codes activate free, with no gateway', () => {
  beforeEach(() => {
    // A 100% code must carry a usage limit (PromoCodeController and checkout both enforce it).
    t.promos.add({ id: 'cf', code: 'FREE100', discount_percent: 100, is_active: true, uses_count: 0, max_uses: 100, applicable_to: 'all', one_time_per_user: true });
    t.promos.add({ id: 'cf2', code: 'FREEADV', discount_percent: 100, is_active: true, uses_count: 0, applicable_to: [ADV_PLAN] });
  });
  const free = (user, body = { planId: PREMIUM, cycle: 'monthly', couponCode: 'FREE100' }) => createOrder(user, body);
  const promo = (code) => t.promos.rows.find((r) => r.code === code);

  test('a legacy 100% code with no usage limit cannot activate anything', async () => {
    // Codes created before the limit rule still exist; checkout enforces it too.
    t.promos.add({ id: 'cf3', code: 'FREEOPEN', discount_percent: 100, is_active: true, uses_count: 0, max_uses: null, applicable_to: 'all', one_time_per_user: false });
    // OTHER, not U: a refused attempt counts toward U's failure limiter used by later tests.
    const res = await free(OTHER, { planId: PREMIUM, cycle: 'monthly', couponCode: 'FREEOPEN' });
    assert.equal(res.status, 400);
    assert.equal(promo('FREEOPEN').uses_count, 0);
  });

  test('validate quotes a free plan', async () => {
    const res = await validate(U, { code: 'FREE100', planId: PREMIUM, cycle: 'annually' });
    assert.equal(res.status, 200);
    assert.deepEqual([res.body.isFree, res.body.finalAmount, res.body.discountAmount], [true, 0, 9990]);
  });

  test('no Razorpay order, no payment fetch; the plan is active in one go', async () => {
    mock.method(PaymentController.razorpay.payments, 'fetch', async () => { throw new Error('gateway must not be used'); });
    const res = await free(U);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.free, true);
    assert.equal(res.body.order_id, undefined);
    assert.equal(res.body.key_id, undefined);
    assert.equal(createCalls.length, 0, 'no order created at the gateway');

    const sub = t.subs.rows[0];
    assert.deepEqual([sub.user_id, sub.plan_id, sub.status, sub.plan_type, sub.billing_cycle, sub.payment_method_id], [U.id, PREMIUM, 'active', 'Premium', 'monthly', 'coupon']);
    assert.ok(new Date(sub.end_date) > new Date(Date.now() + 29 * 86400000), 'a full period is granted');
    const txn = t.txns.rows[0];
    assert.deepEqual([txn.amount, txn.payment_method, txn.coupon_used, txn.status, txn.discount_applied], [0, 'coupon', 'FREE100', 'completed', 999]);
    assert.match(txn.transaction_id, /^coupon_[0-9a-f-]{36}$/);
    assert.equal(t.funds.rows[0].amount, 0);
    assert.equal(t.funds.rows[0].source, 'coupon');
    assert.equal(promo('FREE100').uses_count, 1);
  });

  test('yearly cycle gets a year', async () => {
    await free(U, { planId: PREMIUM, cycle: 'annually', couponCode: 'FREE100' });
    assert.ok(new Date(t.subs.rows[0].end_date) > new Date(Date.now() + 364 * 86400000));
    assert.equal(t.subs.rows[0].billing_cycle, 'annually');
  });

  test('the user is made premium and the Free row is replaced', async () => {
    const updates = [];
    mock.method(db.User, 'update', async (patch) => { updates.push(patch); return [1]; });
    t.subs.add({ user_id: U.id, plan_id: FREE, status: 'active', plan_type: 'Free', end_date: null, advisor_id: null, finfluencer_id: null });
    await free(U);
    assert.equal(t.subs.rows[0].status, 'cancelled');
    assert.deepEqual(updates.at(-1), { is_premium: true });
  });

  test('one-time-per-user limit holds: the second redemption is refused and nothing changes', async () => {
    assert.equal((await free(U)).status, 200);
    t.subs.rows[0].end_date = new Date(Date.now() - 1000); // plan lapsed
    const again = await free(U);
    assert.equal(again.status, 400);
    assert.equal(again.body.error, 'You have already used this promo code');
    assert.equal(promo('FREE100').uses_count, 1);
    assert.equal(t.txns.rows.length, 1);
  });

  test('global limit, deactivation and expiry are enforced at redemption (no money to honour, so it refuses)', async () => {
    promo('FREE100').one_time_per_user = false;
    promo('FREE100').max_uses = 1;
    assert.equal((await free(U)).status, 200);
    // a second customer: the code is now exhausted
    const second = await free(OTHER);
    assert.equal(second.status, 400);
    assert.match(second.body.error, /usage limit/);
    assert.equal(t.subs.rows.filter((s) => s.user_id === OTHER.id).length, 0);
    assert.equal(promo('FREE100').uses_count, 1);

    // Between quoting and redeeming the code is switched off: the locked re-check refuses.
    promo('FREE100').max_uses = null;
    const original = db.PromoCode.findOne;
    let n = 0;
    mock.method(db.PromoCode, 'findOne', async (opts) => {
      const row = await original.call(db.PromoCode, opts);
      if (row && ++n === 2) row.is_active = false; // the 2nd read is the locked one
      return row;
    });
    const off = await free(OTHER);
    assert.equal(off.status, 400);
    assert.equal(off.body.error, 'This promo code is not valid');
    assert.equal(t.subs.rows.filter((s) => s.user_id === OTHER.id).length, 0);
  });

  test('the promo row is locked FOR UPDATE for the check', async () => {
    mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'FOR-UPDATE' } }));
    const seen = [];
    const original = db.PromoCode.findOne;
    mock.method(db.PromoCode, 'findOne', async (opts) => { seen.push(opts.lock); return original.call(db.PromoCode, opts); });
    await free(U);
    assert.ok(seen.includes('FOR-UPDATE'));
  });

  test('every write uses the one transaction; a failure leaves nothing behind (rolled back)', async () => {
    let rolledBack = false;
    const tx = { LOCK: {} };
    mock.method(db.sequelize, 'transaction', async (cb) => { try { return await cb(tx); } catch (e) { rolledBack = true; throw e; } });
    const seen = [];
    for (const [model, name] of [[db.Subscription, 'create'], [db.FundTransaction, 'create'], [db.SubscriptionTransaction, 'create'], [db.PromoCode, 'increment']]) {
      const original = model[name];
      mock.method(model, name, async (...args) => { seen.push(args[args.length - 1].transaction); return original.apply(model, args); });
    }
    await free(U);
    assert.equal(seen.length, 4);
    assert.ok(seen.every((x) => x === tx));
    mock.method(db.SubscriptionTransaction, 'create', async () => { throw new Error('db down'); });
    t.subs.rows.length = 0;
    promo('FREE100').one_time_per_user = false;
    const res = await free(OTHER);
    assert.equal(res.status, 500);
    assert.equal(rolledBack, true);
  });

  test('a double click activates once', async () => {
    promo('FREE100').one_time_per_user = false;
    const [a, b] = await Promise.all([free(U), free(U)]);
    assert.deepEqual([a.status, b.status], [200, 200]);
    assert.equal(t.txns.rows.length, 1);
    assert.equal(promo('FREE100').uses_count, 1);
  });

  test('already on that plan: refused, no use burned', async () => {
    promo('FREE100').one_time_per_user = false;
    t.subs.add({ user_id: U.id, plan_id: PREMIUM, status: 'active', plan_type: 'Premium', end_date: new Date(Date.now() + 10 * 86400000), advisor_id: null, finfluencer_id: null });
    const res = await free(U);
    assert.equal(res.status, 409);
    assert.equal(promo('FREE100').uses_count, 0);
  });

  test('another account cannot claim the free activation through /payments/verify, and has its own allowance', async () => {
    const mine = await free(U);
    const ref = t.txns.rows[0].transaction_id;
    const claim = await verify(OTHER, { razorpay_order_id: 'order_x', razorpay_payment_id: ref, razorpay_signature: sign('order_x', ref) });
    // The signature is valid for this pair, but the payment is U's: refused before any gateway call.
    assert.equal(claim.status, 403);
    assert.equal(t.subs.rows.filter((s) => s.user_id === OTHER.id).length, 0);
    assert.equal(mine.status, 200);
    assert.equal((await free(OTHER)).status, 200, 'a different customer may still use the one-time code once');
    assert.equal(promo('FREE100').uses_count, 2);
  });

  test('a code that only partly discounts still goes through Razorpay', async () => {
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEW50' });
    assert.equal(res.body.free, undefined);
    assert.equal(res.body.order_id, 'order_1');
    assert.equal(createCalls.length, 1);
    assert.equal(t.subs.rows.length, 0);
  });

  test('zero is not reachable without a coupon: free plans stay refused and an order is never created for 0', async () => {
    assert.equal((await createOrder(U, { planId: FREE, cycle: 'monthly' })).status, 400);
    assert.equal((await createOrder(U, { planId: FREE, cycle: 'monthly', couponCode: 'FREE100' })).status, 400);
    assert.equal((await createOrder(U, { planId: PREMIUM, cycle: 'monthly', amount: 0, finalAmount: 0 })).body.amount, 99900);
    assert.equal(t.subs.rows.length, 0);
  });

  test('a flat code bigger than the price does NOT make the plan free: refused at validate and at create-order', async () => {
    t.promos.add({ id: 'cb', code: 'BIGFLAT', discount_amount: 1000, is_active: true, uses_count: 0, applicable_to: 'all' });
    t.promos.add({ id: 'ce', code: 'EXACTFLAT', discount_amount: 999, is_active: true, uses_count: 0, applicable_to: 'all' });
    for (const code of ['BIGFLAT', 'EXACTFLAT']) {
      const v = await validate(U, { code, planId: PREMIUM, cycle: 'monthly' });
      assert.equal(v.status, 400);
      assert.equal(v.body.reason, 'flat_exceeds_price');
      assert.match(v.body.error, /worth more than this plan costs/);
      const o = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: code });
      assert.equal(o.status, 400);
      assert.equal(o.body.free, undefined);
    }
    assert.equal(createCalls.length, 0);
    assert.equal(t.subs.rows.length, 0);
    assert.equal(t.txns.rows.length, 0);
    // a flat code below the price is an ordinary paid discount
    t.promos.add({ id: 'cs', code: 'FLAT100', discount_amount: 100, is_active: true, uses_count: 0, applicable_to: 'all' });
    assert.equal((await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'FLAT100' })).body.amount, 89900);
  });

  test('only a code with discount_percent exactly 100 is free', async () => {
    t.promos.add({ id: 'c99', code: 'NEARLY', discount_percent: 99, is_active: true, uses_count: 0, applicable_to: 'all' });
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'NEARLY' });
    assert.equal(res.body.free, undefined);
    assert.equal(createCalls[0].amount, 999); // 1% of 999 = Rs 9.99 -> 999 paise, paid through Razorpay
    assert.equal(t.subs.rows.length, 0);
  });

  test('a malformed percentage that prices to zero (150%) is not a free code', async () => {
    t.promos.add({ id: 'c150', code: 'OVER', discount_percent: 150, is_active: true, uses_count: 0, applicable_to: 'all' });
    const res = await createOrder(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'OVER' });
    assert.equal(res.status, 400);
    assert.equal(res.body.free, undefined);
    assert.equal(t.subs.rows.length, 0);
  });

  test('two different free codes used at the same moment leave exactly one active plan (the customer row is locked)', async () => {
    t.promos.add({ id: 'cg', code: 'FREEB', discount_percent: 100, is_active: true, uses_count: 0, max_uses: 5, applicable_to: 'all' });
    t.plans.add({ id: 'p0000000-0000-4000-8000-0000000000bb', name: 'VIP', price: 1999, price_monthly: 1999, price_annually: 19990, is_active: true, advisor_id: null, finfluencer_id: null });
    const VIP = 'p0000000-0000-4000-8000-0000000000bb';
    // serialise transactions the way the row lock does, and record what was locked and in what order
    let chain = Promise.resolve();
    const order = [];
    mock.method(db.sequelize, 'transaction', (cb) => {
      const run = chain.then(() => cb({ LOCK: { UPDATE: 'FOR-UPDATE' } }));
      chain = run.catch(() => {});
      return run;
    });
    const promoFind = db.PromoCode.findOne;
    mock.method(db.PromoCode, 'findOne', async (o) => { if (o.lock) order.push('promo'); return promoFind.call(db.PromoCode, o); });
    mock.method(db.User, 'findOne', async (o) => { if (o.lock === 'FOR-UPDATE') order.push('user'); return { id: o.where.id }; });
    const subFind = db.Subscription.findAll;
    const subLocks = [];
    mock.method(db.Subscription, 'findAll', async (o) => { if (o.transaction) subLocks.push(o.lock); return subFind.call(db.Subscription, o); });

    const [a, b] = await Promise.all([
      free(U, { planId: PREMIUM, cycle: 'monthly', couponCode: 'FREE100' }),
      free(U, { planId: VIP, cycle: 'monthly', couponCode: 'FREEB' }),
    ]);
    assert.deepEqual([a.status, b.status], [200, 200]);
    const active = t.subs.rows.filter((s) => s.user_id === U.id && s.status === 'active' && !s.advisor_id);
    assert.equal(active.length, 1, 'never two active platform subscriptions');
    assert.ok(order.includes('user'), 'the customer row is locked FOR UPDATE');
    assert.ok(order.indexOf('promo') < order.indexOf('user'), 'lock order is promo then customer, everywhere');
    assert.ok(subLocks.length >= 2 && subLocks.every((l) => l === 'FOR-UPDATE'), 'subscription reads inside the activation are locking reads');
  });

  test('advisor plans cannot be made free (an advisor does not fund it; follower counts stay honest)', async () => {
    const res = await createOrder(U, { planId: ADV_PLAN, couponCode: 'FREEADV' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /advisor plan free/);
    assert.equal(createCalls.length, 0);
    assert.equal(t.subs.rows.length, 0);
    assert.equal(t.advisors.rows[0].follower_count, 0);
    // partial discounts on a listed advisor plan are still fine
    t.promos.add({ id: 'c7', code: 'ADV50', discount_percent: 50, is_active: true, uses_count: 0, applicable_to: [ADV_PLAN] });
    assert.equal((await createOrder(U, { planId: ADV_PLAN, couponCode: 'ADV50' })).status, 200);
  });

  test('needs a login', async () => {
    const res = await request(app).post('/api/payments/create-order').send({ planId: PREMIUM, cycle: 'monthly', couponCode: 'FREE100' });
    assert.equal(res.status, 401);
  });
});
