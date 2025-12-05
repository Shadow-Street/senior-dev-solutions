const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Reviews CRUD
const reviewController = createCrudController(db.Review, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get reviews by entity
router.get('/entity/:type/:entityId', async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const reviews = await db.Review.findAll({
      where: { 
        entity_type: type,
        entity_id: entityId,
        status: 'approved'
      },
      order: [['created_at', 'DESC']],
      include: [{ model: db.User, attributes: ['id', 'full_name', 'avatar_url'] }]
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get average rating
router.get('/rating/:type/:entityId', async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const result = await db.Review.findOne({
      where: { 
        entity_type: type,
        entity_id: entityId,
        status: 'approved'
      },
      attributes: [
        [db.Sequelize.fn('AVG', db.Sequelize.col('rating')), 'average'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ]
    });
    res.json({
      average: parseFloat(result?.dataValues?.average || 0).toFixed(1),
      count: parseInt(result?.dataValues?.count || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit review
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { entity_type, entity_id, rating, title, content } = req.body;
    
    // Check if user already reviewed
    const existing = await db.Review.findOne({
      where: { 
        user_id: req.user.id,
        entity_type,
        entity_id
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this item' });
    }
    
    const review = await db.Review.create({
      user_id: req.user.id,
      entity_type,
      entity_id,
      rating,
      title,
      content,
      status: 'pending',
      created_at: new Date()
    });
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, reviewController);

module.exports = router;