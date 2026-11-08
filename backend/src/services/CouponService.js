const db = require('../models');

/**
 * Promo code rules. The server is the only source of truth for what a code is
 * worth: the browser sends a code, a plan and a billing cycle, and gets back
 * the discounted price. The Razorpay order is built from the same calculation
 * (see SubscriptionCheckoutService), so what the customer is shown is what
 * they are charged.
 *
 * Money is calculated in integer paise so percentages never leave fractions of
 * a paisa behind.
 */

/** Smallest amount Razorpay will take an order for (Rs 1). */
const MIN_PAYABLE_PAISE = 100;

/** An error whose message is safe to show the customer. */
class CouponError extends Error {
    constructor(message, reason = 'invalid') {
        super(message);
        this.name = 'CouponError';
        this.reason = reason;
    }
}

const INVALID_MESSAGE = 'This promo code is not valid';

const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const fromPaise = (paise) => paise / 100;
const rupees = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

/** Plan ids a code is limited to, or null when it applies to every plan. */
function applicablePlanIds(coupon) {
    let raw = coupon.applicable_to;
    if (raw === null || raw === undefined || raw === '' || raw === 'all') return null;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch (e) {
            return null; // the legacy marker 'all', or unparseable: no restriction
        }
    }
    if (raw === 'all') return null;
    if (!Array.isArray(raw) || raw.length === 0) return null; // "no plans picked" means all plans
    return raw.map(String);
}

class CouponService {
    /**
     * Validates a code for one purchase and prices it.
     *
     * @param {string} code
     * @param {string} userId
     * @param {number} cartAmount  pre-discount price in rupees (taken from the plan row by the caller)
     * @param {string} planId
     * @param {boolean} isRenewal
     * @param {{requireExplicitPlan?: boolean}} options  advisor plans pay an advisor, so a code must list them by id; "all plans" does not reach them
     * @returns {{isValid: true, coupon, discountAmount: number, finalAmount: number}}
     * @throws {CouponError} with a customer-facing message when the code cannot be used
     */
    static async validateCoupon(code, userId, cartAmount = 0, planId = null, isRenewal = false, options = {}) {
        if (!code || typeof code !== 'string' || !code.trim()) {
            throw new CouponError('Enter a promo code', 'missing');
        }
        const normalised = code.trim().toUpperCase();

        // Unknown, switched-off and expired codes all answer the same way, so
        // the endpoint cannot be used to tell which guesses were real codes.
        const coupon = await db.PromoCode.findOne({ where: { code: normalised } });
        if (!coupon || !coupon.is_active || (coupon.expires_at && new Date() > new Date(coupon.expires_at))) {
            throw new CouponError(INVALID_MESSAGE, 'invalid');
        }

        // 2. Global usage limit
        if (coupon.max_uses && Number(coupon.uses_count || 0) >= Number(coupon.max_uses)) {
            throw new CouponError('This promo code has reached its usage limit', 'exhausted');
        }

        // 3. One use per user (only completed, verified payments count)
        if (coupon.one_time_per_user) {
            if (!userId) throw new CouponError('Log in to use this promo code', 'login');
            const used = await db.SubscriptionTransaction.findOne({
                where: { user_id: userId, coupon_used: normalised, status: 'completed' },
            });
            if (used) throw new CouponError('You have already used this promo code', 'already_used');
        }

        // 4. Plan eligibility
        const allowed = applicablePlanIds(coupon);
        if (options.requireExplicitPlan && !allowed) {
            throw new CouponError('This promo code does not apply to the selected plan', 'plan');
        }
        if (allowed && (!planId || !allowed.includes(String(planId)))) {
            throw new CouponError('This promo code does not apply to the selected plan', 'plan');
        }

        // 5. Renewals
        if (isRenewal && coupon.applies_to_renewal === false) {
            throw new CouponError('This promo code cannot be used on renewals', 'renewal');
        }

        // 6. Minimum amount
        const basePaise = toPaise(cartAmount);
        if (!Number.isFinite(basePaise) || basePaise <= 0) {
            throw new CouponError('Promo codes apply to paid plans only', 'free_plan');
        }
        if (coupon.min_order_amount && basePaise < toPaise(coupon.min_order_amount)) {
            throw new CouponError(`This promo code needs a minimum order of ${rupees(coupon.min_order_amount)}`, 'minimum');
        }

        // Discount: a percentage wins when both are set; flat amounts are rupees.
        let discountPaise = 0;
        const percent = Number(coupon.discount_percent);
        const flat = Number(coupon.discount_amount);
        if (percent > 0) {
            discountPaise = Math.round((basePaise * Math.min(percent, 100)) / 100);
        } else if (flat > 0) {
            // A flat code must be worth less than the plan. Letting it be "capped at the price"
            // would make a plan free by accident (a Rs 1000 code on a Rs 499 plan) with none of
            // the safeguards a deliberate 100% code carries (see PromoCodeController).
            if (toPaise(flat) >= basePaise) {
                throw new CouponError('This promo code is worth more than this plan costs, so it cannot be applied to it', 'flat_exceeds_price');
            }
            discountPaise = toPaise(flat);
        } else {
            throw new CouponError('This promo code has no discount configured', 'misconfigured');
        }
        // The price can reach zero but never go below it.
        discountPaise = Math.min(Math.max(discountPaise, 0), basePaise);

        // A code that takes the whole price off makes the plan free: checkout then
        // activates it server-side with no gateway order. A partial discount that
        // leaves less than Rs 1 is different: Razorpay cannot take an order that
        // small, and the customer is not getting it free, so it is refused.
        const finalPaise = basePaise - discountPaise;
        if (finalPaise > 0 && finalPaise < MIN_PAYABLE_PAISE) {
            throw new CouponError('This promo code would leave a total below ₹1, so it cannot be applied to this plan', 'below_minimum');
        }

        return {
            isValid: true,
            coupon,
            discountAmount: fromPaise(discountPaise),
            finalAmount: fromPaise(basePaise - discountPaise),
        };
    }

    /**
     * Re-checks the limits that can change between order creation and payment,
     * against the promo row as locked by the caller. Returns the first problem
     * as { reason, message } or null. The caller has already been paid, so a
     * problem is recorded rather than refused (see SubscriptionCheckoutService).
     */
    static async redemptionProblem(coupon, userId, paymentId) {
        if (!coupon) return { reason: 'missing', message: 'promo code no longer exists' };
        if (!coupon.is_active) return { reason: 'inactive', message: 'promo code was deactivated before payment' };
        if (coupon.expires_at && new Date() > new Date(coupon.expires_at)) {
            return { reason: 'expired', message: 'promo code expired before payment' };
        }
        if (coupon.max_uses && Number(coupon.uses_count || 0) >= Number(coupon.max_uses)) {
            return { reason: 'exhausted', message: `usage limit ${coupon.max_uses} already reached (${coupon.uses_count} redeemed)` };
        }
        if (coupon.one_time_per_user && userId) {
            const prior = await db.SubscriptionTransaction.findOne({
                where: { user_id: userId, coupon_used: coupon.code, status: 'completed' },
            });
            if (prior && String(prior.transaction_id) !== String(paymentId)) {
                return { reason: 'already_used', message: 'user had already redeemed this one-time code' };
            }
        }
        return null;
    }

    /**
     * Counts one redemption. Called only once a payment has been verified, and
     * inside the same transaction that activates the subscription.
     */
    static async incrementUsage(couponId, options = {}) {
        await db.PromoCode.increment('uses_count', { where: { id: couponId }, ...options });
    }
}

CouponService.CouponError = CouponError;
CouponService.MIN_PAYABLE_PAISE = MIN_PAYABLE_PAISE;
module.exports = CouponService;
