/**
 * Who may read an advisor's post, and the moderation lock on removed posts.
 *
 * Shared by the advisor feed (routes/advisor.routes.js) and Content Moderation
 * (services/ModerationService.js), so a member can only report a post they are
 * actually allowed to read, by the same rule the feed applies.
 */
const db = require('../models');
const { isStaff } = require('../controllers/AdvisorDirectoryController');

/**
 * advisor_posts.status a moderator's "Remove content" sets. Owners can only
 * ever write 'draft' or 'published' (advisorValidation POST_STATUSES), so this
 * value means "removed by moderation": owners may not edit or republish it;
 * staff may (that is how the lock is lifted). 'archived' exists in both the
 * migration 004 ENUM and the sync()-created VARCHAR, so no migration is needed.
 */
const MODERATION_REMOVED_STATUS = 'archived';

const isModerationLocked = (post) => Boolean(post) && post.status === MODERATION_REMOVED_STATUS;

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

module.exports = { MODERATION_REMOVED_STATUS, isModerationLocked, viewerAccess, canRead };
