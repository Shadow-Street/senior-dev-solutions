const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { Op } = require("sequelize");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

/**
 * Investment allocations: one investor's capital placed into one fund plan.
 *
 * The superadmin's ExecuteAllocationModal has always POSTed this shape, but no
 * model, table or route existed, so every allocation it executed failed. The
 * component also chains four follow-up writes off the returned id, so the
 * whole execution path died at the first step.
 *
 * Scoping needs care: the row identifies its owner by `investor_id`, which is
 * an Investor row id and not a user id, so plain ownership would compare the
 * wrong two values and quietly match nothing. The hook resolves the caller's
 * Investor records first and scopes to those.
 *
 * Only staff execute an allocation, so writes are admin-only; an investor
 * reads their own.
 */
const allocationRouter = express.Router();

const investorIdsFor = async (req) => {
  const rows = await db.Investor.findAll({
    where: { user_id: req.user.id },
    attributes: ["id"],
  });
  return rows.map((r) => r.id);
};

createCrudRoutes(
  allocationRouter,
  createCrudController(db.InvestmentAllocation, {
    defaultOrderBy: "allocation_date",
    defaultOrder: "DESC",
    scope: {
      listWhere: async (req) => ({ investor_id: { [Op.in]: await investorIdsFor(req) } }),
      allows: async (req, record) =>
        (await investorIdsFor(req)).includes(record.investor_id),
    },
  }),
  { read: [authMiddleware], write: [authMiddleware, adminMiddleware] }
);
router.use("/allocations", allocationRouter);

// Investors CRUD
const investorRouter = express.Router();
const investorController = createCrudController(db.Investor, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});
createCrudRoutes(investorRouter, investorController, [authMiddleware]);
router.use('/investors', investorRouter);

// Investment Requests
const requestRouter = express.Router();
const requestController = createCrudController(db.InvestmentRequest, {
  ownership: 'user_id',
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
    console.error('[investment.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(requestRouter, requestController, [authMiddleware]);
router.use('/requests', requestRouter);

// Investor Requests
const investorRequestRouter = express.Router();
const investorRequestController = createCrudController(db.InvestorRequest, {
  ownership: 'user_id',
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
    console.error('[investment.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[investment.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(investorRequestRouter, investorRequestController, [authMiddleware]);
router.use('/investor-requests', investorRequestRouter);

module.exports = router;
