const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

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
