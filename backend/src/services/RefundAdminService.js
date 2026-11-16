/**
 * Admin refund processing (Super Admin > Financials > Refunds).
 *
 * Requests arrive from three places: a customer's refund request (subscription
 * or event ticket), the automatic prorated refund when a customer cancels
 * (SubscriptionService.initiateRefund), and organisers. Whatever the source,
 * the customer's own fields (amount asked for, status, which payment) are
 * treated as a request only: what is refunded is decided here.
 *
 * Stored status            Shown as      Meaning
 *   pending                  pending       awaiting review (or, with processed_at
 *                                          set, being processed / outcome unknown)
 *   failed                   failed        Razorpay refused the refund; can be retried
 *   approved                 processed     refund created at Razorpay, settlement pending
 *   completed                processed     Razorpay reported the refund processed
 *   rejected                 rejected      declined by an admin (terminal)
 *   (legacy) processing / processed written by the old client screen map to the same names.
 *
 * Money safety
 *   - Only a captured Razorpay charge of the same customer can be refunded, and
 *     never more than Razorpay says is still refundable on it (amount − amount_refunded).
 *   - A lease (processed_at, claimed with a conditional UPDATE) means one
 *     processing run per request at a time: a double click or a retry while
 *     the first call is in flight gets 409.
 *   - Before creating a refund, the payment's existing Razorpay refunds are
 *     read; one carrying this request's id in its notes is adopted, never
 *     repeated (the earlier call timed out, crashed, or ran in another process).
 *   - A gateway answer that is not a definite refusal leaves the lease in place
 *     and the request pending: "Check status" (sync) settles it from Razorpay.
 *   - Every decision is written to audit_logs and financial_audit_logs. The
 *     financial_audit_logs trail (server-written, read-only through the API) is
 *     also the authority for "already refunded" and "an attempt is still open":
 *     refund_requests rows can be edited by the customer who owns them
 *     (events refund CRUD), so their status / processed_at / payment fields are
 *     never what stops a second refund.
 */
const db = require('../models');
const { Op } = require('sequelize');
const SubscriptionService = require('./SubscriptionService');
const Audit = require('./FinanceAudit');
const { toPaise, fromPaise } = require('../utils/money');
const { parseAmountToPaise } = require('../utils/bankValidation');

const LEASE_MS = 10 * 60 * 1000;
const REVIEWABLE = ['pending', 'failed', 'processing']; // 'processing' only from the retired client screen
const DISPLAY = { pending: 'pending', failed: 'failed', processing: 'processing', approved: 'processed', processed: 'processed', completed: 'processed', rejected: 'rejected' };
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]{6,40}$/;

class RefundError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'RefundError';
    this.status = status;
    this.extra = extra;
  }
}

/** The shared Razorpay client (one instance, stubbed in tests). */
const gateway = () => require('../controllers/paymentController').razorpay;

const rawStatus = (r) => String((r && r.status) || 'pending').toLowerCase();
const leaseHeld = (r, now = new Date()) => REVIEWABLE.includes(rawStatus(r)) && r.processed_at && (now - new Date(r.processed_at)) < LEASE_MS;

function displayStatus(r, now = new Date()) {
  const s = rawStatus(r);
  if (s === 'pending' && r.processed_at) return 'processing';
  if (s === 'failed' && leaseHeld(r, now)) return 'processing';
  return DISPLAY[s] || s;
}

const isDefiniteRejection = (error) => Number.isInteger(error && error.statusCode)
  && error.statusCode >= 400 && error.statusCode < 500 && Boolean(error.error && error.error.code);

function serialise(r, users = new Map()) {
  const u = users.get(r.user_id);
  return {
    id: r.id,
    status: displayStatus(r),
    stored_status: rawStatus(r),
    settled: rawStatus(r) === 'completed',
    type: r.transaction_type || (r.ticket_id ? 'event_ticket' : 'subscription'),
    user_id: r.user_id,
    user_email: u ? u.email : null,
    user_name: u ? (u.display_name || u.name || null) : null,
    requested_amount: r.refund_amount !== null && r.refund_amount !== undefined ? fromPaise(toPaise(r.refund_amount)) : (r.amount !== null && r.amount !== undefined ? fromPaise(toPaise(r.amount)) : null),
    payment_id: r.transaction_id || null,
    subscription_id: r.subscription_id || null,
    event_id: r.event_id || null,
    ticket_id: r.ticket_id || null,
    razorpay_refund_id: r.razorpay_refund_id || null,
    reason: r.reason || null,
    admin_notes: r.admin_notes || null,
    processed_at: r.processed_at || null,
    processed_by: r.processed_by || null,
    created_at: r.created_at || null,
  };
}

async function usersById(ids) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = await db.User.findAll({ where: { id: { [Op.in]: list } }, attributes: ['id', 'email', 'display_name', 'name'], raw: true });
  return new Map(rows.map((u) => [u.id, u]));
}

const STATUS_FILTERS = ['pending', 'processing', 'processed', 'failed', 'rejected'];
const TYPE_FILTERS = ['subscription', 'advisor_subscription', 'event_ticket', 'course_enrollment', 'pledge_payment'];

async function list(query = {}) {
  const status = query.status && query.status !== 'all' ? String(query.status) : null;
  const type = query.type && query.type !== 'all' ? String(query.type) : null;
  if (status && !STATUS_FILTERS.includes(status)) throw new RefundError(400, 'Invalid status');
  if (type && !TYPE_FILTERS.includes(type)) throw new RefundError(400, 'Invalid type');
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 25, 1), 100);
  const offset = Math.max(Number.parseInt(query.offset, 10) || 0, 0);
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100).toLowerCase() : '';

  const rows = await db.RefundRequest.findAll({ order: [['created_at', 'DESC']], raw: true });
  const users = await usersById(rows.map((r) => r.user_id));
  let items = rows.map((r) => serialise(r, users));

  const stats = { total: items.length, pending: 0, processing: 0, processed: 0, failed: 0, rejected: 0, pending_amount: 0 };
  let pendingPaise = 0;
  for (const it of items) {
    if (stats[it.status] !== undefined) stats[it.status] += 1;
    if (it.status === 'pending' && it.requested_amount) pendingPaise += toPaise(it.requested_amount);
  }
  stats.pending_amount = fromPaise(pendingPaise);
  // What has really been refunded: the server-written refund rows, not request fields.
  const refundRows = await db.SubscriptionTransaction.findAll({ where: { transaction_type: 'refund', status: { [Op.ne]: 'failed' } }, attributes: ['amount'], raw: true });
  stats.refunded_total = fromPaise(refundRows.reduce((acc, r) => acc + Math.abs(toPaise(r.amount)), 0));

  if (status) items = items.filter((it) => it.status === status);
  if (type) items = items.filter((it) => it.type === type);
  if (search) {
    items = items.filter((it) => [it.user_email, it.user_name, it.payment_id, it.razorpay_refund_id, it.id]
      .some((v) => v && String(v).toLowerCase().includes(search)));
  }
  return { total: items.length, limit, offset, items: items.slice(offset, offset + limit), stats };
}

/** Captured Razorpay charges of this customer, with what has been refunded on each. */
async function chargesFor(userId) {
  const rows = await db.SubscriptionTransaction.findAll({ where: { user_id: userId }, raw: true });
  const charges = rows.filter((r) => r.transaction_type !== 'refund' && toPaise(r.amount) > 0
    && r.status === 'completed' && r.payment_method === 'razorpay' && r.transaction_id);
  const refunds = rows.filter((r) => (r.transaction_type === 'refund' || toPaise(r.amount) < 0) && r.status !== 'failed');
  const byPayment = new Map();
  const missing = [];
  for (const r of refunds) {
    const meta = (typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata); } catch { return null; } })() : r.metadata) || {};
    if (meta.original_transaction_id) byPayment.set(meta.original_transaction_id, (byPayment.get(meta.original_transaction_id) || 0) + Math.abs(toPaise(r.amount)));
    else if (r.transaction_id) missing.push(r);
  }
  if (missing.length) {
    const reqs = await db.RefundRequest.findAll({ where: { razorpay_refund_id: { [Op.in]: missing.map((r) => r.transaction_id) } }, attributes: ['razorpay_refund_id', 'transaction_id'], raw: true });
    const origin = new Map(reqs.map((q) => [q.razorpay_refund_id, q.transaction_id]));
    for (const r of missing) {
      const pid = origin.get(r.transaction_id);
      if (pid) byPayment.set(pid, (byPayment.get(pid) || 0) + Math.abs(toPaise(r.amount)));
    }
  }
  const subIds = [...new Set(charges.map((c) => c.subscription_id).filter(Boolean))];
  const subs = subIds.length ? await db.Subscription.findAll({ where: { id: { [Op.in]: subIds } }, attributes: ['id', 'plan_id', 'status', 'plan_type'], raw: true }) : [];
  const planIds = [...new Set(subs.map((s) => s.plan_id).filter(Boolean))];
  const plans = planIds.length ? await db.SubscriptionPlan.findAll({ where: { id: { [Op.in]: planIds } }, attributes: ['id', 'name'], raw: true }) : [];
  const subMap = new Map(subs.map((s) => [s.id, s]));
  const planMap = new Map(plans.map((p) => [p.id, p]));
  return charges
    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
    .map((c) => {
      const sub = subMap.get(c.subscription_id);
      const amount = toPaise(c.amount);
      const refunded = byPayment.get(c.transaction_id) || 0;
      return {
        payment_id: c.transaction_id,
        subscription_id: c.subscription_id || null,
        subscription_status: sub ? sub.status : null,
        plan_name: sub ? ((planMap.get(sub.plan_id) || {}).name || sub.plan_type || null) : null,
        amount: fromPaise(amount),
        refunded: fromPaise(refunded),
        refundable: fromPaise(Math.max(0, amount - refunded)),
        date: c.date || c.created_at,
      };
    });
}

async function get(id) {
  const r = await db.RefundRequest.findByPk(id);
  if (!r) throw new RefundError(404, 'Refund request not found');
  const users = await usersById([r.user_id]);
  // From financial_audit_logs: written by the server only (audit_logs accepts other writers).
  const history = await db.FinancialAuditLog.findAll({
    where: { entity_type: 'refund_request', entity_id: r.id },
    order: [['created_at', 'DESC']],
    limit: 50,
    attributes: ['id', 'admin_id', 'admin_name', 'action', 'amount', 'details', 'created_at'],
    raw: true,
  });
  return { request: serialise(r, users), charges: r.user_id ? await chargesFor(r.user_id) : [], history };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function parseNote(value, { required = false, field = 'note' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new RefundError(400, field === 'reason' ? 'Give a reason (at least 3 characters)' : 'A note is required');
    return '';
  }
  if (typeof value !== 'string') throw new RefundError(400, `${field} must be text`);
  const s = value.trim();
  if (required && s.length < 3) throw new RefundError(400, 'Give a reason (at least 3 characters)');
  if (s.length > 1000) throw new RefundError(400, `${field} must be at most 1000 characters`);
  return s;
}

function parseApprove(body) {
  const b = body && typeof body === 'object' ? body : {};
  const out = { note: parseNote(b.note), amountPaise: null, paymentId: null, cancelSubscription: null };
  if (b.amount !== undefined && b.amount !== null && b.amount !== '') {
    const amt = parseAmountToPaise(b.amount);
    if (amt.error) throw new RefundError(400, amt.error);
    out.amountPaise = amt.paise;
  }
  if (b.payment_id !== undefined && b.payment_id !== null && b.payment_id !== '') {
    if (typeof b.payment_id !== 'string' || !PAYMENT_ID_RE.test(b.payment_id)) throw new RefundError(400, 'payment_id must be a Razorpay payment id (pay_...)');
    out.paymentId = b.payment_id;
  }
  if (b.cancel_subscription !== undefined && b.cancel_subscription !== null) {
    if (typeof b.cancel_subscription !== 'boolean') throw new RefundError(400, 'cancel_subscription must be true or false');
    out.cancelSubscription = b.cancel_subscription;
  }
  return out;
}

/** The captured charge this request refunds; refuses anything that is not the customer's own Razorpay payment. */
async function resolveCharge(request, paymentIdInput) {
  let charge = null;
  const pid = paymentIdInput || request.transaction_id;
  if (pid) {
    charge = await db.SubscriptionTransaction.findOne({ where: { transaction_id: String(pid) } });
  } else if (request.subscription_id) {
    const rows = await db.SubscriptionTransaction.findAll({
      where: { subscription_id: request.subscription_id, status: 'completed', payment_method: 'razorpay' },
      order: [['date', 'DESC']],
    });
    charge = rows.find((r) => r.transaction_type !== 'refund' && toPaise(r.amount) > 0) || null;
  }
  if (!charge) throw new RefundError(422, 'No captured Razorpay payment is linked to this request. Choose the customer\'s payment to refund.', { code: 'payment_required' });
  if (charge.transaction_type === 'refund' || toPaise(charge.amount) <= 0 || charge.status !== 'completed' || charge.payment_method !== 'razorpay') {
    throw new RefundError(422, 'That payment cannot be refunded through Razorpay');
  }
  if (!request.user_id || String(charge.user_id) !== String(request.user_id)) {
    throw new RefundError(422, 'That payment belongs to a different customer');
  }
  if (request.subscription_id && charge.subscription_id && String(request.subscription_id) !== String(charge.subscription_id)) {
    throw new RefundError(422, 'That payment is for a different subscription');
  }
  return charge;
}

/** Razorpay refunds on `paymentId` made for this request (by our note, or the stored refund id). */
async function gatewayRefundsFor(rp, paymentId, request) {
  const res = await rp.payments.fetchMultipleRefund(paymentId, { count: 100 });
  const items = (res && Array.isArray(res.items)) ? res.items : [];
  return items.filter((x) => (request.razorpay_refund_id && x.id === request.razorpay_refund_id)
    || (x.notes && String(x.notes.refund_request_id || '') === String(request.id)));
}

/** A live (not failed) refund Razorpay holds for this request, or null. A failed one never blocks a retry. */
async function findGatewayRefund(rp, paymentId, request) {
  return (await gatewayRefundsFor(rp, paymentId, request)).find((x) => x.status !== 'failed') || null;
}

const IN_FLIGHT_MS = 2 * 60 * 1000;
const ACTION_EFFECT = {
  'refund.started': 'open',
  'refund.failed': 'close',
  'refund.lease_released': 'close',
  'refund.processed': 'done',
  'refund.adopted': 'done',
  'refund.reversed': 'undone',
};

/**
 * What the server-written trail says about this request:
 *   refunded  a refund was recorded (and not reversed since)
 *   open      the latest refund.started with no outcome yet: { payment_id, amount_paise, at }
 */
async function attemptState(requestId) {
  const rows = await db.FinancialAuditLog.findAll({
    where: { entity_type: 'refund_request', entity_id: requestId },
    order: [['created_at', 'ASC']],
    raw: true,
  });
  const details = (r) => (typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch { return {}; } })() : (r.details || {}));
  // DATETIME may drop milliseconds; `at` (ms) keeps entries of the same second in order.
  const entries = rows.map((r, i) => ({ r, d: details(r), i }))
    .sort((a, b) => (Number(a.d.at) || new Date(a.r.created_at).getTime() || 0) - (Number(b.d.at) || new Date(b.r.created_at).getTime() || 0) || a.i - b.i);
  let refunded = false;
  let open = null;
  for (const { r, d } of entries) {
    const effect = ACTION_EFFECT[r.action];
    if (effect === 'open') open = { payment_id: d.payment_id || null, amount_paise: Number(d.amount_paise) || null, at: Number(d.at) || new Date(r.created_at).getTime() };
    else if (effect === 'close') open = null;
    else if (effect === 'done') { open = null; refunded = true; }
    else if (effect === 'undone') refunded = false;
  }
  return { refunded, open };
}

/** Drops the processing lease so the request can be retried. */
const release = (request) => db.RefundRequest.update({ processed_at: null }, { where: { id: request.id } });

async function markFailed({ request, actor, reason, code, req }) {
  const note = `Razorpay refused the refund${code ? ` (${code})` : ''}: ${reason || 'no reason given'}`.slice(0, 1000);
  try {
    await db.RefundRequest.update({ status: 'failed', processed_at: null, admin_notes: note }, { where: { id: request.id } });
  } catch (e) {
    // Before migration 021 the column may be ENUM without 'failed': keep it pending, say why.
    console.error('[RefundAdminService] status failed not storable, keeping pending:', e && e.name);
    await db.RefundRequest.update({ status: 'pending', processed_at: null, admin_notes: note }, { where: { id: request.id } });
  }
  await Audit.write({ actor, action: 'refund.failed', entityType: 'refund_request', entityId: request.id, after: { code: code || null, reason: reason || null, payment_id: request.transaction_id || null, at: Date.now() }, req });
}

async function notify(userId, title, message) {
  if (!userId) return;
  try {
    await db.Notification.create({ user_id: userId, title, message, type: 'info' });
  } catch (e) {
    console.error('[RefundAdminService] notification failed:', e && e.name);
  }
}

/**
 * Records a refund Razorpay has accepted (new or adopted): request, ledger,
 * subscription and advisor commission, atomically, then side effects.
 */
async function settle({ request, refund, charge, payment, actor, note, cancel, adopted, req }) {
  const refundPaise = Number(refund.amount) || 0;
  if (refund.status === 'failed') {
    await markFailed({ request, actor, reason: 'the refund failed at Razorpay', code: 'refund_failed', req });
    throw new RefundError(502, 'Razorpay reports this refund as failed. Nothing was refunded; you can try again.');
  }
  const stored = refund.status === 'processed' ? 'completed' : 'approved';
  const chargePaise = toPaise(charge.amount);
  // amount_refunded from the payment fetched before this refund (adopted refunds are already in it).
  const refundedAfter = Number(payment.amount_refunded || 0) + (adopted ? 0 : refundPaise);
  const fullyRefunded = refundedAfter >= chargePaise;
  const doCancel = cancel === null || cancel === undefined ? fullyRefunded : cancel;
  const before = { status: rawStatus(request) };
  let subscriptionChange = null;
  let commissionChange = null;
  let cancelledPlatformSub = null;

  await db.sequelize.transaction(async (t) => {
    await request.update({
      status: stored,
      razorpay_refund_id: refund.id,
      refund_amount: fromPaise(refundPaise),
      transaction_id: charge.transaction_id,
      subscription_id: request.subscription_id || charge.subscription_id || null,
      processed_at: new Date(),
      processed_by: actor.id,
      ...(note ? { admin_notes: note } : {}),
    }, { transaction: t });

    await SubscriptionService.recordRefundLedger({
      userId: charge.user_id,
      subscriptionId: charge.subscription_id,
      paymentId: charge.transaction_id,
      refundId: refund.id,
      amount: fromPaise(refundPaise),
      reason: note || request.reason || 'Refund approved by admin',
      transaction: t,
    });

    if (doCancel && charge.subscription_id) {
      const sub = await db.Subscription.findByPk(charge.subscription_id, { transaction: t, lock: t.LOCK ? t.LOCK.UPDATE : undefined });
      if (sub && sub.status === 'active') {
        await sub.update({
          status: 'cancelled',
          auto_renew: false,
          cancellation_reason: `Refunded${note ? `: ${note}` : ''}`.slice(0, 500),
          cancellation_date: new Date(),
        }, { transaction: t });
        subscriptionChange = { id: sub.id, from: 'active', to: 'cancelled' };
        if (!sub.advisor_id && !sub.finfluencer_id) cancelledPlatformSub = sub;
      }
    }

    const commission = await db.CommissionTracking.findOne({ where: { reference_id: String(charge.transaction_id) }, transaction: t });
    if (commission) {
      const st = String(commission.status || '').toLowerCase();
      if (fullyRefunded && st === 'pending') {
        const meta = (commission.metadata && typeof commission.metadata === 'object') ? commission.metadata : {};
        await commission.update({ status: 'cancelled', metadata: { ...meta, cancelled_reason: 'payment_refunded', refund_id: refund.id } }, { transaction: t });
        commissionChange = 'cancelled';
      } else if (st !== 'cancelled') {
        // Already approved or paid to the advisor (or a partial refund): a person decides.
        // Flagged on the row itself so the commission/payout screens can see it.
        const meta = (commission.metadata && typeof commission.metadata === 'object') ? commission.metadata : {};
        await commission.update({ metadata: { ...meta, refund_review_required: true, refund_id: refund.id, refunded_paise: refundPaise } }, { transaction: t });
        commissionChange = 'review_required';
      }
    }

    await Audit.write({
      actor,
      action: adopted ? 'refund.adopted' : 'refund.processed',
      entityType: 'refund_request',
      entityId: request.id,
      amountPaise: refundPaise,
      before,
      after: {
        status: stored, razorpay_refund_id: refund.id, gateway_status: refund.status || null,
        payment_id: charge.transaction_id, fully_refunded: fullyRefunded,
        subscription: subscriptionChange, commission: commissionChange, at: Date.now(),
      },
      description: `Refund ${refund.id} of ${fromPaise(refundPaise)} INR on payment ${charge.transaction_id}`,
      req,
      transaction: t,
    });
  });

  if (cancelledPlatformSub) {
    try {
      await SubscriptionService.syncPremiumFlag(cancelledPlatformSub.user_id);
      await SubscriptionService.ensureFreeSubscriptionSafely(cancelledPlatformSub.user_id);
    } catch (e) {
      console.error('[RefundAdminService] plan fallback after refund failed:', e && e.message);
    }
  }
  await notify(charge.user_id, 'Refund processed', `Your refund of ₹${fromPaise(refundPaise)} has been sent to your original payment method. Banks usually take 5-7 working days to show it.`);

  return {
    status: DISPLAY[stored],
    refund_id: refund.id,
    amount: fromPaise(refundPaise),
    gateway_status: refund.status || null,
    adopted: Boolean(adopted),
    subscription_cancelled: Boolean(subscriptionChange),
    commission: commissionChange,
  };
}

/** Approve and process a refund through Razorpay. super_admin only (enforced by the route). */
async function approve({ id, actor, body, req }) {
  const input = parseApprove(body);
  const request = await db.RefundRequest.findByPk(id);
  if (!request) throw new RefundError(404, 'Refund request not found');
  if (!REVIEWABLE.includes(rawStatus(request))) throw new RefundError(409, `This refund request is already ${displayStatus(request)}`);
  if (leaseHeld(request)) throw new RefundError(409, 'This refund is already being processed');
  const state = await attemptState(request.id);
  if (state.refunded) throw new RefundError(409, 'This request has already been refunded (see its history). Open a new request for a further refund.');
  if (state.open && Date.now() - state.open.at < LEASE_MS) {
    throw new RefundError(409, 'A refund for this request is already in progress. Use "Check status".');
  }
  if (state.open && state.open.payment_id && input.paymentId && input.paymentId !== state.open.payment_id) {
    throw new RefundError(409, `An earlier refund attempt on ${state.open.payment_id} has an unknown outcome. Use "Check status" before refunding another payment.`);
  }
  const charge = await resolveCharge(request, input.paymentId || (state.open && state.open.payment_id) || null);
  const paymentId = charge.transaction_id;
  if (state.open && state.open.payment_id && state.open.payment_id !== paymentId) {
    throw new RefundError(409, `An earlier refund attempt on ${state.open.payment_id} has an unknown outcome. Use "Check status" before refunding another payment.`);
  }

  // Claim: only one run per request, across processes. The chosen payment is stored
  // now, so an unknown outcome can always be settled by "Check status".
  const now = new Date();
  const [claimed] = await db.RefundRequest.update(
    { processed_at: now, processed_by: actor.id, transaction_id: paymentId, subscription_id: request.subscription_id || charge.subscription_id || null },
    { where: { id: request.id, status: { [Op.in]: REVIEWABLE }, [Op.or]: [{ processed_at: null }, { processed_at: { [Op.lt]: new Date(now.getTime() - LEASE_MS) } }] } }
  );
  if (claimed !== 1) throw new RefundError(409, 'This refund is already being processed');
  request.processed_at = now;
  request.transaction_id = paymentId;

  const rp = gateway();
  let payment;
  let existing;
  try {
    payment = await rp.payments.fetch(paymentId);
    existing = await findGatewayRefund(rp, paymentId, request);
  } catch (e) {
    console.error('[RefundAdminService] gateway lookup failed:', e && (e.statusCode || e.message));
    await release(request);
    throw new RefundError(502, 'Could not reach Razorpay to check the payment. Nothing was refunded; try again.');
  }
  if (!payment || payment.id !== paymentId) {
    await release(request);
    throw new RefundError(502, 'Razorpay did not return this payment. Nothing was refunded.');
  }
  const chargePaise = toPaise(charge.amount);
  if (Number(payment.amount) !== chargePaise) {
    await release(request);
    await Audit.write({ actor, action: 'refund.blocked', entityType: 'refund_request', entityId: request.id, after: { reason: 'amount_mismatch', payment_id: paymentId, gateway_amount: Number(payment.amount), recorded_amount: chargePaise, at: Date.now() }, req });
    throw new RefundError(409, 'Razorpay\'s amount for this payment differs from our record. Run Reconciliation and review it before refunding.');
  }

  if (existing) {
    return settle({ request, refund: existing, charge, payment, actor, note: input.note, cancel: input.cancelSubscription, adopted: true, req });
  }

  if (!['captured', 'refunded'].includes(payment.status)) {
    await release(request);
    throw new RefundError(409, `This payment is "${payment.status}" at Razorpay and cannot be refunded`);
  }
  const refundable = Number(payment.amount) - Number(payment.amount_refunded || 0);
  if (refundable <= 0) {
    await release(request);
    throw new RefundError(409, 'This payment has already been fully refunded at Razorpay. Use Reconciliation to review it.');
  }
  const requested = toPaise(request.refund_amount);
  const amountPaise = input.amountPaise !== null ? input.amountPaise : (requested > 0 && requested <= refundable ? requested : refundable);
  if (amountPaise > refundable) {
    await release(request);
    throw new RefundError(422, `At most ₹${fromPaise(refundable)} can be refunded on this payment`, { refundable: fromPaise(refundable) });
  }

  // Recorded before money moves: until an outcome follows it, no other run may start.
  await Audit.write({ actor, action: 'refund.started', entityType: 'refund_request', entityId: request.id, amountPaise, after: { payment_id: paymentId, amount_paise: amountPaise, at: Date.now() }, req });

  let refund;
  try {
    refund = await rp.payments.refund(paymentId, {
      amount: amountPaise,
      speed: 'normal',
      receipt: `rfnd_${String(request.id).slice(0, 30)}`,
      notes: { refund_request_id: String(request.id), processed_by: String(actor.id), reason: String(input.note || request.reason || '').slice(0, 200) },
    });
  } catch (error) {
    if (isDefiniteRejection(error)) {
      await markFailed({ request, actor, reason: error.error.description, code: error.error.code, req });
      throw new RefundError(502, `Razorpay refused the refund: ${String(error.error.description || error.error.code).slice(0, 200)}`);
    }
    // Unknown outcome: money may have moved. Keep the lease; sync settles it from Razorpay.
    console.error('[RefundAdminService] refund outcome unknown:', error && (error.statusCode || error.message));
    await Audit.write({ actor, action: 'refund.outcome_unknown', entityType: 'refund_request', entityId: request.id, amountPaise, after: { payment_id: paymentId, at: Date.now() }, req });
    return { status: 'processing', pending: true, message: 'Razorpay did not confirm the refund. It may still go through: use "Check status" in a few minutes. Do not refund again by other means.' };
  }

  try {
    return await settle({ request, refund, charge, payment, actor, note: input.note, cancel: input.cancelSubscription, adopted: false, req });
  } catch (e) {
    if (e instanceof RefundError) throw e;
    // The refund exists at Razorpay but recording it failed; the lease stays and sync adopts it.
    console.error('[RefundAdminService] refund recorded at Razorpay but not locally:', e && e.message);
    throw new RefundError(500, `The refund was created at Razorpay (${refund.id}) but could not be recorded. Use "Check status" to record it; do not refund again.`);
  }
}

/** Reject a request. Refused when Razorpay already holds a refund for it. */
async function reject({ id, actor, body, req }) {
  const reason = parseNote(body && body.reason, { required: true, field: 'reason' });
  const request = await db.RefundRequest.findByPk(id);
  if (!request) throw new RefundError(404, 'Refund request not found');
  if (!REVIEWABLE.includes(rawStatus(request))) throw new RefundError(409, `This refund request is already ${displayStatus(request)}`);
  const state = await attemptState(request.id);
  if (state.refunded) throw new RefundError(409, 'This request has already been refunded (see its history).');
  if (state.open || leaseHeld(request) || (rawStatus(request) === 'pending' && request.processed_at)) {
    throw new RefundError(409, 'This refund is being processed or its outcome is unknown. Use "Check status" first.');
  }
  if (request.transaction_id && PAYMENT_ID_RE.test(String(request.transaction_id))) {
    let existing;
    try {
      existing = await findGatewayRefund(gateway(), request.transaction_id, request);
    } catch (e) {
      console.error('[RefundAdminService] reject: gateway check failed:', e && (e.statusCode || e.message));
      throw new RefundError(502, 'Could not confirm with Razorpay that no refund was made for this request. Try again.');
    }
    if (existing) throw new RefundError(409, 'Razorpay already holds a refund for this request. Use "Check status" to record it.');
  }
  await db.sequelize.transaction(async (t) => {
    const [n] = await db.RefundRequest.update(
      { status: 'rejected', admin_notes: reason, processed_by: actor.id, processed_at: new Date() },
      { where: { id: request.id, status: { [Op.in]: REVIEWABLE }, processed_at: null }, transaction: t }
    );
    if (n !== 1) throw new RefundError(409, 'This refund request changed while you were reviewing it. Reload and try again.');
    await Audit.write({ actor, action: 'refund.rejected', entityType: 'refund_request', entityId: request.id, before: { status: rawStatus(request) }, after: { status: 'rejected', reason, at: Date.now() }, req, transaction: t });
  });
  await notify(request.user_id, 'Refund request declined', `Your refund request was declined. Reason: ${reason}`);
  return { status: 'rejected' };
}

/**
 * A refund Razorpay accepted and later reported failed: the money did not go
 * back. The request becomes 'failed' (retryable) and the ledger refund row is
 * marked failed so reports stop counting it. The subscription is left as it is
 * (it may have been cancelled with the refund) and flagged in the audit entry.
 */
async function reverseFailedRefund({ request, refund, actor, req }) {
  await db.sequelize.transaction(async (t) => {
    try {
      await request.update({ status: 'failed', processed_at: null, admin_notes: `Razorpay reported refund ${refund.id} as failed; nothing was paid back.` }, { transaction: t });
    } catch (e) {
      console.error('[RefundAdminService] status failed not storable, keeping pending:', e && e.name);
      await request.update({ status: 'pending', processed_at: null, admin_notes: `Razorpay reported refund ${refund.id} as failed; nothing was paid back.` }, { transaction: t });
    }
    await db.SubscriptionTransaction.update({ status: 'failed' }, { where: { transaction_id: String(refund.id), transaction_type: 'refund' }, transaction: t });
    await Audit.write({
      actor, action: 'refund.reversed', entityType: 'refund_request', entityId: request.id,
      amountPaise: Number(refund.amount) || null,
      after: { razorpay_refund_id: refund.id, payment_id: request.transaction_id || null, gateway_status: 'failed', subscription_review_required: true, at: Date.now() },
      description: `Refund ${refund.id} failed at Razorpay; ledger row marked failed`,
      req, transaction: t,
    });
  });
}

/** refund.failed webhook (signature-verified). Matched only by the refund id we stored. */
async function applyRefundFailed(refundEntity) {
  if (!refundEntity || !refundEntity.id) return null;
  const request = await db.RefundRequest.findOne({ where: { razorpay_refund_id: String(refundEntity.id) } });
  if (!request) return null;
  if (request.transaction_id && refundEntity.payment_id && String(request.transaction_id) !== String(refundEntity.payment_id)) return null;
  if (!['approved', 'completed'].includes(rawStatus(request))) return null;
  await reverseFailedRefund({ request, refund: refundEntity, actor: null, req: null });
  return request;
}

/**
 * Check status: reads the request's refund from Razorpay and records what it
 * finds. Never creates a refund. Settles unknown outcomes, moves approved to
 * completed once processed, reverses refunds Razorpay later failed, and frees
 * an attempt that left nothing at Razorpay.
 */
async function sync({ id, actor, req }) {
  const request = await db.RefundRequest.findByPk(id);
  if (!request) throw new RefundError(404, 'Refund request not found');
  const state = await attemptState(request.id);
  if (state.open && Date.now() - state.open.at < IN_FLIGHT_MS) {
    throw new RefundError(409, 'The refund call is still in progress. Check again in a minute.');
  }
  // The payment comes from our own trail first; the request row is customer-editable.
  const paymentId = (state.open && state.open.payment_id) || request.transaction_id;
  if (!paymentId || !PAYMENT_ID_RE.test(String(paymentId))) {
    throw new RefundError(422, 'No Razorpay payment is linked to this request yet');
  }
  const charge = await resolveCharge(request, String(paymentId));
  const rp = gateway();
  let matches;
  try {
    matches = await gatewayRefundsFor(rp, charge.transaction_id, request);
  } catch (e) {
    console.error('[RefundAdminService] sync: gateway lookup failed:', e && (e.statusCode || e.message));
    throw new RefundError(502, 'Could not reach Razorpay. Try again.');
  }
  const status = rawStatus(request);
  const live = matches.find((x) => x.status !== 'failed') || null;
  const failed = matches.find((x) => x.status === 'failed' && (!request.razorpay_refund_id || x.id === request.razorpay_refund_id)) || null;

  if (!live) {
    if (failed && (status === 'approved' || status === 'completed')) {
      await reverseFailedRefund({ request, refund: failed, actor, req });
      return { status: 'failed', refund_id: failed.id, gateway_status: 'failed', message: 'Razorpay reports this refund failed. It is marked failed and can be retried; review the subscription.' };
    }
    if (state.open || (status === 'pending' && request.processed_at && !leaseHeld(request))) {
      await release(request);
      await Audit.write({ actor, action: failed ? 'refund.failed' : 'refund.lease_released', entityType: 'refund_request', entityId: request.id, after: { reason: failed ? 'refund_failed_at_gateway' : 'no_refund_at_gateway', payment_id: charge.transaction_id, at: Date.now() }, req });
      return { status: displayStatus({ ...request, processed_at: null }), message: failed ? 'Razorpay reports the refund failed. It can be processed again.' : 'Razorpay has no refund for this request. It can be processed again.' };
    }
    return { status: displayStatus(request), message: 'Razorpay has no refund for this request.' };
  }
  if (status === 'completed') return { status: 'processed', refund_id: live.id, gateway_status: live.status, message: 'Already recorded as processed.' };
  if (status === 'approved' && live.id === request.razorpay_refund_id) {
    if (live.status === 'processed') {
      await db.sequelize.transaction(async (t) => {
        await request.update({ status: 'completed', processed_at: new Date() }, { transaction: t });
        await Audit.write({ actor, action: 'refund.settled', entityType: 'refund_request', entityId: request.id, amountPaise: Number(live.amount) || null, before: { status }, after: { status: 'completed', razorpay_refund_id: live.id, at: Date.now() }, req, transaction: t });
      });
      return { status: 'processed', refund_id: live.id, gateway_status: live.status, message: 'Razorpay reports the refund processed.' };
    }
    return { status: 'processed', refund_id: live.id, gateway_status: live.status, message: `Razorpay reports the refund as ${live.status}.` };
  }
  // pending / failed / processing with a live refund at Razorpay: record it.
  let payment;
  try {
    payment = await rp.payments.fetch(charge.transaction_id);
  } catch (e) {
    console.error('[RefundAdminService] sync: payment lookup failed:', e && (e.statusCode || e.message));
    throw new RefundError(502, 'Could not reach Razorpay. Try again.');
  }
  const result = await settle({ request, refund: live, charge, payment, actor, note: '', cancel: null, adopted: true, req });
  return { ...result, message: 'Refund found at Razorpay and recorded.' };
}

module.exports = { list, get, approve, reject, sync, applyRefundFailed, attemptState, displayStatus, serialise, RefundError, LEASE_MS, REVIEWABLE };
