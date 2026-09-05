const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Subscriptions CRUD
const subscriptionController = createCrudController(db.Subscription, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  include: [
    { model: db.User },
    { model: db.SubscriptionPlan }
  ]
});

// Get user's active subscription
router.get('/my-subscription', authMiddleware, async (req, res) => {
  try {
    const subscription = await db.Subscription.findOne({
      where: {
        user_id: req.user.id,
        status: 'active'
      },
      include: [{ model: db.SubscriptionPlan }]
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Autopay Management
const SubscriptionService = require('../services/SubscriptionService');
const InvoiceService = require('../services/InvoiceService');
const EmailService = require('../services/EmailService');

router.post('/autopay/enable', authMiddleware, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const subscription = await SubscriptionService.enableAutopay(req.user.id, paymentMethodId);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/autopay/disable', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await SubscriptionService.disableAutopay(req.user.id, reason);

    // Send cancellation email
    const user = await db.User.findByPk(req.user.id);
    await EmailService.sendEmail(
      user.email,
      'Subscription Cancellation Confirmed',
      EmailService.getSubscriptionCancelledTemplate(user.name, subscription.end_date, reason)
    );

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/autopay/status', authMiddleware, async (req, res) => {
  try {
    const subscription = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    if (!subscription) {
      return res.json({ autopayEnabled: false });
    }
    res.json({
      autopayEnabled: subscription.auto_renew,
      nextBillingDate: subscription.next_billing_date,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscription Management
router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { planId, redirectUrl } = req.body;
    const result = await SubscriptionService.upgradeWithProration(req.user.id, planId, redirectUrl);

    // Send upgrade confirmation email
    const user = await db.User.findByPk(req.user.id);
    const proRatioData = await SubscriptionService.calculateProRatedAmount(req.user.id, planId);
    await EmailService.sendEmail(
      user.email,
      'Subscription Upgraded!',
      EmailService.getUpgradeConfirmationTemplate(
        user.name,
        proRatioData.currentPlan,
        proRatioData.newPlan,
        result.proRatedAmount
      )
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { reason, immediate } = req.body;

    // Find active subscription
    const subscription = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Use detailed refund/cancellation logic
    // If immediate=true or default behavior is to try refund
    const result = await SubscriptionService.initiateRefund(subscription.id, reason || 'User requested cancellation');

    // If it was just autopay disabled (refundAmount <= 0 condition in service), result is the subscription object
    // If it was a refund, result is { success: true, refundId... }

    res.json({ success: true, ...result });

  } catch (error) {
    console.error("Cancellation Error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/reactivate', authMiddleware, async (req, res) => {
  try {
    const subscription = await SubscriptionService.reactivateSubscription(req.user.id);
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Analytics
router.get('/my-analytics', authMiddleware, async (req, res) => {
  try {
    const stats = await SubscriptionService.getSubscriptionStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const history = await SubscriptionService.getUserSubscriptionHistory(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invoices
router.get('/my-invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await InvoiceService.getUserInvoices(req.user.id);
    console.log("/my-invoices", invoices);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoice/:id/download', authMiddleware, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { filepath, invoice } = await InvoiceService.downloadInvoice(req.params.id);

    // Verify user owns this invoice
    if (invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.download(filepath, `${invoice.invoice_number}.pdf`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promo Codes sub-routes
const promoRouter = express.Router();
const promoController = createCrudController(db.PromoCode);

const CouponService = require('../services/CouponService');

// Validate promo code
promoRouter.post('/validate', async (req, res) => {
  try {
    const { code, cartAmount } = req.body;
    const result = await CouponService.validateCoupon(code, cartAmount);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

createCrudRoutes(promoRouter, promoController);
router.use('/promo-codes', promoRouter);

// Transactions sub-routes
const transactionRouter = express.Router();
const transactionController = createCrudController(db.SubscriptionTransaction);
createCrudRoutes(transactionRouter, transactionController);
router.use('/transactions', transactionRouter);

// Plans sub-routes
const planRouter = express.Router();
const planController = createCrudController(db.SubscriptionPlan, {
  beforeCreate: async (data) => {
    if (data.price_monthly !== undefined) data.price = data.price_monthly;
    return data;
  },
  beforeUpdate: async (data) => {
    if (data.price_monthly !== undefined) data.price = data.price_monthly;
    return data;
  }
});
createCrudRoutes(planRouter, planController);
router.use('/plans', planRouter);

// CRUD routes - MOVED TO BOTTOM to avoid shadowing sub-routes
createCrudRoutes(router, subscriptionController);

module.exports = router;