const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../models');
const Checkout = require('../services/SubscriptionCheckoutService');
const SubscriptionService = require('../services/SubscriptionService');
const CommissionService = require('../services/CommissionService');
const InvoiceService = require('../services/InvoiceService');
const EmailService = require('../services/EmailService');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/** Constant-time check of Razorpay's hex HMAC-SHA256 signature. */
function signatureMatches(orderId, paymentId, signature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
    const given = String(signature || '');
    // Decode before comparing: a malformed value (wrong length, non-hex,
    // non-ASCII) must be rejected, not allowed to reach timingSafeEqual with
    // buffers of different sizes, which throws.
    if (!/^[0-9a-f]{64}$/i.test(given)) return false;
    return crypto.timingSafeEqual(Buffer.from(given, 'hex'), expected);
}

class PaymentController {

    /**
     * Create Razorpay Order for a platform plan or an advisor plan.
     *
     * Body: { planId, cycle?, couponCode? }. The price, discount and plan kind
     * all come from the database; nothing monetary is read from the client.
     */
    static async createOrder(req, res) {
        try {
            const userId = req.user.id;
            const { planId, cycle, couponCode } = req.body || {};

            const quote = await Checkout.quoteOrder({ userId, planId, cycle, couponCode });

            // A promo code that covers the whole price: activate server-side, no gateway order.
            if (quote.isFree) {
                const result = await PaymentController.settle({
                    result: await Checkout.activateFree({ quote, userId }),
                    paymentId: null, userId,
                });
                return res.json({
                    success: true,
                    free: true,
                    kind: result.kind,
                    subscription: result.subscription,
                    discount: { couponCode: quote.coupon.code, discountAmount: quote.discountAmount },
                    pricing: { originalAmount: quote.baseAmount, discountAmount: quote.discountAmount, finalAmount: 0 },
                });
            }

            // Advisor plans: refuse a second payment while already subscribed.
            if (quote.kind === 'advisor') {
                const already = await db.Subscription.findOne({
                    where: { user_id: userId, advisor_id: quote.plan.advisor_id, status: 'active', plan_id: quote.plan.id },
                });
                if (already && already.end_date && new Date(already.end_date) > new Date()) {
                    return res.status(409).json({ error: 'You are already subscribed to this plan' });
                }
            }

            const options = {
                amount: quote.amountInPaise,
                currency: 'INR',
                // Capture automatically: the plan is activated only for a payment that
                // Razorpay reports as 'captured' (see verifyPayment). With manual capture
                // every payment would sit at 'authorized' and nobody would ever be paid.
                payment_capture: 1,
                receipt: `rcpt_${String(userId).slice(-15)}_${Date.now()}`,
                notes: {
                    userId: String(userId),
                    planId: String(quote.plan.id),
                    kind: quote.kind,
                    cycle: quote.cycle,
                    couponCode: quote.coupon ? quote.coupon.code : '',
                    discountApplied: quote.discountAmount,
                    baseAmount: quote.baseAmount,
                },
            };

            const order = await PaymentController.razorpay.orders.create(options);

            res.json({
                success: true,
                order_id: order.id,
                amount: quote.amountInPaise,
                currency: 'INR',
                key_id: process.env.RAZORPAY_KEY_ID,
                discount: {
                    couponCode: quote.coupon ? quote.coupon.code : null,
                    discountAmount: quote.discountAmount,
                },
                pricing: {
                    originalAmount: quote.baseAmount,
                    discountAmount: quote.discountAmount,
                    finalAmount: quote.finalAmount,
                },
            });

        } catch (error) {
            if (error instanceof Checkout.CheckoutError) {
                return res.status(error.status).json({ error: error.message });
            }
            if (error instanceof Checkout.CouponError) {
                return res.status(400).json({ error: error.message, reason: error.reason });
            }
            console.error('Create Order Error:', error);
            res.status(500).json({ error: 'Could not start the payment. Please try again.' });
        }
    }

    /**
     * Reads the order and the payment back from Razorpay and requires that the money
     * was captured, for this order, for exactly the amount we priced.
     * Returns { order, payment } or { error: true, status, body } for the client.
     */
    static async confirmWithGateway(orderId, paymentId) {
        // The order's notes were written by createOrder, so they are ours, not the browser's.
        const order = await PaymentController.razorpay.orders.fetch(orderId);
        let payment;
        try {
            payment = await PaymentController.razorpay.payments.fetch(paymentId);
        } catch (e) {
            console.error('Payment lookup failed:', e && e.message);
            return { error: true, status: 400, body: { success: false, error: 'Payment could not be verified' } };
        }
        if (!payment || payment.order_id !== orderId
            || Number(payment.amount) !== Number(order.amount)
            || (payment.currency && payment.currency !== order.currency)) {
            console.error('Payment/order mismatch for', paymentId);
            return { error: true, status: 400, body: { success: false, error: 'Payment could not be verified' } };
        }
        if (payment.status !== 'captured') {
            // 'authorized' is the brief window before auto-capture completes; the client
            // retries (and the payment.captured webhook finishes the job if it does not).
            if (payment.status === 'authorized') {
                return { error: true, status: 409, body: { success: false, pending: true, error: 'Your payment is still being confirmed. Please wait a moment.' } };
            }
            return { error: true, status: 400, body: { success: false, error: 'This payment was not completed' } };
        }
        return { order, payment };
    }

    /**
     * What follows a fulfilment, whichever path (verify or webhook) did it: advisor
     * commission (idempotent on the payment id, so also run for a replay to repair a
     * failure the first time) and, for a first fulfilment, invoice and receipt email.
     */
    static async settle({ result, paymentId, userId, order }) {
        if (result.kind === 'advisor') {
            await CommissionService.recordAdvisorCommissionSafely({
                plan: result.plan,
                payerUserId: userId,
                paidAmount: result.amount ?? (order ? Number(order.amount) / 100 : 0),
                paymentId,
                subscriptionId: result.subscription ? result.subscription.id : null,
            });
        }
        if (!result.alreadyProcessed) {
            // Best effort: the payment has been taken and the plan activated, so none of
            // this may fail the request.
            try {
                const invoice = await InvoiceService.generateInvoice(result.subscription.id, paymentId || result.reference);
                if (invoice && result.transactionRow) await result.transactionRow.update({ invoice_id: invoice.id });
            } catch (e) {
                console.error('Invoice generation failed:', e.message);
            }
            try {
                const user = await db.User.findByPk(userId);
                if (user && user.email) {
                    if (result.free) {
                        await EmailService.sendEmail(user.email, `Your ${result.plan.name} plan is active`, EmailService.getWelcomeEmailTemplate(user.name));
                    } else {
                        await EmailService.sendEmail(
                            user.email,
                            'Payment Successful',
                            EmailService.getPaymentReceiptTemplate(user.name, result.amount, result.plan.name, order ? order.id : '')
                        );
                    }
                }
            } catch (e) {
                console.error('Receipt email failed:', e.message);
            }
        }
        return result;
    }

    /**
     * Verify Payment
     *
     * Checks the Razorpay signature, that the order was created for the caller,
     * then activates the plan, records the payment and redeems the promo code
     * in one transaction. Safe to call again for the same payment.
     */
    static async verifyPayment(req, res) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
            const userId = req.user.id;

            if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === 'string' && v)) {
                return res.status(400).json({ success: false, error: 'Missing payment details' });
            }
            if (!process.env.RAZORPAY_KEY_SECRET) {
                console.error('Payment verification requested but RAZORPAY_KEY_SECRET is not configured');
                return res.status(503).json({ success: false, error: 'Payments are temporarily unavailable' });
            }

            if (!signatureMatches(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
                return res.status(400).json({ success: false, error: 'Payment could not be verified' });
            }

            // Already fulfilled (retry, double click, the webhook got there first)? Answer from
            // the database alone, before spending two gateway calls. This also keeps a replayed
            // request cheap, and repairs a commission that failed the first time.
            const replay = await Checkout.findReplay({ paymentId: razorpay_payment_id, userId });

            let result;
            if (replay) {
                result = await PaymentController.settle({ result: replay, paymentId: razorpay_payment_id, userId });
            } else {
                const checked = await PaymentController.confirmWithGateway(razorpay_order_id, razorpay_payment_id);
                if (checked.error) return res.status(checked.status).json(checked.body);
                result = await PaymentController.settle({
                    result: await Checkout.fulfilPayment({ order: checked.order, paymentId: razorpay_payment_id, userId }),
                    paymentId: razorpay_payment_id, userId, order: checked.order,
                });
            }

            res.json({
                success: true,
                kind: result.kind,
                alreadyProcessed: result.alreadyProcessed,
                subscription: result.subscription,
            });

        } catch (error) {
            if (error instanceof Checkout.CheckoutError) {
                return res.status(error.status).json({ success: false, error: error.message });
            }
            console.error('Verify Payment Error:', error);
            res.status(500).json({ success: false, error: 'We could not complete your subscription. If you were charged, contact support with your payment id.' });
        }
    }

    /**
     * Webhook Handler
     */
    static async handleWebhook(req, res) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // With the secret unset, createHmac threw outside any try block; in an
        // async Express 4 handler that is an unhandled rejection, which ends
        // the Node process — one unauthenticated request took the API down.
        if (!secret) {
            console.error('Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
            return res.status(503).json({ status: 'unavailable' });
        }

        // Razorpay signs the exact bytes it sent, captured by the JSON parser
        // in app.js. Re-serialising the parsed body would not reproduce them,
        // so without the raw body the request is refused rather than guessed.
        if (!req.rawBody) {
            return res.status(400).json({ status: 'ignored' });
        }
        const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
        const received = String(req.headers['x-razorpay-signature'] || '');

        // Compare decoded bytes. Checking string length alone let a header with
        // a non-ASCII byte reach timingSafeEqual with unequal buffers, which
        // throws outside any try and left the request hanging.
        const valid =
            /^[0-9a-f]{64}$/i.test(received) &&
            crypto.timingSafeEqual(Buffer.from(received, 'hex'), expected);
        if (!valid) {
            console.error('Invalid Webhook Signature');
            return res.status(400).json({ status: 'ignored' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log('Received Webhook:', event);

        try {
            if (event === 'payment.captured') {
                // A buyer who closes the tab before /payments/verify runs is charged but would
                // never be activated. Fulfil from the webhook through the same idempotent path
                // as /payments/verify, so whichever arrives second is a no-op.
                const entity = payload && payload.payment && payload.payment.entity;
                if (entity && entity.id && entity.order_id) {
                    try {
                        const checked = await PaymentController.confirmWithGateway(entity.order_id, entity.id);
                        const notes = (checked.order && checked.order.notes) || {};
                        // Orders we did not create (events, other products) carry no plan notes.
                        if (!checked.error && notes.userId && notes.planId) {
                            await PaymentController.settle({
                                result: await Checkout.fulfilPayment({ order: checked.order, paymentId: entity.id, userId: notes.userId }),
                                paymentId: entity.id, userId: notes.userId, order: checked.order,
                            });
                        }
                    } catch (e) {
                        // A permanent refusal (e.g. the plan was deleted) must not make Razorpay
                        // retry forever; anything unexpected is rethrown so it does retry.
                        if (e instanceof Checkout.CheckoutError) console.error('payment.captured not fulfilled:', e.message);
                        else throw e;
                    }
                }
            } else if (event === 'subscription.charged') {
                // Handle recurring payment success
                const rzpSubscriptionId = payload.subscription.entity.id;
                const paymentId = payload.payment.entity.id;
                const amount = payload.payment.entity.amount / 100;

                const subscription = await db.Subscription.findOne({
                    where: { razorpay_subscription_id: rzpSubscriptionId }
                });

                // Razorpay retries webhooks, so a payment id is applied at most once.
                // The unique index on subscription_transactions.transaction_id makes
                // that hold across processes; the lookup covers databases without it.
                const seen = subscription && await db.SubscriptionTransaction.findOne({ where: { transaction_id: paymentId } });

                if (subscription && !seen) {
                    // Extend subscription
                    const addDays = subscription.billing_cycle === 'annually' ? 365 : 30;
                    const newEndDate = new Date(subscription.end_date);
                    newEndDate.setDate(newEndDate.getDate() + addDays);

                    let applied = true;
                    try {
                        await db.sequelize.transaction(async (transaction) => {
                            // Claim the payment id first: a duplicate delivery fails here.
                            await db.SubscriptionTransaction.create({
                                subscription_id: subscription.id,
                                user_id: subscription.user_id,
                                amount,
                                status: 'completed',
                                payment_method: 'razorpay',
                                transaction_id: paymentId,
                                transaction_type: 'charge',
                                date: new Date()
                            }, { transaction });

                            await subscription.update({
                                end_date: newEndDate,
                                last_payment_date: new Date(),
                                status: 'active'
                            }, { transaction });

                            await db.FundTransaction.create({
                                user_id: subscription.user_id,
                                amount: amount,
                                transaction_type: 'payment',
                                status: 'completed',
                                transaction_id: paymentId,
                                source: 'razorpay_recurring',
                                completed_at: new Date(),
                                description: `Type: Renewal`
                            }, { transaction });
                        });
                    } catch (e) {
                        if (e && e.name === 'SequelizeUniqueConstraintError') applied = false; // another delivery won
                        else throw e;
                    }

                    if (applied) {
                        await InvoiceService.generateInvoice(subscription.id, paymentId);

                        // Email
                        const user = await db.User.findByPk(subscription.user_id);
                        await EmailService.sendEmail(
                            user.email,
                            'Subscription Renewed',
                            EmailService.getAutopaySuccessTemplate(user.name, amount, newEndDate)
                        );
                    }
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
                // Settles the pending/approved RefundRequest and books the ledger if the API path never did.
                await SubscriptionService.applyRefundProcessed(payload.refund.entity);
            }

            res.json({ status: 'ok' });

        } catch (error) {
            console.error('Webhook Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

// Exposed so tests can stub the gateway; there is only ever one client.
PaymentController.razorpay = razorpay;

module.exports = PaymentController;
