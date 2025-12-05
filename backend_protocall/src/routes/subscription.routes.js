const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Subscriptions CRUD
const subscriptionController = createCrudController(db.Subscription, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
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

// CRUD routes
createCrudRoutes(router, subscriptionController);

// Promo Codes sub-routes
const promoRouter = express.Router();
const promoController = createCrudController(db.PromoCode);

// Validate promo code
promoRouter.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await db.PromoCode.findOne({
      where: { 
        code: code.toUpperCase(),
        is_active: true,
        [db.Sequelize.Op.or]: [
          { expires_at: null },
          { expires_at: { [db.Sequelize.Op.gte]: new Date() } }
        ]
      }
    });
    
    if (!promo) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }
    
    if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      return res.status(400).json({ error: 'Promo code usage limit reached' });
    }
    
    res.json(promo);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
const planController = createCrudController(db.SubscriptionPlan);
createCrudRoutes(planRouter, planController);
router.use('/plans', planRouter);

module.exports = router;