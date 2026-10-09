const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Commission Tracking CRUD
const commissionController = createCrudController(db.CommissionTracking, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get commission summary
router.get('/summary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const commissions = await db.CommissionTracking.findAll({
      where: whereClause,
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total_amount'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'total_count'],
        'status',
        'commission_type'
      ],
      group: ['status', 'commission_type']
    });

    res.json(commissions);
  } catch (error) {
    console.error('[commission.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get commissions by user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only see their own commissions unless admin
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commissions = await db.CommissionTracking.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json(commissions);
  } catch (error) {
    console.error('[commission.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get commissions by advisor
router.get('/advisor/:advisorId', authMiddleware, async (req, res) => {
  try {
    const { advisorId } = req.params;

    const commissions = await db.CommissionTracking.findAll({
      where: { advisor_id: advisorId },
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json(commissions);
  } catch (error) {
    console.error('[commission.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process commission payout
router.post('/payout', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { commissionIds, payoutMethod } = req.body;

    const commissions = await db.CommissionTracking.findAll({
      where: { 
        id: commissionIds,
        status: 'pending'
      }
    });

    if (commissions.length === 0) {
      return res.status(404).json({ error: 'No pending commissions found' });
    }

    // Update status to processing
    await db.CommissionTracking.update(
      { 
        status: 'processing',
        payout_method: payoutMethod,
        processed_at: new Date()
      },
      { where: { id: commissionIds } }
    );

    // In a real implementation, you would trigger payout here
    // For now, mark as paid
    await db.CommissionTracking.update(
      { 
        status: 'paid',
        paid_at: new Date()
      },
      { where: { id: commissionIds } }
    );

    res.json({ success: true, processed: commissions.length });
  } catch (error) {
    console.error('[commission.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Commission tracking records
const trackingRouter = express.Router();
createCrudRoutes(trackingRouter, createCrudController(db.CommissionTracking, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC',
  ownership: 'user_id',
}), [authMiddleware]);
router.use('/tracking', trackingRouter);

// Commission settings
const settingsRouter = express.Router();
createCrudRoutes(settingsRouter, createCrudController(db.CommissionSettings), [authMiddleware, adminMiddleware]);
router.use('/settings', settingsRouter);

// CRUD LAST — '/:id' must not shadow the sub-routers above.
createCrudRoutes(router, commissionController, [authMiddleware]);

module.exports = router;
