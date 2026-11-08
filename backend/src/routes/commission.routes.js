const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { effectiveRole, ADMIN_ROLES } = require("../utils/roles");
const W = require("../services/WithdrawalService");

/**
 * commission_tracking is the ledger an advisor's withdrawable balance is built
 * from (WithdrawalService.computeBalance), so a row here is money. The generic
 * CRUD used to let any signed-in user create rows with their own advisor_id,
 * amount and status, then withdraw against them. Now:
 *   - reads stay owner-scoped (user_id) for everyone, unscoped for staff;
 *   - every write (create / update / delete / bulk) is admin-only;
 *   - genuine rows are created server-side from verified payments
 *     (services/CommissionService.js), and staff move them pending -> approved
 *     with POST /tracking/approve.
 */
const STAFF_WRITES = { read: [authMiddleware], write: [authMiddleware, adminMiddleware] };
const isStaffUser = (user) => ADMIN_ROLES.includes(effectiveRole(user)) || user?.is_admin === true;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (req.user.id !== userId && !isStaffUser(req.user)) {
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

    // Any signed-in user used to be able to read any advisor's earnings.
    if (!isStaffUser(req.user)) {
      const own = await db.Advisor.findOne({ where: { id: advisorId, user_id: req.user.id }, attributes: ['id'] });
      if (!own) return res.status(403).json({ error: 'Access denied' });
    }

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

/**
 * Staff decision on server-created commissions.
 *   POST /tracking/approve  { ids: [...] }  pending -> approved (counts towards the balance)
 *   POST /tracking/cancel   { ids: [...] }  pending -> cancelled
 * All-or-nothing: any id that is unknown or not pending fails the whole call
 * (409) so nothing is half-applied. One audit row per commission.
 */
const decideCommissions = (target) => async (req, res) => {
  try {
    const ids = req.body && req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 ||
        !ids.every((i) => typeof i === 'string' && UUID_RE.test(i))) {
      return res.status(400).json({ error: 'ids must be 1 to 100 commission ids' });
    }
    const unique = [...new Set(ids)];

    const changed = await W.withTransaction(async (t) => {
      const rows = await db.CommissionTracking.findAll({
        where: { id: { [db.Sequelize.Op.in]: unique } },
        transaction: t,
        lock: t.LOCK && t.LOCK.UPDATE
      });
      if (rows.length !== unique.length) throw new W.WithdrawalError(404, 'One or more commissions were not found');
      const notPending = rows.filter((r) => r.status !== 'pending');
      if (notPending.length) {
        throw new W.WithdrawalError(409, `Only pending commissions can be changed (${notPending.length} are not pending)`);
      }
      for (const row of rows) {
        await row.update({ status: target, updated_at: new Date() }, { transaction: t });
        await db.AuditLog.create({
          user_id: req.user.id,
          action: `commission.${target}`,
          entity_type: 'commission_tracking',
          entity_id: row.id,
          old_data: { status: 'pending' },
          new_data: { status: target, amount: Number(row.amount), advisor_id: row.advisor_id },
          description: `commission ${row.id} ${target}`,
          ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
          user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null
        }, { transaction: t });
      }
      return rows;
    });
    res.json({ success: true, status: target, count: changed.length });
  } catch (error) {
    if (error instanceof W.WithdrawalError) return res.status(error.status).json({ error: error.message });
    console.error('[commission.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
trackingRouter.post('/approve', authMiddleware, adminMiddleware, decideCommissions('approved'));
trackingRouter.post('/cancel', authMiddleware, adminMiddleware, decideCommissions('cancelled'));

createCrudRoutes(trackingRouter, createCrudController(db.CommissionTracking, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC',
  ownership: 'user_id',
}), STAFF_WRITES);
router.use('/tracking', trackingRouter);

// Commission settings
const settingsRouter = express.Router();
createCrudRoutes(settingsRouter, createCrudController(db.CommissionSettings), [authMiddleware, adminMiddleware]);
router.use('/settings', settingsRouter);

// CRUD LAST — '/:id' must not shadow the sub-routers above.
createCrudRoutes(router, commissionController, STAFF_WRITES);

module.exports = router;
