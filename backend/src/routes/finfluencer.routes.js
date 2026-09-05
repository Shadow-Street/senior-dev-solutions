const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Finfluencers CRUD
const finfluencerController = createCrudController(db.FinInfluencer, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get featured finfluencers
router.get('/featured', async (req, res) => {
  try {
    const finfluencers = await db.FinInfluencer.findAll({
      where: { is_featured: true, status: 'approved' },
      order: [['follower_count', 'DESC']],
      limit: 10
    });
    res.json(finfluencers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top finfluencers
router.get('/top', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const finfluencers = await db.FinInfluencer.findAll({
      where: { status: 'approved' },
      order: [['follower_count', 'DESC']],
      limit: parseInt(limit)
    });
    res.json(finfluencers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow finfluencer
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Create subscription record
    const subscription = await db.Subscription.create({
      user_id: req.user.id,
      finfluencer_id: id,
      status: 'active',
      type: 'follow'
    });
    
    // Increment follower count
    await db.FinInfluencer.increment('follower_count', { where: { id } });
    
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, finfluencerController);

module.exports = router;