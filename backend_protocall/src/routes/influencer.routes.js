const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Influencer Posts
const postRouter = express.Router();
const postController = createCrudController(db.InfluencerPost, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get posts by influencer
postRouter.get('/by-influencer/:influencerId', async (req, res) => {
  try {
    const { influencerId } = req.params;
    const posts = await db.InfluencerPost.findAll({
      where: { influencer_id: influencerId },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get feed posts
postRouter.get('/feed', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const posts = await db.InfluencerPost.findAll({
      where: { status: 'published' },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: db.FinInfluencer, attributes: ['id', 'name', 'avatar_url'] }]
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(postRouter, postController);
router.use('/posts', postRouter);

module.exports = router;