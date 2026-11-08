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
    res.json(plans.map(withDates));
  } catch (error) {
    serverError(res, 'my plans', error);
  }
});
planRouter.get('/', optionalAuthenticate, planController.list);
planRouter.get('/:id', optionalAuthenticate, planController.get);

planRouter.post('/', authMiddleware, advisorOnly, async (req, res) => {
  try {
    const parsed = V.validatePlan(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const existing = await db.SubscriptionPlan.count({ where: { advisor_id: req.advisor.id } });
    if (existing >= V.MAX_PLANS_PER_ADVISOR) {
      return res.status(409).json({ error: `You can have at most ${V.MAX_PLANS_PER_ADVISOR} plans` });
    }
    const created = await db.SubscriptionPlan.create({
      ...parsed.value,
      is_active: parsed.value.is_active !== false,
      advisor_id: req.advisor.id,
      finfluencer_id: null,
      is_system_plan: false,
    });
    res.status(201).json(withDates(created));
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
    await plan.update({ ...parsed.value, updated_at: new Date() });
    res.json(withDates(plan));
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

/**
 * What a viewer may read of an advisor's posts.
 * Returns { owner, planPrice } where planPrice is the highest price among the
 * viewer's current subscriptions to this advisor (null = not subscribed).
 */
async function viewerAccess(user, advisor, plans) {
  if (!user?.id) return { owner: false, planPrice: null };
  if (isStaff(user) || String(advisor.user_id) === String(user.id)) return { owner: true, planPrice: null };
  const subs = await db.Subscription.findAll({
    where: { user_id: user.id, advisor_id: advisor.id, status: 'active' },
    limit: 20,
  });
  const now = Date.now();
  let best = null;
  for (const sub of subs) {
    if (sub.end_date && new Date(sub.end_date).getTime() <= now) continue;
    const plan = plans.find((p) => p.id === sub.plan_id);
    const price = plan ? Number(plan.price) : 0;
    if (best === null || price > best) best = price;
  }
  return { owner: false, planPrice: best };
}

const canRead = (post, access, plans) => {
  if (access.owner) return true;
  if (post.visibility === 'public') return true;
  if (access.planPrice === null) return false;
  if (!post.required_plan_id) return true;
  const required = plans.find((p) => p.id === post.required_plan_id);
  // A tier that no longer exists must not lock subscribers out.
  return !required || access.planPrice >= Number(required.price);
};


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
    id: r.id, advisor_id: r.advisor_id, title: r.title, post_type: r.post_type,
    visibility: r.visibility, required_plan_id: r.required_plan_id || null,
    required_plan_name: plan ? plan.name : null,
    created_at: r.created_at, created_date: r.created_date,
  };
  if (locked) return { ...base, locked: true };
  return {
    ...base, locked: false,
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
    const access = await viewerAccess(req.user, advisor, plans);
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
    const created = await db.AdvisorPost.create({
      ...parsed.value,
      post_type: parsed.value.post_type || (parsed.value.recommendation_type ? 'recommendation' : 'analysis'),
      advisor_id: req.advisor.id,
      likes_count: 0,
      comments_count: 0,
      is_pinned: false,
    });
    const notified = await notifyOnFirstPublish(req.advisor, created);
    res.status(201).json({ ...withDates(created), notified_subscribers: notified });
  } catch (error) {
    serverError(res, 'create post', error);
  }
});

postRouter.put('/:id', authMiddleware, advisorOrStaff, blockPostWritesWhenDegraded, async (req, res) => {
  try {
    const row = await findWritable(db.AdvisorPost, req);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    const parsed = V.validatePost(req.body, await ownPlanIds(row.advisor_id), { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const wasPublished = row.status === 'published';
    await row.update({ ...parsed.value, updated_at: new Date() });
    // Subscribers hear about a post once: when it first goes live (notified_at is
    // the record). Editing a live post never notifies, and neither does
    // unpublishing and republishing.
    const notified = !wasPublished && req.advisor ? await notifyOnFirstPublish(req.advisor, row) : 0;
    res.json({ ...withDates(row), notified_subscribers: notified });
  } catch (error) {
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
