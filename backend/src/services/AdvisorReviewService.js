/**
 * Admin review of advisor applications.
 *
 * This is the ONLY place an advisor's role is granted or taken away. Approval
 * moves two records (advisors.status and users.role/app_role) and used to be
 * two separate browser calls, so a failure between them left an "approved"
 * advisor who could not open their dashboard (or a rejected one who still
 * could). Both writes, the audit row and the in-app notification now commit
 * together; e-mail and the websocket push follow the commit and never fail it.
 *
 *   action    from                                   to
 *   approve   pending_approval | rejected | suspended -> approved (+ role advisor)
 *   reject    pending_approval                        -> rejected (reason required)
 *   suspend   approved                                -> suspended (+ role user)
 *
 * Staff accounts keep their own role; only a user whose effective role is
 * "advisor" is ever demoted, so reviewing can never strip an admin.
 */
const db = require('../models');
const { effectiveRole } = require('../utils/roles');

const STAFF_ROLES = ['admin', 'super_admin', 'sub_admin'];

class ReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ReviewError';
    this.status = status;
  }
}

const RULES = {
  approve: { from: ['pending_approval', 'rejected', 'suspended'], to: 'approved' },
  reject: { from: ['pending_approval'], to: 'rejected', reasonRequired: true },
  suspend: { from: ['approved'], to: 'suspended' },
};
const ACTIONS = Object.keys(RULES);

const MESSAGES = {
  approve: (name) => ({
    title: 'Your advisor application was approved',
    message: `Congratulations${name ? `, ${name}` : ''}. You are now a verified advisor. Open your advisor dashboard to create plans and publish advisories.`,
    action_url: '/AdvisorDashboard',
  }),
  reject: (name, reason) => ({
    title: 'Your advisor application was not approved',
    message: `Your application was not approved. Reason: ${reason}. You can update your details and apply again.`,
    action_url: '/AdvisorRegistration',
  }),
  suspend: (name, reason) => ({
    title: 'Your advisor account was suspended',
    message: `Your advisor account has been suspended${reason ? `: ${reason}` : ''}. Contact support if you believe this is a mistake.`,
    action_url: '/AdvisorRegistration',
  }),
};

/**
 * @param {object} p
 * @param {string} p.advisorId
 * @param {'approve'|'reject'|'suspend'} p.action
 * @param {string} [p.reason]
 * @param {object} p.reviewer   req.user
 * @param {object} [p.wsService]
 * @param {object} [p.req]      for audit ip / user agent
 */
async function reviewApplication({ advisorId, action, reason, reviewer, wsService, req }) {
  const rule = RULES[action];
  if (!rule) throw new ReviewError(400, `Action must be one of: ${ACTIONS.join(', ')}`);

  const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (rule.reasonRequired && cleanReason.length < 5) {
    throw new ReviewError(400, 'Give the applicant a reason (at least 5 characters)');
  }

  const result = await db.sequelize.transaction(async (transaction) => {
    const lock = transaction && transaction.LOCK ? transaction.LOCK.UPDATE : undefined;
    const advisor = await db.Advisor.findOne({ where: { id: advisorId }, transaction, lock });
    if (!advisor) throw new ReviewError(404, 'Advisor not found');

    if (!rule.from.includes(advisor.status)) {
      throw new ReviewError(409, `Cannot ${action} an application that is ${String(advisor.status || 'unknown').replace('_', ' ')}`);
    }
    if (!advisor.user_id) throw new ReviewError(409, 'This advisor profile has no owning user');

    const user = await db.User.findByPk(advisor.user_id, { transaction, lock });
    if (!user) throw new ReviewError(409, 'The owning user no longer exists');

    const before = advisor.status;
    const approved = rule.to === 'approved';
    await advisor.update({
      status: rule.to,
      verified: approved,
      rejection_reason: approved ? null : (cleanReason || null),
      updated_at: new Date(),
    }, { transaction });

    // Role follows the status; staff are never touched.
    const current = effectiveRole(user);
    let roleChange = null;
    if (approved && !STAFF_ROLES.includes(current) && current !== 'advisor') {
      roleChange = 'advisor';
    } else if (!approved && current === 'advisor') {
      roleChange = 'user';
    }
    if (roleChange) {
      await user.update({ role: roleChange, app_role: roleChange }, { transaction });
    }

    const note = MESSAGES[action](advisor.display_name, cleanReason);
    const notification = await db.Notification.create({
      user_id: user.id,
      type: `advisor_${rule.to}`,
      title: note.title,
      message: note.message,
      is_read: false,
      data: { advisor_id: advisor.id, status: rule.to },
      action_url: note.action_url,
      priority: 'high',
    }, { transaction });

    await db.AuditLog.create({
      user_id: reviewer.id,
      action: `advisor_${action}`,
      entity_type: 'advisor',
      entity_id: advisor.id,
      description: `${action} advisor application (${before} -> ${rule.to})`,
      new_data: { status: rule.to, role_change: roleChange, reason: cleanReason || null },
      ip_address: req && req.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req && req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
    }, { transaction });

    return { advisor, user, notification, note, roleChange };
  });

  // Best effort, after commit.
  try {
    if (wsService && typeof wsService.sendToUser === 'function') {
      const n = result.notification;
      wsService.sendToUser(result.user.id, { type: 'notification', notification: n && typeof n.toJSON === 'function' ? n.toJSON() : n });
    }
  } catch (e) {
    console.error('[AdvisorReview] websocket push failed:', e.message);
  }
  if (result.user.email) {
    try {
      const EmailService = require('./EmailService');
      await EmailService.sendEmail(result.user.email, result.note.title, `<p>${escapeHtml(result.note.message)}</p>`);
    } catch (e) {
      console.error('[AdvisorReview] email failed:', e.message);
    }
  }
  return { advisor: result.advisor, role_change: result.roleChange };
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { reviewApplication, ReviewError, ACTIONS, STAFF_ROLES };
