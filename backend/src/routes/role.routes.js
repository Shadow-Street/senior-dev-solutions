const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Roles CRUD
const roleController = createCrudController(db.Role, {
  defaultOrderBy: 'name',
  defaultOrder: 'ASC'
});

// Get all roles
router.get('/all', async (req, res) => {
  try {
    const roles = await db.Role.findAll({
      order: [['name', 'ASC']]
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, roleController);

module.exports = router;