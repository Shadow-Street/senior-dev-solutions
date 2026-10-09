const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Ad Campaigns
const campaignRouter = express.Router();
const campaignController = createCrudController(db.AdCampaign, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get active campaigns
campaignRouter.get('/active', async (req, res) => {
  try {
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

createCrudRoutes(campaignRouter, campaignController, [authMiddleware]);
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
