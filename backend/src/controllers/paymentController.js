const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../models');
const SubscriptionService = require('../services/SubscriptionService');
const InvoiceService = require('../services/InvoiceService');
const EmailService = require('../services/EmailService');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentController {

    /**
     * Create Razorpay Order
     */
    static async createOrder(req, res) {
        try {
            const { planId, cycle, couponCode } = req.body;
            const userId = req.user.id;

            const plan = await db.SubscriptionPlan.findByPk(planId);
            if (!plan) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            // Calculate Amount
            let amount = cycle === 'monthly' ? plan.price_monthly : plan.price_annually;
            // Fallback for older plans
            if (!amount) amount = plan.price;

            let discountDetails = {
                couponCode: null,
                discountAmount: 0
            };

            // Apply Coupon if exists
            if (couponCode) {
                try {
                    const validation = await require('../services/CouponService').validateCoupon(
                        couponCode,
                        userId,
                        amount,
                        planId,
                        false // isRenewal
                    );

                    if (validation.isValid) {
                        const discount = validation.discountAmount;
                        amount = validation.finalAmount;
                        discountDetails = {
                            couponCode: couponCode,
                            discountAmount: discount
                        };
                    }
                } catch (err) {
                    console.warn(`Coupon validation failed: ${err.message}`);
                    // return res.status(400).json({ error: err.message });
                    // Optionally consume the error and proceed without discount, or block. 
                    // Better to block if user explicitly tried a coupon.
                    return res.status(400).json({ error: err.message });
                }
            }

            // Amount must be in paise
            const amountInPaise = Math.round(amount * 100);

            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `rcpt_${userId.slice(-15)}_${Date.now()}`,
                notes: {
                    userId: userId,
                    planId: planId,
                    cycle: cycle,
                    couponCode: discountDetails.couponCode || '',
                    discountApplied: discountDetails.discountAmount || 0
                }
            };

            const order = await razorpay.orders.create(options);

            res.json({
                success: true,
                order_id: order.id,
                amount: amountInPaise,
                currency: "INR",
                key_id: process.env.RAZORPAY_KEY_ID,
                discount: discountDetails
            });

        } catch (error) {
            console.error('Create Order Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Verify Payment
     */
    static async verifyPayment(req, res) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            const userId = req.user.id;

            // Verify Signature
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            const isAuthentic = expectedSignature === razorpay_signature;

            if (!isAuthentic) {
                return res.status(400).json({ success: false, error: 'Invalid signature' });
            }

            // Fetch Order to get metadata (planId, cycle)
            const order = await razorpay.orders.fetch(razorpay_order_id);
            const { planId, cycle, couponCode, discountApplied } = order.notes;

            // Activate Subscription
            const subscription = await SubscriptionService.activateSubscription(userId, planId, cycle);

            // Update Subscription with payment details
            await subscription.update({
                payment_method_id: 'razorpay',
                last_payment_date: new Date(),
                status: 'active'
            });

            // Log Transaction in FundTransaction (Global Financial Record)
            const amount = order.amount / 100; // Convert back to rupees
            await db.FundTransaction.create({
                user_id: userId,
                amount: amount,
                transaction_type: 'payment',
                status: 'completed',
                transaction_id: razorpay_payment_id,
                source: 'razorpay',
                completed_at: new Date(),
                description: `Subscription payment for plan ${planId}`,
                metadata: {
                    order_id: razorpay_order_id,
                    plan_id: planId,
                    cycle: cycle,
                    coupon: couponCode
                }
            });

            // Log in SubscriptionTransaction (Specific for Subscription History)
            const transaction = await db.SubscriptionTransaction.create({
                subscription_id: subscription.id,
                user_id: userId, // FIXED: Added user_id
                amount: amount,
                status: 'completed',
                payment_method: 'razorpay',
                transaction_id: razorpay_payment_id,
                razorpay_order_id: razorpay_order_id,
                coupon_used: couponCode || null,
                discount_applied: discountApplied || 0,
                transaction_type: 'charge',
                date: new Date()
            });

            // Generate Invoice
            const invoice = await InvoiceService.generateInvoice(subscription.id, transaction.transaction_id);

            // Link invoice to transaction
            if (invoice) {
                await transaction.update({ invoice_id: invoice.id });
            }

            // Update Coupon Usage
            if (couponCode) {
                const coupon = await db.PromoCode.findOne({ where: { code: couponCode } });
                if (coupon) {
                    await require('../services/CouponService').incrementUsage(coupon.id);
                }
            }

            // Send Email
            const user = await db.User.findByPk(userId);
            const plan = await db.SubscriptionPlan.findByPk(planId);

            await EmailService.sendEmail(
                user.email,
                'Payment Successful',
                EmailService.getPaymentReceiptTemplate(user.name, amount, plan.name, razorpay_order_id)
            );

            res.json({ success: true, subscription });

        } catch (error) {
            console.error('Verify Payment Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Webhook Handler
     */
    static async handleWebhook(req, res) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Validate Signature
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest !== req.headers['x-razorpay-signature']) {
            console.error('Invalid Webhook Signature');
            return res.status(400).json({ status: 'ignored' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log('Received Webhook:', event);

        try {
            if (event === 'payment.captured') {
                // Payment success logic if needed (usually handled in verify callback for one-time payments)
                // Helpful for renewals if using recurring payments
            } else if (event === 'subscription.charged') {
                // Handle recurring payment success
                const rzpSubscriptionId = payload.subscription.entity.id;
                const paymentId = payload.payment.entity.id;
                const amount = payload.payment.entity.amount / 100;

                const subscription = await db.Subscription.findOne({
                    where: { razorpay_subscription_id: rzpSubscriptionId }
                });

                if (subscription) {
                    // Extend subscription
                    const addDays = subscription.billing_cycle === 'annually' ? 365 : 30;
                    const newEndDate = new Date(subscription.end_date);
                    newEndDate.setDate(newEndDate.getDate() + addDays);

                    await subscription.update({
                        end_date: newEndDate,
                        last_payment_date: new Date(),
                        status: 'active'
                    });

                    // Log Transaction & Invoice
                    const transaction = await db.FundTransaction.create({
                        user_id: subscription.user_id,
                        amount: amount,
                        transaction_type: 'payment',
                        status: 'completed',
                        transaction_id: paymentId,
                        source: 'razorpay_recurring',
                        completed_at: new Date(),
                        description: `Type: Renewal`
                    });

                    await InvoiceService.generateInvoice(subscription.id, transaction.transaction_id);

                    // Email
                    const user = await db.User.findByPk(subscription.user_id);
                    await EmailService.sendEmail(
                        user.email,
                        'Subscription Renewed',
                        EmailService.getAutopaySuccessTemplate(user.name, amount, newEndDate)
                    );
                }
            } else if (event === 'subscription.cancelled') {
                const rzpSubscriptionId = payload.subscription.entity.id;
                const subscription = await db.Subscription.findOne({
                    where: { razorpay_subscription_id: rzpSubscriptionId }
                });
                if (subscription && subscription.status !== 'cancelled') {
                    await subscription.update({
                        status: 'cancelled',
                        auto_renew: false,
                        cancellation_date: new Date(),
                        cancellation_reason: 'Cancelled via Razorpay Dashboard'
                    });
                    // Notify User
                    // ...
                }
            } else if (event === 'payment.failed') {
                const paymentId = payload.payment.entity.id;
                // Log failed transaction
                // Can try to link to user via notes if available
                const userId = payload.payment.entity.notes.userId;
                if (userId) {
                    await db.FundTransaction.create({
                        user_id: userId,
                        amount: payload.payment.entity.amount / 100,
                        transaction_type: 'payment',
                        status: 'failed',
                        transaction_id: paymentId,
                        source: 'razorpay_webhook',
                        description: payload.payment.entity.error_description || 'Payment Failed'
                    });
                    // Trigger "Payment Failed" email
                }
            } else if (event === 'refund.processed') {
                // Update RefundRequest status if exists
                const refundId = payload.refund.entity.id;
                const refundRequest = await db.RefundRequest.findOne({ where: { razorpay_refund_id: refundId } });
                if (refundRequest) {
                    await refundRequest.update({ status: 'completed', processed_at: new Date() });
                    // Notify User
                }
            }

            res.json({ status: 'ok' });

        } catch (error) {
            console.error('Webhook Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PaymentController;
