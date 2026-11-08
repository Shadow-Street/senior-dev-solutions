/**
 * Advisor withdrawals: balance, state machine, audit trail and notifications.
 *
 * "Available balance" for an advisor is
 *
 *     earned  - reserved - paid
 *
 *   earned   = SUM(commission_tracking.amount) for this advisor's rows
 *              (advisor_id = advisors.id) in WITHDRAWABLE_COMMISSION_STATUSES
 *   reserved = SUM(payout_requests.amount) of this advisor's open requests
 *              (pending, approved) - money already promised to a withdrawal
 *   paid     = SUM(payout_requests.amount) of this advisor's paid requests
 *
 * commission_tracking is the platform's per-advisor earnings ledger (the one
 * the admin Financials / Commission Analytics screens read). Withdrawals do
 * not mark individual commission rows as paid, so settled requests are
 * subtracted here instead. Rejected and cancelled requests release their
 * reservation. All arithmetic is in integer paise.
 *
 * State machine (the only place transitions are defined):
 *
 *     pending  -> approved | rejected | cancelled
 *     approved -> paid     | rejected
 *     paid, rejected, cancelled are terminal
 */
const db = require('../models');

const OPEN_STATUSES = ['pending', 'approved'];
const TERMINAL_STATUSES = ['paid', 'rejected', 'cancelled'];
const ALL_STATUSES = [...OPEN_STATUSES, ...TERMINAL_STATUSES];

const TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
  cancelled: [],
};

/** Only commissions the platform has approved count towards what can be withdrawn. */
const WITHDRAWABLE_COMMISSION_STATUSES = ['approved'];

const ENTITY_TYPE = 'advisor';
const PAYMENT_METHOD = 'bank_transfer';

class WithdrawalError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'WithdrawalError';
    this.status = status;
    Object.assign(this, extra);
  }
}

/** DECIMAL columns arrive as strings (or null from SUM); convert to integer paise. */
const toPaise = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const fromPaise = (p) => Math.round(p) / 100;

/** Runs `fn(t)` in a managed transaction (commit on resolve, rollback on throw). */
const withTransaction = (fn) => db.sequelize.transaction(fn);

/**
 * Balance breakdown for one advisor. Pass `transaction` to read inside the
 * caller's transaction so the check and the insert see the same state.
 */
async function computeBalance({ advisorId, userId, transaction }) {
  const { Op } = db.Sequelize;
  const [earned, reserved, paid] = await Promise.all([
    db.CommissionTracking.sum('amount', {
      where: { advisor_id: advisorId, status: { [Op.in]: WITHDRAWABLE_COMMISSION_STATUSES } },
      transaction,
    }),
    db.PayoutRequest.sum('amount', {
      where: { user_id: userId, entity_type: ENTITY_TYPE, status: { [Op.in]: OPEN_STATUSES } },
      transaction,
    }),
    db.PayoutRequest.sum('amount', {
      where: { user_id: userId, entity_type: ENTITY_TYPE, status: 'paid' },
      transaction,
    }),
  ]);
  const earnedP = toPaise(earned);
  const reservedP = toPaise(reserved);
  const paidP = toPaise(paid);
  const availableP = Math.max(0, earnedP - reservedP - paidP);
  return {
    earned_paise: earnedP,
    reserved_paise: reservedP,
    paid_paise: paidP,
    available_paise: availableP,
    // Unclamped: negative means the ledger no longer covers what has been promised.
    net_paise: earnedP - reservedP - paidP,
    earned: fromPaise(earnedP),
    pending_withdrawals: fromPaise(reservedP),
    total_withdrawn: fromPaise(paidP),
    available: fromPaise(availableP),
    currency: 'INR',
  };
}

/** A new or edited payout destination cannot receive a withdrawal for this long. */
const COOLING_OFF_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When the account's destination last changed (falls back to creation for older rows). */
const destinationChangedAt = (account) => {
  const raw = account && (account.destination_changed_at || account.created_at);
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** { cooling, usableFrom } for a bank account at `now`. */
function coolingOff(account, now = new Date()) {
  const changed = destinationChangedAt(account);
  if (!changed) return { cooling: false, usableFrom: null };
  const usableFrom = new Date(changed.getTime() + COOLING_OFF_MS);
  return { cooling: usableFrom > now, usableFrom };
}

/** 'under_24h' | 'under_7d' | null: how recently the destination changed, for the admin reviewer. */
function bankChangeFlag(account, now = new Date()) {
  const changed = destinationChangedAt(account);
  if (!changed) return null;
  const age = now.getTime() - changed.getTime();
  if (age < DAY_MS) return 'under_24h';
  if (age < 7 * DAY_MS) return 'under_7d';
  return null;
}

/**
 * The approved commission rows currently backing an advisor's balance, for the
 * admin reviewing a request (newest first, capped), plus what is still pending.
 */
async function commissionBreakdown({ advisorId, limit = 50 }) {
  const { Op } = db.Sequelize;
  const [counted, pendingSum, pendingCount] = await Promise.all([
    db.CommissionTracking.findAll({
      where: { advisor_id: advisorId, status: { [Op.in]: WITHDRAWABLE_COMMISSION_STATUSES } },
      order: [['created_at', 'DESC']],
      limit,
    }),
    db.CommissionTracking.sum('amount', { where: { advisor_id: advisorId, status: 'pending' } }),
    db.CommissionTracking.count({ where: { advisor_id: advisorId, status: 'pending' } }),
  ]);
  return {
    counted: counted.map((c) => {
      const r = typeof c.toJSON === 'function' ? c.toJSON() : c;
      const meta = r.metadata && typeof r.metadata === 'object' ? r.metadata : {};
      return {
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        commission_type: r.commission_type || null,
        gross_amount: meta.gross_amount ?? null,
        platform_fee: meta.platform_fee ?? null,
        payment_reference: r.reference_id || null,
        created_at: r.created_at,
      };
    }),
    pending_amount: fromPaise(toPaise(pendingSum)),
    pending_count: pendingCount,
  };
}

/** Client-facing view of a withdrawal row. Never includes bank details beyond the snapshot. */
function serializeWithdrawal(row) {
  const r = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  const snap = r.bank_snapshot && typeof r.bank_snapshot === 'object' ? r.bank_snapshot : null;
  return {
    id: r.id,
    user_id: r.user_id,
    advisor_id: r.entity_id,
    amount: Number(r.amount),
    currency: 'INR',
    status: r.status,
    bank_account_id: r.bank_account_id || null,
    bank: snap
      ? {
          bank_name: snap.bank_name,
          account_holder_name: snap.account_holder_name,
          account_last4: snap.account_last4,
          ifsc: snap.ifsc,
          masked_account_number: `XXXXXXXX${snap.account_last4 || ''}`,
        }
      : null,
    admin_notes: r.admin_notes || null,
    rejection_reason: r.rejection_reason || null,
    reference_number: r.reference_number || null,
    approved_at: r.approved_at || null,
    rejected_at: r.rejected_at || null,
    paid_at: r.paid_at || null,
    cancelled_at: r.cancelled_at || null,
    created_at: r.created_at,
  };
}

const inr = (n) => `INR ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NOTIFICATIONS = {
  pending: (r) => ({
    title: 'Withdrawal request submitted',
    message: `Your withdrawal request of ${inr(r.amount)} was submitted and is awaiting review.`,
    priority: 'normal',
  }),
  approved: (r) => ({
    title: 'Withdrawal approved',
    message: `Your withdrawal request of ${inr(r.amount)} was approved. The transfer will follow.`,
    priority: 'high',
  }),
  rejected: (r) => ({
    title: 'Withdrawal rejected',
    message: `Your withdrawal request of ${inr(r.amount)} was rejected.${r.rejection_reason ? ` Reason: ${r.rejection_reason}` : ''}`,
    priority: 'high',
  }),
  paid: (r) => ({
    title: 'Withdrawal paid',
    message: `Your withdrawal of ${inr(r.amount)} has been paid${r.reference_number ? ` (reference ${r.reference_number})` : ''}.`,
    priority: 'high',
  }),
  cancelled: (r) => ({
    title: 'Withdrawal cancelled',
    message: `Your withdrawal request of ${inr(r.amount)} was cancelled.`,
    priority: 'normal',
  }),
};

/**
 * Tells the advisor about a status change. Best-effort by design: the money
 * movement has already committed, so a notification failure is logged and
 * swallowed rather than reported as a failed withdrawal.
 */
async function notifyStatus(row, status, { wsService } = {}) {
  try {
    const content = NOTIFICATIONS[status](row);
    const notif = await db.Notification.create({
      user_id: row.user_id,
      type: `withdrawal_${status}`,
      title: content.title,
      message: content.message,
      is_read: false,
      data: { withdrawal_id: row.id, status },
      action_url: '/AdvisorDashboard?section=financials',
      priority: content.priority,
    });
    if (wsService?.sendToUser) {
      try {
        wsService.sendToUser(row.user_id, {
          type: 'notification',
          notification: typeof notif?.toJSON === 'function' ? notif.toJSON() : notif,
        });
      } catch (e) {
        console.error('[WithdrawalService] websocket push failed:', e.message);
      }
    }
  } catch (e) {
    console.error('[WithdrawalService] notification failed:', e.message);
  }
}

/**
 * Tells the advisor that their payout destination changed (in-app, plus email
 * when the mail service is configured). Best-effort: a failure is logged and
 * never blocks the change itself. Only the bank name and last four digits are
 * ever included.
 */
async function notifyBankChange({ user, kind, account, wsService }) {
  const label = `${account.bank_name} ending ${account.account_last4}`;
  const text = {
    added: [`Bank account added`, `A bank account (${label}) was added to your advisor profile. It can be used for withdrawals after a 24-hour security hold.`],
    updated: [`Bank account changed`, `The bank account ${label} was changed. If you changed destination details it is on a 24-hour security hold before it can receive a withdrawal.`],
    primary: [`Primary bank account changed`, `${label} is now your primary payout account.`],
    removed: [`Bank account removed`, `The bank account ${label} was removed from your advisor profile.`],
  }[kind];
  if (!text) return;
  try {
    const notif = await db.Notification.create({
      user_id: user.id,
      type: `bank_account_${kind}`,
      title: text[0],
      message: `${text[1]} If this was not you, contact support immediately.`,
      is_read: false,
      data: { bank_account_id: account.id, kind },
      action_url: '/AdvisorDashboard?section=financials&fin=bank',
      priority: 'high',
    });
    if (wsService?.sendToUser) {
      try {
        wsService.sendToUser(user.id, { type: 'notification', notification: typeof notif?.toJSON === 'function' ? notif.toJSON() : notif });
      } catch (e) {
        console.error('[WithdrawalService] websocket push failed:', e.message);
      }
    }
  } catch (e) {
    console.error('[WithdrawalService] bank change notification failed:', e.message);
  }
  if (user.email) {
    try {
      const EmailService = require('./EmailService');
      await EmailService.sendEmail(
        user.email,
        `Security notice: ${text[0]}`,
        `<p>${text[1]}</p><p>If this was not you, contact support immediately and change your password.</p>`
      );
    } catch (e) {
      console.error('[WithdrawalService] bank change email failed:', e.message);
    }
  }
}

/** Audit entry. Carries ids, statuses and amounts only - never bank details. */
function writeAudit({ actorId, action, row, from, to, extra, req, transaction }) {
  return db.AuditLog.create(
    {
      user_id: actorId,
      action,
      entity_type: 'payout_request',
      entity_id: row.id,
      old_data: from ? { status: from } : null,
      new_data: { status: to || from, amount: Number(row.amount), ...(extra || {}) },
      description: `${action} on withdrawal ${row.id}`,
      ip_address: req?.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
    },
    { transaction }
  );
}

/**
 * Applies one transition atomically.
 *
 * The row is read with a write lock inside the transaction, so two admins
 * clicking at once, or an admin racing the advisor's cancel, serialise: the
 * loser sees the new status and gets 409 instead of overwriting it.
 *
 * `ownerUserId` confines the lookup to the advisor's own request (a foreign id
 * is a plain 404, not a 403, so ids cannot be probed). `entityType: null`
 * widens the lookup to legacy payout rows that carry no entity type.
 * `inTransaction(row, t)` runs extra writes in the same transaction.
 */
async function transition({
  id, target, actorId, ownerUserId, patch = {}, auditAction, auditExtra, req,
  entityType = ENTITY_TYPE, inTransaction, notify = true,
}) {
  const result = await withTransaction(async (t) => {
    const where = { id };
    if (entityType) where.entity_type = entityType;
    if (ownerUserId) where.user_id = ownerUserId;
    const row = await db.PayoutRequest.findOne({ where, transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
    if (!row) throw new WithdrawalError(404, 'Withdrawal request not found');

    const from = row.status;
    if (!(TRANSITIONS[from] || []).includes(target)) {
      throw new WithdrawalError(409, `A ${from} withdrawal cannot be changed to ${target}`, { current_status: from });
    }

    // Approving or paying must still be covered by the ledger: commissions can
    // be cancelled or corrected after a request was made. The row is still
    // counted as open here, so a negative net means the money is no longer there.
    if ((target === 'approved' || target === 'paid') && row.entity_type === ENTITY_TYPE) {
      const bal = await computeBalance({ advisorId: row.entity_id, userId: row.user_id, transaction: t });
      if (bal.net_paise < 0) {
        throw new WithdrawalError(409, 'The advisor\'s balance no longer covers this request. Review their commissions before continuing.');
      }
    }

    const now = new Date();
    const stamp = { approved: 'approved_at', rejected: 'rejected_at', paid: 'paid_at', cancelled: 'cancelled_at' }[target];
    const update = { ...patch, status: target, [stamp]: now };
    if (target !== 'cancelled' && actorId) update.processed_by = actorId;
    if (target === 'rejected' || target === 'paid') update.processed_at = now;

    await row.update(update, { transaction: t });
    if (inTransaction) await inTransaction(row, t);
    await writeAudit({ actorId, action: auditAction, row, from, to: target, extra: auditExtra, req, transaction: t });
    return row;
  });
  if (notify) await notifyStatus(result, target, { wsService: req?.app?.get?.('wsService') });
  return result;
}

module.exports = {
  OPEN_STATUSES,
  TERMINAL_STATUSES,
  ALL_STATUSES,
  TRANSITIONS,
  WITHDRAWABLE_COMMISSION_STATUSES,
  ENTITY_TYPE,
  PAYMENT_METHOD,
  WithdrawalError,
  toPaise,
  fromPaise,
  withTransaction,
  computeBalance,
  serializeWithdrawal,
  notifyStatus,
  notifyBankChange,
  COOLING_OFF_MS,
  coolingOff,
  bankChangeFlag,
  destinationChangedAt,
  commissionBreakdown,
  writeAudit,
  transition,
};
