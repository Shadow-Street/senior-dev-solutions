const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Static Pages CRUD
const staticPageController = createCrudController(db.StaticPage);

// Get page by slug (public)
router.get('/slug/:slug', async (req, res) => {
  try {
    const page = await db.StaticPage.findOne({
      where: { slug: req.params.slug, status: 'published' }
    });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all published pages (public)
router.get('/published', async (req, res) => {
  try {
    const pages = await db.StaticPage.findAll({
      where: { status: 'published' },
      attributes: ['id', 'slug', 'title', 'meta_title', 'meta_description'],
      order: [['title', 'ASC']]
    });
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(router, staticPageController);

module.exports = router;
