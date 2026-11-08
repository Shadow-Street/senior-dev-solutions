/**
 * Advisor-facing bank accounts and withdrawals (BE-11).
 *
 * Mounted at /api/advisors, under /bank-accounts and /withdrawals only. Every
 * route authenticates, requires the advisor role AND an advisors row owned by
 * the caller, and then scopes every query by that caller. Nothing here reads a
 * user id, advisor id, status or amount ceiling from the request body.
 */
const express = require('express');
const db = require('../models');
const { authenticate } = require('../middleware/auth');
const { effectiveRole } = require('../utils/roles');
const {
  isBankCryptoAvailable, encryptBankValue, maskAccountNumber,
} = require('../utils/bankCrypto');
const { validateBankAccountInput, parseAmountToPaise } = require('../utils/bankValidation');
const W = require('../services/WithdrawalService');

const router = express.Router();
const MAX_ACTIVE_ACCOUNTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CRYPTO_UNAVAILABLE = {
  error: 'Bank account storage is temporarily unavailable. Please try again later.',
  code: 'BANK_CRYPTO_UNAVAILABLE',
};

/** Sends the right response for a thrown error; returns nothing. */
function fail(res, err, label) {
  if (err instanceof W.WithdrawalError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.current_status ? { current_status: err.current_status } : {}),
      ...(err.available !== undefined ? { available: err.available } : {}),
      ...(err.usable_from ? { usable_from: err.usable_from } : {}),
    });
  }
  console.error(`[advisorFinance] ${label} failed:`, err && err.message);
  return res.status(500).json({ error: 'Internal server error' });
}

/** Advisor role + an advisors row owned by the caller. Sets req.advisor. */
async function requireAdvisor(req, res, next) {
  try {
    if (effectiveRole(req.user) !== 'advisor') {
      return res.status(403).json({ error: 'Advisor access required' });
    }
    const advisor = await db.Advisor.findOne({ where: { user_id: req.user.id } });
    if (!advisor) return res.status(403).json({ error: 'Advisor profile required' });
    // A suspended or otherwise non-approved profile (e.g. the role was not yet
    // demoted) must not add or change payout destinations or see the ledger.
    if (advisor.status !== 'approved') return res.status(403).json({ error: 'Your advisor profile is not approved' });
    req.advisor = advisor;
    return next();
  } catch (err) {
    return fail(res, err, 'requireAdvisor');
  }
}

/** Whitelisted, masked view. The ciphertext column is never part of it. */
function serializeAccount(a) {
  const r = typeof a.toJSON === 'function' ? a.toJSON() : a;
  const hold = W.coolingOff(r);
  return {
    id: r.id,
    account_holder_name: r.account_holder_name,
    bank_name: r.bank_name,
    account_last4: r.account_last4,
    masked_account_number: maskAccountNumber(r.account_last4),
    ifsc: r.ifsc,
    account_type: r.account_type,
    is_primary: Boolean(r.is_primary),
    status: r.status,
    verified_at: r.verified_at || null,
    // A new or edited destination is held for 24h before it can receive a withdrawal.
    cooling_off: hold.cooling,
    usable_from: hold.usableFrom,
    created_at: r.created_at,
  };
}

const audit = async (req, action, entityId, extra) => {
  try {
    await db.AuditLog.create({
      user_id: req.user.id,
      action,
      entity_type: 'advisor_bank_account',
      entity_id: entityId,
      new_data: extra || null, // ids and flags only, never account numbers
      description: action,
      ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
    });
  } catch (e) {
    console.error('[advisorFinance] audit write failed:', e.message);
  }
};

const tellAdvisor = (req, kind, account) =>
  W.notifyBankChange({ user: req.user, kind, account, wsService: req.app.get('wsService') });

const ownActiveAccount = (req, id, extra = {}) =>
  db.AdvisorBankAccount.findOne({ where: { id, user_id: req.user.id, status: 'active' }, ...extra });

const hasOpenWithdrawal = (accountId, transaction) =>
  db.PayoutRequest.count({
    where: { bank_account_id: accountId, status: { [db.Sequelize.Op.in]: W.OPEN_STATUSES } },
    transaction,
  });

const validId = (req, res, next) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  return next();
};

// ===========================================================================
// Bank accounts
// ===========================================================================
const bank = express.Router();
router.use('/bank-accounts', authenticate, requireAdvisor, bank);

bank.get('/', async (req, res) => {
  try {
    const rows = await db.AdvisorBankAccount.findAll({
      where: { user_id: req.user.id, status: { [db.Sequelize.Op.ne]: 'removed' } },
      order: [['is_primary', 'DESC'], ['created_at', 'DESC']],
      limit: 50,
    });
    res.json(rows.map(serializeAccount));
  } catch (err) {
    fail(res, err, 'list bank accounts');
  }
});

bank.post('/', async (req, res) => {
  try {
    if (!isBankCryptoAvailable()) return res.status(503).json(CRYPTO_UNAVAILABLE);

    const parsed = validateBankAccountInput(req.body);
    if (parsed.errors) return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    const v = parsed.value;

    const created = await db.sequelize.transaction(async (t) => {
      const existing = await db.AdvisorBankAccount.findAll({
        where: { user_id: req.user.id, status: 'active' },
        transaction: t,
        lock: t.LOCK && t.LOCK.UPDATE,
      });
      if (existing.length >= MAX_ACTIVE_ACCOUNTS) {
        throw new W.WithdrawalError(409, `You can save up to ${MAX_ACTIVE_ACCOUNTS} bank accounts`);
      }
      const last4 = v.account_number.slice(-4);
      if (existing.some((a) => a.ifsc === v.ifsc && a.account_last4 === last4)) {
        throw new W.WithdrawalError(409, 'This bank account appears to be saved already');
      }
      return db.AdvisorBankAccount.create(
        {
          user_id: req.user.id, // from the session, never the body
          account_holder_name: v.account_holder_name,
          bank_name: v.bank_name,
          account_number_encrypted: encryptBankValue(v.account_number, req.user.id),
          account_last4: last4,
          ifsc: v.ifsc,
          account_type: v.account_type,
          is_primary: existing.length === 0,
          status: 'active',
          verified_at: null,
          destination_changed_at: new Date(),
        },
        { transaction: t }
      );
    });
    await audit(req, 'bank_account.create', created.id, { is_primary: Boolean(created.is_primary) });
    await tellAdvisor(req, 'added', created);
    res.status(201).json(serializeAccount(created));
  } catch (err) {
    if (err && err.code === 'BANK_CRYPTO_UNAVAILABLE') return res.status(503).json(CRYPTO_UNAVAILABLE);
    fail(res, err, 'create bank account');
  }
});

bank.put('/:id', validId, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const editable = ['account_holder_name', 'bank_name', 'ifsc', 'account_type', 'account_number'];
    if (!editable.some((k) => body[k] !== undefined)) {
      return res.status(400).json({ error: 'Validation failed', details: { _: 'No editable fields provided' } });
    }
    const parsed = validateBankAccountInput(body, { partial: true });
    if (parsed.errors) return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    const v = parsed.value;
    if (v.account_number !== undefined && !isBankCryptoAvailable()) return res.status(503).json(CRYPTO_UNAVAILABLE);

    const updated = await db.sequelize.transaction(async (t) => {
      const account = await ownActiveAccount(req, req.params.id, { transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      if (!account) throw new W.WithdrawalError(404, 'Bank account not found');

      // Payment details that identify the destination cannot move under a
      // request an admin may be about to pay.
      const touchesDestination = ['account_number', 'ifsc', 'account_holder_name'].some((k) => v[k] !== undefined);
      if (touchesDestination && (await hasOpenWithdrawal(account.id, t)) > 0) {
        throw new W.WithdrawalError(409, 'This account has a withdrawal in progress and cannot be changed right now');
      }

      const patch = {};
      for (const k of ['account_holder_name', 'bank_name', 'ifsc', 'account_type']) if (v[k] !== undefined) patch[k] = v[k];
      if (v.account_number !== undefined) {
        patch.account_number_encrypted = encryptBankValue(v.account_number, req.user.id);
        patch.account_last4 = v.account_number.slice(-4);
      }
      if (touchesDestination) {
        patch.verified_at = null; // a changed destination is unverified again
        patch.destination_changed_at = new Date(); // and restarts the 24h hold
      }
      patch.updated_at = new Date();
      await account.update(patch, { transaction: t });
      return account;
    });
    await audit(req, 'bank_account.update', updated.id, { fields: Object.keys(v) });
    await tellAdvisor(req, 'updated', updated);
    res.json(serializeAccount(updated));
  } catch (err) {
    if (err && err.code === 'BANK_CRYPTO_UNAVAILABLE') return res.status(503).json(CRYPTO_UNAVAILABLE);
    fail(res, err, 'update bank account');
  }
});

bank.post('/:id/primary', validId, async (req, res) => {
  try {
    const account = await db.sequelize.transaction(async (t) => {
      const target = await ownActiveAccount(req, req.params.id, { transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      if (!target) throw new W.WithdrawalError(404, 'Bank account not found');
      await db.AdvisorBankAccount.update(
        { is_primary: false },
        { where: { user_id: req.user.id, is_primary: true }, transaction: t }
      );
      await target.update({ is_primary: true }, { transaction: t });
      return target;
    });
    await audit(req, 'bank_account.set_primary', account.id);
    await tellAdvisor(req, 'primary', account);
    res.json(serializeAccount(account));
  } catch (err) {
    fail(res, err, 'set primary bank account');
  }
});

bank.delete('/:id', validId, async (req, res) => {
  try {
    const removed = await db.sequelize.transaction(async (t) => {
      const account = await ownActiveAccount(req, req.params.id, { transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      if (!account) throw new W.WithdrawalError(404, 'Bank account not found');
      if ((await hasOpenWithdrawal(account.id, t)) > 0) {
        throw new W.WithdrawalError(409, 'This account has a withdrawal in progress and cannot be removed right now');
      }
      const wasPrimary = Boolean(account.is_primary);
      // Soft delete: finished withdrawals still need to be traceable to it.
      await account.update({ status: 'removed', is_primary: false }, { transaction: t });
      if (wasPrimary) {
        const next = await db.AdvisorBankAccount.findOne({
          where: { user_id: req.user.id, status: 'active' },
          order: [['created_at', 'DESC']],
          transaction: t,
        });
        if (next) await next.update({ is_primary: true }, { transaction: t });
      }
      return account;
    });
    await audit(req, 'bank_account.delete', removed.id);
    await tellAdvisor(req, 'removed', removed);
    res.json({ success: true });
  } catch (err) {
    fail(res, err, 'delete bank account');
  }
});

// ===========================================================================
// Withdrawals
// ===========================================================================
const wd = express.Router();
router.use('/withdrawals', authenticate, requireAdvisor, wd);

wd.get('/summary', async (req, res) => {
  try {
    const b = await W.computeBalance({ advisorId: req.advisor.id, userId: req.user.id });
    const open = await db.PayoutRequest.count({
      where: { user_id: req.user.id, entity_type: W.ENTITY_TYPE, status: { [db.Sequelize.Op.in]: W.OPEN_STATUSES } },
    });
    const accounts = await db.AdvisorBankAccount.count({ where: { user_id: req.user.id, status: 'active' } });
    res.json({
      available: b.available,
      earned: b.earned,
      pending_withdrawals: b.pending_withdrawals,
      total_withdrawn: b.total_withdrawn,
      currency: b.currency,
      has_open_request: open > 0,
      bank_account_count: accounts,
      advisor_status: req.advisor.status,
    });
  } catch (err) {
    fail(res, err, 'withdrawal summary');
  }
});

wd.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const where = { user_id: req.user.id, entity_type: W.ENTITY_TYPE };
    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string' || !W.ALL_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      where.status = req.query.status;
    }
    const { count, rows } = await db.PayoutRequest.findAndCountAll({
      where, order: [['created_at', 'DESC']], limit, offset,
    });
    res.json({ items: rows.map(W.serializeWithdrawal), total: count, limit, offset });
  } catch (err) {
    fail(res, err, 'list withdrawals');
  }
});

wd.post('/', async (req, res) => {
  try {
    if (req.advisor.status !== 'approved') {
      return res.status(403).json({ error: 'Your advisor profile must be approved before you can withdraw' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const amt = parseAmountToPaise(body.amount);
    if (amt.error) return res.status(400).json({ error: amt.error });
    if (body.bank_account_id !== undefined && body.bank_account_id !== null &&
        (typeof body.bank_account_id !== 'string' || !UUID_RE.test(body.bank_account_id))) {
      return res.status(400).json({ error: 'Invalid bank account' });
    }

    const created = await W.withTransaction(async (t) => {
      // Serialise concurrent requests from one advisor: both the open-request
      // rule and the balance check below read state this lock protects.
      await db.Advisor.findOne({ where: { id: req.advisor.id }, transaction: t, lock: t.LOCK && t.LOCK.UPDATE });

      const open = await db.PayoutRequest.count({
        where: { user_id: req.user.id, entity_type: W.ENTITY_TYPE, status: { [db.Sequelize.Op.in]: W.OPEN_STATUSES } },
        transaction: t,
      });
      if (open > 0) throw new W.WithdrawalError(409, 'You already have a withdrawal in progress');

      const accountWhere = { user_id: req.user.id, status: 'active' };
      if (body.bank_account_id) accountWhere.id = body.bank_account_id;
      else accountWhere.is_primary = true;
      // Locked so the snapshot below cannot be taken from a row an edit is rewriting.
      const account = await db.AdvisorBankAccount.findOne({ where: accountWhere, transaction: t, lock: t.LOCK && t.LOCK.UPDATE });
      if (!account) {
        throw new W.WithdrawalError(400, body.bank_account_id
          ? 'Selected bank account not found'
          : 'Add a bank account and set it as primary before requesting a withdrawal');
      }

      const hold = W.coolingOff(account);
      if (hold.cooling) {
        throw new W.WithdrawalError(409,
          `This bank account was added or changed recently. For your security it can be used for withdrawals from ${hold.usableFrom.toISOString()}.`,
          { usable_from: hold.usableFrom });
      }

      // The ceiling is computed here from the database; the client only
      // proposes an amount.
      const bal = await W.computeBalance({ advisorId: req.advisor.id, userId: req.user.id, transaction: t });
      if (amt.paise > bal.available_paise) {
        throw new W.WithdrawalError(400, 'Amount exceeds your available balance', { available: bal.available });
      }

      const row = await db.PayoutRequest.create(
        {
          user_id: req.user.id,
          entity_id: req.advisor.id,
          entity_type: W.ENTITY_TYPE,
          amount: W.fromPaise(amt.paise),
          payment_method: W.PAYMENT_METHOD,
          payment_details: null,
          bank_account_id: account.id,
          bank_snapshot: {
            bank_name: account.bank_name,
            account_holder_name: account.account_holder_name,
            account_last4: account.account_last4,
            ifsc: account.ifsc,
          },
          status: 'pending',
        },
        { transaction: t }
      );
      await W.writeAudit({ actorId: req.user.id, action: 'withdrawal.request', row, to: 'pending', req, transaction: t });
      return row;
    });

    await W.notifyStatus(created, 'pending', { wsService: req.app.get('wsService') });
    res.status(201).json(W.serializeWithdrawal(created));
  } catch (err) {
    fail(res, err, 'create withdrawal');
  }
});

wd.get('/:id', validId, async (req, res) => {
  try {
    const row = await db.PayoutRequest.findOne({
      where: { id: req.params.id, user_id: req.user.id, entity_type: W.ENTITY_TYPE },
    });
    if (!row) return res.status(404).json({ error: 'Withdrawal request not found' });
    res.json(W.serializeWithdrawal(row));
  } catch (err) {
    fail(res, err, 'get withdrawal');
  }
});

wd.post('/:id/cancel', validId, async (req, res) => {
  try {
    const row = await W.transition({
      id: req.params.id,
      target: 'cancelled',
      actorId: req.user.id,
      ownerUserId: req.user.id,
      auditAction: 'withdrawal.cancel',
      req,
    });
    res.json(W.serializeWithdrawal(row));
  } catch (err) {
    fail(res, err, 'cancel withdrawal');
  }
});

module.exports = router;
module.exports.serializeAccount = serializeAccount;
module.exports.requireAdvisor = requireAdvisor;
