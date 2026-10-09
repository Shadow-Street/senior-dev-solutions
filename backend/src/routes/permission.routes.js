const express = require("express");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

/**
 * The permission catalogue: the list of capabilities the system knows about.
 *
 * No route was ever mounted, so /api/permissions returned 404 and the
 * superadmin Roles & Permissions matrix failed on load — it calls
 * `Permission.list()` and, finding nothing, tries to seed its defaults with
 * `Permission.create()`, which also 404'd. The screen was unusable.
 *
 * Note this is NOT /api/roles/permissions, which wraps the role_permissions
 * join table; this is the catalogue those rows point at. Pointing the frontend
 * at the join table instead would have conflated the two.
 *
 * Staff only, both directions. The catalogue defines what every role in the
 * product is allowed to do, so it is an administrative concern end to end.
 */
createCrudRoutes(
  router,
  createCrudController(db.Permission, {
    defaultOrderBy: "module",
    defaultOrder: "ASC",
    searchFields: ["name", "module", "action"],
  }),
  { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] }
);

module.exports = router;
