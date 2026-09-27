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

// Role templates
const templateRouter = express.Router();
createCrudRoutes(templateRouter, createCrudController(db.RoleTemplate, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), [authMiddleware]);
router.use('/templates', templateRouter);

// Template -> permission mappings
const templatePermRouter = express.Router();
createCrudRoutes(templatePermRouter, createCrudController(db.RoleTemplatePermission), [authMiddleware]);
router.use('/template-permissions', templatePermRouter);

// Role -> permission mappings
const rolePermRouter = express.Router();
createCrudRoutes(rolePermRouter, createCrudController(db.RolePermission), [authMiddleware]);
router.use('/permissions', rolePermRouter);

// CRUD LAST — '/:id' must not shadow the sub-routers above.
createCrudRoutes(router, roleController);

module.exports = router;