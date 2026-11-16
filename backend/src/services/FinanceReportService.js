/**
 * Admin Financials: every figure on the Super Admin > Financials screens.
 *
 * Source of truth
 *   subscription_transactions  money that moved through Razorpay (or a 100% promo
 *                              activation, amount 0): one 'charge' row per captured
 *                              payment (status 'completed', transaction_id = payment id)
 *                              and one 'refund' row per refund (negative amount,
 *                              status 'refunded', transaction_id = refund id). Rows are
 *                              written only by the server after gateway verification.
 *   payment_attempts           orders that are still pending or that failed (021).
 *   commission_tracking        the advisor / platform split of each advisor payment.
 *   payout_requests            money paid out to advisors.
 *   income                     income recorded by hand by finance staff ("other").
 *
 * All sums are integer paise; rupees are produced only at the edge (fromPaise).
 * Days and months are India time (utils/financeDates.js).
 *
 * Definitions (also documented in the report back to the client):
 *   gross collected   = Σ captured charge amounts (after promo discounts)
 *   refunds           = Σ refund amounts
 *   net revenue       = gross collected − refunds
 *   total revenue     = net revenue + other recorded income
 *   platform earnings = net platform-subscription revenue
 *                       + platform commission on advisor payments (commission rows not cancelled)
 *   advisor earnings  = Σ advisor share of commission rows not cancelled
 *   new vs renewal    = a captured paid charge is a renewal when the same user already had an
 *                       earlier captured paid charge for the same tier (platform) or the same
 *                       advisor (advisor plans); otherwise it is new
 *   MRR               = Σ over live paid subscriptions (status active, not past end_date) of the
 *                       subscription's latest captured charge, ÷ 12 when billed annually
 */
const db = require('../models');
const { Op } = require('sequelize');
const { toPaise, fromPaise } = require('../utils/money');
const { istMonthKey, monthKeysBetween, inRange, IST_OFFSET_MS } = require('../utils/financeDates');

const TIERS = ['basic', 'premium', 'vip', 'other'];
const LIVE_COMMISSION = (status) => !['cancelled', 'rejected', 'reversed'].includes(String(status || '').toLowerCase());

const parseJson = (v) => {
  if (v && typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v && typeof v === 'object' ? v : null;
};

/** Basic (incl. Free) / Premium / VIP / other, from a platform plan name. */
function tierOf(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('vip')) return 'vip';
  if (n.includes('premium')) return 'premium';
  if (n.includes('basic') || n.includes('free')) return 'basic';
  return 'other';
}

/** Which revenue source a subscription/plan belongs to. */
function classify(sub, plan) {
  const advisorId = (plan && plan.advisor_id) || (sub && sub.advisor_id) || null;
  const finfluencerId = (plan && plan.finfluencer_id) || (sub && sub.finfluencer_id) || null;
  if (advisorId) return { kind: 'advisor', tier: null, advisor_id: advisorId };
  if (finfluencerId || (!sub && !plan)) return { kind: 'other', tier: null, advisor_id: null };
  return { kind: 'platform', tier: tierOf(plan ? plan.name : sub.plan_type), advisor_id: null };
}

const dateOf = (r) => r.date || r.created_at || null;
const isRefundRow = (r) => r.transaction_type === 'refund' || toPaise(r.amount) < 0;
const CHARGE_STATUS = { completed: 'success', pending: 'pending', failed: 'failed', refunded: 'refunded' };

/** A subscription_transactions row in the shape every report uses. Pure. */
function normaliseLedgerRow(r, ctx) {
  const sub = ctx.subs.get(r.subscription_id) || null;
  const plan = sub ? ctx.plans.get(sub.plan_id) || null : null;
  const cls = classify(sub, plan);
  const refund = isRefundRow(r);
  const meta = parseJson(r.metadata) || {};
  return {
    id: r.id,
    record: refund ? 'refund' : 'charge',
    // A refund Razorpay later failed is kept (status failed) but no longer counts as money returned.
    status: refund ? (r.status === 'failed' ? 'failed' : 'refunded') : (CHARGE_STATUS[r.status] || String(r.status || 'unknown')),
    raw_status: r.status || null,
    ...cls,
    plan_id: (plan && plan.id) || (sub && sub.plan_id) || null,
    plan_name: (plan && plan.name) || (sub && sub.plan_type) || null,
    billing_cycle: (sub && sub.billing_cycle) || null,
    subscription_id: r.subscription_id || null,
    user_id: r.user_id || (sub && sub.user_id) || null,
    amount_paise: Math.abs(toPaise(r.amount)),
    discount_paise: refund ? 0 : Math.max(0, toPaise(r.discount_applied)),
    coupon: r.coupon_used || null,
    gateway: r.payment_method || null,
    payment_id: refund ? (meta.original_transaction_id || (ctx.refundOrigin && ctx.refundOrigin.get(r.transaction_id)) || null) : (r.transaction_id || null),
    refund_id: refund ? (r.transaction_id || null) : null,
    order_id: r.razorpay_order_id || null,
    error: null,
    date: dateOf(r),
  };
}

const ABANDON_AFTER_MS = 24 * 3600 * 1000;

/** A pending / failed checkout attempt in the same shape. Pure (pass `now` for tests).
 *  An order still unpaid after 24 hours is reported as abandoned, not pending. */
function normaliseAttempt(a, ctx, now = new Date()) {
  const plan = a.plan_id ? ctx.plans.get(a.plan_id) || null : null;
  const cls = plan ? classify(null, plan) : { kind: a.kind === 'advisor' ? 'advisor' : (a.kind === 'platform' ? 'platform' : 'other'), tier: a.kind === 'platform' ? 'other' : null, advisor_id: null };
  return {
    id: a.id,
    record: 'attempt',
    status: a.status === 'failed' ? 'failed'
      : (a.created_at && now - new Date(a.created_at) > ABANDON_AFTER_MS ? 'abandoned' : 'pending'),
    raw_status: a.status,
    ...cls,
    plan_id: a.plan_id || null,
    plan_name: plan ? plan.name : null,
    billing_cycle: a.cycle || null,
    subscription_id: null,
    user_id: a.user_id || null,
    amount_paise: Math.abs(toPaise(a.amount)),
    discount_paise: 0,
    coupon: a.coupon_code || null,
    gateway: 'razorpay',
    payment_id: a.payment_id || null,
    refund_id: null,
    order_id: a.order_id || null,
    error: a.error_description || a.error_code || null,
    date: a.status === 'failed' ? (a.failed_at || a.created_at) : a.created_at,
  };
}

/** Money that was actually collected (a charge later refunded was still collected). */
const isCollected = (e) => e.record === 'charge' && (e.raw_status === 'completed' || e.raw_status === 'refunded') && e.amount_paise > 0;

/** A refund row whose money really went back (not one Razorpay later failed). */
const isRefunded = (e) => e.record === 'refund' && e.status === 'refunded';

/** payment id -> refunded paise, from refund rows. Pure. */
function refundedByPayment(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!isRefunded(e) || !e.payment_id) continue;
    map.set(e.payment_id, (map.get(e.payment_id) || 0) + e.amount_paise);
  }
  return map;
}

/** Display status of a charge once its refunds are known. Pure. */
function chargeStatusWithRefunds(e, refunded) {
  if (e.record !== 'charge' || !isCollected(e)) return e.status;
  const r = refunded.get(e.payment_id) || 0;
  if (r <= 0) return e.raw_status === 'refunded' ? 'refunded' : e.status;
  return r >= e.amount_paise ? 'refunded' : 'partially_refunded';
}

/** Marks each collected paid charge as new or renewal (mutates `entries`). Pure otherwise. */
function markRenewals(entries) {
  const seen = new Set();
  const paid = entries.filter((e) => isCollected(e) && (e.kind === 'platform' || e.kind === 'advisor'))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.id).localeCompare(String(b.id)));
  for (const e of paid) {
    const key = e.kind === 'advisor' ? `a:${e.user_id}:${e.advisor_id}` : `p:${e.user_id}:${e.tier}`;
    e.is_renewal = seen.has(key);
    seen.add(key);
  }
  return entries;
}

const blank = () => ({ gross: 0, refunds: 0, transactions: 0, refund_count: 0 });
const money = (b) => ({
  gross: fromPaise(b.gross), refunds: fromPaise(b.refunds), net: fromPaise(b.gross - b.refunds),
  transactions: b.transactions, refund_count: b.refund_count,
});

/** Totals and source breakdown for entries already limited to the period. Pure. */
function summarise(entries, { otherIncomePaise = 0, commissions = [] } = {}) {
  const platform = Object.fromEntries(TIERS.map((t) => [t, blank()]));
  const advisor = blank();
  const other = blank();
  let discounts = 0;
  let freeActivations = 0;
  const counts = { success: 0, pending: 0, failed: 0, abandoned: 0, refunds: 0 };
  for (const e of entries) {
    const bucket = e.kind === 'platform' ? platform[e.tier || 'other'] : (e.kind === 'advisor' ? advisor : other);
    if (e.record === 'charge') {
      if (isCollected(e)) {
        bucket.gross += e.amount_paise;
        bucket.transactions += 1;
        counts.success += 1;
        discounts += e.discount_paise;
      } else if ((e.raw_status === 'completed') && e.amount_paise === 0) {
        freeActivations += 1;
        discounts += e.discount_paise;
      } else if (e.status === 'pending') counts.pending += 1;
      else if (e.status === 'failed') counts.failed += 1;
    } else if (isRefunded(e)) {
      bucket.refunds += e.amount_paise;
      bucket.refund_count += 1;
      counts.refunds += 1;
    } else if (e.record === 'attempt') {
      counts[e.status] = (counts[e.status] || 0) + 1;
    }
  }
  const platformTotal = TIERS.reduce((acc, t) => {
    acc.gross += platform[t].gross; acc.refunds += platform[t].refunds;
    acc.transactions += platform[t].transactions; acc.refund_count += platform[t].refund_count;
    return acc;
  }, blank());
  const gross = platformTotal.gross + advisor.gross + other.gross;
  const refunds = platformTotal.refunds + advisor.refunds + other.refunds;
  let fees = 0;
  let advisorShare = 0;
  for (const c of commissions) {
    if (!LIVE_COMMISSION(c.status)) continue;
    const meta = parseJson(c.metadata) || {};
    fees += toPaise(meta.platform_fee);
    advisorShare += toPaise(c.amount);
  }
  const net = gross - refunds;
  return {
    totals: {
      gross_collected: fromPaise(gross),
      refunds: fromPaise(refunds),
      net_revenue: fromPaise(net),
      other_income: fromPaise(otherIncomePaise),
      total_revenue: fromPaise(net + otherIncomePaise),
      discounts_given: fromPaise(discounts),
      platform_earnings: fromPaise(platformTotal.gross - platformTotal.refunds + fees),
      advisor_platform_commission: fromPaise(fees),
      advisor_earnings: fromPaise(advisorShare),
      free_activations: freeActivations,
    },
    counts,
    breakdown: {
      platform_subscriptions: { ...money(platformTotal), tiers: Object.fromEntries(TIERS.map((t) => [t, money(platform[t])])) },
      advisor_subscriptions: money(advisor),
      other: { ...money(other), recorded_income: fromPaise(otherIncomePaise) },
    },
  };
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const LEDGER_ATTRS = ['id', 'subscription_id', 'user_id', 'amount', 'status', 'payment_method', 'transaction_id',
  'razorpay_order_id', 'coupon_used', 'discount_applied', 'transaction_type', 'date', 'created_at', 'metadata'];
const SUB_ATTRS = ['id', 'user_id', 'plan_id', 'status', 'advisor_id', 'finfluencer_id', 'plan_type', 'billing_cycle', 'start_date', 'end_date'];
const PLAN_ATTRS = ['id', 'name', 'advisor_id', 'finfluencer_id'];

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

async function loadContext(subscriptionIds, planIds = []) {
  const subsRows = subscriptionIds.length
    ? await db.Subscription.findAll({ where: { id: { [Op.in]: subscriptionIds } }, attributes: SUB_ATTRS, raw: true })
    : [];
  const subs = new Map(subsRows.map((s) => [s.id, s]));
  const allPlanIds = uniq([...planIds, ...subsRows.map((s) => s.plan_id)]);
  const planRows = allPlanIds.length
    ? await db.SubscriptionPlan.findAll({ where: { id: { [Op.in]: allPlanIds } }, attributes: PLAN_ATTRS, raw: true })
    : [];
  return { subs, plans: new Map(planRows.map((p) => [p.id, p])) };
}

/** Refund rows written before metadata carried the payment id: map refund id -> payment id. */
async function loadRefundOrigins(refundRows) {
  const missing = refundRows
    .filter((r) => !(parseJson(r.metadata) || {}).original_transaction_id && r.transaction_id)
    .map((r) => r.transaction_id);
  if (!missing.length) return new Map();
  const reqs = await db.RefundRequest.findAll({
    where: { razorpay_refund_id: { [Op.in]: uniq(missing) } },
    attributes: ['razorpay_refund_id', 'transaction_id'],
    raw: true,
  });
  return new Map(reqs.filter((q) => q.transaction_id).map((q) => [q.razorpay_refund_id, q.transaction_id]));
}

/** Pending / failed attempts; empty (available: false) before migration 021. */
async function loadAttempts() {
  if (!db.PaymentAttempt) return { rows: [], available: false };
  try {
    const rows = await db.PaymentAttempt.findAll({ where: { status: { [Op.in]: ['pending', 'failed'] } }, raw: true });
    return { rows, available: true };
  } catch (e) {
    console.error('[FinanceReportService] payment_attempts unavailable:', e && e.name);
    return { rows: [], available: false };
  }
}

/** Every ledger row, normalised, plus attempts. */
async function loadEntries({ withAttempts = true } = {}) {
  const rows = await db.SubscriptionTransaction.findAll({ attributes: LEDGER_ATTRS, raw: true });
  const attempts = withAttempts ? await loadAttempts() : { rows: [], available: false };
  const ctx = await loadContext(uniq(rows.map((r) => r.subscription_id)), uniq(attempts.rows.map((a) => a.plan_id)));
  ctx.refundOrigin = await loadRefundOrigins(rows.filter(isRefundRow));
  const ledger = rows.map((r) => normaliseLedgerRow(r, ctx));
  markRenewals(ledger);
  const refunded = refundedByPayment(ledger);
  for (const e of ledger) e.status = chargeStatusWithRefunds(e, refunded);
  const attemptEntries = attempts.rows.map((a) => normaliseAttempt(a, ctx));
  return { ledger, attempts: attemptEntries, attemptsAvailable: attempts.available, ctx, refunded };
}

async function otherIncomePaise({ from, to }) {
  try {
    const rows = await db.Income.findAll({ attributes: ['amount', 'status', 'income_date', 'created_at'], raw: true });
    return rows
      .filter((r) => String(r.status || 'recorded').toLowerCase() !== 'void')
      .filter((r) => inRange(r.income_date || r.created_at, from, to))
      .reduce((acc, r) => acc + toPaise(r.amount), 0);
  } catch (e) {
    console.error('[FinanceReportService] income unavailable:', e && e.name);
    return 0;
  }
}

async function commissionsFor(paymentIds) {
  if (!paymentIds.length) return [];
  return db.CommissionTracking.findAll({
    where: { reference_id: { [Op.in]: paymentIds } },
    attributes: ['id', 'advisor_id', 'amount', 'status', 'reference_id', 'metadata'],
    raw: true,
  });
}

const within = (from, to) => (e) => inRange(e.date, from, to);

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

async function overview({ from, to }) {
  const { ledger, attempts, attemptsAvailable } = await loadEntries();
  const period = [...ledger, ...attempts].filter(within(from, to));
  const advisorPayments = uniq(period.filter((e) => e.kind === 'advisor' && isCollected(e)).map((e) => e.payment_id));
  const commissions = await commissionsFor(advisorPayments);
  const summary = summarise(period, { otherIncomePaise: await otherIncomePaise({ from, to }), commissions });
  return { range: { from, to }, ...summary, attempts_recorded: attemptsAvailable };
}

async function subscriptionRevenue({ from, to }, now = new Date()) {
  const { ledger, refunded } = await loadEntries({ withAttempts: false });
  const period = ledger.filter(within(from, to)).filter((e) => e.kind === 'platform');
  const tiers = Object.fromEntries(TIERS.map((t) => [t, {
    ...blank(), new_count: 0, new_gross: 0, renewal_count: 0, renewal_gross: 0, active_subscribers: 0, mrr: 0, free_activations: 0,
  }]));
  for (const e of period) {
    const b = tiers[e.tier || 'other'];
    if (isCollected(e)) {
      b.gross += e.amount_paise; b.transactions += 1;
      if (e.is_renewal) { b.renewal_count += 1; b.renewal_gross += e.amount_paise; } else { b.new_count += 1; b.new_gross += e.amount_paise; }
    } else if (e.record === 'charge' && e.raw_status === 'completed' && e.amount_paise === 0) {
      b.free_activations += 1;
    } else if (isRefunded(e)) {
      b.refunds += e.amount_paise; b.refund_count += 1;
    }
  }

  // Live subscriptions now (not period-bound): subscribers and MRR.
  const subs = await db.Subscription.findAll({ where: { status: 'active' }, attributes: SUB_ATTRS, raw: true });
  const live = subs.filter((s) => !s.end_date || new Date(s.end_date) > now);
  const planRows = await db.SubscriptionPlan.findAll({ where: { id: { [Op.in]: uniq(live.map((s) => s.plan_id)) } }, attributes: PLAN_ATTRS, raw: true });
  const plans = new Map(planRows.map((p) => [p.id, p]));
  const lastCharge = new Map();
  for (const e of ledger) {
    if (!isCollected(e) || !e.subscription_id) continue;
    const prev = lastCharge.get(e.subscription_id);
    if (!prev || new Date(e.date) > new Date(prev.date)) lastCharge.set(e.subscription_id, e);
  }
  const usersByTier = Object.fromEntries(TIERS.map((t) => [t, new Set()]));
  let advisorMrr = 0;
  const advisorSubscribers = new Set();
  for (const s of live) {
    const cls = classify(s, plans.get(s.plan_id) || null);
    const charge = lastCharge.get(s.id);
    // Net of anything refunded on that charge (a partial refund that kept the plan active).
    const net = charge ? Math.max(0, charge.amount_paise - (refunded.get(charge.payment_id) || 0)) : 0;
    const monthly = Math.round(net / (String(s.billing_cycle).toLowerCase() === 'annually' ? 12 : 1));
    if (cls.kind === 'platform') {
      usersByTier[cls.tier].add(s.user_id);
      tiers[cls.tier].mrr += monthly;
    } else if (cls.kind === 'advisor') {
      advisorSubscribers.add(`${s.user_id}:${cls.advisor_id}`);
      advisorMrr += monthly;
    }
  }
  const out = {};
  for (const t of TIERS) {
    const b = tiers[t];
    out[t] = {
      ...money(b),
      new_count: b.new_count, new_revenue: fromPaise(b.new_gross),
      renewal_count: b.renewal_count, renewal_revenue: fromPaise(b.renewal_gross),
      free_activations: b.free_activations,
      active_subscribers: usersByTier[t].size,
      mrr: fromPaise(b.mrr),
    };
  }
  const totalMrr = TIERS.reduce((acc, t) => acc + tiers[t].mrr, 0);
  return {
    range: { from, to },
    tiers: out,
    totals: {
      mrr: fromPaise(totalMrr),
      active_subscribers: TIERS.reduce((acc, t) => acc + usersByTier[t].size, 0),
      paid_active_subscribers: ['premium', 'vip'].reduce((acc, t) => acc + usersByTier[t].size, 0),
      advisor_mrr: fromPaise(advisorMrr),
      advisor_active_subscriptions: advisorSubscribers.size,
    },
  };
}

async function advisorRevenue({ from, to }) {
  const { ledger } = await loadEntries({ withAttempts: false });
  const period = ledger.filter(within(from, to)).filter((e) => e.kind === 'advisor');
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) rows.set(id, { advisor_id: id, gross: 0, refunds: 0, transactions: 0, refund_count: 0, fees: 0, share: 0, unsplit: 0, commission: { pending: 0, approved: 0, paid: 0 }, paid_out: 0, open_payouts: 0 });
    return rows.get(id);
  };
  for (const e of period) {
    const r = row(e.advisor_id);
    if (isCollected(e)) { r.gross += e.amount_paise; r.transactions += 1; }
    else if (isRefunded(e)) { r.refunds += e.amount_paise; r.refund_count += 1; }
  }
  const payments = period.filter(isCollected);
  const commissions = await commissionsFor(uniq(payments.map((e) => e.payment_id)));
  const byRef = new Map(commissions.map((c) => [c.reference_id, c]));
  for (const e of payments) {
    const r = row(e.advisor_id);
    const c = byRef.get(e.payment_id);
    if (!c) { r.unsplit += e.amount_paise; continue; }
    if (!LIVE_COMMISSION(c.status)) continue;
    const meta = parseJson(c.metadata) || {};
    r.fees += toPaise(meta.platform_fee);
    r.share += toPaise(c.amount);
    const st = String(c.status || 'pending').toLowerCase();
    const key = st === 'paid' ? 'paid' : st === 'approved' ? 'approved' : 'pending';
    r.commission[key] += toPaise(c.amount);
  }

  // Payouts: paid in the period, and what is open right now.
  const payouts = await db.PayoutRequest.findAll({ where: { entity_type: 'advisor' }, attributes: ['entity_id', 'amount', 'status', 'paid_at', 'processed_at', 'created_at'], raw: true });
  for (const p of payouts) {
    if (!p.entity_id) continue;
    const st = String(p.status || '').toLowerCase();
    if (st === 'paid' && inRange(p.paid_at || p.processed_at || p.created_at, from, to)) row(p.entity_id).paid_out += toPaise(p.amount);
    if (st === 'pending' || st === 'approved') row(p.entity_id).open_payouts += toPaise(p.amount);
  }

  const ids = [...rows.keys()].filter(Boolean);
  const advisors = ids.length ? await db.Advisor.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'display_name', 'name', 'user_id'], raw: true }) : [];
  const names = new Map(advisors.map((a) => [a.id, a.display_name || a.name || null]));
  const list = [...rows.values()].map((r) => ({
    advisor_id: r.advisor_id,
    advisor_name: names.get(r.advisor_id) || null,
    gross: fromPaise(r.gross),
    refunds: fromPaise(r.refunds),
    net: fromPaise(r.gross - r.refunds),
    transactions: r.transactions,
    refund_count: r.refund_count,
    platform_commission: fromPaise(r.fees),
    advisor_earnings: fromPaise(r.share),
    unsplit_gross: fromPaise(r.unsplit),
    commission_pending: fromPaise(r.commission.pending),
    commission_approved: fromPaise(r.commission.approved),
    commission_paid: fromPaise(r.commission.paid),
    payouts_paid: fromPaise(r.paid_out),
    payouts_open: fromPaise(r.open_payouts),
  })).sort((a, b) => b.gross - a.gross || String(a.advisor_name).localeCompare(String(b.advisor_name)));
  const tot = [...rows.values()].reduce((acc, r) => {
    acc.gross += r.gross; acc.refunds += r.refunds; acc.fees += r.fees; acc.share += r.share; acc.paid += r.paid_out; acc.open += r.open_payouts; acc.unsplit += r.unsplit; acc.tx += r.transactions;
    return acc;
  }, { gross: 0, refunds: 0, fees: 0, share: 0, paid: 0, open: 0, unsplit: 0, tx: 0 });
  return {
    range: { from, to },
    advisors: list,
    totals: {
      gross: fromPaise(tot.gross), refunds: fromPaise(tot.refunds), net: fromPaise(tot.gross - tot.refunds),
      transactions: tot.tx,
      platform_commission: fromPaise(tot.fees), advisor_earnings: fromPaise(tot.share), unsplit_gross: fromPaise(tot.unsplit),
      payouts_paid: fromPaise(tot.paid), payouts_open: fromPaise(tot.open),
    },
  };
}

/** Monthly performance, status summary and breakdowns for the Analytics view. */
async function analytics({ from, to }, now = new Date()) {
  const { ledger, attempts, attemptsAvailable } = await loadEntries();
  // Without a range: the last 12 months up to now.
  // Without a start: the 12 months ending with the end date's month (default: now).
  const end = to || now;
  const istEnd = new Date(end.getTime() + IST_OFFSET_MS);
  const start = from || new Date(Date.UTC(istEnd.getUTCFullYear(), istEnd.getUTCMonth() - 11, 1) - IST_OFFSET_MS);
  const keys = monthKeysBetween(start, end);
  const months = new Map(keys.map((k) => [k, { month: k, gross: 0, refunds: 0, platform: 0, advisor: 0, other: 0, transactions: 0, new_count: 0, renewal_count: 0, failed: 0, pending: 0, abandoned: 0 }]));
  const all = [...ledger, ...attempts].filter(within(start, end));
  for (const e of all) {
    const m = months.get(istMonthKey(e.date));
    if (!m) continue;
    if (isCollected(e)) {
      m.gross += e.amount_paise; m.transactions += 1; m[e.kind] += e.amount_paise;
      // New vs renewal is defined for platform and advisor plans only (as in Subscription Revenue).
      if (e.kind === 'platform' || e.kind === 'advisor') { if (e.is_renewal) m.renewal_count += 1; else m.new_count += 1; }
    } else if (isRefunded(e)) {
      m.refunds += e.amount_paise; m[e.kind] -= e.amount_paise;
    } else if (e.record === 'attempt' || e.record === 'charge') {
      if (e.status === 'failed') m.failed += 1;
      else if (e.status === 'pending') m.pending += 1;
      else if (e.status === 'abandoned') m.abandoned += 1;
    }
  }
  const monthly = [...months.values()].map((m) => ({
    month: m.month,
    gross: fromPaise(m.gross), refunds: fromPaise(m.refunds), net: fromPaise(m.gross - m.refunds),
    platform_net: fromPaise(m.platform), advisor_net: fromPaise(m.advisor), other_net: fromPaise(m.other),
    transactions: m.transactions, new_count: m.new_count, renewal_count: m.renewal_count, failed: m.failed, pending: m.pending, abandoned: m.abandoned,
  }));

  // Transaction summary by status (counts and amounts).
  const statusSummary = {};
  for (const e of all) {
    const key = isRefunded(e) ? 'refund' : (e.record === 'refund' ? 'refund_failed' : e.status);
    statusSummary[key] = statusSummary[key] || { count: 0, amount: 0 };
    statusSummary[key].count += 1;
    statusSummary[key].amount += e.amount_paise;
  }
  for (const k of Object.keys(statusSummary)) statusSummary[k].amount = fromPaise(statusSummary[k].amount);

  const advisorPayments = uniq(all.filter((e) => e.kind === 'advisor' && isCollected(e)).map((e) => e.payment_id));
  const summary = summarise(all, { otherIncomePaise: await otherIncomePaise({ from: start, to: end }), commissions: await commissionsFor(advisorPayments) });
  return { range: { from: start, to: end }, monthly, status_summary: statusSummary, ...summary, attempts_recorded: attemptsAvailable };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ['success', 'pending', 'abandoned', 'failed', 'refunded', 'partially_refunded'];
const RECORD_FILTERS = ['charge', 'refund', 'attempt'];
const KIND_FILTERS = ['platform', 'advisor', 'other'];

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Validated filters from a query string (unknown values are refused, not ignored). */
function parseTransactionFilters(q = {}) {
  const f = {};
  const pick = (name, allowed) => {
    if (q[name] === undefined || q[name] === '' || q[name] === 'all') return;
    if (!allowed.includes(q[name])) { const e = new Error(`Invalid ${name}`); e.status = 400; throw e; }
    f[name] = q[name];
  };
  pick('status', STATUS_FILTERS);
  pick('record', RECORD_FILTERS);
  pick('kind', KIND_FILTERS);
  pick('tier', TIERS);
  if (typeof q.advisor_id === 'string' && /^[0-9a-f-]{36}$/i.test(q.advisor_id)) f.advisor_id = q.advisor_id;
  if (typeof q.search === 'string' && q.search.trim()) f.search = q.search.trim().slice(0, 100);
  return f;
}

async function userIdsMatching(search) {
  const like = `%${escapeLike(search)}%`;
  const users = await db.User.findAll({
    where: { [Op.or]: [{ email: { [Op.like]: like } }, { display_name: { [Op.like]: like } }, { name: { [Op.like]: like } }] },
    attributes: ['id'],
    limit: 500,
    raw: true,
  });
  return new Set(users.map((u) => u.id));
}

/** All matching entries, newest first (no paging). */
async function findTransactions({ from, to }, filters) {
  const { ledger, attempts, attemptsAvailable } = await loadEntries();
  let list = [...ledger, ...attempts].filter(within(from, to));
  if (filters.status) list = list.filter((e) => e.status === filters.status);
  if (filters.record) list = list.filter((e) => e.record === filters.record);
  if (filters.kind) list = list.filter((e) => e.kind === filters.kind);
  if (filters.tier) list = list.filter((e) => e.kind === 'platform' && e.tier === filters.tier);
  if (filters.advisor_id) list = list.filter((e) => e.advisor_id === filters.advisor_id);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    const users = await userIdsMatching(filters.search);
    list = list.filter((e) => users.has(e.user_id)
      || [e.payment_id, e.order_id, e.refund_id].some((v) => v && String(v).toLowerCase().includes(s)));
  }
  list.sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id)));
  return { list, attemptsAvailable };
}

/** Adds user / advisor display fields to `rows` (in place). */
async function decorate(rows) {
  const userIds = uniq(rows.map((r) => r.user_id));
  const advisorIds = uniq(rows.map((r) => r.advisor_id));
  const users = new Map();
  for (let i = 0; i < userIds.length; i += 1000) {
    const chunk = await db.User.findAll({ where: { id: { [Op.in]: userIds.slice(i, i + 1000) } }, attributes: ['id', 'email', 'display_name', 'name'], raw: true });
    for (const u of chunk) users.set(u.id, u);
  }
  const advisors = advisorIds.length
    ? new Map((await db.Advisor.findAll({ where: { id: { [Op.in]: advisorIds } }, attributes: ['id', 'display_name', 'name'], raw: true })).map((a) => [a.id, a]))
    : new Map();
  return rows.map((r) => {
    const u = users.get(r.user_id);
    const a = advisors.get(r.advisor_id);
    return {
      id: r.id, record: r.record, status: r.status,
      kind: r.kind, tier: r.tier, plan_id: r.plan_id, plan_name: r.plan_name,
      advisor_id: r.advisor_id, advisor_name: a ? (a.display_name || a.name || null) : null,
      user_id: r.user_id, user_email: u ? u.email : null, user_name: u ? (u.display_name || u.name || null) : null,
      amount: fromPaise(r.amount_paise), discount: fromPaise(r.discount_paise), coupon: r.coupon,
      gateway: r.gateway, payment_id: r.payment_id, order_id: r.order_id, refund_id: r.refund_id,
      is_renewal: r.record === 'charge' ? Boolean(r.is_renewal) : null,
      error: r.error, date: r.date,
    };
  });
}

async function listTransactions(range, filters, { limit = 25, offset = 0 } = {}) {
  const { list, attemptsAvailable } = await findTransactions(range, filters);
  const page = list.slice(offset, offset + limit);
  return { total: list.length, limit, offset, items: await decorate(page), attempts_recorded: attemptsAvailable };
}

module.exports = {
  // reports
  overview, subscriptionRevenue, advisorRevenue, analytics,
  listTransactions, findTransactions, decorate, parseTransactionFilters,
  // pure pieces (unit-tested)
  tierOf, classify, normaliseLedgerRow, normaliseAttempt, summarise, isRefunded, markRenewals, refundedByPayment, chargeStatusWithRefunds, isCollected,
  TIERS,
};
