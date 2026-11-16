/**
 * Warnings, suspensions, blocks, deactivation and reactivation of user
 * accounts. Shared by User Management (Deactivate / Reactivate) and Content
 * Moderation (warn / suspend / block on a report), so both screens follow the
 * same rules and leave the same history (user_sanctions + audit_logs).
 *
 * Rules:
 *   - nobody sanctions themselves, and nobody sanctions a super admin;
 *   - only a super admin may sanction an admin or sub-admin;
 *   - suspend / block / deactivate end every session at once (refresh tokens
 *     revoked, sockets closed); access checks in utils/accountStatus.js stop
 *     the access token that is still in flight;
 *   - a suspension ends by itself at `ends_at` (accountStatus lifts it lazily)
 *     or earlier through reactivate.
 */
const db = require('../models');
const { effectiveRole } = require('../utils/roles');

const ACTIONS = ['warn', 'suspend', 'ban', 'deactivate', 'reactivate'];
const SOURCES = ['user_management', 'moderation', 'system'];
const MAX_SUSPENSION_DAYS = 365;
const STAFF = new Set(['admin', 'sub_admin', 'super_admin']);

class SanctionError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const cleanReason = (reason) => String(reason || '').trim().slice(0, 500);

/** Throws unless `actor` may sanction `target`. */
function assertMaySanction(actor, target) {
  if (!actor || !actor.id) throw new SanctionError(401, 'Authentication required');
  if (String(actor.id) === String(target.id)) throw new SanctionError(403, 'You cannot apply this action to your own account.', 'SELF');
  const targetRole = effectiveRole(target);
  if (targetRole === 'super_admin') throw new SanctionError(403, 'Super admin accounts cannot be sanctioned.', 'PROTECTED');
  if (STAFF.has(targetRole) && effectiveRole(actor) !== 'super_admin') {
    throw new SanctionError(403, 'Only a super admin can apply this action to a staff account.', 'PROTECTED');
  }
}

// Deleted (anonymised) accounts carry an email on this domain; see
// AdminUserService.deleteUser. Deletion is irreversible, so no sanction
// (least of all "reactivate") may touch them again.
const TOMBSTONE_SUFFIX = '@deleted.protocall.invalid';

async function loadTarget(userId) {
  const user = await db.User.findByPk(userId, { attributes: { exclude: ['password'] } });
  if (!user) throw new SanctionError(404, 'User not found');
  if (typeof user.email === 'string' && user.email.endsWith(TOMBSTONE_SUFFIX)) {
    throw new SanctionError(410, 'This account has been deleted.', 'DELETED');
  }
  return user;
}

/** Writes the status, translating "column/enum not migrated yet" into a 503. */
async function setStatus(user, status) {
  try {
    await db.User.update({ status }, { where: { id: user.id } });
    user.status = status;
  } catch (e) {
    if (/Data truncated|Incorrect .*value|enum/i.test(String(e.message))) {
      throw new SanctionError(503, 'This action needs a pending database update (migration 016).', 'MIGRATION_PENDING');
    }
    throw e;
  }
}

async function record(user, action, { actor, reason, endsAt = null, source = 'user_management', reportId = null }) {
  try {
    return await db.UserSanction.create({
      user_id: user.id,
      action,
      reason: reason || null,
      ends_at: endsAt,
      actor_id: actor ? actor.id : null,
      source: SOURCES.includes(source) ? source : 'user_management',
      report_id: reportId || null,
      created_at: new Date(),
    });
  } catch (e) {
    if (/doesn't exist|no such table/i.test(String(e.message))) {
      throw new SanctionError(503, 'This action needs a pending database update (migration 016).', 'MIGRATION_PENDING');
    }
    throw e;
  }
}

/** Best-effort side effects: never undo or hide a sanction that was applied. */
async function sideEffects(user, action, { actor, reason, endsAt, context = {}, wsService }) {
  const AuthService = require('./AuthService');
  if (['suspend', 'ban', 'deactivate'].includes(action)) {
    try { await AuthService.revokeAllForUser(user.id); } catch (e) { console.error('[UserSanctionService] revoke failed:', e.message); }
    try { if (wsService && wsService.disconnectUser) wsService.disconnectUser(user.id, 4003, 'Account restricted'); } catch (e) { console.error('[UserSanctionService] socket close failed:', e.message); }
  }

  const titles = {
    warn: 'Warning from the Protocall moderation team',
    suspend: 'Your account has been suspended',
    ban: 'Your account has been blocked',
    deactivate: 'Your account has been deactivated',
    reactivate: 'Your account is active again',
  };
  const until = endsAt ? ` until ${new Date(endsAt).toUTCString()}` : '';
  const messages = {
    warn: `You have received a warning: ${reason || 'a post or message broke the community guidelines'}. Further violations may lead to suspension.`,
    suspend: `Your account is suspended${until}. Reason: ${reason || 'community guideline violations'}.`,
    ban: `Your account has been blocked. Reason: ${reason || 'serious or repeated community guideline violations'}.`,
    deactivate: `Your account has been deactivated by an administrator.${reason ? ` Reason: ${reason}.` : ''}`,
    reactivate: 'Your account has been reactivated. You can sign in again.',
  };
  try {
    await db.Notification.create({
      user_id: user.id,
      type: `account_${action}`,
      title: titles[action],
      message: messages[action],
      is_read: false,
      priority: action === 'warn' || action === 'reactivate' ? 'normal' : 'high',
      data: { action, ends_at: endsAt || null },
    });
  } catch (e) {
    console.error('[UserSanctionService] notification failed:', e.message);
  }

  try {
    await db.AuditLog.create({
      user_id: actor ? actor.id : null,
      action: `user_${action}`,
      entity_type: 'user',
      entity_id: user.id,
      new_data: { status: user.status, ends_at: endsAt || null, source: context.source || null, report_id: context.reportId || null },
      // The user id, never the email: audit rows outlive account deletion.
      description: `${action} user ${user.id}${reason ? `: ${reason}` : ''}`.slice(0, 1000),
      ip_address: context.ip ? String(context.ip).slice(0, 45) : null,
      user_agent: context.userAgent ? String(context.userAgent).slice(0, 255) : null,
    });
  } catch (e) {
    console.error('[UserSanctionService] audit write failed:', e.message);
  }
}

/**
 * Applies one action.
 *   opts.reason      required for warn / suspend / ban
 *   opts.days        suspend only: 1..365 (or opts.until, a future date)
 *   opts.source      'user_management' | 'moderation'
 *   opts.reportId    the content report that led to it (moderation)
 *   opts.context     { ip, userAgent } for the audit log
 *   opts.wsService   to close the user's open sockets
 */
async function apply(userId, action, actor, opts = {}) {
  if (!ACTIONS.includes(action)) throw new SanctionError(400, 'Unknown action');
  const reason = cleanReason(opts.reason);
  if (['warn', 'suspend', 'ban'].includes(action) && !reason) {
    throw new SanctionError(400, 'A reason is required.');
  }

  let endsAt = null;
  if (action === 'suspend') {
    if (opts.until) {
      endsAt = new Date(opts.until);
      if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) throw new SanctionError(400, 'The suspension end must be a future date.');
    } else {
      const days = Number(opts.days);
      if (!Number.isInteger(days) || days < 1 || days > MAX_SUSPENSION_DAYS) {
        throw new SanctionError(400, `Suspension length must be 1 to ${MAX_SUSPENSION_DAYS} days.`);
      }
      endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    if (endsAt.getTime() - Date.now() > MAX_SUSPENSION_DAYS * 24 * 60 * 60 * 1000) {
      throw new SanctionError(400, `Suspension length must be 1 to ${MAX_SUSPENSION_DAYS} days.`);
    }
  }

  const user = await loadTarget(userId);
  assertMaySanction(actor, user);

  const source = opts.source || 'user_management';
  const context = { ...(opts.context || {}), source, reportId: opts.reportId || null };

  // Validate the transition before writing anything.
  if (action === 'reactivate' && user.status === 'active') {
    throw new SanctionError(409, 'This account is already active.', 'ALREADY_ACTIVE');
  }
  if (!['reactivate', 'warn', 'ban'].includes(action) && user.status === 'banned') {
    throw new SanctionError(409, 'This account is blocked. Reactivate it first to change its status.', 'BLOCKED');
  }

  // History first: if the table is missing (migration 016) this fails before
  // the account changes. If the status change then fails, the row is removed,
  // so history never records an action that did not happen.
  const sanction = await record(user, action, { actor, reason: reason || null, endsAt, source, reportId: opts.reportId });
  try {
    if (action === 'reactivate') {
      await setStatus(user, 'active');
    } else if (action !== 'warn') {
      await setStatus(user, { suspend: 'suspended', ban: 'banned', deactivate: 'inactive' }[action]);
    }
  } catch (e) {
    try { if (sanction && sanction.id) await db.UserSanction.destroy({ where: { id: sanction.id } }); } catch { /* best effort */ }
    throw e;
  }
  if (action === 'reactivate') {
    try {
      await db.UserSanction.update(
        { lifted_at: new Date(), lifted_by: actor.id },
        { where: { user_id: user.id, lifted_at: null, action: ['suspend', 'ban', 'deactivate'] } }
      );
    } catch (e) {
      console.error('[UserSanctionService] could not close open sanctions:', e.message);
    }
  }
  await sideEffects(user, action, { actor, reason, endsAt, context, wsService: opts.wsService });

  return { user: { id: user.id, status: user.status }, sanction: sanction && sanction.toJSON ? sanction.toJSON() : sanction };
}

/** Newest first; at most 100 rows. */
async function history(userId, { limit = 50 } = {}) {
  const rows = await db.UserSanction.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
  });
  return rows.map((r) => (r.toJSON ? r.toJSON() : r));
}

/** Count of warnings that have not been followed by a reactivation reset. */
async function warningCount(userId) {
  return db.UserSanction.count({ where: { user_id: userId, action: 'warn' } });
}

module.exports = { apply, history, warningCount, assertMaySanction, SanctionError, ACTIONS, MAX_SUSPENSION_DAYS };
