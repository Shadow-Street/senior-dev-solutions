/**
 * Super Admin > Financials API (client slide 11).
 *
 *   GET  /overview                     platform revenue, net, breakdown by source
 *   GET  /subscription-revenue         per tier: new vs renewal, subscribers, MRR
 *   GET  /advisor-revenue              per advisor: gross, commission, earnings, payouts
 *   GET  /analytics                    monthly performance, status summary, breakdowns
 *   GET  /reports/monthly.csv          downloadable monthly report
 *   GET  /transactions                 success / pending / failed / refunded, filterable, paged
 *   GET  /transactions/export.csv      same filters, CSV (formula-escaped)
 *   GET  /refunds                      refund requests with status and stats
 *   GET  /refunds/:id                  one request, the customer's refundable payments, history
 *   POST /refunds/:id/approve          approve + refund through Razorpay      (super_admin)
 *   POST /refunds/:id/reject           decline with a reason                  (admin, super_admin)
 *   POST /refunds/:id/sync             re-read the refund from Razorpay       (super_admin)
 *   POST /reconciliation               compare Razorpay with our records      (read-only for money)
 *   GET  /audit-logs                   financial audit trail (read-only)
 *
 * Every route: authenticated, admin or super_admin (adminMiddleware). Money-moving
 * routes: super_admin only. All figures are computed on the server from stored
 * payment records; nothing monetary is read from the request except the refund
 * amount an admin chooses, which is capped by what Razorpay says is refundable.
 */
const express = require('express');
const db = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { isSuperAdmin } = require('../utils/roles');
const { userLimiter } = require('../utils/failureLimiters');
const { parseRange, RangeError400 } = require('../utils/financeDates');
const { toCsv, sendCsv } = require('../utils/csv');
const { paiseToText, toPaise } = require('../utils/money');
const Reports = require('../services/FinanceReportService');
const Refunds = require('../services/RefundAdminService');
const Reconciliation = require('../services/ReconciliationService');

const router = express.Router();
const adminOnly = [authMiddleware, adminMiddleware];
const requireSuperAdmin = (req, res, next) => (isSuperAdmin(req.user)
  ? next()
  : res.status(403).json({ error: 'Only a super admin can do this' }));
const superAdminOnly = [authMiddleware, adminMiddleware, requireSuperAdmin];

// Each refund call costs up to three gateway calls; reconciliation up to ~75.
const refundLimit = userLimiter({ max: 60, message: 'Too many refund actions. Please wait a few minutes.' });
const reconcileLimit = userLimiter({ max: 20, message: 'Too many reconciliation runs. Please wait a few minutes.' });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sends a safe error: known 4xx/5xx messages from our services, generic otherwise. */
function fail(res, error, where) {
  const status = error && Number.isInteger(error.status) ? error.status : null;
  if (error instanceof RangeError400 || error instanceof Refunds.RefundError || (status && status >= 400 && status < 600 && error.message)) {
    return res.status(status || 400).json({ error: error.message, ...((error.extra && typeof error.extra === 'object') ? error.extra : {}) });
  }
  console.error(`[financial.routes] ${where} failed:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

const page = (q, { max = 100, dflt = 25 } = {}) => ({
  limit: Math.min(Math.max(Number.parseInt(q.limit, 10) || dflt, 1), max),
  offset: Math.min(Math.max(Number.parseInt(q.offset, 10) || 0, 0), 1000000),
});

const validId = (req, res, next) => (UUID_RE.test(String(req.params.id || '')) ? next() : res.status(404).json({ error: 'Refund request not found' }));

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

router.get('/overview', ...adminOnly, async (req, res) => {
  try {
    res.json(await Reports.overview(parseRange(req.query)));
  } catch (e) { fail(res, e, 'overview'); }
});

router.get('/subscription-revenue', ...adminOnly, async (req, res) => {
  try {
    res.json(await Reports.subscriptionRevenue(parseRange(req.query)));
  } catch (e) { fail(res, e, 'subscription-revenue'); }
});

router.get('/advisor-revenue', ...adminOnly, async (req, res) => {
  try {
    res.json(await Reports.advisorRevenue(parseRange(req.query)));
  } catch (e) { fail(res, e, 'advisor-revenue'); }
});

router.get('/analytics', ...adminOnly, async (req, res) => {
  try {
    res.json(await Reports.analytics(parseRange(req.query)));
  } catch (e) { fail(res, e, 'analytics'); }
});

const rupees = (n) => paiseToText(toPaise(n));

router.get('/reports/monthly.csv', ...adminOnly, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const a = await Reports.analytics(range);
    const t = a.totals;
    const b = a.breakdown;
    const lines = [
      ...a.monthly.map((m) => ({ section: 'Monthly', label: m.month, gross: rupees(m.gross), refunds: rupees(m.refunds), net: rupees(m.net), platform: rupees(m.platform_net), advisor: rupees(m.advisor_net), other: rupees(m.other_net), transactions: m.transactions, new_count: m.new_count, renewal_count: m.renewal_count, failed: m.failed, pending: m.pending, abandoned: m.abandoned })),
      { section: 'Totals', label: 'Gross collected', gross: rupees(t.gross_collected) },
      { section: 'Totals', label: 'Refunds', refunds: rupees(t.refunds) },
      { section: 'Totals', label: 'Net revenue', net: rupees(t.net_revenue) },
      { section: 'Totals', label: 'Other recorded income', net: rupees(t.other_income) },
      { section: 'Totals', label: 'Total revenue', net: rupees(t.total_revenue) },
      { section: 'Totals', label: 'Platform earnings', net: rupees(t.platform_earnings) },
      { section: 'Totals', label: 'Advisor earnings', net: rupees(t.advisor_earnings) },
      { section: 'Totals', label: 'Discounts given', net: rupees(t.discounts_given) },
      ...['basic', 'premium', 'vip', 'other'].map((tier) => {
        const x = b.platform_subscriptions.tiers[tier];
        return { section: 'Platform subscriptions', label: tier, gross: rupees(x.gross), refunds: rupees(x.refunds), net: rupees(x.net), transactions: x.transactions };
      }),
      { section: 'Advisor subscriptions', label: 'All advisors', gross: rupees(b.advisor_subscriptions.gross), refunds: rupees(b.advisor_subscriptions.refunds), net: rupees(b.advisor_subscriptions.net), transactions: b.advisor_subscriptions.transactions },
      ...Object.entries(a.status_summary).map(([status, s]) => ({ section: 'Transactions by status', label: status, gross: rupees(s.amount), transactions: s.count })),
    ];
    const csv = toCsv([
      { key: 'section', label: 'Section' }, { key: 'label', label: 'Item' },
      { key: 'gross', label: 'Gross (INR)' }, { key: 'refunds', label: 'Refunds (INR)' }, { key: 'net', label: 'Net (INR)' },
      { key: 'platform', label: 'Platform net (INR)' }, { key: 'advisor', label: 'Advisor net (INR)' }, { key: 'other', label: 'Other net (INR)' },
      { key: 'transactions', label: 'Transactions' }, { key: 'new_count', label: 'New' }, { key: 'renewal_count', label: 'Renewals' },
      { key: 'failed', label: 'Failed' }, { key: 'pending', label: 'Pending' }, { key: 'abandoned', label: 'Abandoned' },
    ], lines);
    const name = `protocall-financial-report-${(range.fromText || 'start')}-to-${(range.toText || 'today')}.csv`;
    sendCsv(res, name, csv);
  } catch (e) { fail(res, e, 'monthly report'); }
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

router.get('/transactions', ...adminOnly, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const filters = Reports.parseTransactionFilters(req.query);
    res.json(await Reports.listTransactions(range, filters, page(req.query)));
  } catch (e) { fail(res, e, 'transactions'); }
});

const EXPORT_CAP = 20000;
router.get('/transactions/export.csv', ...adminOnly, async (req, res) => {
  try {
    const range = parseRange(req.query);
    const filters = Reports.parseTransactionFilters(req.query);
    const { list } = await Reports.findTransactions(range, filters);
    const rows = await Reports.decorate(list.slice(0, EXPORT_CAP));
    const csv = toCsv([
      { key: 'date', label: 'Date (UTC)', value: (r) => (r.date ? new Date(r.date).toISOString() : '') },
      { key: 'record', label: 'Record' }, { key: 'status', label: 'Status' },
      { key: 'kind', label: 'Source' }, { key: 'tier', label: 'Tier' }, { key: 'plan_name', label: 'Plan' },
      { key: 'advisor_name', label: 'Advisor' },
      { key: 'user_name', label: 'Customer' }, { key: 'user_email', label: 'Customer email' },
      { key: 'amount', label: 'Amount (INR)', value: (r) => rupees(r.amount) },
      { key: 'discount', label: 'Discount (INR)', value: (r) => rupees(r.discount) },
      { key: 'coupon', label: 'Promo code' }, { key: 'is_renewal', label: 'Renewal', value: (r) => (r.is_renewal === null ? '' : r.is_renewal ? 'yes' : 'no') },
      { key: 'gateway', label: 'Gateway' }, { key: 'payment_id', label: 'Payment id' }, { key: 'order_id', label: 'Order id' },
      { key: 'refund_id', label: 'Refund id' }, { key: 'error', label: 'Failure reason' },
    ], rows);
    if (list.length > EXPORT_CAP) res.setHeader('X-Export-Truncated', String(EXPORT_CAP));
    sendCsv(res, `protocall-transactions-${(range.fromText || 'all')}-to-${(range.toText || 'today')}.csv`, csv);
  } catch (e) { fail(res, e, 'transactions export'); }
});

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

router.get('/refunds', ...adminOnly, async (req, res) => {
  try {
    res.json(await Refunds.list(req.query));
  } catch (e) { fail(res, e, 'refunds list'); }
});

router.get('/refunds/:id', ...adminOnly, validId, async (req, res) => {
  try {
    res.json(await Refunds.get(req.params.id));
  } catch (e) { fail(res, e, 'refund detail'); }
});

router.post('/refunds/:id/approve', ...superAdminOnly, refundLimit, validId, async (req, res) => {
  try {
    const out = await Refunds.approve({ id: req.params.id, actor: req.user, body: req.body, req });
    res.status(out && out.pending ? 202 : 200).json(out);
  } catch (e) { fail(res, e, 'refund approve'); }
});

router.post('/refunds/:id/reject', ...adminOnly, refundLimit, validId, async (req, res) => {
  try {
    res.json(await Refunds.reject({ id: req.params.id, actor: req.user, body: req.body, req }));
  } catch (e) { fail(res, e, 'refund reject'); }
});

router.post('/refunds/:id/sync', ...superAdminOnly, refundLimit, validId, async (req, res) => {
  try {
    res.json(await Refunds.sync({ id: req.params.id, actor: req.user, req }));
  } catch (e) { fail(res, e, 'refund sync'); }
});

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

router.post('/reconciliation', ...adminOnly, reconcileLimit, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const range = parseRange({ from: body.from, to: body.to }, { required: true, maxDays: 92 });
    res.json(await Reconciliation.run({ from: range.from, to: range.to, actor: req.user, req }));
  } catch (e) { fail(res, e, 'reconciliation'); }
});

// ---------------------------------------------------------------------------
// Audit trail (read-only; entries are written by the server only)
// ---------------------------------------------------------------------------

router.get('/audit-logs', ...adminOnly, async (req, res) => {
  try {
    const { limit, offset } = page(req.query, { max: 200, dflt: 50 });
    const where = {};
    if (typeof req.query.action === 'string' && /^[a-z_.]{1,64}$/i.test(req.query.action)) where.action = req.query.action;
    if (typeof req.query.entity_type === 'string' && /^[a-z_]{1,64}$/i.test(req.query.entity_type)) where.entity_type = req.query.entity_type;
    const { count, rows } = await db.FinancialAuditLog.findAndCountAll({ where, order: [['created_at', 'DESC']], limit, offset });
    res.json({ total: count, limit, offset, items: rows });
  } catch (e) { fail(res, e, 'audit logs'); }
});

const readOnly = (req, res) => res.status(405).json({ error: 'The financial audit trail is written by the server only' });
router.post('/audit-logs', ...adminOnly, readOnly);
router.put('/audit-logs/:id', ...adminOnly, readOnly);
router.delete('/audit-logs/:id', ...adminOnly, readOnly);

module.exports = router;
