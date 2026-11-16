const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");

/**
 * Advisor-owned rows are keyed by `advisor_id` — the Advisor row's id, which is
 * NOT the user's id. This resolves the caller to their own advisor record so
 * ownership can be enforced generically. Returns null for a non-advisor, which
 * the controller treats as "owns nothing".
 */
const resolveAdvisorId = async (req) => {
  if (!req.user?.id) return null;
  const advisor = await db.Advisor.findOne({
    where: { user_id: req.user.id },
    attributes: ['id'],
  });
  return advisor?.id ?? null;
};

const advisorOwned = { field: 'advisor_id', resolveOwnerId: resolveAdvisorId };

// The advisor directory (GET /) lives in advisorProfile.routes.js, mounted
// ahead of this router: it must not return pending/rejected applicants or the
// private SEBI document URL to anonymous callers.

const { requireApprovedAdvisor } = require('../middleware/advisor');
const V = require('../utils/advisorValidation');
const { isStaff } = require('../controllers/AdvisorDirectoryController');
const { viewerAccess, canRead, isModerationLocked } = require('../utils/advisorPostAccess');
const limits = require('../services/AdvisorPostLimitService');
const crypto = require('crypto');

const { Op } = db.Sequelize;
const UUID_RE = V.UUID_RE;
const pageOf = (req, def = 20, max = 100) => ({
  limit: Math.min(Math.max(Number.parseInt(req.query.limit, 10) || def, 1), max),
  offset: Math.max(Number.parseInt(req.query.offset, 10) || 0, 0),
});
const serverError = (res, label, err) => {
  console.error(`[advisor.routes.js] ${label} failed:`, err && err.message);
  return res.status(500).json({ error: 'Internal server error' });
};
const withDates = (row) => {
  const r = row && typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  return { ...r, created_date: r.created_at, updated_date: r.updated_at };
};

/**
 * Write guard shared by plans, posts and recommendations.
 *   - approved advisor -> req.advisor is set, and every query is scoped to it;
 *   - staff            -> req.staff = true (moderation: edit/remove by id);
 *   - everyone else, including pending, rejected and suspended applicants -> 403.
 */
const advisorOrStaff = (req, res, next) => {
  if (isStaff(req.user)) { req.staff = true; return next(); }
  return requireApprovedAdvisor(req, res, next);
};
const advisorOnly = requireApprovedAdvisor;

const LIMITS_UNAVAILABLE = {
  error: 'Recommendation limits are temporarily unavailable while a database update is pending. Please try again later.',
  code: 'MIGRATION_PENDING',
};

/** Row the caller may modify: their own (advisor) or any (staff). */
const findWritable = (Model, req, extraWhere = {}) => {
  if (!UUID_RE.test(String(req.params.id))) return Promise.resolve(null);
  const where = { id: req.params.id, ...extraWhere };
  if (!req.staff) where.advisor_id = req.advisor.id;
  return Model.findOne({ where });
};

// Advisor Recommendations ---------------------------------------------------
const recommendationRouter = express.Router();
const recommendationController = createCrudController(db.AdvisorRecommendation, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: { ...advisorOwned, publicRead: true }
});

// Get latest recommendations (active ones from approved advisors only)
recommendationRouter.get('/latest', async (req, res) => {
  try {
    const { limit } = pageOf(req, 10, 50);
    const recommendations = await db.AdvisorRecommendation.findAll({
      where: { status: 'active' },
      order: [['created_at', 'DESC']],
      limit,
      include: [{ model: db.Advisor, attributes: ['id', 'display_name', 'name', 'avatar_url', 'profile_image_url'], where: { status: 'approved' }, required: true }]
    });
    res.json(recommendations);
  } catch (error) {
    serverError(res, 'latest recommendations', error);
  }
});

const SYMBOL_RE = /^[A-Z0-9&.\-_^]{1,32}$/;
const approvedAdvisorInclude = { model: db.Advisor, attributes: ['id', 'display_name', 'name'], where: { status: 'approved' }, required: true };

// Public per-stock tally: counts of active buy / sell / hold calls from approved
// advisors plus the latest one. Recommendations are public by design; this is
// only an aggregate (no reasons, no post content, nothing subscriber-only).
recommendationRouter.get('/stock/:symbol/summary', async (req, res) => {
  try {
    const symbol = String(req.params.symbol || '').toUpperCase();
    if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'Invalid stock symbol' });
    const rows = await db.AdvisorRecommendation.findAll({
      where: { stock_symbol: symbol, status: 'active' },
      attributes: ['action', 'target_price', 'stop_loss', 'created_at'],
      include: [approvedAdvisorInclude],
      order: [['created_at', 'DESC']],
      limit: 500,
    });
    const tally = { buy: 0, sell: 0, hold: 0 };
    for (const r of rows) if (tally[r.action] !== undefined) tally[r.action] += 1;
    const latest = rows[0] ? {
      action: rows[0].action,
      target_price: rows[0].target_price,
      stop_loss: rows[0].stop_loss,
      advisor_name: rows[0].Advisor ? (rows[0].Advisor.display_name || rows[0].Advisor.name) : null,
      created_at: rows[0].created_at,
    } : null;
    res.json({ symbol, ...tally, total: rows.length, latest });
  } catch (error) {
    serverError(res, 'recommendation summary', error);
  }
});

// Get recommendations by stock (active calls from approved advisors)
recommendationRouter.get('/stock/:symbol', async (req, res) => {
  try {
    const symbol = String(req.params.symbol || '').slice(0, 32).toUpperCase();
    const recommendations = await db.AdvisorRecommendation.findAll({
      where: { stock_symbol: symbol, status: 'active' },
      include: [approvedAdvisorInclude],
      order: [['created_at', 'DESC']],
      limit: 20
    });
    res.json(recommendations);
  } catch (error) {
    serverError(res, 'recommendations by stock', error);
  }
});

recommendationRouter.get('/', optionalAuthenticate, recommendationController.list);
recommendationRouter.get('/:id', optionalAuthenticate, recommendationController.get);
recommendationRouter.post('/', authMiddleware, advisorOnly, async (req, res) => {
  try {
    const parsed = V.validateRecommendation(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const created = await db.AdvisorRecommendation.create({ ...parsed.value, advisor_id: req.advisor.id });
    res.status(201).json(withDates(created));
  } catch (error) {
    serverError(res, 'create recommendation', error);
  }
});
recommendationRouter.put('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorRecommendation, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    const parsed = V.validateRecommendation(req.body, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    await row.update({ ...parsed.value, updated_at: new Date() });
    res.json(withDates(row));
  } catch (error) {
    serverError(res, 'update recommendation', error);
  }
});
recommendationRouter.delete('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorRecommendation, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    await row.destroy();
    res.json({ success: true });
  } catch (error) {
    serverError(res, 'delete recommendation', error);
  }
});
router.use('/recommendations', recommendationRouter);

// Advisor Pledge Commissions ---------------------------------------------------
// A commission row is money (the pledge tracker and payouts read it). The
// generic CRUD let an advisor create, edit and delete their own rows, including
// amount and status. Reads stay owner-scoped; writes are staff-only.
const commissionRouter = express.Router();
const commissionController = createCrudController(db.AdvisorPledgeCommission, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: advisorOwned
});

// Get advisor's commissions
commissionRouter.get('/my-commissions', authMiddleware, async (req, res) => {
  try {
    // advisor_id is the Advisor row id, not the user id.
    const advisorId = await resolveAdvisorId(req);
    if (!advisorId) return res.json([]);

    const commissions = await db.AdvisorPledgeCommission.findAll({
      where: { advisor_id: advisorId },
      order: [['created_at', 'DESC']],
      limit: 200
    });
    res.json(commissions);
  } catch (error) {
    serverError(res, 'my-commissions', error);
  }
});

// Advisor Plans (Subscription Plans linked to advisor) ---------------------
// Reads are public (users compare plans before subscribing). Writes: an
// approved advisor manages only their own plans; the price the checkout charges
// is read from this row, so every field is validated and whitelisted here.
const planRouter = express.Router();
const planController = createCrudController(db.SubscriptionPlan, {
  defaultOrderBy: 'price',
  defaultOrder: 'ASC',
  ownership: { ...advisorOwned, publicRead: true }
});
// The advisor's own plans, active or not (the public list below hides nothing but
// is filtered by the client; this one is the dashboard's source of truth).
planRouter.get('/mine', authMiddleware, advisorOnly, async (req, res) => {
  try {
    const plans = await db.SubscriptionPlan.findAll({ where: { advisor_id: req.advisor.id }, order: [['price', 'ASC']], limit: 20 });
    res.json(await limits.attachLimits(plans.map(withDates)));
  } catch (error) {
    serverError(res, 'my plans', error);
  }
});

// The generic list/get answer through res.json; add the recommendation limit in
// force to each plan on the way out (no limit -> nulls; never fails the list).
const withPlanLimits = (req, res, next) => {
  const send = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 || !body || typeof body !== 'object') return send(body);
    const plain = (r) => (r && typeof r.toJSON === 'function' ? r.toJSON() : r);
    const rows = Array.isArray(body) ? body.map(plain) : [plain(body)];
    limits.attachLimits(rows.filter((r) => r && r.id))
      .then((enriched) => {
        const byId = new Map(enriched.map((r) => [r.id, r]));
        const merge = (r) => (r && byId.has(r.id) ? byId.get(r.id) : r);
        send(Array.isArray(body) ? rows.map(merge) : merge(rows[0]));
      })
      .catch(() => send(body));
    return res;
  };
  next();
};
planRouter.get('/', optionalAuthenticate, withPlanLimits, planController.list);
planRouter.get('/:id', optionalAuthenticate, withPlanLimits, planController.get);

planRouter.post('/', authMiddleware, advisorOnly, async (req, res) => {
  try {
    const parsed = V.validatePlan(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const existing = await db.SubscriptionPlan.count({ where: { advisor_id: req.advisor.id } });
    if (existing >= V.MAX_PLANS_PER_ADVISOR) {
      return res.status(409).json({ error: `You can have at most ${V.MAX_PLANS_PER_ADVISOR} plans` });
    }
    // Unlimited (null) needs no history row, so it must not depend on the tables.
    const wantsLimit = Boolean(parsed.limit) && parsed.limit.limit_count !== null;
    if (wantsLimit && !(await limits.tablesAvailable())) return res.status(503).json(LIMITS_UNAVAILABLE);
    const planValues = {
      ...parsed.value,
      is_active: parsed.value.is_active !== false,
      advisor_id: req.advisor.id,
      finfluencer_id: null,
      is_system_plan: false,
    };
    let created;
    if (wantsLimit) {
      created = await db.sequelize.transaction(async (t) => {
        const plan = await db.SubscriptionPlan.create(planValues, { transaction: t });
        await limits.setLimit({ plan, userId: req.user.id, limit: parsed.limit, transaction: t });
        return plan;
      });
    } else {
      created = await db.SubscriptionPlan.create(planValues);
    }
    const [view] = await limits.attachLimits([withDates(created)]);
    res.status(201).json(view);
  } catch (error) {
    serverError(res, 'create plan', error);
  }
});

planRouter.put('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    // Never a platform plan: those belong to the subscription admin screens.
    const plan = await findWritable(db.SubscriptionPlan, req);
    if (!plan || !plan.advisor_id || plan.is_system_plan) return res.status(404).json({ error: 'Record not found' });
    const parsed = V.validatePlan(req.body, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (parsed.limit) {
      // Limits belong to the plan's own advisor; staff moderate plans but do not set them.
      if (req.staff) return res.status(403).json({ error: 'Only the advisor who owns this plan can change its recommendation limit' });
      const available = await limits.tablesAvailable();
      // Setting a limit needs the tables; "unlimited" while they are missing is a no-op, not an error.
      if (!available && parsed.limit.limit_count !== null) return res.status(503).json(LIMITS_UNAVAILABLE);
      if (available) {
        await db.sequelize.transaction(async (t) => {
          await plan.update({ ...parsed.value, updated_at: new Date() }, { transaction: t });
          await limits.setLimit({ plan, userId: req.user.id, limit: parsed.limit, transaction: t });
        });
      } else {
        await plan.update({ ...parsed.value, updated_at: new Date() });
      }
    } else {
      await plan.update({ ...parsed.value, updated_at: new Date() });
    }
    const [view] = await limits.attachLimits([withDates(plan)]);
    res.json(view);
  } catch (error) {
    serverError(res, 'update plan', error);
  }
});

planRouter.delete('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const plan = await findWritable(db.SubscriptionPlan, req);
    if (!plan || !plan.advisor_id || plan.is_system_plan) return res.status(404).json({ error: 'Record not found' });
    const active = await db.Subscription.count({ where: { plan_id: plan.id, status: 'active' } });
    if (active > 0) {
      return res.status(409).json({ error: `This plan has ${active} active subscriber${active > 1 ? 's' : ''}. Deactivate it instead.` });
    }
    await plan.destroy();
    res.json({ success: true });
  } catch (error) {
    serverError(res, 'delete plan', error);
  }
});
router.use('/plans', planRouter);

// Advisor Posts --------------------------------------------------------------
const { advisorPostsSchemaGuard, blockPostWritesWhenDegraded } = require('../utils/schemaGuard');
const postRouter = express.Router();
// Posts need migration 014's columns; degrade to read-only instead of 500s until it is applied.
postRouter.use(advisorPostsSchemaGuard);
const POST_SORT = [['created_at', 'DESC']];

const ownPlanIds = async (advisorId) => {
  const plans = await db.SubscriptionPlan.findAll({ where: { advisor_id: advisorId }, attributes: ['id'] });
  return plans.map((p) => p.id);
};

// viewerAccess / canRead: utils/advisorPostAccess.js (shared with Content Moderation).


/**
 * In-app notification to the subscribers entitled to a newly published post
 * (all active subscribers for a public post or "any subscriber" post; only
 * those on the required plan or dearer otherwise). Best effort and bounded: it
 * never fails the publish. Returns how many were notified.
 */
async function notifyPostSubscribers(advisor, post) {
  try {
    const [plans, subs] = await Promise.all([
      db.SubscriptionPlan.findAll({ where: { advisor_id: advisor.id }, attributes: ['id', 'price'] }),
      db.Subscription.findAll({ where: { advisor_id: advisor.id, status: 'active' }, limit: 500 }),
    ]);
    const now = Date.now();
    const required = plans.find((p) => p.id === post.required_plan_id);
    const entitled = subs.filter((sub) => {
      if (sub.end_date && new Date(sub.end_date).getTime() <= now) return false;
      if (!required || post.visibility === 'public') return true;
      const plan = plans.find((p) => p.id === sub.plan_id);
      return plan ? Number(plan.price) >= Number(required.price) : false;
    });
    const userIds = [...new Set(entitled.map((s) => s.user_id).filter(Boolean))];
    if (userIds.length === 0) return 0;
    const name = advisor.display_name || 'Your advisor';
    await db.Notification.bulkCreate(userIds.map((userId) => ({
      user_id: userId,
      type: 'advisor_post',
      title: `New advisory from ${name}`,
      message: String(post.title || 'A new advisory is available').slice(0, 200),
      is_read: false,
      data: { advisor_id: advisor.id, post_id: post.id },
      action_url: `/AdvisorProfile?id=${advisor.id}`,
      priority: 'normal',
    })));
    return userIds.length;
  } catch (e) {
    console.error('[advisor.routes.js] post notifications failed:', e.message);
    return 0;
  }
}


/** Notifies on the first publication only, recorded in notified_at. Returns the count. */
async function notifyOnFirstPublish(advisor, post) {
  if (post.status !== 'published' || post.notified_at) return 0;
  const count = await notifyPostSubscribers(advisor, post);
  try {
    await post.update({ notified_at: new Date() });
  } catch (e) {
    console.error('[advisor.routes.js] could not record notified_at:', e.message);
  }
  return count;
}

// What a subscriber/public reader sees of a post. Locked posts expose only a
// teaser: the content, symbol, targets and call are withheld server-side.
const serializePost = (row, locked, plans) => {
  const r = withDates(row);
  const plan = plans.find((p) => p.id === r.required_plan_id);
  const base = {
    id: r.id, advisor_id: r.advisor_id, post_type: r.post_type,
    visibility: r.visibility, required_plan_id: r.required_plan_id || null,
    required_plan_name: plan ? plan.name : null,
    created_at: r.created_at, created_date: r.created_date,
  };
  // The title is withheld too: "Buy Apple" gives the call away.
  if (locked) return { ...base, title: null, locked: true };
  return {
    ...base, title: r.title, locked: false,
    content: r.content, stock_symbol: r.stock_symbol, recommendation_type: r.recommendation_type,
    target_price: r.target_price, stop_loss: r.stop_loss, time_horizon: r.time_horizon,
  };
};

// Public / subscriber feed for one advisor's published posts.
postRouter.get('/by-advisor/:advisorId', optionalAuthenticate, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.advisorId)) return res.status(404).json({ error: 'Advisor not found' });
    const advisor = await db.Advisor.findByPk(req.params.advisorId);
    const mayPeek = advisor && req.user?.id && (isStaff(req.user) || String(advisor.user_id) === String(req.user.id));
    if (!advisor || (advisor.status !== 'approved' && !mayPeek)) {
      return res.status(404).json({ error: 'Advisor not found' });
    }
    const { limit, offset } = pageOf(req, 20, 50);
    const [plans, rows] = await Promise.all([
      db.SubscriptionPlan.findAll({ where: { advisor_id: advisor.id }, attributes: ['id', 'name', 'price'] }),
      db.AdvisorPost.findAll({ where: { advisor_id: advisor.id, status: 'published' }, order: POST_SORT, limit, offset }),
    ]);
    // ?preview=member lets the advisor / staff see the feed as a signed-out,
    // non-subscribed member would. It can only reduce access, never add any.
    const access = req.query.preview === 'member'
      ? { owner: false, planPrice: null }
      : await viewerAccess(req.user, advisor, plans);
    res.json(rows.map((row) => serializePost(row, !canRead(row, access, plans), plans)));
  } catch (error) {
    serverError(res, 'advisor feed', error);
  }
});

// The advisor's own posts (all statuses). Staff may list any advisor's.
postRouter.get('/', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const { limit, offset } = pageOf(req, 50, 200);
    const where = {};
    if (req.staff) {
      if (typeof req.query.advisor_id === 'string' && UUID_RE.test(req.query.advisor_id)) where.advisor_id = req.query.advisor_id;
    } else {
      where.advisor_id = req.advisor.id;
    }
    if (typeof req.query.status === 'string' && ['draft', 'published'].includes(req.query.status)) where.status = req.query.status;
    const rows = await db.AdvisorPost.findAll({ where, order: POST_SORT, limit, offset });
    res.json(rows.map(withDates));
  } catch (error) {
    serverError(res, 'list posts', error);
  }
});

// Recommendation usage tracker: the advisor's own plans only.
postRouter.get('/usage', authMiddleware, advisorOnly, async (req, res) => {
  try {
    if (!(await limits.tablesAvailable())) return res.status(503).json(LIMITS_UNAVAILABLE);
    const postId = typeof req.query.post_id === 'string' && UUID_RE.test(req.query.post_id) ? req.query.post_id : null;
    res.json(await limits.usageForAdvisor(req.advisor.id, { postId }));
  } catch (error) {
    serverError(res, 'post usage', error);
  }
});

postRouter.get('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorPost, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json(withDates(row));
  } catch (error) {
    serverError(res, 'get post', error);
  }
});

postRouter.post('/', authMiddleware, advisorOnly, blockPostWritesWhenDegraded, async (req, res) => {
  try {
    const parsed = V.validatePost(req.body, await ownPlanIds(req.advisor.id));
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const values = {
      ...parsed.value,
      id: crypto.randomUUID(),
      post_type: parsed.value.post_type || (parsed.value.recommendation_type ? 'recommendation' : 'analysis'),
      advisor_id: req.advisor.id,
      likes_count: 0,
      comments_count: 0,
      is_pinned: false,
    };
    // A published subscriber-only recommendation spends plan allowance: check
    // and record it in one transaction, before the post exists, so a refusal
    // leaves nothing behind.
    const created = limits.countsAgainstLimit(values) && (await limits.tablesAvailable())
      ? await db.sequelize.transaction(async (t) => {
        // reserve() starts with SELECT ... FOR UPDATE on the plan rows; keep it
        // the first statement (REPEATABLE READ snapshots at the first plain read).
        await limits.reserve(req.advisor.id, values, { transaction: t });
        return db.AdvisorPost.create(values, { transaction: t });
      })
      : await db.AdvisorPost.create(values);
    const notified = await notifyOnFirstPublish(req.advisor, created);
    res.status(201).json({ ...withDates(created), notified_subscribers: notified });
  } catch (error) {
    if (error instanceof limits.PostLimitError) return res.status(409).json({ error: error.message, ...error.details });
    serverError(res, 'create post', error);
  }
});

postRouter.put('/:id', authMiddleware, advisorOrStaff, blockPostWritesWhenDegraded, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorPost, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    // Removed by a moderator: the advisor may neither edit nor republish it.
    // Staff may (setting it back to draft/published lifts the lock).
    if (!req.staff && isModerationLocked(row)) {
      return res.status(403).json({ error: 'This post was removed by the moderation team and cannot be edited or republished.', code: 'MODERATION_LOCKED' });
    }
    const parsed = V.validatePost(req.body, await ownPlanIds(row.advisor_id), { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const wasPublished = row.status === 'published';
    const patch = { ...parsed.value, updated_at: new Date() };
    // The post as it will be stored: a draft being published, or a live
    // recommendation whose audience widens, may reach plans it has not used yet.
    const previous = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
    const finalPost = { ...(typeof row.toJSON === 'function' ? row.toJSON() : row), ...parsed.value };
    if (limits.countsAgainstLimit(finalPost) && (await limits.tablesAvailable())) {
      await db.sequelize.transaction(async (t) => {
        // reserve() starts with SELECT ... FOR UPDATE on the plan rows; keep it
        // the first statement (REPEATABLE READ snapshots at the first plain read).
        // Plans the post reached before this edit are not charged again.
        // Staff moderation is never blocked by an advisor's allowance.
        await limits.reserve(row.advisor_id, { ...finalPost, id: row.id }, { transaction: t, enforce: !req.staff, previous });
        await row.update(patch, { transaction: t });
      });
    } else {
      await row.update(patch);
    }
    // Subscribers hear about a post once: when it first goes live (notified_at is
    // the record). Editing a live post never notifies, and neither does
    // unpublishing and republishing.
    const notified = !wasPublished && req.advisor ? await notifyOnFirstPublish(req.advisor, row) : 0;
    res.json({ ...withDates(row), notified_subscribers: notified });
  } catch (error) {
    if (error instanceof limits.PostLimitError) return res.status(409).json({ error: error.message, ...error.details });
    serverError(res, 'update post', error);
  }
});

postRouter.delete('/:id', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorPost, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    await row.destroy();
    res.json({ success: true });
  } catch (error) {
    serverError(res, 'delete post', error);
  }
});
router.use('/posts', postRouter);

// ---------------------------------------------------------------------------
// Advisor Subscriptions (read-only view for the Advisor Dashboard)
//
// This previously mounted an unguarded CRUD controller over db.Subscription,
// which exposed every user's billing row to anonymous callers — a second door
// around the controls on /api/subscriptions. It is now a single purpose-built
// read endpoint: an advisor sees subscriptions to their OWN plans and nothing
// else, and staff see everything.
// ---------------------------------------------------------------------------
const subRouter = express.Router();

subRouter.get('/my-subscribers', authMiddleware, advisorOrStaff, async (req, res) => {
  try {
    const { limit, offset } = pageOf(req, 100, 200);
    const where = {};
    let plans;
    if (req.staff) {
      if (typeof req.query.advisor_id === 'string' && UUID_RE.test(req.query.advisor_id)) where.advisor_id = req.query.advisor_id;
      plans = await db.SubscriptionPlan.findAll({ where: where.advisor_id ? { advisor_id: where.advisor_id } : {}, attributes: ['id', 'name', 'price'], limit: 500 });
    } else {
      // Only subscriptions attached to this advisor's own plans / this advisor.
      plans = await db.SubscriptionPlan.findAll({ where: { advisor_id: req.advisor.id }, attributes: ['id', 'name', 'price'] });
      const planIds = plans.map((p) => p.id);
      where[Op.or] = [{ advisor_id: req.advisor.id }, ...(planIds.length ? [{ plan_id: { [Op.in]: planIds } }] : [])];
    }

    const subscriptions = await db.Subscription.findAll({ where, order: [['created_at', 'DESC']], limit, offset });

    // Subscribers are identified by name only: an advisor does not get their
    // customers' e-mail address or payment references.
    const userIds = [...new Set(subscriptions.map((s) => s.user_id).filter(Boolean))];
    const users = userIds.length
      ? await db.User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'display_name'] })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, u.display_name || u.name]));
    const planOf = new Map(plans.map((p) => [p.id, p]));
    const now = Date.now();

    res.json(subscriptions.map((sub) => {
      const plan = planOf.get(sub.plan_id);
      const ended = sub.end_date && new Date(sub.end_date).getTime() <= now;
      const row = {
        id: sub.id,
        plan_id: sub.plan_id,
        plan_name: plan ? plan.name : null,
        plan_price: plan ? Number(plan.price) : null,
        advisor_id: sub.advisor_id,
        status: sub.status === 'active' && ended ? 'expired' : sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        auto_renew: Boolean(sub.auto_renew),
        subscriber_name: nameOf.get(sub.user_id) || 'Subscriber',
        created_at: sub.created_at,
        created_date: sub.created_at,
      };
      if (req.staff) row.user_id = sub.user_id;
      return row;
    }));
  } catch (error) {
    console.error('Advisor subscribers lookup failed:', error.message);
    res.status(500).json({ error: 'Could not load subscribers' });
  }
});

/**
 * Secured CRUD, kept so existing callers keep working:
 *  - a user sees only their own subscription rows (AdvisorProfile checks
 *    whether the viewer is subscribed);
 *  - staff see everything (superadmin Advisor Management / Subscription Audit);
 *  - advisors use /my-subscribers above for their own plan subscribers.
 */
createCrudRoutes(
  subRouter,
  createCrudController(db.Subscription, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC',
    ownership: 'user_id',
  }),
  // Reads stay as described above. Writes are staff-only: an advisor
  // subscription exists only because a verified payment created it
  // (POST /payments/verify). A client-created row was a free subscription.
  { read: [authMiddleware], write: [authMiddleware, adminMiddleware] }
);

router.use('/subscriptions', subRouter);

createCrudRoutes(commissionRouter, commissionController, { read: [authMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/pledge-commissions', commissionRouter);

module.exports = router;
