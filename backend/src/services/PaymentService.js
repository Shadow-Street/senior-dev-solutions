const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../models');
const SubscriptionService = require('./SubscriptionService');
const CouponService = require('./CouponService');
const EmailService = require('./EmailService');

class PaymentService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_KEY',
            key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret'
        });
    }

    /**
     * Create Razorpay Order with Logic
     */
    async createSubscriptionOrder(userId, planId, couponCode, cycle = 'month', redirectUrl = null) {
        // 1. Get Plan Details
        const plan = await SubscriptionService.getPlanById(planId);
        console.log("createSubscriptionOrder", plan);
        if (!plan) throw new Error('Invalid Plan');

        // 2. Calculate Base Price - Use price_monthly and price_annually fields
        let amount = 0;
        const normalizedCycle = (cycle === 'year' || cycle === 'annual' || cycle === 'annually') ? 'year' : 'month';

        if (normalizedCycle === 'year') {
            // Use price_annually if available, otherwise calculate from monthly
            amount = parseFloat(plan.price_annually || plan.price * 12 || 0);
        } else {
            // Use price_monthly if available, otherwise use base price
            amount = parseFloat(plan.price_monthly || plan.price || 0);
        }

        console.log(`💰 Calculated amount for ${normalizedCycle}ly billing:`, amount);

        // 3. Apply Coupon
        let discount = 0;
        let couponId = null;

        if (couponCode) {
            const validation = await CouponService.validateCoupon(couponCode, amount);
            if (validation.isValid) {
                amount = validation.finalAmount;
                discount = validation.discountAmount;
                couponId = validation.coupon.id;
            }
        }

        // 4. Create Razorpay Order
        // Receipt must be max 40 characters - using short format
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits
        const userIdShort = userId.toString().slice(0, 8); // First 8 chars of user ID

        const options = {
            amount: Math.round(amount * 100), // in paise
            currency: "INR",
            receipt: `sub_${userIdShort}_${timestamp}`, // Max ~25 chars
            notes: {
                userId,
                planId,
                cycle: normalizedCycle, // ✅ Use normalized value
                couponId: couponId || '',
                redirectUrl: redirectUrl || ''
            }
        };

        const order = await this.razorpay.orders.create(options);

        // 5. Log Transaction (Pending)
        const transaction = await db.FundTransaction.create({
            user_id: userId,
            amount: amount,
            currency: 'INR',
            transaction_type: 'payment',
            status: 'pending',
            metadata: JSON.stringify({
                order_id: order.id,
                plan_id: planId,
                coupon_id: couponId,
                cycle: normalizedCycle, // ✅ Store normalized cycle
                redirect_url: redirectUrl
            }),
            payment_intent_id: order.id,
            source: 'razorpay'
        });

        return {
            order,
            transaction,
            discount
        };
    }

    /**
     * Verify Payment
     */
    async verifyPayment(orderId, paymentId, signature, userId) {
        // 1. Verify Signature
        const body = orderId + "|" + paymentId;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret')
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== signature) {
            throw new Error('Invalid Signature');
        }

        // 2. Fetch Transaction
        const transaction = await db.FundTransaction.findOne({
            where: { payment_intent_id: orderId }
        });

        if (!transaction) throw new Error('Transaction not found');

        // 3. Complete Transaction
        transaction.status = 'completed';
        transaction.transaction_id = paymentId;
        transaction.completed_at = new Date();
        await transaction.save();

        // 4. Activate Subscription
        const meta = JSON.parse(transaction.metadata);
        const subscription = await SubscriptionService.activateSubscription(userId, meta.plan_id, meta.cycle);

        // Store billing cycle and redirect URL
        await subscription.update({
            billing_cycle: meta.cycle === 'year' ? 'annually' : 'monthly',
            redirect_url: meta.redirect_url || null,
            last_payment_date: new Date()
        });

        // 5. Update Coupon Usage
        if (meta.coupon_id) {
            await CouponService.incrementUsage(meta.coupon_id);
        }

        // 6. Generate Invoice
        const InvoiceService = require('./InvoiceService');
        try {
            const invoice = await InvoiceService.generateInvoice(subscription.id, paymentId);
            await InvoiceService.generateInvoicePDF(invoice.id);
            await InvoiceService.sendInvoiceEmail(invoice.id);
            console.log('✅ Invoice generated and sent:', invoice.invoice_number);
        } catch (err) {
            console.error('❌ Invoice generation failed:', err.message);
            // Don't fail payment if invoice fails
        }

        // 7. Send Email
        const user = await db.User.findByPk(userId);
        const plan = await SubscriptionService.getPlanById(meta.plan_id);

        // Welcome Email
        await EmailService.sendEmail(
            user.email,
            'Subscription Activated!',
            EmailService.getWelcomeEmailTemplate(user.name)
        );

        // Receipt Email
        await EmailService.sendEmail(
            user.email,
            'Payment Receipt',
            EmailService.getPaymentReceiptTemplate(user.name, transaction.amount, plan.name, orderId)
        );

        return {
            success: true,
            redirectUrl: meta.redirect_url
        };
    }

    /**
     * Create pro-rated payment order for upgrades
     */
    async createProRatedOrder(userId, newPlanId, redirectUrl = null) {
        const InvoiceService = require('./InvoiceService');
        const proRatioData = await SubscriptionService.calculateProRatedAmount(userId, newPlanId);

        if (proRatioData.proRatedAmount <= 0) {
            throw new Error('No payment required for this upgrade');
        }

        const plan = await SubscriptionService.getPlanById(newPlanId);
        const timestamp = Date.now().toString().slice(-10);
        const userIdShort = userId.toString().slice(0, 8);

        const options = {
            amount: Math.round(proRatioData.proRatedAmount * 100), // in paise
            currency: "INR",
            receipt: `upg_${userIdShort}_${timestamp}`,
            notes: {
                userId,
                planId: newPlanId,
                upgrade: true,
                proRatedAmount: proRatioData.proRatedAmount,
                redirectUrl: redirectUrl || ''
            }
        };

        const order = await this.razorpay.orders.create(options);

        // Log transaction
        const transaction = await db.FundTransaction.create({
            user_id: userId,
            amount: proRatioData.proRatedAmount,
            currency: 'INR',
            transaction_type: 'payment',
            status: 'pending',
            metadata: JSON.stringify({
                order_id: order.id,
                plan_id: newPlanId,
                is_upgrade: true,
                pro_rated_amount: proRatioData.proRatedAmount,
                redirect_url: redirectUrl
            }),
            payment_intent_id: order.id,
            source: 'razorpay'
        });

        return {
            order,
            transaction,
            proRatioData
        };
    }
}

module.exports = new PaymentService();
