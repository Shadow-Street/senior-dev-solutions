const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Platform Settings
const settingsRouter = express.Router();
const settingsController = createCrudController(db.PlatformSetting, {
  defaultOrderBy: 'key',
  defaultOrder: 'ASC'
});

// Get setting by key
settingsRouter.get('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await db.PlatformSetting.findOne({
      where: { key }
    });
    res.json(setting || { key, value: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk get settings
settingsRouter.post('/bulk-get', async (req, res) => {
  try {
    const { keys } = req.body;
    const settings = await db.PlatformSetting.findAll({
      where: { key: { [db.Sequelize.Op.in]: keys } }
    });
    
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert setting
settingsRouter.put('/key/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const [setting] = await db.PlatformSetting.upsert({
      key,
      value,
      updated_by: req.user.id,
      updated_at: new Date()
    });
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(settingsRouter, settingsController);
router.use('/settings', settingsRouter);

module.exports = router;