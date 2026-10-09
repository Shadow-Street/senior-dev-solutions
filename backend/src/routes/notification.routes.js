const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Notifications CRUD
const notificationController = createCrudController(db.Notification, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: 'user_id'
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
    console.error('[notification.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[notification.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[notification.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notification Settings sub-routes
const settingsRouter = express.Router();
const settingsController = createCrudController(db.NotificationSetting, { ownership: 'user_id' });

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
    console.error('[notification.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(settingsRouter, settingsController, [authMiddleware]);
router.use('/settings', settingsRouter);

// CRUD LAST — '/:id' must not shadow '/settings' or the named routes above.
createCrudRoutes(router, notificationController, [authMiddleware]);

module.exports = router;
