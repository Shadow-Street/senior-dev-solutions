const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Moderation Logs
const logRouter = express.Router();
const logController = createCrudController(db.ModerationLog, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(logRouter, logController);
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
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(inquiryRouter, inquiryController);
router.use('/inquiries', inquiryRouter);

// Feedback
const feedbackRouter = express.Router();
const feedbackController = createCrudController(db.Feedback, {
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
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(feedbackRouter, feedbackController);
router.use('/feedback', feedbackRouter);

module.exports = router;