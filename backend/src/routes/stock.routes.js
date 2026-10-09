const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const MarketController = require("../controllers/MarketController");

const { adminMiddleware, authMiddleware, optionalAuthenticate } = require("../middleware/auth");
const stockController = createCrudController(db.Stock, {
  defaultOrderBy: 'symbol',
  defaultOrder: 'ASC'
});

// Market Data Routes
router.get('/market-data', MarketController.getMarketData); // New endpoint for overall market view
router.get('/search-live', MarketController.search); // Live search using Yahoo Finance
router.get('/:symbol/price', MarketController.getStockPrice); // New endpoint for specific stock
router.get('/:symbol/candles', MarketController.getCandles); // Intraday OHLC for charts

// Custom Search (can optionally be moved to controller later)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const stocks = await db.Stock.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { symbol: { [db.Sequelize.Op.like]: `%${q}%` } },
          { name: { [db.Sequelize.Op.like]: `%${q}%` } }
        ]
      },
      limit: 20
    });
    res.json(stocks);
  } catch (error) {
    console.error('[stock.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const stocks = await db.Stock.findAll({
      order: [['volume', 'DESC']],
      limit: 10
    });
    res.json(stocks);
  } catch (error) {
    console.error('[stock.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
createCrudRoutes(router, stockController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });

module.exports = router;
