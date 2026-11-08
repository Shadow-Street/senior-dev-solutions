const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");

// Finfluencers CRUD
const finfluencerController = createCrudController(db.FinInfluencer, {
  ownership: { field: 'user_id', publicRead: true },
  protectedFields: ['status', 'rating', 'follower_count'],
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// /top and /featured (signed-out Home page): approved profiles only, and only
// the fields a visitor sees; the owning user id, moderation status and social
// handles stay out. The generic CRUD list/get below are still unfiltered
// public reads (tracker SEC-44).
const PUBLIC_ATTRIBUTES = ['id', 'name', 'avatar_url', 'bio', 'follower_count', 'specialization', 'rating', 'is_featured', 'total_subscribers'];

// Get featured finfluencers
router.get('/featured', async (req, res) => {
  try {
    const finfluencers = await db.FinInfluencer.findAll({
      where: { is_featured: true, status: 'approved' },
      attributes: PUBLIC_ATTRIBUTES,
      order: [['follower_count', 'DESC']],
      limit: 10
    });
    res.json(finfluencers);
  } catch (error) {
    console.error('[finfluencer.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top finfluencers
router.get('/top', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const finfluencers = await db.FinInfluencer.findAll({
      where: { status: 'approved' },
      attributes: PUBLIC_ATTRIBUTES,
      order: [['follower_count', 'DESC']],
      limit
    });
    res.json(finfluencers);
  } catch (error) {
    console.error('[finfluencer.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[finfluencer.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
createCrudRoutes(router, finfluencerController, { read: [optionalAuthenticate], write: [authMiddleware] });

module.exports = router;
