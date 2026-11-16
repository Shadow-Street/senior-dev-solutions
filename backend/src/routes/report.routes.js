const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");
const Moderation = require("../services/ModerationService");
const { userLimiter } = require("../utils/failureLimiters");

// ---------------------------------------------------------------------------
// Content reports (Content Moderation, PPT slide 9). A member reports a chat
// message, an advisor post or a user; admins review them under
// /api/moderation/reports. Declared before the generic CRUD below, whose
// /:id routes would otherwise capture these paths.
// ---------------------------------------------------------------------------
const reportLimiter = userLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'You have sent a lot of reports. Please try again later.' });

function sendModerationError(res, error) {
  if (error instanceof Moderation.ModerationError && error.status) {
    const body = { error: error.message };
    if (error.code) body.code = error.code;
    return res.status(error.status).json(body);
  }
  console.error('[report.routes.js] content report failed:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

router.post('/content', authMiddleware, reportLimiter, Moderation.requireSchema, async (req, res) => {
  try {
    // Whitelist: reporter, author, severity and status are decided server-side.
    const { target_type: targetType, target_id: targetId, reason, note } = req.body || {};
    const result = await Moderation.createReport(req.user, { target_type: targetType, target_id: targetId, reason, note });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    sendModerationError(res, error);
  }
});

router.get('/content/mine', authMiddleware, Moderation.requireSchema, async (req, res) => {
  try {
    res.json(await Moderation.listMine(req.user));
  } catch (error) {
    sendModerationError(res, error);
  }
});

// Reports CRUD
const reportController = createCrudController(db.Report, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's reports
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    const reports = await db.Report.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(reports);
  } catch (error) {
    console.error('[report.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate report
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { type, params } = req.body;
    
    const report = await db.Report.create({
      user_id: req.user.id,
      type,
      params: JSON.stringify(params),
      status: 'pending',
      created_at: new Date()
    });
    
    // In a real app, trigger async report generation here
    // For now, mark as completed immediately
    await report.update({ 
      status: 'completed',
      completed_at: new Date()
    });
    
    res.status(201).json(report);
  } catch (error) {
    console.error('[report.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
createCrudRoutes(router, reportController, [authMiddleware]);

module.exports = router;
