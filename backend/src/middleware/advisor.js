/**
 * Gate for advisor-only APIs.
 *
 * Passing requires ALL of:
 *   1. an authenticated user whose effective role (app_role || role) is
 *      "advisor" - a role only the admin review action grants;
 *   2. an advisors row owned by that user; and
 *   3. that row's status being "approved".
 *
 * (3) matters on its own: a suspended advisor whose role was not yet demoted,
 * or legacy data where the two drifted apart, must not keep publishing plans
 * or posts. A pending or rejected applicant fails (1) and (3).
 *
 * Sets req.advisor to the row on success.
 */
const db = require('../models');
const { effectiveRole } = require('../utils/roles');

async function requireApprovedAdvisor(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (effectiveRole(req.user) !== 'advisor') {
      return res.status(403).json({ error: 'Advisor access required' });
    }
    const advisor = await db.Advisor.findOne({ where: { user_id: req.user.id } });
    if (!advisor) return res.status(403).json({ error: 'Advisor profile required' });
    if (advisor.status !== 'approved') {
      return res.status(403).json({ error: 'Your advisor profile is not approved' });
    }
    req.advisor = advisor;
    return next();
  } catch (err) {
    console.error('[advisor middleware] lookup failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireApprovedAdvisor };
