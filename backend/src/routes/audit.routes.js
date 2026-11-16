const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

/*
 * Audit logs: staff-only to read, append-only, and always attributed to the
 * caller (SEC-28).
 *
 * Before: any signed-in user could read anyone's entries by user or entity id
 * (entries carry admin IP addresses, payment and refund ids) and write
 * arbitrary entries through POST /log; admins could edit or delete entries
 * through the generic CRUD, so the trail proved nothing.
 */
const logRouter = express.Router();
const logController = createCrudController(db.AuditLog, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
const staff = [authMiddleware, adminMiddleware];

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v).slice(0, 20000));

/** Server-attributed entry: the actor, address and agent come from the request. */
async function appendEntry(req, res) {
  try {
    // `details` is what src/components/utils/auditLogger.jsx sends.
    const { action, entity_type, entity_id, old_data, new_data, description, details } = req.body || {};
    if (typeof action !== 'string' || !action.trim()) return res.status(400).json({ error: 'action is required' });
    const log = await db.AuditLog.create({
      user_id: req.user.id,
      action: action.trim().slice(0, 100),
      entity_type: str(entity_type, 100),
      entity_id: typeof entity_id === 'string' && /^[0-9a-f-]{36}$/i.test(entity_id) ? entity_id : null,
      old_data: json(old_data),
      new_data: json(new_data),
      description: str(description, 2000) || str(details, 2000),
      ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
      created_at: new Date()
    });
    return res.status(201).json(log);
  } catch (error) {
    console.error('[audit.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const readOnly = (_req, res) => res.status(405).json({ error: 'Audit entries cannot be changed or deleted.' });

// Get logs by entity
logRouter.get('/entity/:type/:entityId', ...staff, async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const logs = await db.AuditLog.findAll({
      where: {
        entity_type: String(type).slice(0, 100),
        entity_id: String(entityId).slice(0, 36)
      },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('[audit.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs by user (the actor)
logRouter.get('/user/:userId', ...staff, async (req, res) => {
  try {
    const logs = await db.AuditLog.findAll({
      where: { user_id: String(req.params.userId).slice(0, 36) },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('[audit.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create audit log entry (staff tools that log their own actions)
logRouter.post('/log', ...staff, appendEntry);

// Append-only: no bulk writes, no edits, no deletes, for anyone.
logRouter.post('/bulk', readOnly);
logRouter.put('/bulk', readOnly);
logRouter.delete('/bulk', readOnly);
logRouter.get('/', ...staff, logController.list);
logRouter.get('/:id', ...staff, logController.get);
logRouter.post('/', ...staff, appendEntry);
logRouter.put('/:id', readOnly);
logRouter.delete('/:id', readOnly);

router.use('/logs', logRouter);

module.exports = router;
