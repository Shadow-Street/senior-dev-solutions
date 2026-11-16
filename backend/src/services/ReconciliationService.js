/**
 * Payment reconciliation: Razorpay's payments for a period against what the
 * platform recorded. Read-only for money: nothing is created, changed or
 * refunded here; every difference is listed for a person to review, and each
 * run is written to the audit trail.
 *
 * Compared per Razorpay payment id:
 *   amount (paise), status (captured/refunded at Razorpay vs our 'completed'
 *   charge row) and amount refunded (Razorpay amount_refunded vs our refund rows).
 *
 * Categories
 *   matched              recorded, same amount, status and refunds
 *   missing_in_db        captured at Razorpay, no record here (customer may have paid
 *                        without being activated, or a payment for another product)
 *   missing_at_gateway   recorded here as captured, unknown to Razorpay
 *   amount_mismatch      both sides know the payment, amounts differ
 *   status_mismatch      we recorded success, Razorpay says it is not captured (or the reverse)
 *   refund_mismatch      refunded amounts differ
 *   failed_at_gateway    informational: failed/abandoned at Razorpay and not recorded as paid
 *   in_progress          informational: authorized, not yet captured
 */
const db = require('../models');
const { Op } = require('sequelize');
const Audit = require('./FinanceAudit');
const { toPaise, fromPaise } = require('../utils/money');
const { DAY_MS } = require('../utils/financeDates');

const PAGE = 100;
const MAX_PAGES = 50; // 5,000 payments per run
const MAX_LOOKUPS = 25; // individual fetches for recorded payments outside the gateway listing
const MONEY_STATES = ['captured', 'refunded'];
const PROBLEMS = ['missing_in_db', 'missing_at_gateway', 'amount_mismatch', 'status_mismatch', 'refund_mismatch'];
const CATEGORIES = ['matched', ...PROBLEMS, 'failed_at_gateway', 'in_progress'];

const gateway = () => require('../controllers/paymentController').razorpay;

const parseJson = (v) => {
  if (v && typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v && typeof v === 'object' ? v : null;
};

const gatewayView = (p) => p && ({
  amount: fromPaise(Number(p.amount) || 0),
  status: p.status || null,
  amount_refunded: fromPaise(Number(p.amount_refunded) || 0),
  method: p.method || null,
  created_at: p.created_at ? new Date(Number(p.created_at) * 1000) : null,
  email: p.email || null,
  order_id: p.order_id || null,
});
const dbView = (c, refundedPaise) => c && ({
  record_id: c.id,
  amount: fromPaise(toPaise(c.amount)),
  status: c.status || null,
  refunded: fromPaise(refundedPaise || 0),
  date: c.date || c.created_at || null,
  user_id: c.user_id || null,
  subscription_id: c.subscription_id || null,
});

/**
 * Pure comparison.
 *   gatewayPayments  Razorpay payment entities (amount, amount_refunded in paise)
 *   dbCharges        subscription_transactions charge rows (payment_method razorpay)
 *   refundedByPayment Map payment id -> refunded paise recorded here
 *   attemptsByOrder  Map order id -> payment_attempts row (optional)
 */
function diff({ gatewayPayments, dbCharges, refundedByPayment = new Map(), attemptsByOrder = new Map() }) {
  const byPayment = new Map(dbCharges.filter((c) => c.transaction_id).map((c) => [c.transaction_id, c]));
  const seen = new Set();
  const items = [];
  for (const p of gatewayPayments) {
    if (!p || !p.id) continue;
    seen.add(p.id);
    const c = byPayment.get(p.id) || null;
    const recRefunded = refundedByPayment.get(p.id) || 0;
    const gwAmount = Number(p.amount) || 0;
    const gwRefunded = Number(p.amount_refunded) || 0;
    let category;
    let note = null;
    if (MONEY_STATES.includes(p.status)) {
      if (!c) {
        category = 'missing_in_db';
        note = 'Captured at Razorpay but not recorded. Check whether the customer was activated, or whether it was a payment for another product.';
      } else if (toPaise(c.amount) !== gwAmount) {
        category = 'amount_mismatch';
        note = `Razorpay ${fromPaise(gwAmount)} vs recorded ${fromPaise(toPaise(c.amount))}`;
      } else if (c.status !== 'completed' && c.status !== 'refunded') {
        category = 'status_mismatch';
        note = `Razorpay "${p.status}" vs recorded "${c.status}"`;
      } else if (gwRefunded !== recRefunded) {
        category = 'refund_mismatch';
        note = `Refunded at Razorpay ${fromPaise(gwRefunded)} vs recorded ${fromPaise(recRefunded)}`;
      } else {
        category = 'matched';
      }
    } else if (c && (c.status === 'completed' || c.status === 'refunded')) {
      category = 'status_mismatch';
      note = `Recorded as paid, but Razorpay says "${p.status}"`;
    } else if (p.status === 'authorized') {
      category = 'in_progress';
      note = 'Authorized, not captured yet';
    } else {
      category = 'failed_at_gateway';
      const attempt = p.order_id ? attemptsByOrder.get(p.order_id) : null;
      note = attempt ? `Attempt recorded as ${attempt.status}` : (p.error_description || null);
    }
    items.push({ category, payment_id: p.id, order_id: p.order_id || (c && c.razorpay_order_id) || null, gateway: gatewayView(p), db: dbView(c, recRefunded), note });
  }
  for (const c of dbCharges) {
    if (!c.transaction_id || seen.has(c.transaction_id)) continue;
    if (c.status !== 'completed' && c.status !== 'refunded') continue;
    items.push({
      category: 'missing_at_gateway', payment_id: c.transaction_id, order_id: c.razorpay_order_id || null,
      gateway: null, db: dbView(c, refundedByPayment.get(c.transaction_id) || 0),
      note: 'Recorded as captured, but Razorpay has no such payment',
    });
  }
  const summary = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
  const amounts = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
  for (const it of items) {
    summary[it.category] += 1;
    amounts[it.category] += toPaise((it.gateway && it.gateway.amount) ?? (it.db && it.db.amount) ?? 0);
  }
  const order = (k) => (PROBLEMS.includes(k) ? 0 : k === 'matched' ? 2 : 1);
  items.sort((a, b) => order(a.category) - order(b.category) || String(a.payment_id).localeCompare(String(b.payment_id)));
  return {
    summary,
    amounts: Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, fromPaise(v)])),
    issues: PROBLEMS.reduce((acc, k) => acc + summary[k], 0),
    items,
  };
}

async function fetchGatewayPayments(rp, from, to) {
  const out = [];
  const seen = new Set();
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await rp.payments.all({ from: Math.floor(from.getTime() / 1000), to: Math.floor(to.getTime() / 1000), count: PAGE, skip: page * PAGE });
    const items = (res && Array.isArray(res.items)) ? res.items : [];
    // A payment created during the run shifts the pages; never list one twice.
    for (const p of items) if (p && p.id && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
    if (items.length < PAGE) return { payments: out, truncated };
  }
  truncated = true;
  return { payments: out, truncated };
}

/** Payment id -> refunded paise from our refund rows (server-written). */
async function refundsByPayment() {
  const rows = await db.SubscriptionTransaction.findAll({ where: { transaction_type: 'refund', status: { [Op.ne]: 'failed' } }, attributes: ['transaction_id', 'amount', 'metadata'], raw: true });
  const map = new Map();
  const missing = [];
  for (const r of rows) {
    const pid = (parseJson(r.metadata) || {}).original_transaction_id;
    if (pid) map.set(pid, (map.get(pid) || 0) + Math.abs(toPaise(r.amount)));
    else if (r.transaction_id) missing.push(r);
  }
  if (missing.length) {
    const reqs = await db.RefundRequest.findAll({ where: { razorpay_refund_id: { [Op.in]: missing.map((r) => r.transaction_id) } }, attributes: ['razorpay_refund_id', 'transaction_id'], raw: true });
    const origin = new Map(reqs.map((q) => [q.razorpay_refund_id, q.transaction_id]));
    for (const r of missing) {
      const pid = origin.get(r.transaction_id);
      if (pid) map.set(pid, (map.get(pid) || 0) + Math.abs(toPaise(r.amount)));
    }
  }
  return map;
}

const isCharge = (r) => r.transaction_type !== 'refund' && toPaise(r.amount) > 0 && r.payment_method === 'razorpay';

async function run({ from, to, actor, req }) {
  const rp = gateway();
  let listing;
  try {
    listing = await fetchGatewayPayments(rp, from, to);
  } catch (e) {
    console.error('[ReconciliationService] gateway listing failed:', e && (e.statusCode || e.message));
    const err = new Error('Could not fetch payments from Razorpay. Check the gateway configuration and try again.');
    err.status = 502;
    throw err;
  }
  const gatewayIds = listing.payments.map((p) => p.id).filter(Boolean);

  // Our charges: those dated in the period (a day of slack either side, since we record
  // at fulfilment and Razorpay at creation), plus any the gateway listed, whatever their date.
  const slackFrom = new Date(from.getTime() - DAY_MS);
  const slackTo = new Date(to.getTime() + DAY_MS);
  const dated = await db.SubscriptionTransaction.findAll({
    where: { [Op.or]: [{ date: { [Op.gte]: slackFrom, [Op.lte]: slackTo } }, { date: null, created_at: { [Op.gte]: slackFrom, [Op.lte]: slackTo } }] },
    raw: true,
  });
  const listed = gatewayIds.length
    ? await db.SubscriptionTransaction.findAll({ where: { transaction_id: { [Op.in]: gatewayIds } }, raw: true })
    : [];
  const charges = new Map();
  for (const r of [...dated, ...listed]) if (isCharge(r) && r.transaction_id) charges.set(r.transaction_id, r);

  // Recorded payments the listing did not include: inside the period they are checked one by
  // one (the listing is by creation time); outside it they are simply out of scope.
  const listedSet = new Set(gatewayIds);
  const inPeriod = (r) => { const d = new Date(r.date || r.created_at); return d >= from && d <= to; };
  const unlisted = [...charges.values()].filter((r) => !listedSet.has(r.transaction_id));
  let lookups = 0;
  let lookupLimitHit = false;
  const extra = [];
  for (const r of unlisted) {
    if (!inPeriod(r)) { charges.delete(r.transaction_id); continue; }
    if (lookups >= MAX_LOOKUPS) { lookupLimitHit = true; continue; }
    lookups += 1;
    try {
      const p = await rp.payments.fetch(r.transaction_id);
      if (p && p.id === r.transaction_id) extra.push(p);
    } catch (e) {
      // A 4xx "not found" leaves it unmatched (missing_at_gateway); anything else aborts the run.
      if (!(Number.isInteger(e && e.statusCode) && e.statusCode >= 400 && e.statusCode < 500)) {
        const err = new Error('Razorpay did not answer while checking recorded payments. Try again.');
        err.status = 502;
        throw err;
      }
    }
  }

  let attemptsByOrder = new Map();
  const orderIds = [...listing.payments, ...extra].map((p) => p.order_id).filter(Boolean);
  if (db.PaymentAttempt && orderIds.length) {
    try {
      const rows = await db.PaymentAttempt.findAll({ where: { order_id: { [Op.in]: [...new Set(orderIds)] } }, raw: true });
      attemptsByOrder = new Map(rows.map((a) => [a.order_id, a]));
    } catch (e) {
      console.error('[ReconciliationService] payment_attempts unavailable:', e && e.name);
    }
  }

  const result = diff({
    gatewayPayments: [...listing.payments, ...extra],
    dbCharges: [...charges.values()],
    refundedByPayment: await refundsByPayment(),
    attemptsByOrder,
  });

  await Audit.write({
    actor,
    action: 'financials.reconciliation_run',
    entityType: 'reconciliation',
    after: { from, to, gateway_payments: listing.payments.length, recorded_charges: charges.size, summary: result.summary, truncated: listing.truncated },
    description: `Reconciliation ${from.toISOString()} – ${to.toISOString()}: ${result.issues} issue(s)`,
    req,
  });

  return {
    range: { from, to },
    gateway_payments: listing.payments.length + extra.length,
    recorded_charges: charges.size,
    truncated: listing.truncated || lookupLimitHit,
    ...result,
    generated_at: new Date(),
  };
}

module.exports = { run, diff, CATEGORIES, PROBLEMS };
