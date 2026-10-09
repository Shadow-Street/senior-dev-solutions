const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");

/**
 * Advisor-owned rows are keyed by `advisor_id` — the Advisor row's id, which is
 * NOT the user's id. This resolves the caller to their own advisor record so
 * ownership can be enforced generically. Returns null for a non-advisor, which
 * the controller treats as "owns nothing".
 */
const resolveAdvisorId = async (req) => {
  if (!req.user?.id) return null;
  const advisor = await db.Advisor.findOne({
    where: { user_id: req.user.id },
    attributes: ['id'],
  });
  return advisor?.id ?? null;
};

const advisorOwned = { field: 'advisor_id', resolveOwnerId: resolveAdvisorId };

// Main Advisors - using User model with advisor role
router.get('/', async (req, res) => {
  try {
    const advisors = await db.Advisor.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(advisors);
  } catch (error) {
    console.error('[advisor.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advisor Recommendations
const recommendationRouter = express.Router();
const recommendationController = createCrudController(db.AdvisorRecommendation, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: { ...advisorOwned, publicRead: true }
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
    console.error('[advisor.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[advisor.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

recommendationRouter.get('/', optionalAuthenticate, recommendationController.list);
recommendationRouter.get('/:id', optionalAuthenticate, recommendationController.get);
recommendationRouter.post('/', authMiddleware, recommendationController.create);
recommendationRouter.put('/:id', authMiddleware, recommendationController.update);
recommendationRouter.delete('/:id', authMiddleware, recommendationController.delete);
router.use('/recommendations', recommendationRouter);

// Advisor Pledge Commissions
const commissionRouter = express.Router();
const commissionController = createCrudController(db.AdvisorPledgeCommission, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: advisorOwned
});

// Get advisor's commissions
commissionRouter.get('/my-commissions', authMiddleware, async (req, res) => {
  try {
    // advisor_id is the Advisor row id, not the user id — the previous lookup
    // compared against req.user.id and so always returned nothing.
    const advisorId = await resolveAdvisorId(req);
    if (!advisorId) return res.json([]);

    const commissions = await db.AdvisorPledgeCommission.findAll({
      where: { advisor_id: advisorId },
      order: [['created_at', 'DESC']]
    });
    res.json(commissions);
  } catch (error) {
    console.error('[advisor.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advisor Plans (Subscription Plans linked to advisor)
const planRouter = express.Router();
const planController = createCrudController(db.SubscriptionPlan, {
  defaultOrderBy: 'price',
  defaultOrder: 'ASC',
  ownership: { ...advisorOwned, publicRead: true }
});
// Override list to allow filtering by advisor_id (already supported by crudController generic filter)
// Reads are public (users compare plans before subscribing); writes are not.
planRouter.get('/', optionalAuthenticate, planController.list);
planRouter.get('/:id', optionalAuthenticate, planController.get);
planRouter.post('/', authMiddleware, planController.create);
planRouter.put('/:id', authMiddleware, planController.update);
planRouter.delete('/:id', authMiddleware, planController.delete);
router.use('/plans', planRouter);

// Advisor Posts
const postRouter = express.Router();
const postController = createCrudController(db.AdvisorPost, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: advisorOwned
});
createCrudRoutes(postRouter, postController, [authMiddleware]);
router.use('/posts', postRouter);

// ---------------------------------------------------------------------------
// Advisor Subscriptions (read-only view for the Advisor Dashboard)
//
// This previously mounted an unguarded CRUD controller over db.Subscription,
// which exposed every user's billing row to anonymous callers — a second door
// around the controls on /api/subscriptions. It is now a single purpose-built
// read endpoint: an advisor sees subscriptions to their OWN plans and nothing
// else, and staff see everything.
// ---------------------------------------------------------------------------
const subRouter = express.Router();

subRouter.get('/my-subscribers', authMiddleware, async (req, res) => {
  try {
    const STAFF = ['admin', 'super_admin', 'sub_admin'];
    const isStaff = STAFF.includes(req.user?.app_role || req.user?.role);

    let where = {};
    if (!isStaff) {
      const advisorId = await resolveAdvisorId(req);
      if (!advisorId) return res.json([]);

      // Only subscriptions attached to this advisor's own plans.
      const plans = await db.SubscriptionPlan.findAll({
        where: { advisor_id: advisorId },
        attributes: ['id'],
      });
      const planIds = plans.map((p) => p.id);
      if (planIds.length === 0) return res.json([]);
      where = { plan_id: planIds };
    }

    const subscriptions = await db.Subscription.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 100, 200),
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('Advisor subscribers lookup failed:', error.message);
    res.status(500).json({ error: 'Could not load subscribers' });
  }
});

/**
 * Secured CRUD, kept so existing callers keep working:
 *  - a user sees only their own subscription rows (AdvisorProfile checks
 *    whether the viewer is subscribed);
 *  - staff see everything (superadmin Advisor Management / Subscription Audit);
 *  - advisors use /my-subscribers above for their own plan subscribers.
 */
createCrudRoutes(
  subRouter,
  createCrudController(db.Subscription, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC',
    ownership: 'user_id',
  }),
  [authMiddleware]
);

router.use('/subscriptions', subRouter);

createCrudRoutes(commissionRouter, commissionController, [authMiddleware]);
router.use('/pledge-commissions', commissionRouter);

module.exports = router;
