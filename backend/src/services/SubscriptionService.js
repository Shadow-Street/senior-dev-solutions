const db = require('../models');
const { Op } = require('sequelize');

class SubscriptionService {
    /**
     * Create or Update a Subscription Plan
     */
    static async upsertPlan(data, planId = null) {
        if (planId) {
            const plan = await db.SubscriptionPlan.findByPk(planId);
            if (!plan) throw new Error('Plan not found');
            return await plan.update(data);
        }
        return await db.SubscriptionPlan.create(data);
    }

    /**
     * Get Active Plans
     */
    static async getActivePlans() {
        return await db.SubscriptionPlan.findAll({
            where: { is_active: true },
            order: [['price', 'ASC']]
        });
    }

    /**
     * Get Plan by ID
     */
    static async getPlanById(id) {
        return await db.SubscriptionPlan.findByPk(id);
    }

    /**
     * Activate Subscription for User
     * @param {string} userId - User ID
     * @param {string} planId - Plan ID
     * @param {string} duration - 'month' or 'year'
     */
    static async activateSubscription(userId, planId, duration = 'month') {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new Error('Invalid Plan');

        // ✅ CHECK FOR EXISTING ACTIVE SUBSCRIPTIONS
        const existingSubscription = await db.Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active',
                end_date: { [Op.gt]: new Date() }
            }
        });

        // ✅ If exists, cancel/expire it first
        if (existingSubscription) {
            console.log('📝 Cancelling existing subscription:', existingSubscription.id);
            await existingSubscription.update({
                status: 'cancelled',
                auto_renew: false
            });
        }

        const startDate = new Date();
        const endDate = new Date();

        // Calculate End Date - handle multiple cycle formats
        if (duration === 'year' || duration === 'annual' || duration === 'annually') {
            endDate.setDate(startDate.getDate() + 365);
        } else {
            endDate.setDate(startDate.getDate() + 30);
        }

        // ✅ SET plan_type FROM PLAN NAME - Critical for UI detection
        const subscription = await db.Subscription.create({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            type: 'standard',
            plan_type: plan.name, // ✅ CRITICAL: Set plan_type for UI detection
            start_date: startDate,
            end_date: endDate,
            auto_renew: false
        });

        console.log('✅ Subscription created:', {
            user_id: userId,
            plan_type: plan.name,
            duration: duration,
            end_date: endDate
        });

        // ✅ Update user based on plan tier
        const planNameLower = plan.name.toLowerCase();
        const isPremium = planNameLower.includes('premium') || planNameLower.includes('vip');

        await db.User.update(
            {
                is_premium: isPremium,
                // Don't change app_role unless it's an advisor plan
                ...(planNameLower.includes('advisor') && { app_role: 'advisor' })
            },
            { where: { id: userId } }
        );

        return subscription;
    }

    /**
     * Check Subscription Status
     */
    static async checkSubscriptionStatus(userId) {
        const subscription = await db.Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active',
                end_date: { [Op.gt]: new Date() }
            },
            include: [{ model: db.SubscriptionPlan }],
            order: [['end_date', 'DESC']]
        });

        if (!subscription) return null;

        return subscription;
    }

    /**
     * Enable Autopay for subscription
     */
    static async enableAutopay(userId, paymentMethodId = null) {
        const subscription = await this.checkSubscriptionStatus(userId);

        if (!subscription) {
            throw new Error('No active subscription found');
        }

        // Calculate next billing date based on current end_date
        const nextBillingDate = new Date(subscription.end_date);

        await subscription.update({
            auto_renew: true,
            cancelAtPeriodEnd: false,
            cancellation_date: null,
            cancellation_reason: null,
            payment_method_id: paymentMethodId,
            next_billing_date: nextBillingDate
        });

        console.log('✅ Autopay enabled for subscription:', subscription.id);
        return subscription;
    }

    /**
     * Disable Autopay (cancel at period end)
     */
    static async disableAutopay(userId, reason = null) {
        const subscription = await this.checkSubscriptionStatus(userId);

        if (!subscription) {
            throw new Error('No active subscription found');
        }

        await subscription.update({
            auto_renew: false,
            cancelAtPeriodEnd: true,
            cancellation_date: new Date(),
            cancellation_reason: reason
        });

        console.log('📝 Autopay disabled for subscription:', subscription.id);
        return subscription;
    }

    /**
     * Reactivate cancelled subscription
     */
    static async reactivateSubscription(userId) {
        const subscription = await db.Subscription.findOne({
            where: {
                user_id: userId,
                status: 'active',
                cancelAtPeriodEnd: true
            },
            include: [{ model: db.SubscriptionPlan }]
        });

        if (!subscription) {
            throw new Error('No cancelled subscription found to reactivate');
        }

        await subscription.update({
            auto_renew: true,
            cancelAtPeriodEnd: false,
            cancellation_date: null,
            cancellation_reason: null,
            next_billing_date: subscription.end_date
        });

        console.log('✅ Subscription reactivated:', subscription.id);
        return subscription;
    }

    /**
     * Calculate pro-rated amount for mid-cycle upgrade
     */
    static async calculateProRatedAmount(userId, newPlanId) {
        const currentSubscription = await this.checkSubscriptionStatus(userId);

        if (!currentSubscription) {
            return { proRatedAmount: 0, isUpgrade: false };
        }

        const currentPlan = await this.getPlanById(currentSubscription.plan_id);
        const newPlan = await this.getPlanById(newPlanId);

        if (!currentPlan || !newPlan) {
            throw new Error('Invalid plan(s)');
        }

        // Get pricing based on billing cycle
        const cycle = currentSubscription.billing_cycle || 'monthly';
        const currentPrice = cycle === 'annually' ? currentPlan.price_annually : currentPlan.price_monthly;
        const newPrice = cycle === 'annually' ? newPlan.price_annually : newPlan.price_monthly;

        // Calculate days remaining
        const now = new Date();
        const endDate = new Date(currentSubscription.end_date);
        const startDate = new Date(currentSubscription.start_date);

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
            return { proRatedAmount: parseFloat(newPrice), isUpgrade: true, daysRemaining: 0 };
        }

        // Calculate pro-rated amounts
        const currentDailyRate = parseFloat(currentPrice) / totalDays;
        const newDailyRate = parseFloat(newPrice) / totalDays;

        const currentUnused = currentDailyRate * daysRemaining;
        const newCost = newDailyRate * daysRemaining;

        const proRatedAmount = Math.max(0, newCost - currentUnused);

        console.log('💰 Pro-rated calculation:', {
            currentPlan: currentPlan.name,
            newPlan: newPlan.name,
            daysRemaining,
            totalDays,
            currentUnused: currentUnused.toFixed(2),
            newCost: newCost.toFixed(2),
            proRatedAmount: proRatedAmount.toFixed(2)
        });

        return {
            proRatedAmount: Math.round(proRatedAmount * 100) / 100,
            isUpgrade: parseFloat(newPrice) > parseFloat(currentPrice),
            daysRemaining,
            currentPlan: currentPlan.name,
            newPlan: newPlan.name
        };
    }

    /**
     * Upgrade subscription with pro-ration
     */
    static async upgradeWithProration(userId, newPlanId, redirectUrl = null) {
        const proRatioData = await this.calculateProRatedAmount(userId, newPlanId);

        // Cancel existing subscription
        const currentSubscription = await this.checkSubscriptionStatus(userId);
        if (currentSubscription) {
            await currentSubscription.update({ status: 'cancelled', auto_renew: false });
        }

        // Create new subscription maintaining the billing cycle
        const cycle = currentSubscription?.billing_cycle || 'monthly';
        const newSubscription = await this.activateSubscription(userId, newPlanId, cycle);

        // Store redirect URL if provided
        if (redirectUrl) {
            await newSubscription.update({ redirect_url: redirectUrl });
        }

        return {
            subscription: newSubscription,
            proRatedAmount: proRatioData.proRatedAmount,
            redirectUrl
        };
    }

    /**
     * Get user's subscription history
     */
    static async getUserSubscriptionHistory(userId) {
        return await db.Subscription.findAll({
            where: { user_id: userId },
            include: [{ model: db.SubscriptionPlan }],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get subscription analytics for user
     */
    static async getSubscriptionStats(userId) {
        const allSubscriptions = await this.getUserSubscriptionHistory(userId);

        // Get all transactions
        const transactions = await db.FundTransaction.findAll({
            where: {
                user_id: userId,
                transaction_type: 'payment',
                status: 'completed'
            },
            order: [['completed_at', 'DESC']]
        });

        const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const activeSubscription = await this.checkSubscriptionStatus(userId);

        return {
            totalSubscriptions: allSubscriptions.length,
            currentSubscription: activeSubscription,
            totalSpent: Math.round(totalSpent * 100) / 100,
            transactionCount: transactions.length,
            subscriptionHistory: allSubscriptions
        };
    }
    /**
     * Calculate Refund Amount logic
     */
    static async calculateRefundAmount(subscriptionId) {
        const subscription = await db.Subscription.findByPk(subscriptionId);
        if (!subscription) throw new Error('Subscription not found');

        // Find original transaction to get amount_paid and discount
        const transaction = await db.SubscriptionTransaction.findOne({
            where: {
                subscription_id: subscriptionId,
                status: 'completed',
                transaction_type: 'charge'
            },
            order: [['date', 'DESC']] // detailed log
        });

        if (!transaction) return { refundAmount: 0, reason: 'No payment record found' };

        const amountPaid = parseFloat(transaction.amount); // What user paid
        const discountApplied = parseFloat(transaction.discount_applied || 0);

        const now = new Date();
        const endDate = new Date(subscription.end_date);
        const startDate = new Date(subscription.last_payment_date || subscription.start_date);

        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        const usedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, totalDays - usedDays);

        if (remainingDays <= 0) {
            return { refundAmount: 0, reason: 'Subscription period ended' };
        }

        // Formula: (remaining_days / total_days) * amount_paid
        // This is the prorated value of the *actual money paid*
        let rawRefund = (remainingDays / totalDays) * amountPaid;

        // "Case B — If coupon applied: refund_amount = refund_amount - discount_applied"
        // This seems to double-dip if we start from amountPaid (which is already net).
        // If the prompt implies we start from Plan Price... let's stick to the prompt's formula explicitly.
        // Prompt says: 
        // Case A: refund_amount = (remaining_days / total_days) * amount_paid
        // Case B: refund_amount = refund_amount - discount_applied

        let refundAmount = rawRefund - discountApplied;

        if (refundAmount < 0) refundAmount = 0;

        return {
            refundAmount: parseFloat(refundAmount.toFixed(2)),
            daysRemaining: remainingDays,
            totalDays,
            amountPaid,
            discountApplied,
            rawCalculated: parseFloat(rawRefund.toFixed(2))
        };
    }

    /**
     * Initiate Refund via Razorpay
     */
    static async initiateRefund(subscriptionId, reason) {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const calculation = await this.calculateRefundAmount(subscriptionId);
        if (calculation.refundAmount <= 0) {
            // Just cancel without refund
            return await this.disableAutopay(
                (await db.Subscription.findByPk(subscriptionId)).user_id,
                reason
            );
        }

        // Get payment ID
        const transaction = await db.SubscriptionTransaction.findOne({
            where: {
                subscription_id: subscriptionId,
                status: 'completed',
                transaction_type: 'charge'
            },
            order: [['date', 'DESC']]
        });

        if (!transaction || !transaction.transaction_id) {
            throw new Error('No transaction found to refund');
        }

        try {
            const refund = await razorpay.payments.refund(transaction.transaction_id, {
                amount: Math.round(calculation.refundAmount * 100), // paise
                notes: {
                    reason: reason,
                    subscription_id: subscriptionId
                }
            });

            // Log Refund Request
            await db.RefundRequest.create({
                subscription_id: subscriptionId,
                user_id: transaction.user_id,
                transaction_id: transaction.transaction_id,
                razorpay_refund_id: refund.id,
                reason: reason,
                status: 'approved', // Auto-approved via API
                refund_amount: calculation.refundAmount,
                processed_at: new Date()
            });

            // Log Negative Transaction
            await db.SubscriptionTransaction.create({
                subscription_id: subscriptionId,
                user_id: transaction.user_id,
                amount: -calculation.refundAmount,
                status: 'refunded',
                payment_method: 'razorpay',
                transaction_id: refund.id,
                transaction_type: 'refund',
                date: new Date()
            });

            // Log Fund Transaction (Global Ledger)
            await db.FundTransaction.create({
                user_id: transaction.user_id,
                amount: -calculation.refundAmount,
                transaction_type: 'refund',
                status: 'completed',
                transaction_id: refund.id,
                source: 'razorpay_refund',
                completed_at: new Date(),
                description: `Refund for subscription ${subscriptionId}`,
                metadata: {
                    original_transaction_id: transaction.transaction_id,
                    reason: reason
                }
            });

            // Update Subscription to Cancelled
            const subscription = await db.Subscription.findByPk(subscriptionId);
            await subscription.update({
                status: 'cancelled',
                auto_renew: false,
                cancellation_reason: reason,
                cancellation_date: new Date()
            });

            return {
                success: true,
                refundId: refund.id,
                amount: calculation.refundAmount
            };

        } catch (error) {
            console.error("Razorpay refund error:", error);
            throw new Error('Refund failed: ' + error.message);
        }
    }
}

module.exports = SubscriptionService;
