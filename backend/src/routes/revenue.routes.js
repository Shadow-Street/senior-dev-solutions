const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");
const { effectiveRole, ADMIN_ROLES } = require("../utils/roles");
const { parseAmountToPaise } = require("../utils/bankValidation");
const W = require("../services/WithdrawalService");

// Revenue Transactions
const transactionRouter = express.Router();
const transactionController = createCrudController(db.RevenueTransaction, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get revenue summary
transactionRouter.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    
    if (start_date && end_date) {
      where.created_at = {
        [db.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    
    const total = await db.RevenueTransaction.sum('amount', { where });
    const count = await db.RevenueTransaction.count({ where });
    
    const byType = await db.RevenueTransaction.findAll({
      where,
      attributes: [
        'type',
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['type']
    });
    
    res.json({ total: total || 0, count, byType });
  } catch (error) {
    console.error('[revenue.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(transactionRouter, transactionController, [authMiddleware]);
router.use('/transactions', transactionRouter);

// Payout Requests
//
// The generic CRUD controller used to be mounted here with `ownership:
// 'user_id'`, which let the owner of a payout row PUT its own `status` (and
// amount) and POST arbitrary fields. Reads still go through the controller
// (confined to the caller's rows); every write is now an explicit handler:
//
//   POST   /          same as POST /request (server-computed ceiling)
//   PUT    /:id       owner: may only cancel their own pending request
//                     staff: legacy (non-advisor) rows only, whitelisted fields;
//                            advisor withdrawals are reviewed through
//                            /api/admin/withdrawals so the state machine holds
//   DELETE /:id       never (financial records are not deleted)
//
// Advisor withdrawals are created and cancelled at /api/advisors/withdrawals.
const payoutRouter = express.Router();
const payoutController = createCrudController(db.PayoutRequest, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

const isStaff = (user) => ADMIN_ROLES.includes(effectiveRole(user)) || user?.is_admin === true;
// Entity types a caller may ask to file a payout under. The id is NEVER taken
// from the body: it is looked up from the caller's own profile row.
const SELF_ENTITY_TYPES = { finfluencer: () => db.FinInfluencer };

async function createPayout(req, res) {
  try {
    if (effectiveRole(req.user) === 'advisor') {
      return res.status(403).json({ error: 'Advisors request withdrawals from the Financials page' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const amt = parseAmountToPaise(body.amount);
    if (amt.error) return res.status(400).json({ error: amt.error });

    const method = typeof body.payment_method === 'string' ? body.payment_method.trim() : '';
    if (!method || method.length > 50) {
      return res.status(400).json({ error: 'payment_method is required (max 50 characters)' });
    }
    let details = null;
    if (body.payment_details !== undefined && body.payment_details !== null) {
      if (typeof body.payment_details !== 'object' || Array.isArray(body.payment_details) ||
          JSON.stringify(body.payment_details).length > 4000) {
        return res.status(400).json({ error: 'payment_details must be an object under 4 KB' });
      }
      details = body.payment_details;
    }

    // Optional entity: the server decides which row it points at.
    let entity = { type: null, id: null };
    if (body.entity_type !== undefined && body.entity_type !== null && body.entity_type !== '') {
      const model = Object.prototype.hasOwnProperty.call(SELF_ENTITY_TYPES, body.entity_type)
        ? SELF_ENTITY_TYPES[body.entity_type]()
        : null;
      if (!model) {
        return res.status(403).json({ error: 'Payouts for this type are created by the platform, not requested by users' });
      }
      const own = await model.findOne({ where: { user_id: req.user.id }, attributes: ['id'] });
      if (!own) return res.status(403).json({ error: 'No matching profile for this account' });
      entity = { type: body.entity_type, id: own.id };
    }

    const payout = await W.withTransaction(async (t) => {
      // Serialise this user's requests so two concurrent calls cannot both pass
      // the balance check.
      await db.User.findOne({ where: { id: req.user.id }, transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      const { Op } = db.Sequelize;
      const earned = await db.RevenueTransaction.sum('amount', {
        where: { user_id: req.user.id, status: 'completed' }, transaction: t
      });
      const committed = await db.PayoutRequest.sum('amount', {
        where: { user_id: req.user.id, status: { [Op.in]: [...W.OPEN_STATUSES, 'paid', 'processing', 'completed', 'processed'] } },
        transaction: t
      });
      const available = W.toPaise(earned) - W.toPaise(committed);
      if (amt.paise > available) {
        throw new W.WithdrawalError(400, 'Insufficient balance');
      }
      return db.PayoutRequest.create({
        user_id: req.user.id,
        amount: W.fromPaise(amt.paise),
        payment_method: method,
        payment_details: details,
        entity_type: entity.type,
        entity_id: entity.id,
        status: 'pending',
        created_at: new Date()
      }, { transaction: t });
    });

    res.status(201).json(payout);
  } catch (error) {
    if (error instanceof W.WithdrawalError) return res.status(error.status).json({ error: error.message });
    console.error('[revenue.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Request payout
payoutRouter.post('/request', authMiddleware, createPayout);

// Get user's payouts
payoutRouter.get('/my-payouts', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const payouts = await db.PayoutRequest.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    res.json(payouts);
  } catch (error) {
    console.error('[revenue.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

payoutRouter.get('/', authMiddleware, payoutController.list);
payoutRouter.get('/:id', authMiddleware, payoutController.get);
payoutRouter.post('/', authMiddleware, createPayout);

payoutRouter.put('/:id', authMiddleware, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (!isStaff(req.user)) {
      // Owners get exactly one write: cancelling a request that is still pending.
      const own = await db.PayoutRequest.findOne({ where: { id: req.params.id, user_id: req.user.id } });
      if (!own) return res.status(404).json({ error: 'Record not found' });
      if (body.status !== 'cancelled') {
        return res.status(403).json({ error: 'You can only cancel a pending request' });
      }
      const row = await W.transition({
        id: req.params.id, target: 'cancelled', actorId: req.user.id, ownerUserId: req.user.id,
        entityType: null, auditAction: 'withdrawal.cancel', req
      });
      return res.json(row);
    }

    const row = await db.PayoutRequest.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    if (row.entity_type === W.ENTITY_TYPE) {
      return res.status(409).json({ error: 'Advisor withdrawals are reviewed in Financials > Advisor Withdrawals' });
    }

    // Notes the staff member may attach; amount, owner and entity are never writable.
    const patch = {};
    for (const key of ['admin_notes', 'rejection_reason', 'reference_number']) {
      if (typeof body[key] === 'string') patch[key] = body[key].slice(0, key === 'reference_number' ? 100 : 2000);
    }

    if (body.status !== undefined) {
      // Same state machine as advisor withdrawals; only its own vocabulary is accepted.
      if (!W.ALL_STATUSES.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });
      const updated = await W.transition({
        id: req.params.id, target: body.status, actorId: req.user.id, entityType: null,
        patch, auditAction: 'payout.' + body.status, auditExtra: { legacy: true }, req,
        notify: false // the admin screens notify the user themselves
      });
      return res.json(updated);
    }

    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const updated = await W.withTransaction(async (t) => {
      const locked = await db.PayoutRequest.findOne({ where: { id: req.params.id }, transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      if (!locked) throw new W.WithdrawalError(404, 'Record not found');
      if (locked.entity_type === W.ENTITY_TYPE) throw new W.WithdrawalError(409, 'Advisor withdrawals are reviewed in Financials > Advisor Withdrawals');
      await locked.update({ ...patch, processed_by: req.user.id }, { transaction: t });
      await W.writeAudit({ actorId: req.user.id, action: 'payout.update_notes', row: locked, from: locked.status, req, transaction: t });
      return locked;
    });
    return res.json(updated);
  } catch (error) {
    if (error instanceof W.WithdrawalError) return res.status(error.status).json({ error: error.message });
    console.error('[revenue.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

payoutRouter.delete('/:id', authMiddleware, (req, res) =>
  res.status(403).json({ error: 'Payout requests cannot be deleted' })
);

router.use('/payouts', payoutRouter);

module.exports = router;
