const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");

const { adminMiddleware, authMiddleware, optionalAuthenticate } = require("../middleware/auth");
// Localization CRUD
const localizationController = createCrudController(db.Localization);

// Get all translations for a language
router.get('/language/:lang', async (req, res) => {
  try {
    const translations = await db.Localization.findAll({
      where: { language: req.params.lang }
    });
    
    // Convert to key-value object
    const result = {};
    translations.forEach(t => {
      if (!result[t.category]) {
        result[t.category] = {};
      }
      result[t.category][t.key] = t.value;
    });
    
    res.json(result);
  } catch (error) {
    console.error('[localization.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get translations by category
router.get('/category/:category', async (req, res) => {
  try {
    const translations = await db.Localization.findAll({
      where: { category: req.params.category }
    });
    res.json(translations);
  } catch (error) {
    console.error('[localization.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update translations
router.post('/bulk', async (req, res) => {
  try {
    const { translations } = req.body;
    
    for (const t of translations) {
      await db.Localization.upsert({
        key: t.key,
        language: t.language,
        value: t.value,
        category: t.category
      });
    }
    
    res.json({ success: true, count: translations.length });
  } catch (error) {
    console.error('[localization.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(router, localizationController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });

module.exports = router;
