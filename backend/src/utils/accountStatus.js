/**
 * Whether an account may sign in or use a session (SEC-21).
 *
 * Checked wherever a session is issued or used: AuthService.issueTokens
 * (password, Google, OTP verification, refresh), middleware/auth.js on every
 * request, and the WebSocket handshake. Before this, a deactivated or banned
 * user kept full access: only GET /auth/me looked at the status.
 *
 *   active                      allowed
 *   inactive                    ACCOUNT_DEACTIVATED (an admin deactivated it)
 *   banned                      ACCOUNT_BLOCKED (permanent until an admin lifts it)
 *   suspended                   ACCOUNT_SUSPENDED until the open suspension ends;
 *                               once it has ended the account is reactivated here,
 *                               lazily, by the first request that sees it
 *   pending / anything else     ACCOUNT_INACTIVE
 *
 * Fails closed: if a suspension's end date cannot be read, the account stays
 * suspended.
 */
const MESSAGES = {
  ACCOUNT_DEACTIVATED: 'This account has been deactivated. Contact support to restore access.',
  ACCOUNT_BLOCKED: 'This account has been blocked for violating the community guidelines.',
  ACCOUNT_SUSPENDED: 'This account is temporarily suspended.',
  ACCOUNT_INACTIVE: 'This account is not active.',
};
const BLOCK_CODES = Object.keys(MESSAGES);

const blocked = (code, extra = {}) => ({ code, message: MESSAGES[code], ...extra });

/**
 * Lifts a suspension once every open one has ended. Returns
 * { active, until }. Uses the latest end date across all open suspensions
 * (a short one added after a long one must not end the long one early), and
 * lifts conditionally, so an admin re-suspending at the same moment is not
 * undone and concurrent requests do not write duplicate history.
 */
async function liftIfExpired(user) {
  // Required lazily: models/index requires this module's callers.
  const db = require('../models');
  const { Op } = require('sequelize');
  const open = await db.UserSanction.findAll({
    where: { user_id: user.id, action: 'suspend', lifted_at: null },
    attributes: ['id', 'ends_at'],
  });
  if (!open.length) return { active: false, until: null };
  // A suspension without an end date never ends by itself.
  if (open.some((s) => !s.ends_at)) return { active: false, until: null };
  const until = open.reduce((max, s) => (new Date(s.ends_at) > max ? new Date(s.ends_at) : max), new Date(0));
  if (until.getTime() > Date.now()) return { active: false, until };

  const now = new Date();
  const ids = open.map((s) => s.id);
  const [lifted] = await db.UserSanction.update(
    { lifted_at: now },
    { where: { id: { [Op.in]: ids }, lifted_at: null } }
  );
  // Only reactivate when nothing new was opened meanwhile.
  const newer = await db.UserSanction.count({
    where: { user_id: user.id, action: 'suspend', lifted_at: null },
  });
  if (newer > 0) return { active: false, until: null };
  const [reactivated] = await db.User.update({ status: 'active' }, { where: { id: user.id, status: 'suspended' } });
  if (!reactivated) {
    // Changed meanwhile (blocked or deactivated by an admin): honour that.
    const fresh = await db.User.findByPk(user.id, { attributes: ['id', 'status'] });
    if (fresh && fresh.status !== 'active') return { active: false, until: null, status: fresh.status };
  }
  if (lifted > 0) {
    await db.UserSanction.create({
      user_id: user.id,
      action: 'reactivate',
      reason: 'Suspension ended',
      source: 'system',
      created_at: now,
    });
  }
  user.status = 'active';
  return { active: true, until: null };
}

/**
 * null when the account may be used, else { code, message, until? }.
 * `user` needs `id` and `status`.
 */
async function accountBlock(user) {
  const status = user && user.status;
  if (!status || status === 'active') return null;
  if (status === 'inactive') return blocked('ACCOUNT_DEACTIVATED');
  if (status === 'banned') return blocked('ACCOUNT_BLOCKED');
  if (status === 'suspended') {
    try {
      const { active, until, status: changed } = await liftIfExpired(user);
      if (active) return null;
      if (changed && changed !== 'suspended') return accountBlock({ id: user.id, status: changed });
      return blocked('ACCOUNT_SUSPENDED', until ? { until: new Date(until).toISOString() } : {});
    } catch (e) {
      console.error('[accountStatus] could not read suspension:', e.message);
      return blocked('ACCOUNT_SUSPENDED');
    }
  }
  return blocked('ACCOUNT_INACTIVE');
}

/** Error carrying the block, for services that throw (issueTokens). */
function accountBlockError(block) {
  return Object.assign(new Error(block.message), { code: block.code, until: block.until, status: 403 });
}

/** JSON body for a blocked account. */
const blockBody = (block) => ({ error: block.message, code: block.code, ...(block.until ? { until: block.until } : {}) });

module.exports = { accountBlock, accountBlockError, blockBody, BLOCK_CODES, MESSAGES };
