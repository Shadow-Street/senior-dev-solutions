const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Analytics Events
const eventRouter = express.Router();
const eventController = createCrudController(db.AnalyticsEvent, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Track event
eventRouter.post('/track', async (req, res) => {
  try {
    const { event_type, event_data, user_id, session_id } = req.body;
    
    const event = await db.AnalyticsEvent.create({
      event_type,
      event_data: JSON.stringify(event_data),
      user_id,
      session_id,
      created_at: new Date()
    });
    
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event counts
eventRouter.get('/counts', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date, event_type } = req.query;
    const where = {};
    
    if (start_date && end_date) {
      where.created_at = {
        [db.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    
    if (event_type) {
      where.event_type = event_type;
    }
    
    const counts = await db.AnalyticsEvent.findAll({
      where,
      attributes: [
        'event_type',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['event_type'],
      order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']]
    });
    
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(eventRouter, eventController);
router.use('/events', eventRouter);

module.exports = router;