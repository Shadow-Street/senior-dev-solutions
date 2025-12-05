const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Notifications CRUD
const notificationController = createCrudController(db.Notification, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's notifications
router.get('/my-notifications', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, unread_only } = req.query;
    const where = { user_id: req.user.id };
    
    if (unread_only === 'true') {
      where.is_read = false;
    }
    
    const notifications = await db.Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await db.Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await db.Notification.count({
      where: { user_id: req.user.id, is_read: false }
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, notificationController);

// Notification Settings sub-routes
const settingsRouter = express.Router();
const settingsController = createCrudController(db.NotificationSetting);

// Get user's notification settings
settingsRouter.get('/my-settings', authMiddleware, async (req, res) => {
  try {
    let settings = await db.NotificationSetting.findOne({
      where: { user_id: req.user.id }
    });
    
    if (!settings) {
      settings = await db.NotificationSetting.create({
        user_id: req.user.id,
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(settingsRouter, settingsController);
router.use('/settings', settingsRouter);

module.exports = router;