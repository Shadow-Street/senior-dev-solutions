const express = require("express");
const router = express.Router();
const db = require("../models");
const SubscriptionService = require('../services/SubscriptionService');
const SubscriptionCheckoutService = require('../services/SubscriptionCheckoutService');
const PromoCodeController = require('../controllers/PromoCodeController');
const { effectiveRole } = require('../utils/roles');
const { failureLimiters } = require('../utils/failureLimiters');
const { Op } = require('sequelize');

// Failed promo attempts are the enumeration signal; see utils/failureLimiters.js.
const promoLimits = failureLimiters();
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");

// Subscriptions CRUD
const subscriptionController = createCrudController(db.Subscription, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: 'user_id',
  include: [
    // never serialise the password hash (or other credentials) into a subscription listing (SEC-12)
    { model: db.User, attributes: { exclude: ['password'] } },
    { model: db.SubscriptionPlan }
  ]
});

// The caller's current platform plan. Never empty for a signed-in user: with no
// paid plan in force they are on Free (created on first read for accounts that
// pre-date Free-by-default). Advisor subscriptions are not included.
router.get('/my-subscription', authMiddleware, async (req, res) => {
  try {
    res.json(await SubscriptionService.getCurrentSubscription(req.user.id));
  } catch (error) {
    console.error('[subscription.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plan details, dates and last payment for the Profile billing view. Own data only.
router.get('/my-billing', authMiddleware, async (req, res) => {
  try {
    res.json(await SubscriptionService.getBillingSummary(req.user.id));
  } catch (error) {
    console.error('[subscription.routes.js] my-billing failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Autopay Management
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
    console.error('[subscription.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscription Management
// Plan changes go through the verified checkout only (POST /payments/create-order
// then /payments/verify). This route activated a paid plan with no payment at
// all — any user could POST a VIP plan id and get VIP — so it is retired.
router.post('/upgrade', authMiddleware, (req, res) => {
  res.status(410).json({
    error: 'Upgrades are made through checkout. Choose a plan on the Subscription page to pay and activate it.',
  });
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
    console.error('[subscription.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const history = await SubscriptionService.getUserSubscriptionHistory(req.user.id);
    res.json(history);
  } catch (error) {
    console.error('[subscription.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoices
router.get('/my-invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await InvoiceService.getUserInvoices(req.user.id);
    res.json(invoices);
  } catch (error) {
    console.error('[subscription.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoice/:id/download', authMiddleware, async (req, res) => {
  try {
    // Ownership is enforced inside the service, before any file work happens.
    const { filepath, invoice } = await InvoiceService.downloadInvoice(req.params.id, req.user);
    res.download(filepath, `${invoice.invoice_number}.pdf`);
  } catch (error) {
    // Not-found and not-yours are deliberately indistinguishable.
    if (/not found/i.test(error.message)) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.error('Invoice download failed:', error.message);
    res.status(500).json({ error: 'Could not download invoice' });
  }
});

// Promo Codes sub-routes
const promoRouter = express.Router();

// Validate a promo code for a plan + billing cycle. The server prices it from
// the plan row, so the response is exactly what checkout will charge.
// Body: { code, planId, cycle }  (any amount sent by the client is ignored)
promoRouter.post('/validate', promoLimits.ip, authMiddleware, promoLimits.user, async (req, res) => {
  try {
    const { code, planId, cycle } = req.body || {};
    const quote = await SubscriptionCheckoutService.quoteOrder({
      userId: req.user.id, planId, cycle, couponCode: code || '',
    });
    if (!quote.coupon) {
      return res.status(400).json({ error: 'Enter a promo code', reason: 'missing' });
    }
    res.json(SubscriptionCheckoutService.describeQuote(quote));
  } catch (error) {
    if (error instanceof SubscriptionCheckoutService.CheckoutError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof SubscriptionCheckoutService.CouponError) {
      return res.status(400).json({ error: error.message, reason: error.reason });
    }
    console.error('[subscription.routes.js] promo validation failed:', error.message);
    res.status(500).json({ error: 'Could not check the promo code. Please try again.' });
  }
});

// Management is for admins only (whitelisted + validated in the controller).
const adminOnly = [authMiddleware, adminMiddleware];
promoRouter.get('/', ...adminOnly, PromoCodeController.list);
promoRouter.get('/:id', ...adminOnly, PromoCodeController.get);
promoRouter.post('/', ...adminOnly, PromoCodeController.create);
promoRouter.put('/:id', ...adminOnly, PromoCodeController.update);
promoRouter.delete('/:id', ...adminOnly, PromoCodeController.remove);
router.use('/promo-codes', promoRouter);

// Transactions sub-routes
const transactionRouter = express.Router();
const transactionController = createCrudController(db.SubscriptionTransaction, { ownership: 'user_id' });
// A customer can read their own history; rows are written by verified payments only.
createCrudRoutes(transactionRouter, transactionController, { read: [authMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/transactions', transactionRouter);

// Plans sub-routes
const planRouter = express.Router();
const STAFF_ROLES = ['admin', 'super_admin', 'sub_admin'];
const planController = createCrudController(db.SubscriptionPlan, {
  // The public catalogue is the active platform plans only. Advisor plans have
  // their own listing (/advisors/plans) and inactive plans cannot be bought;
  // staff still see everything so the plan editor can manage it.
  customFilters: (query, req) => {
    const where = {};
    if (query.name) where.name = String(query.name);
    if (!STAFF_ROLES.includes(effectiveRole(req.user))) {
      // NULL counts as active, the same rule checkout applies (quoteOrder).
      where[Op.or] = [{ is_active: { [Op.ne]: false } }, { is_active: null }];
      where.advisor_id = null;
      where.finfluencer_id = null;
    } else {
      if (query.is_active === 'true' || query.is_active === 'false') where.is_active = query.is_active === 'true';
      if (query.advisor_id) where.advisor_id = String(query.advisor_id);
    }
    return where;
  },
  beforeCreate: async (data) => {
    if (data.price_monthly !== undefined) data.price = data.price_monthly;
    return data;
  },
  beforeUpdate: async (data) => {
    if (data.price_monthly !== undefined) data.price = data.price_monthly;
    return data;
  }
});
createCrudRoutes(planRouter, planController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });
router.use('/plans', planRouter);

// CRUD routes - MOVED TO BOTTOM to avoid shadowing sub-routes
// Customers read their own rows; only staff write them. Plans are activated by
// verified payments (POST /payments/verify), never by a client-created row.
createCrudRoutes(router, subscriptionController, { read: [authMiddleware], write: [authMiddleware, adminMiddleware] });

module.exports = router;
