const db = require('../models');
const { Op } = require('sequelize');

class CouponService {
    /**
     * Create a new Coupon
     */
    static async createCoupon(data) {
        // Ensure code is uppercase
        data.code = data.code.toUpperCase();
        return await db.PromoCode.create(data);
    }

    /**
     * Validate a Coupon Code
     * @param {string} code 
     * @param {number} cartAmount - optional, to check min spend if needed
     */
    static async validateCoupon(code, userId, cartAmount = 0, planId = null, isRenewal = false) {
        if (!code) throw new Error('Coupon code is required');

        const coupon = await db.PromoCode.findOne({
            where: {
                code: code.toUpperCase(),
                is_active: true
            }
        });

        if (!coupon) {
            throw new Error('Invalid Coupon');
        }

        // 1. Expiry Check
        if (coupon.expires_at && new Date() > new Date(coupon.expires_at)) {
            throw new Error('Coupon Expired');
        }

        // 2. Global Usage Limit
        if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
            throw new Error('Coupon usage limit reached');
        }

        // 3. One User Constraint
        if (coupon.one_time_per_user && userId) {
            const usage = await db.SubscriptionTransaction.findOne({
                where: {
                    user_id: userId,
                    coupon_used: code.toUpperCase(),
                    status: 'completed'
                }
            });
            if (usage) {
                throw new Error('You have already used this coupon');
            }
        }

        // 4. Plan Specificity
        if (planId && coupon.applicable_to) {
            let applicablePlans = [];
            try {
                applicablePlans = typeof coupon.applicable_to === 'string'
                    ? JSON.parse(coupon.applicable_to)
                    : coupon.applicable_to;
            } catch (e) {
                // If special string 'all', ignore
                if (coupon.applicable_to !== 'all') applicablePlans = [];
            }

            if (coupon.applicable_to !== 'all' && Array.isArray(applicablePlans) && !applicablePlans.includes(planId)) {
                throw new Error('Coupon not applicable for this plan');
            }
        }

        // 5. Renewal Applicability
        if (isRenewal && !coupon.applies_to_renewal) {
            throw new Error('Coupon not applicable for renewals');
        }

        // 6. Min Order Amount
        if (coupon.min_order_amount && cartAmount < parseFloat(coupon.min_order_amount)) {
            throw new Error(`Minimum spend of ₹${coupon.min_order_amount} required`);
        }

        // Calculate Discount
        let discountAmount = 0;
        if (coupon.discount_percent) {
            discountAmount = (cartAmount * parseFloat(coupon.discount_percent)) / 100;
        } else if (coupon.discount_amount) {
            discountAmount = parseFloat(coupon.discount_amount);
        }

        // Ensure discount doesn't exceed cart amount
        if (discountAmount > cartAmount) {
            discountAmount = cartAmount;
        }

        return {
            isValid: true,
            coupon,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalAmount: parseFloat((cartAmount - discountAmount).toFixed(2))
        };
    }

    /**
     * Increment Usage Count
     */
    static async incrementUsage(couponId) {
        await db.PromoCode.increment('uses_count', { where: { id: couponId } });
    }
}

module.exports = CouponService;
