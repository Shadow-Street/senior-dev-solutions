const express = require("express");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

const controller = createCrudController(db.Announcement, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  beforeCreate: async (data, req) => {
    if (req?.user?.id) data.created_by = req.user.id;
    return data;
  }
});

// Reads are public (banners render for everyone); writes require auth.
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', authMiddleware, controller.create);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.delete);

module.exports = router;
