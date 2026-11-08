/**
 * Admin review of advisor withdrawals (BE-11).
 *
 * Mounted at /api/admin/withdrawals. admin / super_admin only (sub_admin is
 * not enough: this moves money). Status changes go through
 * WithdrawalService.transition, which enforces the state machine under a row
 * lock and writes the audit entry in the same transaction.
 *
 * Listings and detail show bank details MASKED. The one exception is
 * GET /:id/bank-details, which an admin needs to make the manual transfer: it
 * is limited to approved requests, rate-limited, never cached, and writes an
 * audit row BEFORE any data is returned (if the audit write fails, nothing is
 * revealed).
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../models');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const { decryptBankValue, isBankCryptoAvailable } = require('../utils/bankCrypto');
const W = require('../services/WithdrawalService');

const router = express.Router();
router.use(authenticate, adminMiddleware);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{3,63}$/;
const CTRL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Keyed by the signed-in admin, not the IP: behind a proxy without `trust proxy`
// every admin shares one IP and would share one budget (and an attacker with a
// stolen session could not be told apart from them). The route is authenticated
// before this runs, so req.user is always set. `trust proxy` is deliberately not
// changed here - see the note in the BE-11 report.
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `admin:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

function fail(res, err, label) {
  if (err instanceof W.WithdrawalError) {
    return res.status(err.status).json({ error: err.message, ...(err.current_status ? { current_status: err.current_status } : {}) });
  }
  console.error(`[withdrawalAdmin] ${label} failed:`, err && err.message);
  return res.status(500).json({ error: 'Internal server error' });
}

const validId = (req, res, next) => (UUID_RE.test(req.params.id) ? next() : res.status(404).json({ error: 'Not found' }));

/** Trimmed text within [min, max], or null when it does not qualify. */
function text(value, min, max) {
  if (typeof value !== 'string') return null;
  const v = value.replace(CTRL_CHARS, '').trim();
  return v.length >= min && v.length <= max ? v : null;
}

/** Optional note: undefined/empty is fine, wrong type or too long is an error. */
function optionalNote(body) {
  if (body.admin_notes === undefined || body.admin_notes === null || body.admin_notes === '') return { value: undefined };
  const v = text(body.admin_notes, 1, 1000);
  return v === null ? { error: true } : { value: v };
}

const advisorsById = async (rows) => {
  const ids = [...new Set(rows.map((r) => r.entity_id).filter(Boolean))];
  if (!ids.length) return {};
  const advisors = await db.Advisor.findAll({
    where: { id: { [db.Sequelize.Op.in]: ids } },
    attributes: ['id', 'user_id', 'display_name', 'name', 'status'],
  });
  return Object.fromEntries(advisors.map((a) => [a.id, { id: a.id, user_id: a.user_id, display_name: a.display_name || a.name || null, status: a.status }]));
};

/** Bank account rows behind these withdrawals, keyed by id (for the "changed recently" flag). */
const accountsById = async (rows) => {
  const ids = [...new Set(rows.map((r) => r.bank_account_id).filter(Boolean))];
  if (!ids.length) return {};
  const accounts = await db.AdvisorBankAccount.findAll({
    where: { id: { [db.Sequelize.Op.in]: ids } },
    attributes: ['id', 'created_at', 'destination_changed_at', 'verified_at', 'status'],
  });
  return Object.fromEntries(accounts.map((a) => [a.id, a]));
};

const withAdvisor = (row, advisors, accounts = {}) => {
  const acct = accounts[row.bank_account_id];
  const changed = acct ? W.destinationChangedAt(acct) : null;
  return {
    ...W.serializeWithdrawal(row),
    advisor: advisors[row.entity_id] || null,
    // Reviewer warning: the payout destination was set or changed recently.
    bank_changed_at: changed,
    bank_change_flag: acct ? W.bankChangeFlag(acct) : null,
    bank_verified_at: acct ? acct.verified_at || null : null,
  };
};

router.get('/', async (req, res) => {
  try {
    const { Op } = db.Sequelize;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const where = { entity_type: W.ENTITY_TYPE };

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string' || !W.ALL_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      where.status = req.query.status;
    }
    if (req.query.advisor_id !== undefined) {
      if (typeof req.query.advisor_id !== 'string' || !UUID_RE.test(req.query.advisor_id)) {
        return res.status(400).json({ error: 'Invalid advisor filter' });
      }
      where.entity_id = req.query.advisor_id;
    }
    const range = {};
    for (const [param, op] of [['from', Op.gte], ['to', Op.lte]]) {
      if (req.query[param] === undefined) continue;
      const d = typeof req.query[param] === 'string' ? new Date(req.query[param]) : null;
      if (!d || Number.isNaN(d.getTime())) return res.status(400).json({ error: `Invalid ${param} date` });
      range[op] = d;
    }
    if (Reflect.ownKeys(range).length) where.created_at = range;

    const { count, rows } = await db.PayoutRequest.findAndCountAll({
      where, order: [['created_at', 'DESC']], limit, offset,
    });
    const [map, accounts] = await Promise.all([advisorsById(rows), accountsById(rows)]);
    res.json({ items: rows.map((r) => withAdvisor(r, map, accounts)), total: count, limit, offset });
  } catch (err) {
    fail(res, err, 'list');
  }
});

router.get('/:id', validId, async (req, res) => {
  try {
    const row = await db.PayoutRequest.findOne({ where: { id: req.params.id, entity_type: W.ENTITY_TYPE } });
    if (!row) return res.status(404).json({ error: 'Withdrawal request not found' });
    const [map, accounts] = await Promise.all([advisorsById([row]), accountsById([row])]);
    res.json(withAdvisor(row, map, accounts));
  } catch (err) {
    fail(res, err, 'get');
  }
});

/**
 * What backs this request: the advisor's balance breakdown and the approved
 * commission rows counted towards it (newest 50), plus commissions still
 * awaiting approval. `covered` is false when the ledger no longer covers the
 * requests promised against it (approve / mark-paid are refused in that case).
 */
router.get('/:id/balance', validId, async (req, res) => {
  try {
    const row = await db.PayoutRequest.findOne({ where: { id: req.params.id, entity_type: W.ENTITY_TYPE } });
    if (!row) return res.status(404).json({ error: 'Withdrawal request not found' });
    const [bal, breakdown] = await Promise.all([
      W.computeBalance({ advisorId: row.entity_id, userId: row.user_id }),
      W.commissionBreakdown({ advisorId: row.entity_id }),
    ]);
    res.json({
      withdrawal_id: row.id,
      requested: Number(row.amount),
      earned: bal.earned,
      reserved_by_open_requests: bal.pending_withdrawals,
      already_paid: bal.total_withdrawn,
      available_after_open_requests: bal.available,
      covered: bal.net_paise >= 0,
      currency: bal.currency,
      commissions: breakdown.counted,
      pending_commissions_amount: breakdown.pending_amount,
      pending_commissions_count: breakdown.pending_count,
    });
  } catch (err) {
    fail(res, err, 'balance');
  }
});

router.post('/:id/approve', validId, async (req, res) => {
  try {
    const note = optionalNote(req.body || {});
    if (note.error) return res.status(400).json({ error: 'Notes must be 1 to 1000 characters' });
    const row = await W.transition({
      id: req.params.id, target: 'approved', actorId: req.user.id,
      patch: note.value ? { admin_notes: note.value } : {},
      auditAction: 'withdrawal.approve', req,
    });
    res.json(W.serializeWithdrawal(row));
  } catch (err) {
    fail(res, err, 'approve');
  }
});

router.post('/:id/reject', validId, async (req, res) => {
  try {
    const body = req.body || {};
    const reason = text(body.reason, 3, 500);
    if (!reason) return res.status(400).json({ error: 'A rejection reason of 3 to 500 characters is required' });
    const note = optionalNote(body);
    if (note.error) return res.status(400).json({ error: 'Notes must be 1 to 1000 characters' });
    const row = await W.transition({
      id: req.params.id, target: 'rejected', actorId: req.user.id,
      patch: { rejection_reason: reason, ...(note.value ? { admin_notes: note.value } : {}) },
      auditAction: 'withdrawal.reject', auditExtra: { reason }, req,
    });
    res.json(W.serializeWithdrawal(row));
  } catch (err) {
    fail(res, err, 'reject');
  }
});

router.post('/:id/mark-paid', validId, async (req, res) => {
  try {
    const body = req.body || {};
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!REFERENCE_RE.test(reference)) {
      return res.status(400).json({ error: 'A transfer reference of 4 to 64 letters, digits or - _ . / is required' });
    }
    const note = optionalNote(body);
    if (note.error) return res.status(400).json({ error: 'Notes must be 1 to 1000 characters' });
    const row = await W.transition({
      id: req.params.id, target: 'paid', actorId: req.user.id,
      patch: { reference_number: reference, ...(note.value ? { admin_notes: note.value } : {}) },
      auditAction: 'withdrawal.mark_paid', auditExtra: { reference }, req,
      // A completed transfer is the evidence that the destination is real.
      inTransaction: async (r, t) => {
        if (r.bank_account_id) {
          await db.AdvisorBankAccount.update(
            { verified_at: new Date() },
            { where: { id: r.bank_account_id, user_id: r.user_id, verified_at: null }, transaction: t }
          );
        }
      },
    });
    res.json(W.serializeWithdrawal(row));
  } catch (err) {
    fail(res, err, 'mark-paid');
  }
});

router.get('/:id/bank-details', revealLimiter, validId, async (req, res) => {
  try {
    if (!isBankCryptoAvailable()) {
      return res.status(503).json({ error: 'Bank data encryption is not configured', code: 'BANK_CRYPTO_UNAVAILABLE' });
    }
    const row = await db.PayoutRequest.findOne({ where: { id: req.params.id, entity_type: W.ENTITY_TYPE } });
    if (!row) return res.status(404).json({ error: 'Withdrawal request not found' });
    if (row.status !== 'approved') {
      return res.status(409).json({ error: 'Full bank details are available only while a request is approved and awaiting payment', current_status: row.status });
    }
    // The account must belong to the requesting advisor; a mismatched row is
    // refused rather than decrypted.
    const account = row.bank_account_id
      ? await db.AdvisorBankAccount.findOne({ where: { id: row.bank_account_id, user_id: row.user_id } })
      : null;
    if (!account) return res.status(404).json({ error: 'Bank account not found' });

    // The request was made against a specific destination. If the stored
    // account no longer matches that snapshot, never reveal it.
    const snap = row.bank_snapshot && typeof row.bank_snapshot === 'object' ? row.bank_snapshot : null;
    if (!snap || snap.account_last4 !== account.account_last4) {
      return res.status(409).json({ error: 'The bank account no longer matches the one on this request. Reject it and ask the advisor to resubmit.' });
    }

    let number;
    try {
      number = decryptBankValue(account.account_number_encrypted, account.user_id);
    } catch (e) {
      console.error('[withdrawalAdmin] decrypt failed for withdrawal', row.id, e.message);
      return res.status(500).json({ error: 'Could not read bank details' });
    }

    // Audit first, reveal second. No account number in the log entry.
    await W.writeAudit({ actorId: req.user.id, action: 'withdrawal.bank_details_viewed', row, from: row.status, req });

    res.set('Cache-Control', 'no-store');
    res.json({
      withdrawal_id: row.id,
      account_holder_name: account.account_holder_name,
      bank_name: account.bank_name,
      account_number: number,
      ifsc: account.ifsc,
      account_type: account.account_type,
    });
  } catch (err) {
    fail(res, err, 'bank-details');
  }
});

module.exports = router;
