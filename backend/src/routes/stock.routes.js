const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const MarketController = require("../controllers/MarketController");
const rateLimit = require("express-rate-limit");
const { FinDataService } = require("../services/FinDataService");
const { parseSearchQuery } = require("../utils/searchQuery");

const { adminMiddleware, authMiddleware, optionalAuthenticate } = require("../middleware/auth");
const stockController = createCrudController(db.Stock, {
  defaultOrderBy: 'symbol',
  defaultOrder: 'ASC'
});

// Public symbol/company search: anyone can call it, and it reaches SQL LIKE and
// external provider searches, so it is throttled per IP on top of the input
// validation in utils/searchQuery.js.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many searches. Please slow down." },
});

// Market Data Routes
router.get('/market-data', MarketController.getMarketData); // New endpoint for overall market view
router.get('/search-live', searchLimiter, MarketController.search); // Live search (Dhan master / providers)
router.get('/:symbol/price', MarketController.getStockPrice); // New endpoint for specific stock
router.get('/:symbol/candles', MarketController.getCandles); // Intraday OHLC for charts

// Custom Search (can optionally be moved to controller later)
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const q = parseSearchQuery(req.query.q);
    if (q === null) {
      return res.status(400).json({ error: 'q must be 1-50 characters: letters, digits, space, & . -' });
    }
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
    // Dhan snapshot (whole NSE universe) when active; the DB list otherwise.
    const dhanView = FinDataService.getDhanMarketView();
    if (dhanView) return res.json(dhanView.views.trending);
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
