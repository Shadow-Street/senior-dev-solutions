const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/permissions");

/**
 * Generic table access for roles, role templates and their permission links.
 * The Super Admin screens use /api/admin/access/* (validated, audited); these
 * raw CRUD routes remain for compatibility. Reads are staff-only, and writes
 * are super-admin only — an admin could otherwise grant a custom role (and
 * so a sub-admin) any permission, bypassing the rules in
 * services/AccessControlService.js.
 */
const read = [authMiddleware, adminMiddleware];
const write = [authMiddleware, requireSuperAdmin];

// Roles CRUD
const roleController = createCrudController(db.Role, {
  defaultOrderBy: 'name',
  defaultOrder: 'ASC'
});

// Get all roles
router.get('/all', ...read, async (req, res) => {
  try {
    const roles = await db.Role.findAll({
      order: [['name', 'ASC']]
    });
    res.json(roles);
  } catch (error) {
    console.error('[role.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Role templates
const templateRouter = express.Router();
createCrudRoutes(templateRouter, createCrudController(db.RoleTemplate, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), { read, write });
router.use('/templates', templateRouter);

// Template -> permission mappings
const templatePermRouter = express.Router();
createCrudRoutes(templatePermRouter, createCrudController(db.RoleTemplatePermission), { read, write });
router.use('/template-permissions', templatePermRouter);

// Role -> permission mappings
const rolePermRouter = express.Router();
createCrudRoutes(rolePermRouter, createCrudController(db.RolePermission), { read, write });
router.use('/permissions', rolePermRouter);

// CRUD LAST — '/:id' must not shadow the sub-routers above.
createCrudRoutes(router, roleController, { read, write });

module.exports = router;
