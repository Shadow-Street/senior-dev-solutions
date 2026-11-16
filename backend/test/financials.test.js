const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const PaymentController = require('../src/controllers/paymentController');
const SubscriptionService = require('../src/services/SubscriptionService');
const Reports = require('../src/services/FinanceReportService');
const Reconciliation = require('../src/services/ReconciliationService');
const { toPaise, paiseToText } = require('../src/utils/money');
const { toCsv } = require('../src/utils/csv');

// Super Admin > Financials (client slide 11): reports from real records, refunds
// through Razorpay (mocked), reconciliation, and admin-only access.

const as = (u) => ({ Authorization: bearer(u) });
const CUST = { id: '55555555-5555-4555-8555-555555555555', email: 'cust@example.test', app_role: 'user', role: 'user', status: 'active', display_name: 'Asha Customer' };
const CUST2 = { id: '66666666-6666-4666-8666-666666666666', email: '=cmd@example.test', app_role: 'user', role: 'user', status: 'active', display_name: '=HYPERLINK("http://x")' };

const P = {
  basic: 'b0000000-0000-4000-8000-000000000001',
  premium: 'b0000000-0000-4000-8000-000000000002',
  vip: 'b0000000-0000-4000-8000-000000000003',
  adv: 'b0000000-0000-4000-8000-000000000004',
};
const ADVISOR_ID = 'a0000000-0000-4000-8000-0000000000a1';
const S = {
  premium: 'c0000000-0000-4000-8000-000000000001',
  vip: 'c0000000-0000-4000-8000-000000000002',
  adv: 'c0000000-0000-4000-8000-000000000003',
  basic: 'c0000000-0000-4000-8000-000000000004',
};
const FUTURE = new Date(Date.now() + 20 * 86400000);
const d = (iso) => new Date(iso);

let t; let audit; let finAudit; let rz;

function charge(extra) {
  return { status: 'completed', payment_method: 'razorpay', transaction_type: 'charge', discount_applied: '0.00', coupon_used: null, razorpay_order_id: null, metadata: null, created_at: extra.date, ...extra };
}

beforeEach(() => {
  stubUserLookup({ [CUST.id]: CUST, [CUST2.id]: CUST2 });
  t = {
    plans: fakeTable([
      { id: P.basic, name: 'Basic', advisor_id: null, finfluencer_id: null },
      { id: P.premium, name: 'Premium', advisor_id: null, finfluencer_id: null },
      { id: P.vip, name: 'VIP', advisor_id: null, finfluencer_id: null },
      { id: P.adv, name: 'Alpha Picks', advisor_id: ADVISOR_ID, finfluencer_id: null },
    ]).install(mock, db.SubscriptionPlan),
    subs: fakeTable([
      { id: S.premium, user_id: CUST.id, plan_id: P.premium, status: 'active', advisor_id: null, finfluencer_id: null, billing_cycle: 'monthly', end_date: FUTURE },
      { id: S.vip, user_id: CUST2.id, plan_id: P.vip, status: 'active', advisor_id: null, finfluencer_id: null, billing_cycle: 'annually', end_date: FUTURE },
      { id: S.adv, user_id: CUST.id, plan_id: P.adv, status: 'active', advisor_id: ADVISOR_ID, finfluencer_id: null, billing_cycle: 'monthly', end_date: FUTURE },
      { id: S.basic, user_id: CUST2.id, plan_id: P.basic, status: 'active', advisor_id: null, finfluencer_id: null, billing_cycle: 'monthly', end_date: null },
    ]).install(mock, db.Subscription),
    txns: fakeTable([
      // Premium: new in Sept, renewal in Oct (same user, same tier), then 999 refunded in Oct.
      charge({ subscription_id: S.premium, user_id: CUST.id, amount: '999.00', transaction_id: 'pay_PREM0001', date: d('2026-09-10T06:00:00Z'), discount_applied: '100.00', coupon_used: 'NEW10' }),
      charge({ subscription_id: S.premium, user_id: CUST.id, amount: '999.00', transaction_id: 'pay_PREM0002', date: d('2026-10-10T06:00:00Z') }),
      { subscription_id: S.premium, user_id: CUST.id, amount: '-999.00', status: 'refunded', payment_method: 'razorpay', transaction_id: 'rfnd_OLD00001', transaction_type: 'refund', date: d('2026-10-12T06:00:00Z'), created_at: d('2026-10-12T06:00:00Z'), metadata: { original_transaction_id: 'pay_PREM0002' } },
      // VIP annual.
      charge({ subscription_id: S.vip, user_id: CUST2.id, amount: '11988.00', transaction_id: 'pay_VIP00001', date: d('2026-10-05T06:00:00Z') }),
      // Advisor plan.
      charge({ subscription_id: S.adv, user_id: CUST.id, amount: '500.00', transaction_id: 'pay_ADV00001', date: d('2026-10-15T06:00:00Z') }),
      // 100% promo activation: amount 0, gateway coupon.
      charge({ subscription_id: S.basic, user_id: CUST2.id, amount: '0.00', payment_method: 'coupon', transaction_id: 'coupon_x', date: d('2026-10-16T06:00:00Z'), discount_applied: '999.00' }),
      // Outside October (August): excluded by the date filter.
      // (another customer, so they do not make the October VIP payment a renewal)
      charge({ subscription_id: S.vip, user_id: 'u-august', amount: '0.10', transaction_id: 'pay_AUG00001', date: d('2026-08-01T06:00:00Z') }),
      charge({ subscription_id: S.vip, user_id: 'u-august', amount: '0.20', transaction_id: 'pay_AUG00002', date: d('2026-08-02T06:00:00Z') }),
    ]).install(mock, db.SubscriptionTransaction),
    attempts: fakeTable([
      { order_id: 'order_FAIL1', user_id: CUST.id, plan_id: P.vip, kind: 'platform', amount: '2999.00', status: 'failed', error_description: 'Card declined', created_at: d('2026-10-20T06:00:00Z'), failed_at: d('2026-10-20T06:01:00Z') },
      { order_id: 'order_PEND1', user_id: CUST2.id, plan_id: P.premium, kind: 'platform', amount: '999.00', status: 'pending', created_at: d('2026-10-21T06:00:00Z') },
      { order_id: 'order_DONE1', user_id: CUST.id, plan_id: P.premium, kind: 'platform', amount: '999.00', status: 'success', created_at: d('2026-10-10T05:59:00Z') },
    ]).install(mock, db.PaymentAttempt),
    commissions: fakeTable([
      { advisor_id: ADVISOR_ID, amount: '400.00', status: 'pending', reference_id: 'pay_ADV00001', metadata: { gross_amount: 500, platform_fee: 100 } },
    ]).install(mock, db.CommissionTracking),
    payouts: fakeTable([
      { entity_type: 'advisor', entity_id: ADVISOR_ID, amount: '150.00', status: 'paid', paid_at: d('2026-10-25T06:00:00Z') },
      { entity_type: 'advisor', entity_id: ADVISOR_ID, amount: '50.00', status: 'pending' },
    ]).install(mock, db.PayoutRequest),
    advisors: fakeTable([{ id: ADVISOR_ID, display_name: 'Ravi Advisor', name: null }]).install(mock, db.Advisor),
    refunds: fakeTable().install(mock, db.RefundRequest),
    income: fakeTable([
      { source: 'Sponsorship', amount: '1000.00', status: 'recorded', income_date: d('2026-10-03T00:00:00Z') },
      { source: 'Void entry', amount: '5000.00', status: 'void', income_date: d('2026-10-03T00:00:00Z') },
    ]).install(mock, db.Income),
    funds: fakeTable().install(mock, db.FundTransaction),
    expenses: fakeTable().install(mock, db.Expense),
  };

  mock.method(db.User, 'findAll', async (opts = {}) => {
    const all = [CUST, CUST2];
    const ids = opts.where && opts.where.id && opts.where.id[db.Sequelize.Op.in];
    if (ids) return all.filter((u) => ids.includes(u.id));
    return [];
  });
  mock.method(db.User, 'update', async () => [1]);
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  audit = []; finAudit = [];
  mock.method(db.AuditLog, 'create', async (row) => { audit.push(row); return row; });
  mock.method(db.AuditLog, 'findAll', async () => audit);
  mock.method(db.FinancialAuditLog, 'create', async (row) => { finAudit.push(row); return row; });
  mock.method(db.FinancialAuditLog, 'findAll', async (opts = {}) => finAudit.filter((a) => !opts.where || !opts.where.entity_id || a.entity_id === opts.where.entity_id));
  mock.method(db.Notification, 'create', async (row) => row);
  mock.method(SubscriptionService, 'syncPremiumFlag', async () => false);
  mock.method(SubscriptionService, 'ensureFreeSubscriptionSafely', async () => null);

  // Razorpay (test double). Payments as Razorpay reports them; refunds are recorded per payment.
  rz = { payments: {}, refunds: {}, refundCalls: [], refundImpl: null };
  const pay = (id, amount, status = 'captured', extra = {}) => { rz.payments[id] = { id, amount, currency: 'INR', status, amount_refunded: 0, order_id: `order_${id}`, created_at: 1790000000, ...extra }; };
  pay('pay_PREM0001', 99900); pay('pay_PREM0002', 99900, 'refunded', { amount_refunded: 99900 }); pay('pay_VIP00001', 1198800); pay('pay_ADV00001', 50000);
  mock.method(PaymentController.razorpay.payments, 'fetch', async (id) => {
    if (!rz.payments[id]) { const e = new Error('not found'); e.statusCode = 400; e.error = { code: 'BAD_REQUEST_ERROR' }; throw e; }
    return { ...rz.payments[id] };
  });
  mock.method(PaymentController.razorpay.payments, 'fetchMultipleRefund', async (id) => ({ items: rz.refunds[id] || [] }));
  mock.method(PaymentController.razorpay.payments, 'refund', async (id, opts) => {
    rz.refundCalls.push({ id, opts });
    if (rz.refundImpl) return rz.refundImpl(id, opts);
    const refund = { id: `rfnd_NEW${rz.refundCalls.length}`, payment_id: id, amount: opts.amount, status: 'pending', notes: opts.notes };
    rz.refunds[id] = [...(rz.refunds[id] || []), refund];
    rz.payments[id].amount_refunded += opts.amount;
    return refund;
  });
});
afterEach(() => mock.restoreAll());

const OCT = '?from=2026-10-01&to=2026-10-31';

// ---------------------------------------------------------------------------
describe('money and CSV helpers', () => {
  test('decimal strings convert to exact paise (no float drift)', () => {
    assert.equal(toPaise('0.10') + toPaise('0.20'), 30);
    assert.equal(toPaise('11988.00'), 1198800);
    assert.equal(toPaise('-999.00'), -99900);
    assert.equal(toPaise('1.005'), 101);
    assert.equal(toPaise(null), 0);
    assert.equal(toPaise('abc'), 0);
    assert.equal(paiseToText(-2550), '-25.50');
  });
  test('CSV neutralises formula cells but keeps numbers', () => {
    const csv = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], [{ a: '=SUM(A1)', b: -12.5 }, { a: '@x', b: '-3.00' }, { a: '+1+1', b: 'ok, "q"' }]);
    const lines = csv.trim().split('\r\n');
    assert.equal(lines[1], "'=SUM(A1),-12.5");
    assert.equal(lines[2], "'@x,-3.00");
    assert.equal(lines[3], "'+1+1,\"ok, \"\"q\"\"\"");
  });
});

describe('aggregation (pure)', () => {
  test('summarise: gross minus refunds, by tier and source', () => {
    const e = (x) => ({ record: 'charge', raw_status: 'completed', status: 'success', discount_paise: 0, ...x });
    const entries = [
      e({ kind: 'platform', tier: 'premium', amount_paise: 99900 }),
      e({ kind: 'platform', tier: 'vip', amount_paise: 299900 }),
      e({ kind: 'advisor', tier: null, amount_paise: 50000 }),
      { record: 'refund', kind: 'platform', tier: 'premium', amount_paise: 49950, status: 'refunded' },
      { record: 'attempt', status: 'failed', kind: 'platform', tier: 'vip', amount_paise: 299900 },
    ];
    const s = Reports.summarise(entries, { otherIncomePaise: 100000, commissions: [{ status: 'pending', amount: '400.00', metadata: { platform_fee: 100 } }] });
    assert.equal(s.totals.gross_collected, 4498);
    assert.equal(s.totals.refunds, 499.5);
    assert.equal(s.totals.net_revenue, 3998.5);
    assert.equal(s.totals.total_revenue, 4998.5);
    assert.equal(s.breakdown.platform_subscriptions.tiers.premium.net, 499.5);
    assert.equal(s.breakdown.platform_subscriptions.tiers.vip.gross, 2999);
    assert.equal(s.breakdown.advisor_subscriptions.gross, 500);
    // Platform earnings = platform net (3498.5) + advisor platform fee (100)
    assert.equal(s.totals.platform_earnings, 3598.5);
    assert.equal(s.totals.advisor_earnings, 400);
    assert.equal(s.counts.failed, 1);
  });
  test('renewal = an earlier paid charge for the same user and tier', () => {
    const rows = Reports.markRenewals([
      { id: '2', record: 'charge', raw_status: 'completed', amount_paise: 1, kind: 'platform', tier: 'premium', user_id: 'u', date: '2026-02-01' },
      { id: '1', record: 'charge', raw_status: 'completed', amount_paise: 1, kind: 'platform', tier: 'premium', user_id: 'u', date: '2026-01-01' },
      { id: '3', record: 'charge', raw_status: 'completed', amount_paise: 1, kind: 'platform', tier: 'vip', user_id: 'u', date: '2026-03-01' },
    ]);
    assert.deepEqual(rows.map((r) => [r.id, r.is_renewal]), [['2', true], ['1', false], ['3', false]]);
  });
  test('tier names', () => {
    assert.equal(Reports.tierOf('VIP Annual'), 'vip');
    assert.equal(Reports.tierOf('Premium'), 'premium');
    assert.equal(Reports.tierOf('Free'), 'basic');
    assert.equal(Reports.tierOf('Basic'), 'basic');
    assert.equal(Reports.tierOf('Gold'), 'other');
  });
});

// ---------------------------------------------------------------------------
describe('access control', () => {
  const GETS = ['/overview', '/subscription-revenue', '/advisor-revenue', '/analytics', '/transactions', '/transactions/export.csv', '/reports/monthly.csv', '/refunds', '/audit-logs'];
  for (const path of GETS) {
    test(`GET ${path}: 401 without a token, 403 for a normal user`, async () => {
      assert.equal((await request(app).get(`/api/financials${path}`)).status, 401);
      assert.equal((await request(app).get(`/api/financials${path}`).set(as(USERS.user))).status, 403);
    });
  }
  test('reconciliation and refund actions refuse a normal user', async () => {
    assert.equal((await request(app).post('/api/financials/reconciliation').set(as(USERS.user)).send({ from: '2026-10-01', to: '2026-10-31' })).status, 403);
    const r = t.refunds.add({ user_id: CUST.id, transaction_id: 'pay_PREM0001', status: 'pending', refund_amount: '100.00', processed_at: null });
    for (const action of ['approve', 'reject', 'sync']) {
      assert.equal((await request(app).post(`/api/financials/refunds/${r.id}/${action}`).set(as(USERS.user)).send({ reason: 'xyz' })).status, 403);
    }
    assert.equal(rz.refundCalls.length, 0);
    assert.equal(r.status, 'pending');
  });
  test('an admin (not super admin) cannot move money', async () => {
    const r = t.refunds.add({ user_id: CUST.id, transaction_id: 'pay_PREM0001', status: 'pending', refund_amount: '100.00', processed_at: null });
    assert.equal((await request(app).post(`/api/financials/refunds/${r.id}/approve`).set(as(USERS.admin)).send({})).status, 403);
    assert.equal(rz.refundCalls.length, 0);
  });
  test('the audit trail cannot be written through the API', async () => {
    assert.equal((await request(app).post('/api/financials/audit-logs').set(as(USERS.superAdmin)).send({ action: 'x' })).status, 405);
  });
});

// ---------------------------------------------------------------------------
describe('reports', () => {
  test('overview: October totals net of refunds, by source and tier', async () => {
    const res = await request(app).get(`/api/financials/overview${OCT}`).set(as(USERS.admin));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { totals, breakdown, counts } = res.body;
    // 999 (premium renewal) + 11988 (vip) + 500 (advisor) = 13487 gross; 999 refunded
    assert.equal(totals.gross_collected, 13487);
    assert.equal(totals.refunds, 999);
    assert.equal(totals.net_revenue, 12488);
    assert.equal(totals.other_income, 1000); // the 'void' income row is excluded
    assert.equal(totals.total_revenue, 13488);
    assert.equal(breakdown.platform_subscriptions.tiers.premium.gross, 999);
    assert.equal(breakdown.platform_subscriptions.tiers.premium.net, 0);
    assert.equal(breakdown.platform_subscriptions.tiers.vip.net, 11988);
    assert.equal(breakdown.platform_subscriptions.tiers.basic.gross, 0);
    assert.equal(breakdown.advisor_subscriptions.gross, 500);
    assert.equal(totals.advisor_platform_commission, 100);
    assert.equal(totals.platform_earnings, 11988 + 100);
    assert.equal(totals.free_activations, 1);
    assert.equal(totals.discounts_given, 999);
    assert.equal(counts.failed, 1);
    // The October order unpaid for weeks is abandoned, not pending.
    assert.equal(counts.pending, 0);
    assert.equal(counts.abandoned, 1);
  });
  test('days are India time: 30 Sep 19:00 UTC is 1 Oct in India', async () => {
    t.txns.add(charge({ subscription_id: S.vip, user_id: 'u-ist', amount: '100.00', transaction_id: 'pay_IST00001', date: d('2026-09-30T19:00:00Z') }));
    const oct = await request(app).get(`/api/financials/overview${OCT}`).set(as(USERS.admin));
    assert.equal(oct.body.totals.gross_collected, 13587);
    const sep = await request(app).get('/api/financials/overview?from=2026-09-01&to=2026-09-30').set(as(USERS.admin));
    assert.equal(sep.body.totals.gross_collected, 999);
  });
  test('analytics with only an end date covers the 12 months ending then', async () => {
    const res = await request(app).get('/api/financials/analytics?to=2026-10-31').set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.monthly.length, 12);
    assert.equal(res.body.monthly[11].month, '2026-10');
    assert.equal(res.body.monthly[11].net, 12488);
  });
  test('the date range really filters (August sums exactly)', async () => {
    const res = await request(app).get('/api/financials/overview?from=2026-08-01&to=2026-08-31').set(as(USERS.admin));
    assert.equal(res.body.totals.gross_collected, 0.3);
    assert.equal(res.body.totals.refunds, 0);
  });
  test('an invalid range is refused', async () => {
    assert.equal((await request(app).get('/api/financials/overview?from=2026-10-31&to=2026-10-01').set(as(USERS.admin))).status, 400);
    assert.equal((await request(app).get('/api/financials/overview?from=yesterday').set(as(USERS.admin))).status, 400);
  });
  test('subscription revenue: new vs renewal, subscribers, MRR', async () => {
    const res = await request(app).get(`/api/financials/subscription-revenue${OCT}`).set(as(USERS.admin));
    assert.equal(res.status, 200);
    const { tiers, totals } = res.body;
    assert.equal(tiers.premium.renewal_count, 1);
    assert.equal(tiers.premium.new_count, 0);
    assert.equal(tiers.premium.refunds, 999);
    assert.equal(tiers.vip.new_count, 1);
    assert.equal(tiers.vip.mrr, 999); // 11988 billed annually / 12
    assert.equal(tiers.premium.mrr, 0); // the latest premium charge was fully refunded
    assert.equal(tiers.premium.active_subscribers, 1);
    assert.equal(tiers.basic.active_subscribers, 1);
    assert.equal(tiers.basic.free_activations, 1);
    assert.equal(totals.advisor_mrr, 500);
  });
  test('advisor revenue: gross, platform commission, earnings and payouts', async () => {
    const res = await request(app).get(`/api/financials/advisor-revenue${OCT}`).set(as(USERS.admin));
    assert.equal(res.status, 200);
    const [a] = res.body.advisors;
    assert.equal(a.advisor_name, 'Ravi Advisor');
    assert.equal(a.gross, 500);
    assert.equal(a.platform_commission, 100);
    assert.equal(a.advisor_earnings, 400);
    assert.equal(a.commission_pending, 400);
    assert.equal(a.payouts_paid, 150);
    assert.equal(a.payouts_open, 50);
  });
  test('analytics: one row per month with the period net', async () => {
    const res = await request(app).get('/api/financials/analytics?from=2026-09-01&to=2026-10-31').set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.monthly.map((m) => m.month), ['2026-09', '2026-10']);
    assert.equal(res.body.monthly[0].net, 999);
    assert.equal(res.body.monthly[1].net, 12488);
    assert.equal(res.body.monthly[1].failed, 1);
    assert.equal(res.body.status_summary.failed.count, 1);
  });
  test('monthly report downloads as CSV', async () => {
    const res = await request(app).get('/api/financials/reports/monthly.csv?from=2026-10-01&to=2026-10-31').set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.text, /Monthly,2026-10,13487\.00,999\.00,12488\.00/);
  });
});

// ---------------------------------------------------------------------------
describe('transactions', () => {
  test('lists success, refunded, failed and pending with paging', async () => {
    const res = await request(app).get(`/api/financials/transactions${OCT}&limit=3`).set(as(USERS.admin));
    assert.equal(res.status, 200);
    // Oct: premium renewal + its refund + vip + advisor + coupon activation + failed + pending
    // attempts = 7 (the successful attempt is the premium charge, not listed twice)
    assert.equal(res.body.total, 7);
    assert.equal(res.body.items.length, 3);
    assert.equal(res.body.items[0].order_id, 'order_PEND1'); // newest first
  });
  test('status filter: refunded charges are derived from refund rows', async () => {
    const res = await request(app).get(`/api/financials/transactions${OCT}&status=refunded&record=charge`).set(as(USERS.admin));
    assert.deepEqual(res.body.items.map((i) => i.payment_id), ['pay_PREM0002']);
    const failed = await request(app).get(`/api/financials/transactions${OCT}&status=failed`).set(as(USERS.admin));
    assert.equal(failed.body.items[0].error, 'Card declined');
  });
  test('search by payment id and by customer; tier filter', async () => {
    const byId = await request(app).get('/api/financials/transactions?search=VIP0000').set(as(USERS.admin));
    assert.deepEqual(byId.body.items.map((i) => i.payment_id), ['pay_VIP00001']);
    mock.method(db.User, 'findAll', async (opts = {}) => {
      const ids = opts.where && opts.where.id && opts.where.id[db.Sequelize.Op.in];
      if (ids) return [CUST, CUST2].filter((u) => ids.includes(u.id));
      return [{ id: CUST.id }]; // the LIKE search
    });
    const byUser = await request(app).get(`/api/financials/transactions${OCT}&search=asha&record=charge&status=success`).set(as(USERS.admin));
    assert.deepEqual(byUser.body.items.map((i) => i.payment_id).sort(), ['pay_ADV00001']);
    const vip = await request(app).get(`/api/financials/transactions${OCT}&tier=vip`).set(as(USERS.admin));
    assert.ok(vip.body.items.every((i) => i.tier === 'vip'));
  });
  test('unknown filter values are refused', async () => {
    assert.equal((await request(app).get('/api/financials/transactions?status=hacked').set(as(USERS.admin))).status, 400);
  });
  test('CSV export escapes formula-looking customer names', async () => {
    const res = await request(app).get(`/api/financials/transactions/export.csv${OCT}&tier=vip`).set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.match(res.text, /'=HYPERLINK/);
    assert.match(res.text, /'=cmd@example\.test/);
    assert.match(res.text, /11988\.00/);
  });
});

// ---------------------------------------------------------------------------
describe('refund processing', () => {
  const pending = (extra = {}) => t.refunds.add({ user_id: CUST.id, transaction_id: 'pay_PREM0001', subscription_id: S.premium, transaction_type: 'subscription', status: 'pending', refund_amount: '999.00', reason: 'not useful', processed_at: null, razorpay_refund_id: null, ...extra });
  const approve = (r, body = {}) => request(app).post(`/api/financials/refunds/${r.id}/approve`).set(as(USERS.superAdmin)).send(body);

  test('approve refunds through Razorpay once, records the ledger, cancels the plan, audits', async () => {
    const r = pending();
    const res = await approve(r, { amount: '999', note: 'Duplicate purchase' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(rz.refundCalls.length, 1);
    assert.equal(rz.refundCalls[0].id, 'pay_PREM0001');
    assert.equal(rz.refundCalls[0].opts.amount, 99900);
    assert.equal(rz.refundCalls[0].opts.notes.refund_request_id, r.id);
    assert.equal(r.status, 'approved');
    assert.equal(r.razorpay_refund_id, 'rfnd_NEW1');
    const ledger = t.txns.rows.filter((x) => x.transaction_id === 'rfnd_NEW1');
    assert.equal(ledger.length, 1);
    assert.equal(Number(ledger[0].amount), -999);
    assert.equal(ledger[0].metadata.original_transaction_id, 'pay_PREM0001');
    assert.equal(t.subs.rows.find((s) => s.id === S.premium).status, 'cancelled');
    assert.ok(audit.some((a) => a.action === 'refund.processed' && a.entity_id === r.id));
    assert.ok(finAudit.some((a) => a.action === 'refund.processed' && Number(a.amount) === 999));

    // Retry / double click after success: refused, no second refund.
    const again = await approve(r, { amount: '999' });
    assert.equal(again.status, 409);
    assert.equal(rz.refundCalls.length, 1);
  });

  test('concurrent approvals of one request refund once', async () => {
    const r = pending();
    let release;
    const gate = new Promise((res) => { release = res; });
    rz.refundImpl = async (id, opts) => { await gate; const refund = { id: 'rfnd_RACE', amount: opts.amount, status: 'pending', notes: opts.notes }; rz.refunds[id] = [refund]; return refund; };
    const first = approve(r, { amount: '100' }).then((x) => x); // .then() sends it now
    while (rz.refundCalls.length === 0) await new Promise((res) => setTimeout(res, 5));
    const second = await approve(r, { amount: '100' });
    release();
    const done = await first;
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(second.status, 409);
    assert.equal(rz.refundCalls.length, 1);
  });

  test('a second process with a stale copy of the request is stopped by the server-side trail', async () => {
    const r = pending();
    const stale = { ...r, update: async () => {} };
    let release;
    const gate = new Promise((res) => { release = res; });
    rz.refundImpl = async (id, opts) => { await gate; const refund = { id: 'rfnd_RACE2', amount: opts.amount, status: 'pending', notes: opts.notes }; rz.refunds[id] = [refund]; return refund; };
    const first = approve(r, { amount: '100' }).then((x) => x);
    while (rz.refundCalls.length === 0) await new Promise((res) => setTimeout(res, 5));
    // The other process read the row before the claim: no processed_at on its copy.
    mock.method(db.RefundRequest, 'findByPk', async () => ({ ...stale, processed_at: null }));
    const second = await approve(r, { amount: '100' });
    assert.equal(second.status, 409);
    release();
    assert.equal((await first).status, 200);
    assert.equal(rz.refundCalls.length, 1);
  });

  test('the conditional claim alone also stops a second run', async () => {
    const r = pending();
    r.processed_at = new Date(); // claimed by another process a moment ago
    mock.method(db.RefundRequest, 'findByPk', async () => ({ ...r, processed_at: null, update: async () => {} }));
    const res = await approve(r, { amount: '100' });
    assert.equal(res.status, 409);
    assert.equal(rz.refundCalls.length, 0);
  });

  test('once refunded, a request reset by its owner is not refunded again', async () => {
    const r = pending();
    assert.equal((await approve(r, { amount: '100' })).status, 200);
    // The owner edits the row back through the events CRUD.
    Object.assign(r, { status: 'pending', razorpay_refund_id: null, processed_at: null, transaction_id: 'pay_ADV00001', subscription_id: null });
    const again = await approve(r, {});
    assert.equal(again.status, 409);
    assert.equal(rz.refundCalls.length, 1);
  });

  test('an unknown outcome stores the chosen payment, blocks another payment, and sync settles it', async () => {
    const r = pending({ transaction_id: null, subscription_id: null });
    rz.refundImpl = async (id, opts) => {
      rz.refunds[id] = [{ id: 'rfnd_UNK', amount: opts.amount, status: 'pending', notes: opts.notes }];
      rz.payments[id].amount_refunded += opts.amount;
      throw new Error('socket hang up');
    };
    const res = await approve(r, { payment_id: 'pay_PREM0001', amount: '200' });
    assert.equal(res.status, 202);
    assert.equal(r.transaction_id, 'pay_PREM0001'); // saved before the gateway call
    assert.ok(finAudit.some((a) => a.action === 'refund.started' && a.details.payment_id === 'pay_PREM0001'));
    // Too soon: the call may still be running.
    assert.equal((await request(app).post(`/api/financials/refunds/${r.id}/sync`).set(as(USERS.superAdmin))).status, 409);
    // Later: a different payment is refused until the first attempt is resolved.
    finAudit.filter((a) => a.action === 'refund.started').forEach((a) => { a.details.at -= 11 * 60 * 1000; });
    r.processed_at = new Date(Date.now() - 11 * 60 * 1000);
    r.transaction_id = 'pay_ADV00001'; // even if the owner edits the row
    const other = await approve(r, { payment_id: 'pay_ADV00001' });
    assert.equal(other.status, 409);
    const synced = await request(app).post(`/api/financials/refunds/${r.id}/sync`).set(as(USERS.superAdmin));
    assert.equal(synced.status, 200, JSON.stringify(synced.body));
    assert.equal(r.razorpay_refund_id, 'rfnd_UNK');
    assert.equal(r.transaction_id, 'pay_PREM0001');
    assert.equal(rz.refundCalls.length, 1);
  });

  test('a refund Razorpay marked failed does not block a fresh refund', async () => {
    const r = pending();
    rz.refunds.pay_PREM0001 = [{ id: 'rfnd_DEAD', amount: 10000, status: 'failed', notes: { refund_request_id: r.id } }];
    const res = await approve(r, { amount: '100' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(rz.refundCalls.length, 1);
  });

  test('a refund that fails after Razorpay accepted it is reversed by sync and by the webhook', async () => {
    const r = pending();
    assert.equal((await approve(r, { amount: '999' })).status, 200);
    rz.refunds.pay_PREM0001[0].status = 'failed';
    const res = await request(app).post(`/api/financials/refunds/${r.id}/sync`).set(as(USERS.superAdmin));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, 'failed');
    assert.equal(r.status, 'failed');
    assert.equal(t.txns.rows.find((x) => x.transaction_id === 'rfnd_NEW1').status, 'failed');
    const ov = await request(app).get('/api/financials/overview').set(as(USERS.admin));
    assert.equal(ov.body.totals.refunds, 999); // only the earlier, real refund
    assert.ok(finAudit.some((a) => a.action === 'refund.reversed'));

    // Webhook path on another request.
    const r2 = pending({ transaction_id: 'pay_VIP00001', user_id: CUST2.id, subscription_id: S.vip });
    assert.equal((await approve(r2, { amount: '100' })).status, 200);
    const body = JSON.stringify({ event: 'refund.failed', payload: { refund: { entity: { id: r2.razorpay_refund_id, payment_id: 'pay_VIP00001', amount: 10000, status: 'failed' } } } });
    const sig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
    assert.equal((await request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', sig).send(body)).status, 200);
    assert.equal(r2.status, 'failed');
  });

  test('sync refuses a payment that is not the customer\'s own', async () => {
    const r = pending({ transaction_id: 'pay_VIP00001', status: 'pending', processed_at: new Date(Date.now() - 20 * 60 * 1000) });
    const res = await request(app).post(`/api/financials/refunds/${r.id}/sync`).set(as(USERS.superAdmin));
    assert.equal(res.status, 422);
  });

  test('a partial refund keeps the plan and is capped by what is refundable', async () => {
    const r = pending();
    const over = await approve(r, { amount: '1000' });
    assert.equal(over.status, 422);
    assert.equal(over.body.refundable, 999);
    assert.equal(rz.refundCalls.length, 0);
    assert.equal(r.processed_at, null); // lease released, can be retried
    const ok = await approve(r, { amount: '100.50' });
    assert.equal(ok.status, 200);
    assert.equal(rz.refundCalls[0].opts.amount, 10050);
    assert.equal(t.subs.rows.find((s) => s.id === S.premium).status, 'active');
  });

  test('a payment of another customer, or one already fully refunded, is refused', async () => {
    const r = pending();
    const other = await approve(r, { payment_id: 'pay_VIP00001' });
    assert.equal(other.status, 422);
    const full = pending({ transaction_id: 'pay_PREM0002' });
    const res = await approve(full, {});
    assert.equal(res.status, 409);
    assert.equal(rz.refundCalls.length, 0);
  });

  test('a definite gateway refusal marks the request failed; an unknown outcome stays processing and sync adopts it', async () => {
    const r = pending();
    rz.refundImpl = async () => { const e = new Error('bad'); e.statusCode = 400; e.error = { code: 'BAD_REQUEST_ERROR', description: 'Insufficient balance' }; throw e; };
    const refused = await approve(r, { amount: '50' });
    assert.equal(refused.status, 502);
    assert.equal(r.status, 'failed');
    assert.ok(audit.some((a) => a.action === 'refund.failed'));

    // Retry: Razorpay times out, but the refund was in fact created.
    rz.refundImpl = async (id, opts) => {
      rz.refunds[id] = [{ id: 'rfnd_LATE', amount: opts.amount, status: 'processed', notes: opts.notes }];
      rz.payments[id].amount_refunded += opts.amount;
      throw new Error('ETIMEDOUT');
    };
    const unknown = await approve(r, { amount: '50' });
    assert.equal(unknown.status, 202);
    assert.equal(unknown.body.status, 'processing');
    assert.equal(rz.refundCalls.length, 2);

    finAudit.filter((a) => a.action === 'refund.started').forEach((a) => { a.details.at -= 3 * 60 * 1000; });
    const synced = await request(app).post(`/api/financials/refunds/${r.id}/sync`).set(as(USERS.superAdmin));
    assert.equal(synced.status, 200, JSON.stringify(synced.body));
    assert.equal(r.status, 'completed');
    assert.equal(r.razorpay_refund_id, 'rfnd_LATE');
    assert.equal(rz.refundCalls.length, 2); // sync never creates a refund
    assert.equal(t.txns.rows.filter((x) => x.transaction_id === 'rfnd_LATE').length, 1);
  });

  test('approve adopts a refund Razorpay already holds for this request', async () => {
    const r = pending();
    rz.refunds.pay_PREM0001 = [{ id: 'rfnd_EARLIER', amount: 99900, status: 'processed', notes: { refund_request_id: r.id } }];
    rz.payments.pay_PREM0001.amount_refunded = 99900;
    const res = await approve(r, {});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.adopted, true);
    assert.equal(rz.refundCalls.length, 0);
    assert.equal(r.status, 'completed');
  });

  test('a gateway/record amount mismatch blocks the refund', async () => {
    rz.payments.pay_PREM0001.amount = 100000;
    const r = pending();
    const res = await approve(r, {});
    assert.equal(res.status, 409);
    assert.equal(rz.refundCalls.length, 0);
  });

  test('reject needs a reason, notifies, and is refused when Razorpay holds a refund', async () => {
    const r = pending();
    assert.equal((await request(app).post(`/api/financials/refunds/${r.id}/reject`).set(as(USERS.admin)).send({})).status, 400);
    rz.refunds.pay_PREM0001 = [{ id: 'rfnd_X', amount: 100, status: 'processed', notes: { refund_request_id: r.id } }];
    assert.equal((await request(app).post(`/api/financials/refunds/${r.id}/reject`).set(as(USERS.admin)).send({ reason: 'Outside window' })).status, 409);
    rz.refunds.pay_PREM0001 = [];
    const ok = await request(app).post(`/api/financials/refunds/${r.id}/reject`).set(as(USERS.admin)).send({ reason: 'Outside window' });
    assert.equal(ok.status, 200);
    assert.equal(r.status, 'rejected');
    assert.ok(audit.some((a) => a.action === 'refund.rejected'));
    assert.equal((await approve(r, {})).status, 409);
  });

  test('a customer request without a payment needs the admin to choose one of their payments', async () => {
    const r = pending({ transaction_id: null, subscription_id: null });
    const missing = await approve(r, {});
    assert.equal(missing.status, 422);
    const detail = await request(app).get(`/api/financials/refunds/${r.id}`).set(as(USERS.admin));
    assert.equal(detail.status, 200);
    assert.ok(detail.body.charges.some((c) => c.payment_id === 'pay_PREM0001' && c.refundable === 999));
    assert.ok(detail.body.charges.some((c) => c.payment_id === 'pay_PREM0002' && c.refundable === 0));
    const ok = await approve(r, { payment_id: 'pay_ADV00001' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    // Full refund of an advisor payment whose commission is still pending: commission cancelled.
    assert.equal(t.commissions.rows[0].status, 'cancelled');
  });

  test('list shows display statuses and the ledger refund total', async () => {
    pending();
    pending({ status: 'approved', razorpay_refund_id: 'rfnd_OLD00001' });
    const res = await request(app).get('/api/financials/refunds').set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.stats.pending, 1);
    assert.equal(res.body.stats.processed, 1);
    assert.equal(res.body.stats.refunded_total, 999);
    const only = await request(app).get('/api/financials/refunds?status=processed').set(as(USERS.admin));
    assert.equal(only.body.items.length, 1);
  });
});

// ---------------------------------------------------------------------------
describe('reconciliation', () => {
  test('diff categorises every case (pure)', () => {
    const r = Reconciliation.diff({
      gatewayPayments: [
        { id: 'pay_A', amount: 1000, status: 'captured', amount_refunded: 0 },
        { id: 'pay_B', amount: 2000, status: 'captured', amount_refunded: 0 },
        { id: 'pay_C', amount: 3000, status: 'captured', amount_refunded: 0 },
        { id: 'pay_D', amount: 4000, status: 'failed', amount_refunded: 0 },
        { id: 'pay_E', amount: 5000, status: 'refunded', amount_refunded: 5000 },
        { id: 'pay_F', amount: 6000, status: 'failed', order_id: 'order_F' },
      ],
      dbCharges: [
        { id: '1', transaction_id: 'pay_A', amount: '10.00', status: 'completed' },
        { id: '2', transaction_id: 'pay_B', amount: '25.00', status: 'completed' },
        { id: '3', transaction_id: 'pay_D', amount: '40.00', status: 'completed' },
        { id: '4', transaction_id: 'pay_E', amount: '50.00', status: 'completed' },
        { id: '5', transaction_id: 'pay_Z', amount: '70.00', status: 'completed' },
      ],
      refundedByPayment: new Map([['pay_E', 2500]]),
      attemptsByOrder: new Map([['order_F', { status: 'failed' }]]),
    });
    const cat = Object.fromEntries(r.items.map((i) => [i.payment_id, i.category]));
    assert.deepEqual(cat, {
      pay_A: 'matched', pay_B: 'amount_mismatch', pay_C: 'missing_in_db', pay_D: 'status_mismatch',
      pay_E: 'refund_mismatch', pay_F: 'failed_at_gateway', pay_Z: 'missing_at_gateway',
    });
    assert.equal(r.issues, 5);
  });

  test('run compares Razorpay with records, changes no money record, and is audited', async () => {
    mock.method(PaymentController.razorpay.payments, 'all', async ({ skip }) => (skip ? { items: [] } : {
      items: [
        { ...rz.payments.pay_PREM0002 },
        { ...rz.payments.pay_VIP00001, amount: 1198700 },
        { id: 'pay_GHOST', amount: 49900, status: 'captured', amount_refunded: 0, order_id: 'order_G' },
        { id: 'pay_FAILX', amount: 299900, status: 'failed', order_id: 'order_FAIL1' },
      ],
    }));
    const before = t.txns.rows.length;
    const res = await request(app).post('/api/financials/reconciliation').set(as(USERS.admin)).send({ from: '2026-10-01', to: '2026-10-31' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const cat = Object.fromEntries(res.body.items.map((i) => [i.payment_id, i.category]));
    assert.equal(cat.pay_PREM0002, 'matched');
    assert.equal(cat.pay_VIP00001, 'amount_mismatch');
    assert.equal(cat.pay_GHOST, 'missing_in_db');
    assert.equal(cat.pay_FAILX, 'failed_at_gateway');
    // pay_ADV00001 was not in the listing: fetched individually and matched.
    assert.equal(cat.pay_ADV00001, 'matched');
    assert.equal(t.txns.rows.length, before);
    assert.equal(t.txns.updates.length, 0);
    assert.equal(rz.refundCalls.length, 0);
    assert.ok(audit.some((a) => a.action === 'financials.reconciliation_run'));
  });

  test('requires a bounded range', async () => {
    assert.equal((await request(app).post('/api/financials/reconciliation').set(as(USERS.admin)).send({})).status, 400);
    assert.equal((await request(app).post('/api/financials/reconciliation').set(as(USERS.admin)).send({ from: '2026-01-01', to: '2026-12-31' })).status, 400);
  });
});

// ---------------------------------------------------------------------------
describe('expenses, income and revenue rows are staff-controlled', () => {
  test('expenses: users are refused; admin writes are whitelisted and audited', async () => {
    assert.equal((await request(app).get('/api/expenses').set(as(USERS.user))).status, 403);
    assert.equal((await request(app).post('/api/expenses').set(as(USERS.user)).send({ category: 'X', description: 'y', amount: 1, expense_date: '2026-10-01' })).status, 403);
    const res = await request(app).post('/api/expenses').set(as(USERS.admin)).send({ category: 'Marketing', description: 'Ads', amount: '1500.50', expense_date: '2026-10-01', recorded_by: CUST.id, id: 'forged', added_by_admin_id: 'x' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = t.expenses.rows[0];
    assert.equal(row.recorded_by, USERS.admin.id);
    assert.equal(row.amount, 1500.5);
    assert.notEqual(row.id, 'forged');
    assert.equal(row.added_by_admin_id, undefined);
    assert.ok(finAudit.some((a) => a.action === 'expense.create'));
    assert.equal((await request(app).post('/api/expenses').set(as(USERS.admin)).send({ category: 'M', description: 'x', amount: '-5', expense_date: '2026-10-01' })).status, 400);
  });
  test('impossible dates are refused', async () => {
    assert.equal((await request(app).post('/api/expenses').set(as(USERS.admin)).send({ category: 'M', description: 'x', amount: '5', expense_date: '2026-02-31' })).status, 400);
  });
  test('income is admin-only', async () => {
    assert.equal((await request(app).get('/api/income').set(as(USERS.user))).status, 403);
  });
  test('a user cannot mint revenue for a payout balance', async () => {
    const created = [];
    mock.method(db.RevenueTransaction, 'create', async (data) => { created.push(data); return { id: 'r1', ...data }; });
    const res = await request(app).post('/api/revenue/transactions').set(as(USERS.user)).send({ amount: 100000, status: 'completed', type: 'course', description: 'x' });
    assert.equal(res.status, 201);
    assert.equal(created[0].amount, undefined);
    assert.equal(created[0].status, undefined);
    assert.equal(created[0].user_id, USERS.user.id);
    assert.equal((await request(app).get('/api/revenue/transactions/summary').set(as(USERS.user))).status, 403);
    assert.equal((await request(app).put('/api/revenue/transactions/r1').set(as(USERS.user)).send({ description: 'y' })).status, 403);
  });
  test('a sub-admin is not staff for revenue rows either', async () => {
    const SUB = { id: '99999999-9999-4999-8999-999999999999', email: 'sub@example.test', app_role: 'sub_admin', role: 'user', status: 'active' };
    stubUserLookup({ [SUB.id]: SUB });
    const created = [];
    mock.method(db.RevenueTransaction, 'create', async (data) => { created.push(data); return { id: 'r2', ...data }; });
    await request(app).post('/api/revenue/transactions').set(as(SUB)).send({ user_id: USERS.user.id, amount: 100000, status: 'completed' });
    assert.equal(created[0].amount, undefined);
    assert.equal(created[0].status, undefined);
    assert.equal(created[0].user_id, SUB.id);
  });
});

// ---------------------------------------------------------------------------
describe('payment attempts are recorded', () => {
  test('payment.failed webhook marks the order failed', async () => {
    const body = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_NEWFAIL', order_id: 'order_PEND1', amount: 99900, notes: {}, error_code: 'BAD_REQUEST_ERROR', error_description: 'Payment declined by bank' } } } });
    const sig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
    const res = await request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', sig).send(body);
    assert.equal(res.status, 200);
    const a = t.attempts.rows.find((x) => x.order_id === 'order_PEND1');
    assert.equal(a.status, 'failed');
    assert.equal(a.error_description, 'Payment declined by bank');
    // A late failure never downgrades a success.
    const body2 = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_LATE', order_id: 'order_DONE1', amount: 99900, notes: {} } } } });
    const sig2 = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body2).digest('hex');
    await request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', sig2).send(body2);
    assert.equal(t.attempts.rows.find((x) => x.order_id === 'order_DONE1').status, 'success');
  });
});
