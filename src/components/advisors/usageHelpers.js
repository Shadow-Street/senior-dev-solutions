/**
 * Pure helpers for the recommendation usage tracker (no React).
 * The server owns the numbers (GET /advisors/posts/usage); weeks run Monday to
 * Sunday and months are calendar months, in India time.
 */

/** "Mon 16 Nov" in India time. */
export function formatIstDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
    .format(d).replace(',', '');
}

const has = (v) => v !== null && v !== undefined && v !== '' && v !== 'none';

/**
 * Same rule as the server (AdvisorPostLimitService.countsAgainstLimit): a
 * published, subscriber-only recommendation, or a stock call (symbol with a
 * target or stop loss) filed under another post type. Drafts and public posts never count.
 */
export function countsAgainstLimit(post) {
  if (!post || post.status !== 'published' || post.visibility !== 'subscribers') return false;
  if (post.post_type === 'recommendation' || has(post.recommendation_type)) return true;
  return has(post.stock_symbol) && (has(post.target_price) || has(post.stop_loss));
}

/** Ids of the plans a post with this audience reaches (required plan and dearer; none required = all). */
export function reachedPlanIds(usage, requiredPlanId = null) {
  const plans = usage?.plans || [];
  const required = requiredPlanId ? plans.find((p) => p.plan_id === requiredPlanId) : null;
  return plans
    .filter((p) => !required || p.plan_id === required.plan_id || Number(p.price) >= Number(required.price))
    .map((p) => p.plan_id);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "2 recommendations / week", "10 recommendations / month" or "Unlimited recommendations". */
export function limitLabel(plan) {
  if (!plan.limit_count) return 'Unlimited recommendations';
  return `${plural(plan.limit_count, 'recommendation')} / ${plan.limit_period === 'month' ? 'month' : 'week'}`;
}

/**
 * What an audience can still publish. `reached` = plans the post would reach
 * that have not counted it yet. Returns { limited, blocked, blockedBy, tightest }.
 */
export function allowanceFor(usage, { requiredPlanId = null, countedPlanIds = [] } = {}) {
  const plans = usage?.plans || [];
  const required = requiredPlanId ? plans.find((p) => p.plan_id === requiredPlanId) : null;
  const reached = plans
    .filter((p) => !required || p.plan_id === required.plan_id || Number(p.price) >= Number(required.price))
    .filter((p) => !countedPlanIds.includes(p.plan_id));
  let tightest = null;
  let blockedBy = null;
  for (const plan of reached) {
    const left = [plan.week.remaining, plan.month.remaining].filter((n) => n !== null && n !== undefined);
    if (left.length === 0) continue;
    const min = Math.min(...left);
    if (tightest === null || min < tightest.remaining) tightest = { plan, remaining: min };
    if (min <= 0 && !blockedBy) blockedBy = plan;
  }
  return { limited: tightest !== null, blocked: Boolean(blockedBy), blockedBy, tightest };
}

/** Message for an exhausted plan, mirroring the server's 409. */
export function exhaustedMessage(plan) {
  const monthFull = plan.month.cap !== null && plan.month.remaining === 0;
  const scope = monthFull ? 'month' : 'week';
  const c = plan[scope];
  return `${plan.plan_name} has used ${c.used} of ${c.cap} recommendation${c.cap === 1 ? '' : 's'} this ${scope}. It resets on ${formatIstDate(c.resets_at)}.`;
}
