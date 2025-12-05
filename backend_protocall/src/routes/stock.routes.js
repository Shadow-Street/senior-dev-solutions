const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

const stockController = createCrudController(db.Stock, {
  defaultOrderBy: 'symbol',
  defaultOrder: 'ASC'
});

// Custom routes
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, stockController);

module.exports = router;