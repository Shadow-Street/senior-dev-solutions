/**
 * Records checkout attempts (payment_attempts, migration 021) so the admin
 * Transactions view can show pending and failed payments, not only captured ones.
 *
 *   order created              -> pending
 *   payment verified/captured  -> success  (the money row is in subscription_transactions)
 *   payment.failed webhook     -> failed   (a later successful retry on the same order wins)
 *
 * Every call here is best effort: the payment flow never waits on, or fails
 * because of, this bookkeeping (the table may not exist before 021 is applied).
 */
const db = require('../models');

const warn = (what, e) => console.error(`[PaymentAttemptService] ${what} not recorded:`, e && (e.name || e.message));

async function recordOrderSafely({ orderId, userId, quote }) {
  if (!orderId || !db.PaymentAttempt) return null;
  try {
    return await db.PaymentAttempt.create({
      order_id: String(orderId).slice(0, 64),
      user_id: userId || null,
      plan_id: quote && quote.plan ? quote.plan.id : null,
      kind: quote ? quote.kind : null,
      cycle: quote ? quote.cycle : null,
      amount: quote ? Number(quote.amountInPaise) / 100 : 0,
      currency: 'INR',
      coupon_code: quote && quote.coupon ? String(quote.coupon.code).slice(0, 64) : null,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (e) {
    warn('order', e);
    return null;
  }
}

async function markSucceededSafely({ orderId, paymentId }) {
  if (!orderId || !db.PaymentAttempt) return 0;
  try {
    const now = new Date();
    const [n] = await db.PaymentAttempt.update(
      { status: 'success', payment_id: paymentId ? String(paymentId).slice(0, 64) : null, succeeded_at: now, updated_at: now },
      { where: { order_id: String(orderId), status: { [db.Sequelize.Op.ne]: 'success' } } }
    );
    return n;
  } catch (e) {
    warn('success', e);
    return 0;
  }
}

/**
 * payment.failed (signature-verified webhook). Updates the order's pending row;
 * an order created before 021 has no row, so one is created from the gateway's data.
 */
async function markFailedSafely({ orderId, paymentId, amountPaise, userId, code, description }) {
  if (!orderId || !db.PaymentAttempt) return 0;
  try {
    const now = new Date();
    const patch = {
      status: 'failed',
      payment_id: paymentId ? String(paymentId).slice(0, 64) : null,
      error_code: code ? String(code).slice(0, 100) : null,
      error_description: description ? String(description).slice(0, 500) : null,
      failed_at: now,
      updated_at: now,
    };
    const [n] = await db.PaymentAttempt.update(patch, { where: { order_id: String(orderId), status: 'pending' } });
    if (n > 0) return n;
    const existing = await db.PaymentAttempt.findOne({ where: { order_id: String(orderId) } });
    if (existing) return 0; // already success or failed: a late failure never downgrades a success
    await db.PaymentAttempt.create({
      order_id: String(orderId).slice(0, 64),
      user_id: userId || null,
      amount: Number(amountPaise) > 0 ? Number(amountPaise) / 100 : 0,
      currency: 'INR',
      created_at: now,
      ...patch,
    });
    return 1;
  } catch (e) {
    if (e && e.name === 'SequelizeUniqueConstraintError') return 0; // a parallel delivery recorded it
    warn('failure', e);
    return 0;
  }
}

module.exports = { recordOrderSafely, markSucceededSafely, markFailedSafely };
