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
     * Recomputes users.is_premium from what the user actually holds: true only
     * while a live, paid platform subscription exists. Call after anything that
     * ends a plan early (refund, immediate cancellation).
     */
    static async syncPremiumFlag(userId, options = {}) {
        const { transaction } = options;
        const now = new Date();
        const rows = await db.Subscription.findAll({
            where: { ...this.platformWhere(userId), status: 'active' },
            include: [{ model: db.SubscriptionPlan }],
            transaction,
        });
        const paidLive = rows.some((s) => {
            if (!s.end_date || new Date(s.end_date) <= now) return false;
            const name = String((s.SubscriptionPlan && s.SubscriptionPlan.name) || s.plan_type || '').toLowerCase();
            return name.includes('premium') || name.includes('vip');
        });
        await db.User.update({ is_premium: paidLive }, { where: { id: userId }, transaction });
        return paidLive;
    }

    /**
     * Platform (non-advisor, non-finfluencer) subscription rows. Advisor
     * subscriptions live in the same table, so every "the user's plan" lookup
     * has to exclude them or buying one advisor plan would replace (or be
     * mistaken for) the user's Free/Premium/VIP membership.
     */
    static platformWhere(userId) {
        return { user_id: userId, advisor_id: null, finfluencer_id: null };
    }

    /**
     * Activate a platform plan for a user.
     * @param {string} userId - User ID
     * @param {string} planId - Plan ID
     * @param {string} duration - 'month' or 'year'
     * @param {object} [options] - { transaction } so the caller can make the activation atomic with its other writes
     */
    static async activateSubscription(userId, planId, duration = 'month', options = {}) {
        const { transaction } = options;
        const plan = await this.getPlanById(planId);
        if (!plan) throw new Error('Invalid Plan');
        if (plan.advisor_id || plan.finfluencer_id) {
            // Advisor/finfluencer plans have their own activation and must never
            // replace the user's platform membership or change their role.
            throw new Error('Not a platform plan');
        }

        // Replace the user's current platform subscription, free or paid.
        const existing = await db.Subscription.findAll({
            where: { ...this.platformWhere(userId), status: 'active' },
            transaction,
            // Read the committed state, and block a concurrent activation until we finish.
            lock: transaction && transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
        });
        for (const row of existing) {
            await row.update({ status: 'cancelled', auto_renew: false }, { transaction });
        }

        const startDate = new Date();
        const endDate = new Date();

        // Calculate End Date - handle multiple cycle formats
        if (duration === 'year' || duration === 'annual' || duration === 'annually') {
            endDate.setDate(startDate.getDate() + 365);
        } else {
            endDate.setDate(startDate.getDate() + 30);
        }

        // plan_type carries the plan name; the UI detects the tier from it.
        const subscription = await db.Subscription.create({
            user_id: userId,
            plan_id: planId,
            advisor_id: null,
            finfluencer_id: null,
            status: 'active',
            type: 'standard',
            plan_type: plan.name,
            start_date: startDate,
            end_date: endDate,
            auto_renew: false
        }, { transaction });

        // Update user based on plan tier
        const planNameLower = plan.name.toLowerCase();
        const isPremium = planNameLower.includes('premium') || planNameLower.includes('vip');

        await db.User.update(
            { is_premium: isPremium },
            { where: { id: userId }, transaction }
        );

        return subscription;
    }

    /**
     * The catalogue's Free plan: the cheapest active platform plan named
     * Free/Basic that really costs nothing. Null when the catalogue has none.
     */
    static async getFreePlan() {
        const plans = await db.SubscriptionPlan.findAll({
            where: { advisor_id: null, finfluencer_id: null },
            order: [['price', 'ASC']],
            limit: 50,
        });
        // The name alone is not enough: a plan someone calls "Free" but prices
        // above zero (monthly or yearly) must never be handed out for nothing.
        const zero = (v) => v === null || v === undefined || v === '' || Number(v) === 0;
        return plans.find((p) => p.is_active !== false
            && /^(free|basic)$/i.test(String(p.name || '').trim())
            && zero(p.price) && zero(p.price_monthly) && zero(p.price_annually)) || null;
    }

    /**
     * Gives the user an active Free subscription unless they already have an
     * active platform subscription of any kind. Idempotent, so register,
     * social sign-in and the read fallback can all call it.
     * Returns the row, or null when the catalogue has no Free plan.
     */
    static async ensureFreeSubscription(userId, options = {}) {
        const { transaction } = options;
        if (!userId) return null;

        const now = new Date();
        const active = await db.Subscription.findAll({
            where: { ...this.platformWhere(userId), status: 'active' },
            transaction,
        });
        const live = active.find((s) => !s.end_date || new Date(s.end_date) > now);
        if (live) return live;

        const plan = await this.getFreePlan();
        if (!plan) {
            console.warn('[SubscriptionService] no Free plan in the catalogue; user stays on the implicit Free tier');
            return null;
        }

        return db.Subscription.create({
            user_id: userId,
            plan_id: plan.id,
            advisor_id: null,
            finfluencer_id: null,
            status: 'active',
            type: 'standard',
            plan_type: plan.name,
            start_date: now,
            end_date: null, // Free never expires
            auto_renew: false,
            billing_cycle: 'monthly',
        }, { transaction });
    }

    /** Best-effort wrapper: a hiccup here must never fail sign-up or sign-in. */
    static async ensureFreeSubscriptionSafely(userId) {
        try {
            return await this.ensureFreeSubscription(userId);
        } catch (e) {
            console.error('[SubscriptionService] could not create the Free subscription:', e.message);
            return null;
        }
    }

    /**
     * The subscription the app should treat as the user's current plan.
     * Always returns something for a signed-in user: a paid plan that has not
     * run out, otherwise Free (created on first read for accounts that pre-date
     * the Free-by-default rule, or a virtual Free when the catalogue has none).
     */
    static async getCurrentSubscription(userId) {
        const now = new Date();
        const rows = await db.Subscription.findAll({
            where: { ...this.platformWhere(userId), status: 'active' },
            include: [{ model: db.SubscriptionPlan }],
            order: [['created_at', 'DESC']],
            limit: 20,
        });
        const live = rows.filter((s) => !s.end_date || new Date(s.end_date) > now);
        const isFreeRow = (s) => !s.end_date && /^(free|basic)$/i.test(String(s.plan_type || '').trim());
        // A paid plan beats a stray Free row; among paid rows the furthest end wins.
        const paid = live.filter((s) => !isFreeRow(s)).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        const chosen = paid[0] || live[0];
        if (chosen) return this.describe(chosen);

        const created = await this.ensureFreeSubscription(userId);
        if (created) {
            const plan = await db.SubscriptionPlan.findByPk(created.plan_id);
            return this.describe(created, plan);
        }
        return {
            id: null, user_id: userId, plan_id: null, status: 'active', type: 'standard',
            plan_type: 'Free', start_date: null, end_date: null, auto_renew: false,
            is_free: true, virtual: true,
        };
    }

    /** Plain JSON for a subscription row plus the derived `is_free` flag. */
    static describe(row, plan = null) {
        const json = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
        if (plan && !json.SubscriptionPlan) json.SubscriptionPlan = typeof plan.toJSON === 'function' ? plan.toJSON() : plan;
        json.is_free = !json.end_date && /^(free|basic)$/i.test(String(json.plan_type || '').trim());
        return json;
    }

    /**
     * Activates (or extends) a user's subscription to one advisor plan after a
     * verified payment. Never touches the user's platform membership, is_premium
     * or role. Returns { subscription, isNew }.
     */
    static async activateAdvisorSubscription(userId, plan, options = {}) {
        const { transaction } = options;
        if (!plan || !plan.advisor_id) throw new Error('Not an advisor plan');

        const now = new Date();
        const days = /^year/i.test(String(plan.interval || '')) ? 365 : /^quarter/i.test(String(plan.interval || '')) ? 90 : 30;

        const current = await db.Subscription.findOne({
            where: { user_id: userId, advisor_id: plan.advisor_id, status: 'active' },
            transaction,
        });

        if (current) {
            // Renewal / plan change: extend from whichever is later, now or the current end.
            const base = current.end_date && new Date(current.end_date) > now ? new Date(current.end_date) : now;
            const end = new Date(base);
            end.setDate(end.getDate() + days);
            await current.update({
                plan_id: plan.id,
                plan_type: plan.name,
                end_date: end,
                last_payment_date: now,
                payment_method_id: 'razorpay',
            }, { transaction });
            return { subscription: current, isNew: false };
        }

        const end = new Date(now);
        end.setDate(end.getDate() + days);
        const subscription = await db.Subscription.create({
            user_id: userId,
            advisor_id: plan.advisor_id,
            plan_id: plan.id,
            status: 'active',
            type: 'advisor',
            plan_type: plan.name,
            start_date: now,
            end_date: end,
            auto_renew: false,
            billing_cycle: 'monthly',
            last_payment_date: now,
            payment_method_id: 'razorpay',
        }, { transaction });
        return { subscription, isNew: true };
    }

    /** Keeps the prefix and the last four characters: pay_Nabc123XYZ9 -> pay_••••XYZ9. */
    static maskReference(ref) {
        const text = String(ref || '');
        if (!text) return null;
        if (text.length <= 8) return '••••';
        const prefix = text.includes('_') ? text.slice(0, text.indexOf('_') + 1) : '';
        return `${prefix}••••${text.slice(-4)}`;
    }

    /**
     * Everything the Profile billing view needs about the caller's current plan: the plan,
     * dates, and the last payment (gateway, masked reference, amount, coupon). Reads only
     * rows owned by `userId`. Invoices come from the invoice endpoints.
     */
    static async getBillingSummary(userId) {
        const subscription = await this.getCurrentSubscription(userId);
        let plan = subscription.SubscriptionPlan || null;
        if (!plan && subscription.plan_id) plan = await db.SubscriptionPlan.findByPk(subscription.plan_id);
        const isFree = Boolean(subscription.is_free);

        let last = null;
        if (subscription.id && !isFree) {
            last = await db.SubscriptionTransaction.findOne({
                where: { user_id: userId, subscription_id: subscription.id, status: 'completed', transaction_type: 'charge' },
                order: [['date', 'DESC']],
            });
        }
        const money = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

        return {
            subscription: {
                id: subscription.id,
                plan_name: (plan && plan.name) || subscription.plan_type || 'Free',
                status: subscription.status || 'active',
                is_free: isFree,
                billing_cycle: isFree ? null : (subscription.billing_cycle || 'monthly'),
                start_date: subscription.start_date || null,
                end_date: subscription.end_date || null,
                // A paid plan either renews (auto-renew on) or simply expires.
                renews: !isFree && Boolean(subscription.auto_renew),
                cancel_at_period_end: Boolean(subscription.cancelAtPeriodEnd),
                list_price_monthly: money(plan && (plan.price_monthly || plan.price)),
                list_price_annually: money(plan && plan.price_annually),
            },
            last_payment: last ? {
                amount: money(last.amount),
                discount_applied: money(last.discount_applied) || 0,
                coupon_used: last.coupon_used || null,
                gateway: last.payment_method || null,
                reference: this.maskReference(last.transaction_id),
                date: last.date || last.created_at || null,
            } : null,
        };
    }

    /**
     * Check Subscription Status
     */
    static async checkSubscriptionStatus(userId) {
        const subscription = await db.Subscription.findOne({
            where: {
                ...this.platformWhere(userId),
                status: 'active',
                end_date: { [Op.gt]: new Date() } // Free has no end date and is not cancellable
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

    /** The Razorpay client, created on first use (a seam for tests). */
    static gateway() {
        if (!this._gateway) {
            const Razorpay = require('razorpay');
            this._gateway = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
        }
        return this._gateway;
    }

    /**
     * Initiate Refund via Razorpay
     */
    static async initiateRefund(subscriptionId, reason) {
        const razorpay = this.gateway();

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

        // Claim the cancellation before any money moves. The subscription row is
        // locked for the duration of this short transaction, so two concurrent
        // /cancel calls are serialised: the second finds it already cancelled (or
        // the payment already claimed) and stops, instead of refunding twice.
        //
        // The claim also writes a *pending* RefundRequest. That row is what makes
        // the refund durable: if the gateway call times out we cannot know whether
        // Razorpay refunded, so the subscription stays cancelled and this row stays
        // pending until the refund.processed webhook settles it.
        let before;
        const { claimed, request } = await db.sequelize.transaction(async (t) => {
            const sub = await db.Subscription.findByPk(subscriptionId, {
                transaction: t,
                lock: t.LOCK ? t.LOCK.UPDATE : undefined,
            });
            if (!sub || sub.status !== 'active') {
                throw new Error('This subscription is already cancelled');
            }
            // Anything but a rejected request counts: pending (in flight), approved,
            // and completed (the webhook moves approved -> completed).
            const prior = await db.RefundRequest.findOne({
                where: { transaction_id: transaction.transaction_id, status: { [Op.ne]: 'rejected' } },
                transaction: t,
            });
            if (prior) throw new Error('This payment has already been refunded');
            before = { auto_renew: sub.auto_renew, cancellation_reason: sub.cancellation_reason ?? null, cancellation_date: sub.cancellation_date ?? null };
            const cancelledAt = new Date();
            await sub.update({
                status: 'cancelled',
                auto_renew: false,
                cancellation_reason: reason,
                cancellation_date: cancelledAt
            }, { transaction: t });
            const req = await db.RefundRequest.create({
                subscription_id: subscriptionId,
                user_id: transaction.user_id,
                transaction_id: transaction.transaction_id,
                reason: reason,
                status: 'pending',
                refund_amount: calculation.refundAmount,
            }, { transaction: t });
            return { claimed: sub, request: req };
        });

        let refund = null;
        let pending = false;
        try {
            refund = await razorpay.payments.refund(transaction.transaction_id, {
                amount: Math.round(calculation.refundAmount * 100), // paise
                // The SDK cannot send an idempotency header, so the request id travels as the
                // receipt and a note: it is how a refund is matched back to this row.
                receipt: `rfnd_${String(request.id).slice(0, 30)}`,
                notes: {
                    reason: String(reason || '').slice(0, 200),
                    subscription_id: subscriptionId,
                    refund_request_id: String(request.id)
                }
            });
        } catch (error) {
            // Only a definite rejection (a 4xx carrying a Razorpay error code) proves no
            // money moved. A timeout, network failure, 5xx or anything unrecognised may
            // have refunded already, and restoring the plan then would let the customer
            // keep it AND cancel again for a second refund.
            const rejected = Number.isInteger(error && error.statusCode)
                && error.statusCode >= 400 && error.statusCode < 500
                && Boolean(error.error && error.error.code);
            if (rejected) {
                console.error('Razorpay refund rejected:', error.statusCode, error.error.code);
                await db.sequelize.transaction(async (t) => {
                    const sub = await db.Subscription.findByPk(subscriptionId, { transaction: t, lock: t.LOCK ? t.LOCK.UPDATE : undefined });
                    // Only undo our own cancellation; if anything has changed the row since, leave it.
                    if (sub && sub.status === 'cancelled') {
                        await sub.update({ status: 'active', ...before }, { transaction: t });
                    }
                    await request.update({ status: 'rejected', admin_notes: `Gateway rejected: ${error.error.code}`, processed_at: new Date() }, { transaction: t });
                });
                throw new Error('The refund could not be processed. Your subscription has not been cancelled.');
            }
            console.error('Razorpay refund outcome unknown:', error && (error.message || error.statusCode));
            pending = true;
        }

        if (refund) {
            // The refund has happened; record it all together.
            await db.sequelize.transaction(async (t) => {
                await request.update({
                    razorpay_refund_id: refund.id,
                    status: 'approved', // the refund.processed webhook later moves it to completed
                    processed_at: new Date()
                }, { transaction: t });
                await this.recordRefundLedger({ userId: transaction.user_id, subscriptionId, paymentId: transaction.transaction_id, refundId: refund.id, amount: calculation.refundAmount, reason, transaction: t });
            });
        }

        // The plan ended now, so premium access ends now; the user falls back to Free.
        if (!claimed.advisor_id && !claimed.finfluencer_id) {
            await this.syncPremiumFlag(claimed.user_id);
            await this.ensureFreeSubscriptionSafely(claimed.user_id);
        }

        if (pending) {
            return {
                success: true,
                pending: true,
                amount: calculation.refundAmount,
                message: 'Your subscription is cancelled. Your refund is being confirmed with the payment provider and will be completed shortly.'
            };
        }
        return {
            success: true,
            refundId: refund.id,
            amount: calculation.refundAmount
        };
    }

    /** The negative history row and ledger row for one refund. Idempotent per refund id. */
    static async recordRefundLedger({ userId, subscriptionId, paymentId, refundId, amount, reason, transaction }) {
        const seen = await db.SubscriptionTransaction.findOne({ where: { transaction_id: refundId }, transaction });
        if (seen) return false;
        await db.SubscriptionTransaction.create({
            subscription_id: subscriptionId,
            user_id: userId,
            amount: -amount,
            status: 'refunded',
            payment_method: 'razorpay',
            transaction_id: refundId,
            transaction_type: 'refund',
            date: new Date()
        }, { transaction });
        await db.FundTransaction.create({
            user_id: userId,
            amount: -amount,
            transaction_type: 'refund',
            status: 'completed',
            transaction_id: refundId,
            source: 'razorpay_refund',
            completed_at: new Date(),
            description: `Refund for subscription ${subscriptionId}`,
            metadata: { original_transaction_id: paymentId, reason }
        }, { transaction });
        return true;
    }

    /**
     * refund.processed webhook. Settles the RefundRequest for this refund: matched by
     * refund id, or - when the original call timed out and we never learned the id -
     * by the request id carried in the refund's notes (falling back to the payment id
     * with a pending request). Writes the ledger rows if the API path never did.
     */
    static async applyRefundProcessed(refundEntity) {
        if (!refundEntity || !refundEntity.id) return null;
        const refundId = refundEntity.id;
        let request = await db.RefundRequest.findOne({ where: { razorpay_refund_id: refundId } });
        if (!request) {
            const noteId = refundEntity.notes && refundEntity.notes.refund_request_id;
            if (noteId) request = await db.RefundRequest.findByPk(noteId);
            if (!request && refundEntity.payment_id) {
                request = await db.RefundRequest.findOne({ where: { transaction_id: refundEntity.payment_id, status: 'pending' } });
            }
        }
        if (!request) return null;
        await db.sequelize.transaction(async (t) => {
            await request.update({ razorpay_refund_id: refundId, status: 'completed', processed_at: new Date() }, { transaction: t });
            await this.recordRefundLedger({
                userId: request.user_id,
                subscriptionId: request.subscription_id,
                paymentId: request.transaction_id,
                refundId,
                amount: Number(request.refund_amount) || (Number(refundEntity.amount) || 0) / 100,
                reason: request.reason,
                transaction: t
            });
        });
        return request;
    }
}

module.exports = SubscriptionService;
