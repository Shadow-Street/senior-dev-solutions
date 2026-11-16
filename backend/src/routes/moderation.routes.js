const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const Moderation = require("../services/ModerationService");
const { SanctionError } = require("../services/UserSanctionService");
const { userLimiter } = require("../utils/failureLimiters");

/** ModerationError / SanctionError carry their own status; anything else is a generic 500. */
function sendError(res, error, where) {
  if ((error instanceof Moderation.ModerationError || error instanceof SanctionError) && error.status) {
    const body = { error: error.message };
    if (error.code) body.code = error.code;
    return res.status(error.status).json(body);
  }
  console.error(`[moderation.routes.js] ${where} failed:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

const requestContext = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

// ---------------------------------------------------------------------------
// Content Moderation queue (admin / super_admin only; sub_admin is not granted
// moderation until BE-7 decides sub_admin privileges).
// ---------------------------------------------------------------------------
const adminOnly = [authMiddleware, adminMiddleware, Moderation.requireSchema];
const decisionLimiter = userLimiter({ windowMs: 60 * 1000, max: 60, message: 'Too many moderation actions. Please slow down.' });

router.get('/reports', adminOnly, async (req, res) => {
  try {
    res.json(await Moderation.listReports(req.query));
  } catch (error) {
    sendError(res, error, 'list reports');
  }
});

// Before /reports/:id so "bulk" is not read as an id.
router.post('/reports/bulk', adminOnly, decisionLimiter, async (req, res) => {
  try {
    const { ids, action, reason } = req.body || {};
    const result = await Moderation.bulkDecide(ids, action, req.user, {
      reason,
      context: requestContext(req),
      wsService: req.app.get('wsService'),
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 'bulk decision');
  }
});

router.get('/reports/:id', adminOnly, async (req, res) => {
  try {
    res.json(await Moderation.getReport(req.params.id));
  } catch (error) {
    sendError(res, error, 'get report');
  }
});

router.post('/reports/:id/decision', adminOnly, decisionLimiter, async (req, res) => {
  try {
    // Whitelist: nothing else from the body reaches the service.
    const { action, reason, days, also_remove: alsoRemove } = req.body || {};
    const result = await Moderation.decide(req.params.id, action, req.user, {
      reason,
      days,
      also_remove: alsoRemove === true,
      context: requestContext(req),
      wsService: req.app.get('wsService'),
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 'decision');
  }
});

router.get('/history', adminOnly, async (req, res) => {
  try {
    res.json(await Moderation.listHistory(req.query));
  } catch (error) {
    sendError(res, error, 'history');
  }
});

// The chat filter blocked one of the caller's own messages (was a ModerationLog
// CRUD create, which only admins may call, so members' flags were never saved).
const flagLimiter = userLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many requests. Please try again later.' });
router.post('/flags', authMiddleware, flagLimiter, Moderation.requireSchema, async (req, res) => {
  try {
    const { chat_room_id: chatRoomId, content, violation_type: violationType, severity } = req.body || {};
    const flag = await Moderation.createAutoFlag(req.user, {
      chat_room_id: chatRoomId, content, violation_type: violationType, severity,
    });
    res.status(201).json(flag);
  } catch (error) {
    sendError(res, error, 'auto flag');
  }
});

// Moderation Logs
const logRouter = express.Router();
const logController = createCrudController(db.ModerationLog, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(logRouter, logController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/logs', logRouter);

// Contact Inquiries
const inquiryRouter = express.Router();
const inquiryController = createCrudController(db.ContactInquiry, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Submit inquiry
inquiryRouter.post('/submit', async (req, res) => {
  try {
    const inquiry = await db.ContactInquiry.create({
      ...req.body,
      status: 'pending',
      created_at: new Date()
    });
    res.status(201).json(inquiry);
  } catch (error) {
    console.error('[moderation.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(inquiryRouter, inquiryController, { read: [authMiddleware, adminMiddleware], create: [], write: [authMiddleware, adminMiddleware] });
router.use('/inquiries', inquiryRouter);

// Feedback
const feedbackRouter = express.Router();
const feedbackController = createCrudController(db.Feedback, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Submit feedback
feedbackRouter.post('/submit', authMiddleware, async (req, res) => {
  try {
    const feedback = await db.Feedback.create({
      ...req.body,
      user_id: req.user.id,
      status: 'pending',
      created_at: new Date()
    });
    res.status(201).json(feedback);
  } catch (error) {
    console.error('[moderation.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(feedbackRouter, feedbackController, [authMiddleware]);
router.use('/feedback', feedbackRouter);

module.exports = router;
