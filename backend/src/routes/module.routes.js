const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Module Approval Requests
const approvalRouter = express.Router();
const approvalController = createCrudController(db.ModuleApprovalRequest, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get pending approvals
approvalRouter.get('/pending', authMiddleware, async (req, res) => {
  try {
    const requests = await db.ModuleApprovalRequest.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'ASC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('[module.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve request
approvalRouter.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await db.ModuleApprovalRequest.findByPk(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    await request.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date()
    });
    
    res.json(request);
  } catch (error) {
    console.error('[module.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject request
approvalRouter.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await db.ModuleApprovalRequest.findByPk(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    await request.update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_by: req.user.id,
      rejected_at: new Date()
    });
    
    res.json(request);
  } catch (error) {
    console.error('[module.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(approvalRouter, approvalController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/approvals', approvalRouter);

module.exports = router;
