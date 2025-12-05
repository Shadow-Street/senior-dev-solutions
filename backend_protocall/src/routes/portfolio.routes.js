const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Portfolios CRUD
const portfolioController = createCrudController(db.Portfolio, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's portfolios
router.get('/my-portfolios', authMiddleware, async (req, res) => {
  try {
    const portfolios = await db.Portfolio.findAll({
      where: { user_id: req.user.id },
      include: [{ model: db.PortfolioHolding }],
      order: [['created_at', 'DESC']]
    });
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio summary
router.get('/:id/summary', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const portfolio = await db.Portfolio.findByPk(id, {
      include: [{ model: db.PortfolioHolding }]
    });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const holdings = portfolio.PortfolioHoldings || [];
    const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
    const totalGain = totalValue - totalCost;
    const gainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;
    
    res.json({
      portfolio,
      summary: {
        totalValue,
        totalCost,
        totalGain,
        gainPercent: gainPercent.toFixed(2),
        holdingsCount: holdings.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, portfolioController);

// Holdings sub-routes
const holdingRouter = express.Router();
const holdingController = createCrudController(db.PortfolioHolding, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(holdingRouter, holdingController);
router.use('/holdings', holdingRouter);

module.exports = router;