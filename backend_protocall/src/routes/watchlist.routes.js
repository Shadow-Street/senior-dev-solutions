const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Watchlists CRUD
const watchlistController = createCrudController(db.Watchlist, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's watchlists
router.get('/my-watchlists', authMiddleware, async (req, res) => {
  try {
    const watchlists = await db.Watchlist.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(watchlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add stock to watchlist
router.post('/:id/add-stock', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_symbol } = req.body;
    
    const watchlist = await db.Watchlist.findByPk(id);
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    if (watchlist.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const stocks = watchlist.stocks || [];
    if (!stocks.includes(stock_symbol)) {
      stocks.push(stock_symbol);
      await watchlist.update({ stocks });
    }
    
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove stock from watchlist
router.post('/:id/remove-stock', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_symbol } = req.body;
    
    const watchlist = await db.Watchlist.findByPk(id);
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    if (watchlist.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const stocks = (watchlist.stocks || []).filter(s => s !== stock_symbol);
    await watchlist.update({ stocks });
    
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, watchlistController);

module.exports = router;