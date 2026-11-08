const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const SubscriptionService = require('../src/services/SubscriptionService');
const InvoiceService = require('../src/services/InvoiceService');
const EmailService = require('../src/services/EmailService');

const U = USERS.user;
const DAY = 86400000;
const PREMIUM = 'p0000000-0000-4000-8000-000000000001';
const FREE = 'p0000000-0000-4000-8000-000000000002';

beforeEach(() => stubUserLookup());
afterEach(() => mock.restoreAll());

/** A transaction stub that runs callbacks one at a time, like a row lock would. */
function serialisedTransactions() {
  let chain = Promise.resolve();
  const locks = [];
  mock.method(db.sequelize, 'transaction', (cb) => {
    const run = chain.then(() => cb({ LOCK: { UPDATE: 'FOR-UPDATE' }, locks }));
    chain = run.catch(() => {});
    return run;
  });
  return locks;
}

describe('refunds and cancellation', () => {
  let t; let refunds; let userUpdates;
  const live = () => t.subs.rows.find((s) => s.id === 'sub-1');

  beforeEach(() => {
    const paidAt = new Date(Date.now() - DAY);
    t = {
      plans: fakeTable([{ id: PREMIUM, name: 'Premium', price: 999, price_monthly: 999, price_annually: 9990, is_active: true, advisor_id: null, finfluencer_id: null },
        { id: FREE, name: 'Free', price: 0, price_monthly: 0, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null }]).install(mock, db.SubscriptionPlan),
      subs: fakeTable([{ id: 'sub-1', user_id: U.id, plan_id: PREMIUM, status: 'active', plan_type: 'Premium', advisor_id: null, finfluencer_id: null,
        start_date: paidAt, last_payment_date: paidAt, end_date: new Date(paidAt.getTime() + 30 * DAY), auto_renew: false }]).install(mock, db.Subscription),
      txns: fakeTable([{ subscription_id: 'sub-1', user_id: U.id, status: 'completed', transaction_type: 'charge', transaction_id: 'pay_1', amount: 999, discount_applied: 0, date: paidAt }]).install(mock, db.SubscriptionTransaction),
      refundReqs: fakeTable().install(mock, db.RefundRequest),
      funds: fakeTable().install(mock, db.FundTransaction),
    };
    t.subs.rows[0].id = 'sub-1';
    userUpdates = [];
    mock.method(db.User, 'update', async (patch) => { userUpdates.push(patch); return [1]; });
    refunds = [];
    mock.method(SubscriptionService, 'gateway', () => ({
      payments: { refund: async (id, opts) => { refunds.push({ id, opts }); await new Promise((r) => setTimeout(r, 5)); return { id: `rfnd_${refunds.length}` }; } },
    }));
  });

  test('a refund ends premium access: is_premium is recomputed and the user lands on Free', async () => {
    serialisedTransactions();
    const out = await SubscriptionService.initiateRefund('sub-1', 'changed my mind');
    assert.equal(out.success, true);
    assert.equal(live().status, 'cancelled');
    assert.deepEqual(userUpdates.at(-1), { is_premium: false });
    const free = t.subs.rows.find((s) => s.plan_type === 'Free' && s.status === 'active');
    assert.ok(free, 'a Free subscription replaces it');
  });

  test('is_premium stays true when another live paid platform plan remains', async () => {
    t.subs.add({ user_id: U.id, plan_id: PREMIUM, status: 'active', plan_type: 'Premium', advisor_id: null, finfluencer_id: null, end_date: new Date(Date.now() + 20 * DAY) });
    live().status = 'cancelled';
    assert.equal(await SubscriptionService.syncPremiumFlag(U.id), true);
    assert.deepEqual(userUpdates.at(-1), { is_premium: true });
  });

  test('concurrent cancel requests refund exactly once', async () => {
    serialisedTransactions();
    const results = await Promise.allSettled([
      SubscriptionService.initiateRefund('sub-1', 'a'),
      SubscriptionService.initiateRefund('sub-1', 'b'),
      SubscriptionService.initiateRefund('sub-1', 'c'),
    ]);
    assert.equal(refunds.length, 1, 'Razorpay must be asked to refund once');
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter((r) => r.status === 'rejected').length, 2);
    assert.equal(t.refundReqs.rows.length, 1);
    assert.equal(t.funds.rows.filter((f) => f.transaction_type === 'refund').length, 1);
  });

  test('the subscription row is read with a write lock when claiming the cancellation', async () => {
    serialisedTransactions();
    const seen = [];
    const original = db.Subscription.findByPk;
    mock.method(db.Subscription, 'findByPk', async (id, opts) => { seen.push(opts && opts.lock); return original.call(db.Subscription, id, opts); });
    await SubscriptionService.initiateRefund('sub-1', 'x');
    assert.ok(seen.includes('FOR-UPDATE'));
  });

  test('a payment that was already refunded cannot be refunded again', async () => {
    serialisedTransactions();
    t.refundReqs.add({ transaction_id: 'pay_1', status: 'approved' });
    await assert.rejects(SubscriptionService.initiateRefund('sub-1', 'x'), /already been refunded/);
    assert.equal(refunds.length, 0);
    assert.equal(live().status, 'active');
  });

  const rejection = () => Object.assign(new Error('bad'), { statusCode: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'The payment has been fully refunded already' } });

  test('a definite gateway rejection (4xx with an error code) puts the plan back and frees the payment for a retry', async () => {
    serialisedTransactions();
    mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => { throw rejection(); } } }));
    await assert.rejects(SubscriptionService.initiateRefund('sub-1', 'x'), (e) => /not been cancelled/.test(e.message) && !/fully refunded/.test(e.message));
    assert.equal(live().status, 'active');
    assert.equal(t.refundReqs.rows.length, 1);
    assert.equal(t.refundReqs.rows[0].status, 'rejected');
    assert.equal(t.funds.rows.length, 0, 'no money record');
    // a rejected request does not block trying again
    mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => ({ id: 'rfnd_ok' }) } }));
    assert.equal((await SubscriptionService.initiateRefund('sub-1', 'again')).success, true);
  });

  test('a timeout may have refunded: the plan stays cancelled, a pending request is kept, and a second cancel is blocked', async () => {
    serialisedTransactions();
    let calls = 0;
    mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => { calls += 1; throw new TypeError("Cannot read properties of undefined (reading 'status')"); } } }));
    const out = await SubscriptionService.initiateRefund('sub-1', 'x');
    assert.equal(out.success, true);
    assert.equal(out.pending, true);
    assert.equal(live().status, 'cancelled', 'not restored: the customer may already have been refunded');
    assert.equal(t.refundReqs.rows.length, 1);
    assert.equal(t.refundReqs.rows[0].status, 'pending');
    assert.equal(t.refundReqs.rows[0].transaction_id, 'pay_1');
    assert.deepEqual(userUpdates.at(-1), { is_premium: false });
    // they cannot get the plan back and cancel again for another refund
    live().status = 'active'; // even if something re-activated it
    await assert.rejects(SubscriptionService.initiateRefund('sub-1', 'again'), /already been refunded/);
    assert.equal(calls, 1);
  });

  test('5xx and 4xx-without-a-code are treated as unknown, not rejected', async () => {
    for (const err of [Object.assign(new Error('x'), { statusCode: 502, error: { code: 'SERVER_ERROR' } }), Object.assign(new Error('x'), { statusCode: 400 }), Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' })]) {
      t.refundReqs.rows.length = 0; live().status = 'active';
      serialisedTransactions();
      mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => { throw err; } } }));
      const out = await SubscriptionService.initiateRefund('sub-1', 'x');
      assert.equal(out.pending, true);
      assert.equal(live().status, 'cancelled');
    }
  });

  test('restore after a rejection only undoes our own cancellation', async () => {
    serialisedTransactions();
    mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => { live().status = 'expired'; throw rejection(); } } }));
    await assert.rejects(SubscriptionService.initiateRefund('sub-1', 'x'));
    assert.equal(live().status, 'expired', 'a row that is no longer "cancelled" is left alone');
  });

  test('the refund.processed webhook settles a pending request and books the ledger once', async () => {
    serialisedTransactions();
    mock.method(SubscriptionService, 'gateway', () => ({ payments: { refund: async () => { throw new Error('timeout'); } } }));
    await SubscriptionService.initiateRefund('sub-1', 'x');
    const requestId = t.refundReqs.rows[0].id;
    const entity = { id: 'rfnd_late', payment_id: 'pay_1', amount: 99900, notes: { refund_request_id: requestId } };
    await SubscriptionService.applyRefundProcessed(entity);
    await SubscriptionService.applyRefundProcessed(entity); // redelivery
    const row = t.refundReqs.rows[0];
    assert.deepEqual([row.status, row.razorpay_refund_id], ['completed', 'rfnd_late']);
    assert.equal(t.funds.rows.filter((f) => f.transaction_id === 'rfnd_late').length, 1);
    assert.equal(t.txns.rows.filter((r) => r.transaction_id === 'rfnd_late').length, 1);
  });

  test('double cancel after the webhook completed the refund is still blocked (status "completed", not only "approved")', async () => {
    serialisedTransactions();
    await SubscriptionService.initiateRefund('sub-1', 'first');
    assert.equal(t.refundReqs.rows[0].status, 'approved');
    await SubscriptionService.applyRefundProcessed({ id: 'rfnd_1', payment_id: 'pay_1', amount: 99900 });
    assert.equal(t.refundReqs.rows[0].status, 'completed');
    live().status = 'active';
    await assert.rejects(SubscriptionService.initiateRefund('sub-1', 'second'), /already been refunded/);
    assert.equal(refunds.length, 1);
  });

  test('the refund call carries the request id as receipt and note', async () => {
    serialisedTransactions();
    await SubscriptionService.initiateRefund('sub-1', 'x');
    const id = t.refundReqs.rows[0].id;
    assert.equal(refunds[0].opts.notes.refund_request_id, id);
    assert.match(refunds[0].opts.receipt, /^rfnd_/);
  });

  test('POST /subscriptions/cancel: a second call after the first is refused', async () => {
    serialisedTransactions();
    mock.method(db.User, 'findByPk', async (id) => ({ ...U, id }));
    // checkSubscriptionStatus uses Op.gt on end_date, which the fake does not model; resolve the live row directly.
    mock.method(SubscriptionService, 'checkSubscriptionStatus', async () => t.subs.rows.find((s) => s.status === 'active' && s.plan_type === 'Premium') || null);
    const call = () => request(app).post('/api/subscriptions/cancel').set('Authorization', bearer(U)).send({ reason: 'x' });
    const [a, b] = await Promise.all([call(), call()]);
    const statuses = [a.status, b.status].sort();
    assert.equal(statuses[0], 200);
    assert.ok([400, 404].includes(statuses[1]), `the losing call is refused, got ${statuses[1]}`);
    assert.equal(refunds.length, 1);
  });
});

describe('Free plan selection', () => {
  test('a plan merely named Free but priced above zero is never handed out', async () => {
    fakeTable([
      { id: 'x1', name: 'Free', price: 0, price_monthly: 499, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: 'x2', name: 'Basic', price: 0, price_monthly: 0, price_annually: 4999, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: 'x3', name: 'Free', price: 10, price_monthly: 0, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan);
    assert.equal(await SubscriptionService.getFreePlan(), null);
    const subs = fakeTable().install(mock, db.Subscription);
    assert.equal(await SubscriptionService.ensureFreeSubscription('u-1'), null);
    assert.equal(subs.rows.length, 0);
  });

  test('a genuinely free plan (NULL prices count as 0) is chosen, ahead of a mis-priced namesake', async () => {
    fakeTable([
      { id: 'bad', name: 'Free', price: 0, price_monthly: 499, price_annually: 0, is_active: true, advisor_id: null, finfluencer_id: null },
      { id: 'good', name: 'Free', price: 0, price_monthly: null, price_annually: null, is_active: null, advisor_id: null, finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan);
    assert.equal((await SubscriptionService.getFreePlan()).id, 'good');
  });

  test('migration 013 backfill applies the same price rule', () => {
    const sql = require('fs').readFileSync(require('path').join(__dirname, '../src/migrations/013_free_plan_backfill_and_payment_idempotency.sql'), 'utf8');
    const insert = sql.slice(sql.indexOf('INSERT INTO subscriptions'), sql.indexOf('-- ====='));
    assert.match(insert, /COALESCE\(price, 0\) = 0 AND COALESCE\(price_monthly, 0\) = 0 AND COALESCE\(price_annually, 0\) = 0/);
  });
});

describe('plan catalogue treats NULL is_active as active (same as checkout)', () => {
  test('public listing includes NULL, excludes false and advisor plans', async () => {
    fakeTable([
      { id: 'a', name: 'Free', is_active: null, advisor_id: null, finfluencer_id: null },
      { id: 'b', name: 'Premium', is_active: true, advisor_id: null, finfluencer_id: null },
      { id: 'c', name: 'Old', is_active: false, advisor_id: null, finfluencer_id: null },
      { id: 'd', name: 'Advisor', is_active: true, advisor_id: 'adv', finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan);
    const res = await request(app).get('/api/subscriptions/plans');
    assert.deepEqual(res.body.map((p) => p.name).sort(), ['Free', 'Premium']);
  });
});

describe('subscription listings never carry password hashes (SEC-12)', () => {
  test('the User include excludes the password column', async () => {
    let include;
    mock.method(db.Subscription, 'findAll', async (opts) => { include = opts.include; return []; });
    const res = await request(app).get('/api/subscriptions').set('Authorization', bearer(USERS.admin));
    assert.equal(res.status, 200);
    const user = include.find((i) => i.model === db.User);
    assert.ok(user, 'User is still included');
    assert.deepEqual(user.attributes, { exclude: ['password'] });
  });
});

describe('admin subscription analytics count paying customers only', () => {
  const analytics = () => request(app).get('/api/admin/subscription-analytics').set('Authorization', bearer(USERS.admin));
  const plan = (over) => ({ id: over.id, name: over.name, price: null, price_monthly: null, price_annually: null, ...over });

  beforeEach(() => {
    const premium = plan({ id: 'p', name: 'Premium', price_monthly: 1000, price_annually: 9600 });
    const free = plan({ id: 'f', name: 'Free', price_monthly: 0, price_annually: 0 });
    const nullPriced = plan({ id: 'n', name: 'Mystery', price_annually: 1200 }); // monthly price NULL
    const row = (over) => ({ advisor_id: null, finfluencer_id: null, billing_cycle: 'monthly', ...over });
    mock.method(db.Subscription, 'findAll', async (opts) => {
      if (opts.group) return []; // top plans
      assert.deepEqual([opts.where.advisor_id, opts.where.finfluencer_id], [null, null], 'advisor subscriptions are excluded in the query');
      return [
        row({ status: 'active', SubscriptionPlan: premium }),
        row({ status: 'active', SubscriptionPlan: premium, billing_cycle: 'annually' }),
        row({ status: 'cancelled', SubscriptionPlan: premium }),
        row({ status: 'active', SubscriptionPlan: free }),
        row({ status: 'active', SubscriptionPlan: free }),
        row({ status: 'cancelled', SubscriptionPlan: free }), // the Free row an upgrade cancels
        row({ status: 'active', SubscriptionPlan: nullPriced }),
      ];
    });
    mock.method(db.FundTransaction, 'findAll', async () => []);
    mock.method(db.FundTransaction, 'count', async () => 0);
    mock.method(db.SubscriptionTransaction, 'findAll', async () => []);
  });

  test('Free rows are out of subscribers, cancellations, churn and MRR; NULL prices count as 0', async () => {
    const res = await analytics();
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.subscribers, { total: 4, active: 3, cancelled: 1, churnRate: 25 });
    // 1000 monthly + 9600/12 annual + 0 for the NULL-priced plan
    assert.equal(res.body.financials.mrr, 1800);
    assert.equal(res.body.financials.arr, 21600);
    assert.ok(Number.isFinite(res.body.financials.mrr));
  });

  test('requires admin', async () => {
    assert.equal((await request(app).get('/api/admin/subscription-analytics').set('Authorization', bearer(U))).status, 403);
  });
});

describe('webhook subscription.charged is idempotent per payment id', () => {
  let t; let sent;
  const event = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_rzp_1' } }, payment: { entity: { id: 'pay_renew_1', amount: 99900 } } } });
  const post = () => request(app).post('/api/payments/webhook').set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(event).digest('hex')).send(event);

  beforeEach(() => {
    t = {
      subs: fakeTable([{ user_id: U.id, razorpay_subscription_id: 'sub_rzp_1', status: 'active', billing_cycle: 'monthly', end_date: new Date('2030-01-01T00:00:00Z') }]).install(mock, db.Subscription),
      txns: fakeTable().install(mock, db.SubscriptionTransaction),
      funds: fakeTable().install(mock, db.FundTransaction),
    };
    sent = [];
    mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: {} }));
    mock.method(db.User, 'findByPk', async () => ({ ...U, name: 'U' }));
    mock.method(InvoiceService, 'generateInvoice', async () => null);
    mock.method(EmailService, 'sendEmail', async (...a) => { sent.push(a); return true; });
  });

  test('redelivery extends the subscription once, books the money once, emails once', async () => {
    assert.equal((await post()).status, 200);
    const afterFirst = new Date(t.subs.rows[0].end_date).getTime();
    assert.equal(afterFirst, new Date('2030-01-31T00:00:00Z').getTime());
    assert.equal((await post()).status, 200);
    assert.equal(new Date(t.subs.rows[0].end_date).getTime(), afterFirst, 'no second extension');
    assert.equal(t.funds.rows.length, 1);
    assert.equal(t.txns.rows.length, 1);
    assert.equal(sent.length, 1);
  });

  test('a delivery that loses the unique-index race changes nothing', async () => {
    mock.method(db.SubscriptionTransaction, 'create', async () => { const e = new Error('dup'); e.name = 'SequelizeUniqueConstraintError'; throw e; });
    const res = await post();
    assert.equal(res.status, 200);
    assert.equal(new Date(t.subs.rows[0].end_date).getTime(), new Date('2030-01-01T00:00:00Z').getTime());
    assert.equal(sent.length, 0);
  });
});
