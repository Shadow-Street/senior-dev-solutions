const express = require("express");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Financial audit trail — admin-only.
const auditRouter = express.Router();
createCrudRoutes(auditRouter, createCrudController(db.FinancialAuditLog, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
}), [authMiddleware]);
router.use('/audit-logs', auditRouter);

module.exports = router;
