const express = require("express");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

createCrudRoutes(router, createCrudController(db.Income, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  beforeCreate: async (data, req) => {
    if (req?.user?.id) data.recorded_by = req.user.id;
    return data;
  }
}), [authMiddleware]);

module.exports = router;
