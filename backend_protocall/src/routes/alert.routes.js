const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Alert Configurations
const configRouter = express.Router();
const configController = createCrudController(db.AlertConfiguration, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's alert configurations
configRouter.get('/my-alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await db.AlertConfiguration.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle alert
configRouter.put('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await db.AlertConfiguration.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    if (alert.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await alert.update({ is_active: !alert.is_active });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(configRouter, configController);
router.use('/configurations', configRouter);

module.exports = router;