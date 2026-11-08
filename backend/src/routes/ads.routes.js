const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { isAdsEnabled } = require("../utils/adsSetting");
const { effectiveRole, ADMIN_ROLES } = require("../utils/roles");

/**
 * Campaigns are management data and, once `active`, what /active serves to
 * every visitor. Only admins and vendors may touch the generic CRUD; a
 * vendor is confined to rows where advertiser_id is their own user id.
 */
const adminOrVendor = (req, res, next) => {
  const role = effectiveRole(req.user);
  if (ADMIN_ROLES.includes(role) || role === 'vendor') return next();
  return res.status(403).json({ error: 'Advertiser access required' });
};

/** Fields only an admin may write: approval/delivery state and metrics. */
const CAMPAIGN_STAFF_ONLY = ['status', 'priority', 'spent', 'impressions', 'clicks', 'conversions', 'ctr'];
const isAdminReq = (req) => ADMIN_ROLES.includes(effectiveRole(req.user));

// Ad Campaigns
const campaignRouter = express.Router();
const campaignController = createCrudController(db.AdCampaign, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  // Vendors see and edit only their own campaigns; admins see all.
  ownership: { field: 'advertiser_id', adminRoles: ADMIN_ROLES },
  protectedFields: CAMPAIGN_STAFF_ONLY,
  beforeCreate: async (data, req) => {
    // A vendor's campaign always starts pending; only an admin can activate it.
    if (!isAdminReq(req)) return { ...data, status: 'pending' };
    return { ...data, advertiser_id: data.advertiser_id || req.user.id };
  },
  beforeUpdate: async (data, record, req) => {
    // Editing the creative of an approved campaign sends it back for review,
    // otherwise approval could be bypassed by swapping the content afterwards.
    if (!isAdminReq(req) && record.status === 'active') return { ...data, status: 'pending' };
    return data;
  }
});

// Get active campaigns
campaignRouter.get('/active', async (req, res) => {
  try {
    // Global switch: serve no creatives at all while ads are disabled.
    if (!(await isAdsEnabled())) return res.json([]);
    const now = new Date();
    const campaigns = await db.AdCampaign.findAll({
      where: {
        status: 'active',
        start_date: { [db.Sequelize.Op.lte]: now },
        [db.Sequelize.Op.or]: [
          { end_date: null },
          { end_date: { [db.Sequelize.Op.gte]: now } }
        ]
      },
      order: [['priority', 'DESC']]
    });
    res.json(campaigns);
  } catch (error) {
    console.error('[ads.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's campaigns
campaignRouter.get('/my-campaigns', authMiddleware, async (req, res) => {
  try {
    const campaigns = await db.AdCampaign.findAll({
      where: { advertiser_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(campaigns);
  } catch (error) {
    console.error('[ads.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(campaignRouter, campaignController, [authMiddleware, adminOrVendor]);
router.use('/campaigns', campaignRouter);

// Ad Transactions
const transactionRouter = express.Router();
const transactionController = createCrudController(db.AdTransaction, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(transactionRouter, transactionController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/transactions', transactionRouter);

// Campaign Billing
const billingRouter = express.Router();
const billingController = createCrudController(db.CampaignBilling, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(billingRouter, billingController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/billing', billingRouter);

module.exports = router;
