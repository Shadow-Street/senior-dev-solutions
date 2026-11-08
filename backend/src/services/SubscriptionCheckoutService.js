/**
 * Prices and fulfils plan purchases (platform plans and advisor plans).
 *
 * The browser only ever names a plan, a billing cycle and a promo code. The
 * price, the discount and what is activated afterwards are all decided here
 * from database rows, so the Razorpay order cannot be steered by the client.
 *
 *   quoteOrder    - build the priced order (also used by the validate endpoint)
 *   fulfilPayment - after the signature has been verified, activate the plan,
 *                   record the payment and redeem the code, atomically and
 *                   idempotently per payment id
 */
const crypto = require('crypto');
const db = require('../models');
const CouponService = require('./CouponService');
const SubscriptionService = require('./SubscriptionService');

const { CouponError, MIN_PAYABLE_PAISE } = CouponService;

/** A failure whose message and status are safe to return to the caller. */
class CheckoutError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'CheckoutError';
        this.status = status;
    }
}

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** 'monthly' | 'annually', or null for anything unrecognised. */
function normaliseCycle(cycle) {
    const c = String(cycle || '').toLowerCase();
    if (['monthly', 'month', 'm'].includes(c)) return 'monthly';
    if (['annually', 'annual', 'yearly', 'year', 'y'].includes(c)) return 'annually';
    return null;
}

/** Plan price in rupees for the cycle, straight from the plan row. */
function planPrice(plan, cycle) {
    if (plan.advisor_id) {
        // Advisor plans have one price, set by the advisor.
        return Number(plan.price) || Number(plan.price_monthly) || 0;
    }
    const monthly = Number(plan.price_monthly) || Number(plan.price) || 0;
    if (cycle === 'annually') return Number(plan.price_annually) || monthly * 12;
    return monthly;
}

/**
 * Prices an order for `userId`. Throws CheckoutError / CouponError for anything
 * the customer should be told about.
 */
async function quoteOrder({ userId, planId, cycle, couponCode }) {
    if (!planId || typeof planId !== 'string') throw new CheckoutError('Choose a plan to subscribe to');

    const plan = await db.SubscriptionPlan.findByPk(planId);
    if (!plan || plan.is_active === false) throw new CheckoutError('Plan not found', 404);
    if (plan.finfluencer_id) throw new CheckoutError('This plan cannot be purchased here');

    const kind = plan.advisor_id ? 'advisor' : 'platform';

    // Advisor plans bill one period at a time; the cycle only matters for platform plans.
    const billingCycle = kind === 'advisor' ? 'monthly' : normaliseCycle(cycle);
    if (!billingCycle) throw new CheckoutError('Billing cycle must be monthly or annually');

    let advisor = null;
    if (kind === 'advisor') {
        advisor = await db.Advisor.findByPk(plan.advisor_id);
        if (!advisor || advisor.status !== 'approved') throw new CheckoutError('This advisor is not accepting subscriptions', 404);
        if (advisor.user_id && String(advisor.user_id) === String(userId)) {
            throw new CheckoutError('You cannot subscribe to your own plan');
        }
    }

    const basePrice = planPrice(plan, billingCycle);
    if (!(basePrice > 0)) throw new CheckoutError('This plan is free and does not need a payment');

    // A repeat purchase of the same platform plan is a renewal (affects codes that exclude renewals).
    let isRenewal = false;
    if (kind === 'platform') {
        const now = new Date();
        const mine = await db.Subscription.findAll({
            where: { ...SubscriptionService.platformWhere(userId), status: 'active', plan_id: plan.id },
            limit: 5,
        });
        isRenewal = mine.some((s) => s.end_date && new Date(s.end_date) > now);
    }

    let discountAmount = 0;
    let finalAmount = basePrice;
    let coupon = null;
    if (couponCode) {
        const result = await CouponService.validateCoupon(couponCode, userId, basePrice, plan.id, isRenewal, { requireExplicitPlan: kind === 'advisor' });
        coupon = result.coupon;
        discountAmount = result.discountAmount;
        finalAmount = result.finalAmount;
    }

    const amountInPaise = toPaise(finalAmount);

    // Zero is reachable only through a promo code that covers the whole price (a plan
    // that is free to begin with was refused above). It is activated without Razorpay.
    // ...and only through a code that says so on its face: discount_percent exactly 100.
    // (Flat codes that reach the price are refused in CouponService.) A 100% code is a
    // deliberate act by an admin, who must also give it a usage limit (PromoCodeController).
    const isFree = Boolean(coupon) && Number(coupon.discount_percent) === 100 && amountInPaise === 0;
    if (isFree && kind === 'advisor') {
        // An advisor's earnings are not the platform's to give away, and free advisor
        // subscriptions would let throwaway accounts inflate an advisor's follower count
        // and review eligibility. Partial discounts on advisor plans stay possible.
        throw new CouponError('This promo code cannot make an advisor plan free', 'advisor_free');
    }
    // Codes made before the "100% needs a limit" rule existed are still in the
    // table; enforce the rule here too so an unlimited free code cannot be used.
    if (isFree) {
        const limited = Number(coupon.max_uses) > 0
            || coupon.one_time_per_user === true || Number(coupon.one_time_per_user) === 1;
        if (!limited) throw new CouponError('This promo code is not valid', 'free_without_limit');
    }
    if (!isFree && amountInPaise < MIN_PAYABLE_PAISE) throw new CheckoutError('This plan cannot be purchased for that amount');

    return {
        plan, advisor, kind, cycle: billingCycle, coupon, isFree,
        baseAmount: basePrice, discountAmount, finalAmount, amountInPaise,
    };
}

/** Everything the validate endpoint returns, from a quote. */
function describeQuote(q) {
    const discountPercent = q.coupon && Number(q.coupon.discount_percent) > 0 ? Number(q.coupon.discount_percent) : null;
    return {
        isValid: true,
        isFree: Boolean(q.isFree),
        code: q.coupon ? q.coupon.code : null,
        planId: q.plan.id,
        cycle: q.cycle,
        originalAmount: q.baseAmount,
        discountAmount: q.discountAmount,
        finalAmount: q.finalAmount,
        discountType: discountPercent ? 'percent' : 'flat',
        discountPercent,
        message: q.isFree
            ? `${q.coupon.code} applied: this plan is free with your code`
            : q.coupon
            ? (discountPercent
                ? `${q.coupon.code} applied: ${discountPercent}% off (you save ₹${q.discountAmount})`
                : `${q.coupon.code} applied: ₹${q.discountAmount} off`)
            : null,
    };
}

/**
 * The result for a payment that has already been fulfilled, or null when it has not.
 * Purely local (database only), so callers can run it before spending gateway calls.
 */
async function replayOf(paymentId, userId, notes = {}) {
    const existing = await db.SubscriptionTransaction.findOne({ where: { transaction_id: paymentId } });
    if (!existing) return null;
    if (String(existing.user_id) !== String(userId)) {
        throw new CheckoutError('This payment does not belong to your account', 403);
    }
    const subscription = existing.subscription_id ? await db.Subscription.findByPk(existing.subscription_id) : null;
    const planId = notes.planId || (subscription && subscription.plan_id);
    const plan = planId ? await db.SubscriptionPlan.findByPk(planId) : null;
    return {
        subscription, plan, alreadyProcessed: true,
        kind: plan && plan.advisor_id ? 'advisor' : 'platform',
        amount: Number(existing.amount),
    };
}

/** Has this payment id already been fulfilled for this user? (null when not) */
function findReplay({ paymentId, userId }) {
    return replayOf(paymentId, userId);
}

/**
 * Fulfils a verified payment. Idempotent per Razorpay payment id: a second
 * call (client retry, webhook, double click) returns the first result and
 * changes nothing.
 *
 * @param {object} p
 * @param {object} p.order      Razorpay order fetched server-side (its notes were written by quoteOrder)
 * @param {string} p.paymentId
 * @param {string} p.userId     the authenticated caller; must own the order
 */
async function fulfilPaymentOnce({ order, paymentId, userId }) {
    const notes = (order && order.notes) || {};
    // The order must have been created for this caller (SEC-36): a valid
    // signature for someone else's order proves a payment happened, not that
    // it is yours to claim.
    if (!notes.userId || String(notes.userId) !== String(userId)) {
        throw new CheckoutError('This payment does not belong to your account', 403);
    }

    // Already recorded (retry, double click, or the other process won a race)?
    const replay = await replayOf(paymentId, userId, notes);
    if (replay) return replay;

    // Everything is re-derived from the database; notes only name the plan.
    const plan = await db.SubscriptionPlan.findByPk(notes.planId);
    if (!plan) throw new CheckoutError('Plan not found', 404);
    const kind = plan.advisor_id ? 'advisor' : 'platform';
    const amount = Number(order.amount) / 100;
    const couponCode = notes.couponCode || null;
    const discountApplied = Number(notes.discountApplied) || 0;

    let result;
    try {
      result = await db.sequelize.transaction(async (transaction) => {
        // The code is redeemed only now that the payment is verified. The promo
        // row is locked first, so concurrent payments for the same code are
        // counted one at a time and each sees the others' redemptions.
        if (couponCode) {
            const coupon = await db.PromoCode.findOne({
                where: { code: String(couponCode).toUpperCase() },
                transaction,
                lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
            });
            // The limits were checked when the order was created, but nothing stops many
            // unpaid orders being created before any is paid, and a code can be switched off
            // or expire in between. The money is already captured, so the customer keeps
            // what they paid for; the breach is recorded for staff and the use still counted.
            const problem = await CouponService.redemptionProblem(coupon, userId, paymentId);
            if (problem) {
                await db.AuditLog.create({
                    user_id: userId,
                    action: 'promo_redemption_overage',
                    entity_type: 'promo_code',
                    entity_id: coupon ? coupon.id : null,
                    description: `Payment ${paymentId} used ${couponCode}: ${problem.message}`,
                    new_data: { reason: problem.reason, payment_id: paymentId, order_id: order.id, plan_id: plan.id, discount_applied: discountApplied, amount },
                }, { transaction });
            }
            if (coupon) await CouponService.incrementUsage(coupon.id, { transaction });
        }

        let subscription;
        let isNew = true;
        if (kind === 'advisor') {
            const out = await SubscriptionService.activateAdvisorSubscription(userId, plan, { transaction });
            subscription = out.subscription;
            isNew = out.isNew;
            if (isNew) {
                await db.Advisor.increment('follower_count', { by: 1, where: { id: plan.advisor_id }, transaction });
            }
        } else {
            subscription = await SubscriptionService.activateSubscription(userId, plan.id, notes.cycle, { transaction });
            await subscription.update({
                payment_method_id: 'razorpay',
                last_payment_date: new Date(),
                billing_cycle: normaliseCycle(notes.cycle) === 'annually' ? 'annually' : 'monthly',
                status: 'active',
            }, { transaction });
        }

        // Global financial record
        await db.FundTransaction.create({
            user_id: userId,
            amount,
            transaction_type: 'payment',
            status: 'completed',
            transaction_id: paymentId,
            source: 'razorpay',
            completed_at: new Date(),
            description: `${kind === 'advisor' ? 'Advisor' : 'Subscription'} payment for plan ${plan.name}`,
            metadata: { order_id: order.id, plan_id: plan.id, kind, cycle: notes.cycle, coupon: couponCode },
        }, { transaction });

        // Subscription history; this row is also the idempotency key for the payment id
        const txn = await db.SubscriptionTransaction.create({
            subscription_id: subscription.id,
            user_id: userId,
            amount,
            status: 'completed',
            payment_method: 'razorpay',
            transaction_id: paymentId,
            razorpay_order_id: order.id,
            coupon_used: couponCode,
            discount_applied: discountApplied,
            transaction_type: 'charge',
            date: new Date(),
        }, { transaction });

        return { subscription, txn };
      });
    } catch (e) {
      // Another process fulfilled this payment between our check and our insert; the
      // unique index on subscription_transactions.transaction_id rejected ours and the
      // whole transaction rolled back. That is success, not an error.
      if (e && e.name === 'SequelizeUniqueConstraintError') {
        const raced = await replayOf(paymentId, userId, notes);
        if (raced) return raced;
      }
      throw e;
    }

    return { subscription: result.subscription, transactionRow: result.txn, kind, plan, alreadyProcessed: false, amount };
}

// ---------------------------------------------------------------------------
// Free activation (a promo code that covers the whole price)
// ---------------------------------------------------------------------------

const REDEMPTION_MESSAGES = {
    missing: 'This promo code is not valid',
    inactive: 'This promo code is not valid',
    expired: 'This promo code is not valid',
    exhausted: 'This promo code has reached its usage limit',
    already_used: 'You have already used this promo code',
};

const freeInFlight = new Map();

/**
 * Activates a platform plan for a customer whose promo code makes it free: no Razorpay
 * order, no payment. Everything happens in one transaction:
 *   - the promo row is locked and its limits re-checked. Unlike a paid redemption there
 *     is no captured money to honour, so a breach REFUSES the activation;
 *   - the plan is activated (dates, status, is_premium) exactly as for a paid one;
 *   - a zero-amount SubscriptionTransaction (gateway 'coupon') and ledger row are written
 *     under a server-generated unique reference, which is also what the unique index and
 *     the replay check key on;
 *   - the redemption is counted.
 * Concurrent identical requests (a double click) share one activation.
 */
async function activateFree({ quote, userId }) {
    if (!quote || !quote.isFree || !quote.coupon || quote.kind !== 'platform') {
        throw new CheckoutError('This purchase needs a payment');
    }
    const key = `${userId}:${quote.plan.id}:${quote.cycle}:${quote.coupon.code}`;
    if (freeInFlight.has(key)) return { ...(await freeInFlight.get(key)), alreadyProcessed: true };
    const run = activateFreeOnce({ quote, userId });
    freeInFlight.set(key, run);
    try {
        return await run;
    } finally {
        freeInFlight.delete(key);
    }
}

async function activateFreeOnce({ quote, userId }) {
    const { plan, coupon, cycle } = quote;
    const reference = `coupon_${crypto.randomUUID()}`;
    const discountApplied = quote.discountAmount;

    const out = await db.sequelize.transaction(async (transaction) => {
        const locked = await db.PromoCode.findOne({
            where: { id: coupon.id },
            transaction,
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
        });
        // Lock the customer too. Two different free codes used at the same moment would
        // otherwise each see "no active plan" and each create one, leaving two active
        // subscriptions. Taken after the promo row everywhere (the paid path takes them in the
        // same order), so the two locks cannot deadlock each other.
        await db.User.findOne({
            where: { id: userId },
            attributes: ['id'],
            transaction,
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
        });

        // Already on this plan? Nothing to give; do not burn a use on it.
        const now = new Date();
        const current = await db.Subscription.findAll({
            where: { ...SubscriptionService.platformWhere(userId), status: 'active', plan_id: plan.id },
            transaction,
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
        });
        const live = current.find((s) => s.end_date && new Date(s.end_date) > now);
        if (live) {
            // The same code redeemed moments ago for this very plan is a repeat of that request
            // (a double click that arrived after the first finished): report it as done.
            const recent = await db.SubscriptionTransaction.findOne({
                where: { subscription_id: live.id, user_id: userId, coupon_used: coupon.code, payment_method: 'coupon' },
                transaction,
            });
            if (recent && recent.date && now - new Date(recent.date) < 2 * 60 * 1000) {
                return { replay: { subscription: live, transactionRow: recent } };
            }
            throw new CheckoutError('You are already on this plan', 409);
        }

        const problem = await CouponService.redemptionProblem(locked, userId, reference);
        if (problem) {
            throw new CouponError(REDEMPTION_MESSAGES[problem.reason] || 'This promo code is not valid', problem.reason);
        }


        const subscription = await SubscriptionService.activateSubscription(userId, plan.id, cycle, { transaction });
        await subscription.update({
            payment_method_id: 'coupon',
            last_payment_date: now,
            billing_cycle: cycle === 'annually' ? 'annually' : 'monthly',
            status: 'active',
        }, { transaction });

        await db.FundTransaction.create({
            user_id: userId,
            amount: 0,
            transaction_type: 'payment',
            status: 'completed',
            transaction_id: reference,
            source: 'coupon',
            completed_at: now,
            description: `Free activation of ${plan.name} with promo code ${coupon.code}`,
            metadata: { plan_id: plan.id, kind: 'platform', cycle, coupon: coupon.code, list_price: quote.baseAmount },
        }, { transaction });

        const txn = await db.SubscriptionTransaction.create({
            subscription_id: subscription.id,
            user_id: userId,
            amount: 0,
            status: 'completed',
            payment_method: 'coupon',
            transaction_id: reference,
            razorpay_order_id: null,
            coupon_used: coupon.code,
            discount_applied: discountApplied,
            transaction_type: 'charge',
            date: now,
        }, { transaction });

        await CouponService.incrementUsage(coupon.id, { transaction });
        return { subscription, txn };
    });

    if (out.replay) {
        return { ...out.replay, plan, kind: 'platform', alreadyProcessed: true, amount: 0, free: true };
    }
    return {
        subscription: out.subscription, transactionRow: out.txn, plan, kind: 'platform',
        alreadyProcessed: false, amount: 0, free: true, reference,
    };
}

// Two verifications of one payment arriving together (double click, retry
// racing the original) would both pass the idempotency lookup. Within this
// process the second waits for the first and reuses its result; across
// processes the unique index on subscription_transactions.transaction_id
// (migration 013) is the backstop.
const inFlight = new Map();
async function fulfilPayment(args) {
    const key = `${args.paymentId}:${args.userId}`;
    if (inFlight.has(key)) {
        const first = await inFlight.get(key);
        return { ...first, alreadyProcessed: true };
    }
    const run = fulfilPaymentOnce(args);
    inFlight.set(key, run);
    try {
        return await run;
    } finally {
        inFlight.delete(key);
    }
}

module.exports = { activateFree, findReplay, quoteOrder, describeQuote, fulfilPayment, normaliseCycle, planPrice, CheckoutError, CouponError };
