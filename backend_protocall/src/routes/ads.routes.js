const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(campaignRouter, campaignController);
router.use('/campaigns', campaignRouter);

// Ad Transactions
const transactionRouter = express.Router();
const transactionController = createCrudController(db.AdTransaction, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(transactionRouter, transactionController);
router.use('/transactions', transactionRouter);

// Campaign Billing
const billingRouter = express.Router();
const billingController = createCrudController(db.CampaignBilling, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(billingRouter, billingController);
router.use('/billing', billingRouter);

module.exports = router;