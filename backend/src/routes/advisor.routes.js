const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Main Advisors - using User model with advisor role
router.get('/', async (req, res) => {
  try {
    const advisors = await db.Advisor.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(advisors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advisor Recommendations
const recommendationRouter = express.Router();
const recommendationController = createCrudController(db.AdvisorRecommendation, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get latest recommendations
recommendationRouter.get('/latest', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const recommendations = await db.AdvisorRecommendation.findAll({
      where: { status: 'active' },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      include: [{ model: db.Advisor, attributes: ['id', 'name', 'avatar_url'] }]
    });
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommendations by stock
recommendationRouter.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const recommendations = await db.AdvisorRecommendation.findAll({
      where: { stock_symbol: symbol.toUpperCase() },
      order: [['created_at', 'DESC']],
      limit: 20
    });
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(recommendationRouter, recommendationController);
router.use('/recommendations', recommendationRouter);

// Advisor Pledge Commissions
const commissionRouter = express.Router();
const commissionController = createCrudController(db.AdvisorPledgeCommission, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get advisor's commissions
commissionRouter.get('/my-commissions', authMiddleware, async (req, res) => {
  try {
    const commissions = await db.AdvisorPledgeCommission.findAll({
      where: { advisor_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advisor Plans (Subscription Plans linked to advisor)
const planRouter = express.Router();
const planController = createCrudController(db.SubscriptionPlan, {
  defaultOrderBy: 'price',
  defaultOrder: 'ASC'
});
// Override list to allow filtering by advisor_id (already supported by crudController generic filter)
createCrudRoutes(planRouter, planController);
router.use('/plans', planRouter);

// Advisor Posts
const postRouter = express.Router();
const postController = createCrudController(db.AdvisorPost, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(postRouter, postController);
router.use('/posts', postRouter);

// Advisor Subscriptions (View Only for Advisor Dashboard)
const subRouter = express.Router();
const subController = createCrudController(db.Subscription, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(subRouter, subController);
router.use('/subscriptions', subRouter);

createCrudRoutes(commissionRouter, commissionController);
router.use('/pledge-commissions', commissionRouter);

module.exports = router;