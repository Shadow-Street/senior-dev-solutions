const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Audit Logs
const logRouter = express.Router();
const logController = createCrudController(db.AuditLog, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get logs by entity
logRouter.get('/entity/:type/:entityId', authMiddleware, async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const logs = await db.AuditLog.findAll({
      where: { 
        entity_type: type,
        entity_id: entityId
      },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs by user
logRouter.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await db.AuditLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create audit log entry
logRouter.post('/log', authMiddleware, async (req, res) => {
  try {
    const { action, entity_type, entity_id, old_data, new_data, description } = req.body;
    
    const log = await db.AuditLog.create({
      user_id: req.user.id,
      action,
      entity_type,
      entity_id,
      old_data: old_data ? JSON.stringify(old_data) : null,
      new_data: new_data ? JSON.stringify(new_data) : null,
      description,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      created_at: new Date()
    });
    
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(logRouter, logController);
router.use('/logs', logRouter);

module.exports = router;