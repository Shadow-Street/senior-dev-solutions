const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Investors CRUD
const investorRouter = express.Router();
const investorController = createCrudController(db.Investor, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(investorRouter, investorController);
router.use('/investors', investorRouter);

// Investment Requests
const requestRouter = express.Router();
const requestController = createCrudController(db.InvestmentRequest, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's investment requests
requestRouter.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await db.InvestmentRequest.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(requestRouter, requestController);
router.use('/requests', requestRouter);

// Investor Requests
const investorRequestRouter = express.Router();
const investorRequestController = createCrudController(db.InvestorRequest, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Approve investor request
investorRequestRouter.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await db.InvestorRequest.findByPk(id);
    
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
    res.status(500).json({ error: error.message });
  }
});

// Reject investor request
investorRequestRouter.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await db.InvestorRequest.findByPk(id);
    
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
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(investorRequestRouter, investorRequestController);
router.use('/investor-requests', investorRequestRouter);

module.exports = router;