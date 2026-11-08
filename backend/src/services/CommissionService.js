/**
 * Server-side creation of advisor commissions (BE-11).
 *
 * commission_tracking feeds an advisor's withdrawable balance, so rows are only
 * ever written here (from a verified payment) or by staff - never from a
 * client request. The amount comes from the verified payment and the platform
 * rate from configuration, not from anything the browser sent.
 *
 *   amount                = what the advisor earns (gross - platform fee)
 *   metadata.gross_amount = what the subscriber paid
 *   metadata.platform_fee = the platform's share
 *   reference_id          = payment id (unique) so a retry or a second
 *                           verification path cannot credit the same payment twice
 *
 * New rows are 'pending'; staff approve them (POST /api/commissions/tracking/approve)
 * before they count towards the advisor's available balance.
 */
const db = require('../models');

const DEFAULT_RATE = 20;
const toPaise = (v) => Math.round(Number(v) * 100);

const validRate = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

/** Platform commission percentage for advisors: commission_settings, then the global platform setting, then 20. */
async function platformRate() {
  const setting = await db.CommissionSettings.findOne({ where: { entity_type: 'advisor', is_active: true } });
  const fromSettings = validRate(setting?.commission_percent);
  if (fromSettings !== null) return fromSettings;
  const global = await db.PlatformSetting.findOne({ where: { key: 'global_commission_rate' } });
  return validRate(global?.value) ?? DEFAULT_RATE;
}

/**
 * Records the advisor's commission for one verified subscription payment.
 * Returns the row, or null when the plan is not an advisor plan. Idempotent on
 * `paymentId`. Callers should treat failure as non-fatal to the payment (the
 * customer has already paid) but must log it.
 */
async function recordAdvisorCommission({ plan, payerUserId, paidAmount, paymentId, subscriptionId }) {
  if (!plan || !plan.advisor_id || !paymentId) return null;
  const grossPaise = toPaise(paidAmount);
  if (!Number.isFinite(grossPaise) || grossPaise <= 0) return null;

  const advisor = await db.Advisor.findByPk(plan.advisor_id);
  if (!advisor) return null;

  const existing = await db.CommissionTracking.findOne({ where: { reference_id: String(paymentId) } });
  if (existing) return existing;

  const rate = await platformRate();
  const feePaise = Math.round((grossPaise * rate) / 100);
  const netPaise = grossPaise - feePaise;

  try {
    return await db.CommissionTracking.create({
      user_id: advisor.user_id, // lets the advisor read their own rows through the owner-scoped list
      advisor_id: advisor.id,
      commission_type: 'subscription',
      amount: netPaise / 100,
      status: 'pending',
      reference_id: String(paymentId),
      metadata: {
        gross_amount: grossPaise / 100,
        platform_fee: feePaise / 100,
        platform_commission_rate: rate,
        payer_user_id: payerUserId || null,
        plan_id: plan.id,
        subscription_id: subscriptionId || null,
        payment_id: String(paymentId),
      },
    });
  } catch (e) {
    // Lost a race with the other verification path: the unique reference wins.
    if (e && e.name === 'SequelizeUniqueConstraintError') {
      return db.CommissionTracking.findOne({ where: { reference_id: String(paymentId) } });
    }
    throw e;
  }
}

/** Never lets a commission problem fail a payment that has already been verified and taken. */
async function recordAdvisorCommissionSafely(args) {
  try {
    return await recordAdvisorCommission(args);
  } catch (e) {
    console.error('[CommissionService] could not record advisor commission for payment', args && args.paymentId, e.message);
    return null;
  }
}

module.exports = { recordAdvisorCommission, recordAdvisorCommissionSafely, platformRate, DEFAULT_RATE };
