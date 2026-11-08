const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");

// News CRUD
const NewsController = require("../controllers/NewsController");

// Public read endpoints (the News page and dashboard card are public-facing);
// throttled per IP because every cache miss spends Marketaux free-tier quota.
const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// Indian market news (Marketaux). { configured:false } when no API key is set.
router.get('/feed', newsLimiter, optionalAuthenticate, NewsController.getFeed);

// Get latest news (flat array; Marketaux when configured, legacy fallback otherwise)
router.get('/latest', newsLimiter, optionalAuthenticate, NewsController.getLatestNews);

// Get news by stock
router.get('/stock/:symbol', newsLimiter, optionalAuthenticate, NewsController.getStockNews);

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.News.findAll({
      attributes: [
        [db.Sequelize.fn('DISTINCT', db.Sequelize.col('category')), 'category']
      ],
      where: { status: 'published' }
    });
    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (error) {
    console.error('[news.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
createCrudRoutes(router, NewsController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });

module.exports = router;
