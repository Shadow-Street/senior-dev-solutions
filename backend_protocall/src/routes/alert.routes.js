const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Alert Configurations
const configRouter = express.Router();
const configController = createCrudController(db.AlertConfiguration);
createCrudRoutes(configRouter, configController);
router.use('/configurations', configRouter);

// Alert Settings CRUD
const settingsRouter = express.Router();
const settingsController = createCrudController(db.AlertSetting);

settingsRouter.get('/my-alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await db.AlertSetting.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

settingsRouter.get('/stock/:symbol', authMiddleware, async (req, res) => {
  try {
    const alerts = await db.AlertSetting.findAll({
      where: { user_id: req.user.id, stock_symbol: req.params.symbol }
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(settingsRouter, settingsController);
router.use('/settings', settingsRouter);

module.exports = router;