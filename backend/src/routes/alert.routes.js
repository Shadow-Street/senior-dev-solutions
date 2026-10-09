const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Alert Configurations
const configRouter = express.Router();
const configController = createCrudController(db.AlertConfiguration, {
  ownership: 'user_id',
});
createCrudRoutes(configRouter, configController, [authMiddleware]);
router.use('/configurations', configRouter);

// Alert Settings CRUD
const settingsRouter = express.Router();
const settingsController = createCrudController(db.AlertSetting, {
  ownership: 'user_id',
});

settingsRouter.get('/my-alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await db.AlertSetting.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(alerts);
  } catch (error) {
    console.error('[alert.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

settingsRouter.get('/stock/:symbol', authMiddleware, async (req, res) => {
  try {
    const alerts = await db.AlertSetting.findAll({
      where: { user_id: req.user.id, stock_symbol: req.params.symbol }
    });
    res.json(alerts);
  } catch (error) {
    console.error('[alert.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(settingsRouter, settingsController, [authMiddleware]);
router.use('/settings', settingsRouter);

// Alert log
const logRouter = express.Router();
createCrudRoutes(logRouter, createCrudController(db.AlertLog, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), [authMiddleware, adminMiddleware]);
router.use('/logs', logRouter);

module.exports = router;
