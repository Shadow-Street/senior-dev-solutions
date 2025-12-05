const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Reports CRUD
const reportController = createCrudController(db.Report, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's reports
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    const reports = await db.Report.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate report
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { type, params } = req.body;
    
    const report = await db.Report.create({
      user_id: req.user.id,
      type,
      params: JSON.stringify(params),
      status: 'pending',
      created_at: new Date()
    });
    
    // In a real app, trigger async report generation here
    // For now, mark as completed immediately
    await report.update({ 
      status: 'completed',
      completed_at: new Date()
    });
    
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, reportController);

module.exports = router;