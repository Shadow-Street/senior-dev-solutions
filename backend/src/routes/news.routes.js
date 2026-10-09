const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");

// News CRUD
const NewsController = require("../controllers/NewsController");

// Get latest news
router.get('/latest', NewsController.getLatestNews);

// Get news by stock
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const news = await db.News.findAll({
      where: {
        status: 'published',
        [db.Sequelize.Op.or]: [
          { stock_symbols: { [db.Sequelize.Op.like]: `%${symbol}%` } },
          { tags: { [db.Sequelize.Op.like]: `%${symbol}%` } }
        ]
      },
      order: [['published_at', 'DESC']],
      limit: 20
    });
    res.json(news);
  } catch (error) {
    console.error('[news.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
