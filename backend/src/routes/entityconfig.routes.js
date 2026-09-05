const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Entity Configs CRUD
const configController = createCrudController(db.EntityConfig, {
  defaultOrderBy: 'entity_type',
  defaultOrder: 'ASC'
});

// Get config by entity type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const config = await db.EntityConfig.findOne({
      where: { entity_type: type }
    });
    res.json(config || { entity_type: type, config: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert config
router.put('/type/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { config } = req.body;
    
    const [entityConfig] = await db.EntityConfig.upsert({
      entity_type: type,
      config: JSON.stringify(config),
      updated_by: req.user.id,
      updated_at: new Date()
    });
    
    res.json(entityConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, configController);

module.exports = router;