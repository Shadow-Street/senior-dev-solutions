const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// News CRUD
const newsController = createCrudController(db.News, {
  defaultOrderBy: 'published_at',
  defaultOrder: 'DESC'
});

// Get latest news
router.get('/latest', async (req, res) => {
  try {
    const { limit = 20, category } = req.query;
    const where = { status: 'published' };
    
    if (category) {
      where.category = category;
    }
    
    const news = await db.News.findAll({
      where,
      order: [['published_at', 'DESC']],
      limit: parseInt(limit)
    });
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, newsController);

module.exports = router;