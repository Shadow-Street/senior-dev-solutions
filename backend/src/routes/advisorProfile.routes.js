/**
 * Advisor application, profile, earnings and refund views.
 *
 * Mounted at /api/advisors (before advisor.routes.js). State machine:
 *
 *   (none) --apply--> pending_approval --admin approve--> approved
 *                          |                                 |  \--admin suspend--> suspended
 *                          \--admin reject--> rejected --apply again--> pending_approval
 *
 * The applicant can create or re-submit an application and edit their public
 * profile; only an admin (POST /:id/review) can change status, verified, or the
 * user's role. Nothing here trusts status, verified, ratings, counters or ids
 * from the request body.
 */
const express = require('express');
const db = require('../models');
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require('../middleware/auth');
const { requireApprovedAdvisor } = require('../middleware/advisor');
const V = require('../utils/advisorValidation');
const Directory = require('../controllers/AdvisorDirectoryController');
const { reviewApplication, ReviewError } = require('../services/AdvisorReviewService');
const W = require('../services/WithdrawalService');
const storage = require('../services/StorageService');
const { ownHosts } = require('../utils/storageKeys');

const router = express.Router();
const fail = (res, err, label) => {
  console.error(`[advisorProfile] ${label} failed:`, err && err.message);
  return res.status(500).json({ error: 'Internal server error' });
};
const withDates = (row) => {
  const r = row && typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  return { ...r, created_date: r.created_at, updated_date: r.updated_at };
};

// Public directory (approved advisors only; see the controller).
router.get('/', optionalAuthenticate, Directory.list);

// ---------------------------------------------------------------------------
// The caller's own application / profile
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const advisor = await db.Advisor.findOne({ where: { user_id: req.user.id } });
    res.json({ advisor: advisor ? withDates(advisor) : null });
  } catch (err) {
    fail(res, err, 'me');
  }
});

router.post('/apply', authMiddleware, async (req, res) => {
  try {
    if (Directory.isStaff(req.user)) {
      return res.status(403).json({ error: 'Staff accounts cannot apply as advisors. Use a separate account.' });
    }
    const parsed = V.validateApplication(req.body, req.user.id, ownHosts(req));
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    // The key is well formed and the applicant's; make sure the upload is real.
    if (!(await storage.objectExists(parsed.value.sebi_document_url))) {
      return res.status(400).json({ error: 'We could not find your uploaded certificate. Please upload it again.' });
    }

    const outcome = await db.sequelize.transaction(async (transaction) => {
      const lock = transaction && transaction.LOCK ? transaction.LOCK.UPDATE : undefined;
      // Serialise concurrent submissions from one account: two tabs cannot both
      // pass the "no application yet" check and create two rows.
      await db.User.findByPk(req.user.id, { transaction, lock });
      const existing = await db.Advisor.findOne({ where: { user_id: req.user.id }, transaction, lock });

      if (!existing) {
        const created = await db.Advisor.create({
          ...parsed.value,
          user_id: req.user.id,
          status: 'pending_approval',
          verified: false,
          rejection_reason: null,
          follower_count: 0,
        }, { transaction });
        return { status: 201, advisor: created };
      }
      if (existing.status === 'rejected') {
        await existing.update({
          ...parsed.value,
          status: 'pending_approval',
          verified: false,
          rejection_reason: null,
          updated_at: new Date(),
        }, { transaction });
        return { status: 200, advisor: existing };
      }
      const messages = {
        pending_approval: 'You already have an application under review.',
        approved: 'You are already an approved advisor.',
        suspended: 'Your advisor account is suspended. Contact support.',
      };
      return { status: 409, error: messages[existing.status] || 'You already have an advisor application.' };
    });

    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    return res.status(outcome.status).json({ advisor: withDates(outcome.advisor) });
  } catch (err) {
    return fail(res, err, 'apply');
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const advisor = await db.Advisor.findOne({ where: { user_id: req.user.id } });
    if (!advisor) return res.status(404).json({ error: 'You have not applied as an advisor' });
    if (advisor.status === 'suspended') return res.status(403).json({ error: 'Your advisor account is suspended' });
    if (advisor.status === 'rejected') {
      return res.status(409).json({ error: 'Update your application and re-submit it from the registration page' });
    }
    const parsed = V.validateProfileUpdate(req.body, advisor, ownHosts(req));
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const patch = { ...parsed.value };
    // Images are validated as keys and stored as the URLs the site renders.
    for (const field of ['profile_image_url', 'avatar_url']) {
      if (patch[field]) patch[field] = storage.publicUrlForKey(patch[field], req);
    }
    await advisor.update({ ...patch, updated_at: new Date() });
    return res.json({ advisor: withDates(advisor) });
  } catch (err) {
    return fail(res, err, 'update profile');
  }
});

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------
router.post('/:id/review', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!V.UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Advisor not found' });
    const { action, reason } = req.body || {};
    const out = await reviewApplication({
      advisorId: req.params.id,
      action,
      reason,
      reviewer: req.user,
      wsService: req.app.get('wsService'),
      req,
    });
    return res.json({ advisor: withDates(out.advisor), role_change: out.role_change });
  } catch (err) {
    if (err instanceof ReviewError) return res.status(err.status).json({ error: err.message });
    return fail(res, err, 'review');
  }
});

/**
 * Permanently removes an advisor profile (admin). Refused while the advisor has
 * earnings, withdrawals or active subscribers: that history is financial record
 * and the right action is to suspend. The owner's advisor role is withdrawn in
 * the same transaction so no one is left with the role and no profile.
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!V.UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Advisor not found' });
    const outcome = await db.sequelize.transaction(async (transaction) => {
      const lock = transaction && transaction.LOCK ? transaction.LOCK.UPDATE : undefined;
      const advisor = await db.Advisor.findOne({ where: { id: req.params.id }, transaction, lock });
      if (!advisor) return { status: 404, error: 'Advisor not found' };

      const [commissions, active, payouts] = await Promise.all([
        db.CommissionTracking.count({ where: { advisor_id: advisor.id }, transaction }),
        db.Subscription.count({ where: { advisor_id: advisor.id, status: 'active' }, transaction }),
        db.PayoutRequest.count({ where: { user_id: advisor.user_id, entity_type: 'advisor' }, transaction }),
      ]);
      if (commissions > 0 || active > 0 || payouts > 0) {
        return { status: 409, error: 'This advisor has subscribers or financial history. Suspend the account instead of deleting it.' };
      }

      const user = advisor.user_id ? await db.User.findByPk(advisor.user_id, { transaction, lock }) : null;
      if (user && (user.app_role || user.role) === 'advisor') {
        await user.update({ role: 'user', app_role: 'user' }, { transaction });
      }
      await db.SubscriptionPlan.destroy({ where: { advisor_id: advisor.id }, transaction });
      await db.AdvisorPost.destroy({ where: { advisor_id: advisor.id }, transaction });
      await db.AdvisorRecommendation.destroy({ where: { advisor_id: advisor.id }, transaction });
      await advisor.destroy({ transaction });
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'advisor_delete',
        entity_type: 'advisor',
        entity_id: advisor.id,
        description: 'deleted advisor profile',
        new_data: { user_id: advisor.user_id, status: advisor.status },
        ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
        user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
      }, { transaction });
      return { status: 200 };
    });
    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    return res.json({ success: true });
  } catch (err) {
    return fail(res, err, 'delete advisor');
  }
});

// ---------------------------------------------------------------------------
// Earnings (approved advisors, their own ledger only)
// ---------------------------------------------------------------------------
router.get('/earnings', authMiddleware, requireApprovedAdvisor, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const where = { advisor_id: req.advisor.id };
    if (req.query.status !== undefined) {
      if (!['pending', 'approved', 'cancelled'].includes(req.query.status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      where.status = req.query.status;
    }

    const [balance, pendingSum, pendingCount, page, plans] = await Promise.all([
      W.computeBalance({ advisorId: req.advisor.id, userId: req.user.id }),
      db.CommissionTracking.sum('amount', { where: { advisor_id: req.advisor.id, status: 'pending' } }),
      db.CommissionTracking.count({ where: { advisor_id: req.advisor.id, status: 'pending' } }),
      db.CommissionTracking.findAndCountAll({ where, order: [['created_at', 'DESC']], limit, offset }),
      db.SubscriptionPlan.findAll({ where: { advisor_id: req.advisor.id }, attributes: ['id', 'name'] }),
    ]);
    const planName = new Map(plans.map((p) => [p.id, p.name]));

    const items = page.rows.map((c) => {
      const r = typeof c.toJSON === 'function' ? c.toJSON() : c;
      const meta = r.metadata && typeof r.metadata === 'object' ? r.metadata : {};
      return {
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        commission_type: r.commission_type || null,
        gross_amount: meta.gross_amount ?? null,
        platform_fee: meta.platform_fee ?? null,
        plan_name: planName.get(meta.plan_id) || null,
        created_at: r.created_at,
      };
    });

    return res.json({
      summary: {
        approved: balance.earned,
        pending: Math.round(Number(pendingSum || 0) * 100) / 100,
        pending_count: pendingCount,
        available: balance.available,
        pending_withdrawals: balance.pending_withdrawals,
        total_withdrawn: balance.total_withdrawn,
        currency: balance.currency,
      },
      items,
      total: page.count,
      limit,
      offset,
    });
  } catch (err) {
    return fail(res, err, 'earnings');
  }
});

// ---------------------------------------------------------------------------
// Refund requests raised against this advisor's subscribers
// ---------------------------------------------------------------------------
router.get('/refunds', authMiddleware, requireApprovedAdvisor, async (req, res) => {
  try {
    const { Op } = db.Sequelize;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const subs = await db.Subscription.findAll({
      where: { advisor_id: req.advisor.id },
      attributes: ['id', 'user_id'],
      limit: 1000,
    });
    if (subs.length === 0) return res.json([]);
    const byId = new Map(subs.map((s) => [s.id, s]));
    const refunds = await db.RefundRequest.findAll({
      where: { subscription_id: { [Op.in]: [...byId.keys()] } },
      order: [['created_at', 'DESC']],
      limit,
    });
    const users = await db.User.findAll({
      where: { id: { [Op.in]: [...new Set(subs.map((s) => s.user_id))] } },
      attributes: ['id', 'name'],
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    return res.json(refunds.map((r) => ({
      id: r.id,
      subscriber_name: nameOf.get(byId.get(r.subscription_id)?.user_id) || 'Subscriber',
      status: r.status,
      reason: r.reason || null,
      refund_amount: r.refund_amount === null || r.refund_amount === undefined ? null : Number(r.refund_amount),
      created_at: r.created_at,
      processed_at: r.processed_at || null,
    })));
  } catch (err) {
    return fail(res, err, 'refunds');
  }
});

module.exports = router;
