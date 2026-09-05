const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Vendors CRUD
const vendorController = createCrudController(db.Vendor, {
  defaultOrderBy: 'name',
  defaultOrder: 'ASC'
});

// Get active vendors
router.get('/active', async (req, res) => {
  try {
    const vendors = await db.Vendor.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']]
    });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendors by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const vendors = await db.Vendor.findAll({
      where: { category, status: 'active' },
      order: [['name', 'ASC']]
    });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, vendorController);

module.exports = router;