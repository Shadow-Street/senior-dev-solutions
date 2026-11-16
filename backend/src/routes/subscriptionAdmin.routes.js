/**
 * Super Admin › Subscriptions › User Subscriptions.
 *
 * GET /api/subscriptions/admin/users?status=&q=&page=&limit=
 *
 * The screen used to download the whole subscriptions and users tables (100
 * rows each by default) and join them in the browser, so past 100 users it
 * showed "Unknown User", it printed `₹/mo` (it read a `price` field that does
 * not exist) and "Jan 1, 1970" for plans without an end date (Free never
 * ends). This endpoint joins, searches, filters, counts and pages on the
 * server and returns display-ready fields.
 *
 * Status is the *effective* status: an 'active' row whose end date has passed
 * is reported as expired even if the nightly job has not flipped it yet.
 */
const express = require('express');
const { Op } = require('sequelize');
const db = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['all', 'active', 'cancelling', 'cancelled', 'expired'];
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

function statusWhere(status, now) {
  const notEnded = { [Op.or]: [{ end_date: null }, { end_date: { [Op.gt]: now } }] };
  switch (status) {
    case 'active':
      return { [Op.and]: [{ status: 'active' }, notEnded, { [Op.or]: [{ cancelAtPeriodEnd: false }, { cancelAtPeriodEnd: null }] }] };
    case 'cancelling':
      return { [Op.and]: [{ status: 'active' }, notEnded, { cancelAtPeriodEnd: true }] };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'expired':
      return { [Op.or]: [{ status: 'expired' }, { [Op.and]: [{ status: 'active' }, { end_date: { [Op.lte]: now } }] }] };
    default:
      return {};
  }
}

function effectiveStatus(sub, now) {
  if (sub.status === 'active' && sub.end_date && new Date(sub.end_date) <= now) return 'expired';
  if (sub.status === 'active' && sub.cancelAtPeriodEnd) return 'cancelling';
  return sub.status || 'unknown';
}

/** Price for the subscriber's billing cycle, from the plan (rupees). */
function cyclePrice(plan, cycle) {
  if (!plan) return null;
  const monthly = num(plan.price_monthly) ?? num(plan.price);
  if (cycle === 'annually' || cycle === 'yearly' || cycle === 'annual') {
    return num(plan.price_annually) ?? (monthly === null ? null : monthly * 12);
  }
  return monthly;
}

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const q = req.query || {};
    const status = STATUSES.includes(q.status) ? q.status : 'all';
    const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || 25, 1), 100);
    const page = Math.max(Number.parseInt(q.page, 10) || 1, 1);
    const term = typeof q.q === 'string' ? q.q.trim().slice(0, 80) : '';
    const now = new Date();

    // Search: user name/email, plan name.
    const searchClauses = [];
    if (term) {
      const like = { [Op.like]: `%${likeEscape(term)}%` };
      const [users, plans] = await Promise.all([
        db.User.findAll({
          where: { [Op.or]: [{ name: like }, { display_name: like }, { email: like }] },
          attributes: ['id'],
          limit: 500,
        }),
        db.SubscriptionPlan.findAll({ where: { name: like }, attributes: ['id'], limit: 200 }),
      ]);
      if (users.length) searchClauses.push({ user_id: { [Op.in]: users.map((u) => u.id) } });
      if (plans.length) searchClauses.push({ plan_id: { [Op.in]: plans.map((p) => p.id) } });
      searchClauses.push({ plan_type: like });
    }
    const searchWhere = searchClauses.length ? { [Op.or]: searchClauses } : {};
    const where = { [Op.and]: [searchWhere, statusWhere(status, now)] };

    const [total, rows, ...counts] = await Promise.all([
      db.Subscription.count({ where }),
      db.Subscription.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      }),
      ...['active', 'cancelling', 'cancelled', 'expired'].map((s) =>
        db.Subscription.count({ where: { [Op.and]: [searchWhere, statusWhere(s, now)] } })),
    ]);

    const subs = rows.map((r) => (r.toJSON ? r.toJSON() : r));
    const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
    const planIds = [...new Set(subs.map((s) => s.plan_id).filter(Boolean))];
    const [users, plans] = await Promise.all([
      userIds.length
        ? db.User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'display_name', 'email'] })
        : [],
      planIds.length
        ? db.SubscriptionPlan.findAll({
          where: { id: { [Op.in]: planIds } },
          attributes: ['id', 'name', 'price', 'price_monthly', 'price_annually', 'advisor_id'],
        })
        : [],
    ]);
    const userById = new Map(users.map((u) => [String(u.id), u.toJSON ? u.toJSON() : u]));
    const planById = new Map(plans.map((p) => [String(p.id), p.toJSON ? p.toJSON() : p]));

    const items = subs.map((s) => {
      const user = userById.get(String(s.user_id));
      const plan = planById.get(String(s.plan_id));
      const cycle = s.billing_cycle === 'annually' || s.billing_cycle === 'yearly' ? 'annually' : 'monthly';
      return {
        id: s.id,
        user: user
          ? { id: user.id, name: user.display_name || user.name || null, email: user.email || null }
          : { id: s.user_id, name: null, email: null },
        plan_id: s.plan_id,
        plan_name: plan?.name || s.plan_type || 'Unknown plan',
        is_advisor_plan: Boolean(plan?.advisor_id || s.advisor_id),
        billing_cycle: cycle,
        price: cyclePrice(plan, cycle),
        start_date: s.start_date || null,
        end_date: s.end_date || null,
        status: effectiveStatus(s, now),
        cancel_at_period_end: Boolean(s.cancelAtPeriodEnd),
        auto_renew: Boolean(s.auto_renew),
      };
    });

    const [active, cancelling, cancelled, expired] = counts;
    return res.json({ items, total, page, limit, counts: { active, cancelling, cancelled, expired } });
  } catch (error) {
    console.error('[subscriptionAdmin] list failed:', error);
    return res.status(500).json({ error: 'Could not load subscriptions' });
  }
});

module.exports = router;
module.exports.cyclePrice = cyclePrice;
module.exports.effectiveStatus = effectiveStatus;
