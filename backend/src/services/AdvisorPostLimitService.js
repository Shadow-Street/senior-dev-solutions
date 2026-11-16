/**
 * Advisor recommendation limits and the usage tracker.
 *
 *  - A plan may carry a limit: limit_count per limit_period ('week' | 'month').
 *    Weekly limit W -> monthly cap 4 x W; monthly limit M -> no weekly cap.
 *  - Weeks run Monday-Sunday and months are calendar months, in Asia/Kolkata.
 *  - The limit in force is the latest advisor_plan_limits row with
 *    effective_from <= now (history is insert-only).
 *  - advisor_post_usage is the ledger: one row per (post, plan), written the
 *    first time a published subscriber-only recommendation reaches the plan,
 *    never deleted. Counters are ledger rows inside the current window.
 *  - Allowance is checked and the ledger written inside a transaction that locks
 *    the advisor's plan rows, so two simultaneous publishes cannot both pass.
 *
 * If the tables do not exist yet (sync failed / migration pending) the limits
 * are skipped (logged) rather than blocking posting; see tablesAvailable().
 */
const db = require('../models');

const TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // India has no DST
const WEEKS_PER_MONTH_CAP = 4;
const MAX_LIMIT = 1000;
const PERIODS = ['week', 'month'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class PostLimitError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'PostLimitError';
    this.status = 409;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Windows (IST)
// ---------------------------------------------------------------------------
const toIst = (d) => new Date(d.getTime() + IST_OFFSET_MS); // read with getUTC*
const fromIst = (ms) => new Date(ms - IST_OFFSET_MS);

/** [start, end) of the Monday-Sunday week (IST) containing `now`. */
function weekWindow(now = new Date()) {
  const ist = toIst(now);
  const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const sinceMonday = (ist.getUTCDay() + 6) % 7;
  const startIst = midnight - sinceMonday * 86400000;
  return { start: fromIst(startIst), end: fromIst(startIst + 7 * 86400000) };
}

/** [start, end) of the calendar month (IST) containing `now`. */
function monthWindow(now = new Date()) {
  const ist = toIst(now);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  return { start: fromIst(Date.UTC(y, m, 1)), end: fromIst(Date.UTC(y, m + 1, 1)) };
}

/** "Mon 16 Nov" in IST. */
function formatReset(date) {
  const ist = toIst(date);
  return `${DAY_NAMES[ist.getUTCDay()]} ${ist.getUTCDate()} ${MONTH_NAMES[ist.getUTCMonth()]}`;
}

// ---------------------------------------------------------------------------
// What counts and which plans it reaches
// ---------------------------------------------------------------------------
/** A published, subscriber-only recommendation. Drafts and public posts never count. */
function countsAgainstLimit(post) {
  if (!post || post.status !== 'published' || post.visibility !== 'subscribers') return false;
  if (post.post_type === 'recommendation' || Boolean(post.recommendation_type)) return true;
  // A stock call filed under another type (analysis/update) is still a call:
  // a symbol with a target or stop loss counts, so the type cannot be used to
  // get around the plan's limit.
  const has = (v) => v !== null && v !== undefined && v !== '';
  return has(post.stock_symbol) && (has(post.target_price) || has(post.stop_loss));
}

/**
 * Plans whose subscribers may read the post (same rule as canRead /
 * notifyPostSubscribers): no required plan -> every plan of the advisor;
 * required plan P -> P and every plan priced >= P. A required plan that no
 * longer exists locks nobody out, so it reaches every plan.
 */
function reachedPlans(post, plans) {
  if (!post.required_plan_id) return plans;
  const required = plans.find((p) => p.id === post.required_plan_id);
  if (!required) return plans;
  return plans.filter((p) => p.id === required.id || Number(p.price) >= Number(required.price));
}

/** Caps for a limit: weekly W -> { week: W, month: 4W }; monthly M -> { week: null, month: M }. */
function capsFor(limit) {
  if (!limit || limit.limit_count === null || limit.limit_count === undefined) return { week: null, month: null };
  const n = Number(limit.limit_count);
  return limit.limit_period === 'month'
    ? { week: null, month: n }
    : { week: n, month: n * WEEKS_PER_MONTH_CAP };
}

// ---------------------------------------------------------------------------
// Tables available? (cached, like utils/schemaGuard.js)
// ---------------------------------------------------------------------------
const RETRY_MS = 30000;
let state = null; // { ok, at }

async function tablesAvailable() {
  if (state && (state.ok || Date.now() - state.at < RETRY_MS)) return state.ok;
  try {
    const qi = db.sequelize.getQueryInterface();
    await qi.describeTable('advisor_plan_limits');
    await qi.describeTable('advisor_post_usage');
    state = { ok: true, at: Date.now() };
  } catch (e) {
    console.error('[AdvisorPostLimitService] limit tables unavailable; limits are not enforced:', e.message);
    state = { ok: false, at: Date.now() };
  }
  return state.ok;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
const at = (v) => new Date(v).getTime();

/** Map planId -> the limit row in force at `now` (rows with no entry have no limit). */
async function limitsInForce(planIds, now = new Date(), { transaction } = {}) {
  const out = new Map();
  if (!planIds.length) return out;
  const { Op } = db.Sequelize;
  const rows = await db.AdvisorPlanLimit.findAll({
    where: { plan_id: { [Op.in]: planIds }, effective_from: { [Op.lte]: now } },
    transaction,
  });
  const sorted = [...rows].sort((a, b) => at(b.effective_from) - at(a.effective_from) || at(b.created_at) - at(a.created_at));
  for (const r of sorted) if (!out.has(r.plan_id)) out.set(r.plan_id, r);
  return out;
}

async function usedIn(planId, window, { transaction } = {}) {
  const { Op } = db.Sequelize;
  return db.AdvisorPostUsage.count({
    where: { plan_id: planId, published_at: { [Op.gte]: window.start, [Op.lt]: window.end } },
    transaction,
  });
}

const counter = (used, cap, window) => ({
  used,
  cap,
  remaining: cap === null ? null : Math.max(cap - used, 0),
  starts_at: window.start.toISOString(),
  resets_at: window.end.toISOString(),
});

/** Public shape of the limit in force, for plan lists. */
const limitView = (row) => (row
  ? { limit_count: row.limit_count === null || row.limit_count === undefined ? null : Number(row.limit_count), limit_period: row.limit_period, limit_effective_from: row.effective_from }
  : { limit_count: null, limit_period: null, limit_effective_from: null });

/** Attaches the limit in force to plans (plain objects). Never throws: plan lists must still load. */
async function attachLimits(plans, now = new Date()) {
  const list = Array.isArray(plans) ? plans : [];
  if (!list.length || !(await tablesAvailable())) return list.map((p) => ({ ...p, ...limitView(null) }));
  try {
    const map = await limitsInForce(list.map((p) => p.id), now);
    return list.map((p) => ({ ...p, ...limitView(map.get(p.id)) }));
  } catch (e) {
    console.error('[AdvisorPostLimitService] could not read plan limits:', e.message);
    return list.map((p) => ({ ...p, ...limitView(null) }));
  }
}

/** Per-plan tracker for one advisor. */
async function usageForAdvisor(advisorId, { now = new Date(), postId = null } = {}) {
  const plans = await db.SubscriptionPlan.findAll({ where: { advisor_id: advisorId }, order: [['price', 'ASC']], limit: 20 });
  const limits = await limitsInForce(plans.map((p) => p.id), now);
  const wk = weekWindow(now);
  const mo = monthWindow(now);
  const out = [];
  for (const plan of plans) {
    const lim = limits.get(plan.id) || null;
    const caps = capsFor(lim);
    out.push({
      plan_id: plan.id,
      plan_name: plan.name,
      price: Number(plan.price),
      is_active: plan.is_active !== false,
      limit_count: lim && lim.limit_count !== null && lim.limit_count !== undefined ? Number(lim.limit_count) : null,
      limit_period: lim ? lim.limit_period : null,
      effective_from: lim ? lim.effective_from : null,
      week: counter(await usedIn(plan.id, wk), caps.week, wk),
      month: counter(await usedIn(plan.id, mo), caps.month, mo),
    });
  }
  let counted = [];
  if (postId) {
    const rows = await db.AdvisorPostUsage.findAll({ where: { advisor_id: advisorId, post_id: postId }, limit: 50 });
    counted = rows.map((r) => r.plan_id);
  }
  return { timezone: TZ, generated_at: now.toISOString(), plans: out, counted_plan_ids: counted };
}

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------
/**
 * Call inside `sequelize.transaction`. `finalPost` is the post as it will be
 * stored (must carry id). Locks the advisor's plan rows, checks the allowance of
 * every reached plan that has no ledger row for this post yet, then writes the
 * ledger rows. Throws PostLimitError (409) when a plan is exhausted unless
 * `enforce` is false (staff moderation still records usage). No-op for posts
 * that do not count.
 */
async function reserve(advisorId, finalPost, { transaction, now = new Date(), enforce = true, previous = null } = {}) {
  if (!countsAgainstLimit(finalPost)) return { recorded: 0 };
  // The FOR UPDATE on the plan rows must be the first statement of the
  // transaction (InnoDB REPEATABLE READ takes its snapshot at the first plain read).
  const plans = await db.SubscriptionPlan.findAll({
    where: { advisor_id: advisorId },
    attributes: ['id', 'name', 'price'],
    transaction,
    lock: transaction && transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
  });
  const reached = reachedPlans(finalPost, plans);
  if (!reached.length) return { recorded: 0 };
  const existing = await db.AdvisorPostUsage.findAll({ where: { post_id: finalPost.id }, transaction });
  const have = new Set(existing.map((r) => r.plan_id));
  // Plans the post ALREADY reached before this edit were charged when it went
  // live (or predate the tracker): editing a live post never charges them again,
  // writes no ledger row for them and never checks them against the allowance.
  const before = new Set(countsAgainstLimit(previous) ? reachedPlans(previous, plans).map((p) => p.id) : []);
  const fresh = reached.filter((p) => !have.has(p.id) && !before.has(p.id));
  if (!fresh.length) return { recorded: 0 };

  const limits = await limitsInForce(fresh.map((p) => p.id), now, { transaction });
  const wk = weekWindow(now);
  const mo = monthWindow(now);
  for (const plan of fresh) {
    const caps = capsFor(limits.get(plan.id));
    if (caps.week === null && caps.month === null) continue;
    const [usedWeek, usedMonth] = await Promise.all([usedIn(plan.id, wk, { transaction }), usedIn(plan.id, mo, { transaction })]);
    const monthFull = caps.month !== null && usedMonth >= caps.month;
    const weekFull = caps.week !== null && usedWeek >= caps.week;
    if ((monthFull || weekFull) && enforce) {
      // Both full: the month is the longer wait, so that is the date to show.
      const scope = monthFull ? 'month' : 'week';
      const used = scope === 'month' ? usedMonth : usedWeek;
      const cap = scope === 'month' ? caps.month : caps.week;
      const window = scope === 'month' ? mo : wk;
      throw new PostLimitError(
        `${plan.name} has used ${used} of ${cap} recommendation${cap === 1 ? '' : 's'} this ${scope}. It resets on ${formatReset(window.end)}.`,
        { code: 'POST_LIMIT_REACHED', plan_id: plan.id, plan_name: plan.name, scope, used, cap, resets_at: window.end.toISOString() },
      );
    }
  }
  for (const plan of fresh) {
    await db.AdvisorPostUsage.create({ advisor_id: advisorId, plan_id: plan.id, post_id: finalPost.id, published_at: now }, { transaction });
  }
  return { recorded: fresh.length };
}

/**
 * Records a new limit for a plan when it differs from the one in force.
 * Returns the inserted row or null when nothing changed.
 */
async function setLimit({ plan, userId, limit, now = new Date(), transaction }) {
  const current = (await limitsInForce([plan.id], now, { transaction })).get(plan.id) || null;
  const nextCount = limit.limit_count === undefined ? null : limit.limit_count;
  const same = current
    ? Number(current.limit_count ?? -1) === Number(nextCount ?? -1) && (nextCount === null || current.limit_period === limit.limit_period)
    : nextCount === null;
  if (same) return null;
  return db.AdvisorPlanLimit.create({
    plan_id: plan.id,
    advisor_id: plan.advisor_id,
    limit_count: nextCount,
    limit_period: limit.limit_period || (current ? current.limit_period : 'week'),
    effective_from: now,
    created_by: userId || null,
  }, { transaction });
}

module.exports = {
  TZ, MAX_LIMIT, PERIODS, WEEKS_PER_MONTH_CAP, PostLimitError,
  weekWindow, monthWindow, formatReset, countsAgainstLimit, reachedPlans, capsFor,
  tablesAvailable, limitsInForce, attachLimits, usageForAdvisor, reserve, setLimit, limitView,
  _reset: () => { state = null; },
};
