/**
 * Admin-only CRUD for manually recorded finance entries (expenses, income).
 *
 * These used to be the generic CRUD controller behind authMiddleware alone, so
 * any signed-in user could list, create, edit or delete the platform's books,
 * and the "audit" rows were written by the browser. Now:
 *   - admin / super_admin only, for reads and writes;
 *   - only whitelisted fields are accepted and validated (amount in paise-exact
 *     decimal text, dates as YYYY-MM-DD); recorded_by comes from the session;
 *   - every create / update / delete is written to the audit trail by the server,
 *     in the same transaction as the change.
 */
const express = require('express');
const db = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { parseAmountToPaise } = require('./bankValidation');
const { fromPaise, toPaise } = require('./money');
const { istDayStart } = require('./financeDates');
const Audit = require('../services/FinanceAudit');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class EntryError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

const text = (v, field, max, { required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new EntryError(`${field} is required`);
    return undefined;
  }
  if (typeof v !== 'string') throw new EntryError(`${field} must be text`);
  const s = v.trim();
  if (required && !s) throw new EntryError(`${field} is required`);
  if (s.length > max) throw new EntryError(`${field} must be at most ${max} characters`);
  return s;
};

/**
 * spec: { model, entityType, label, textFields: { name: max }, requiredText: [...], dateField, enums: { field: [values] } }
 */
function financeEntryRouter(spec) {
  const router = express.Router();
  const guard = [authMiddleware, adminMiddleware];
  const Model = () => db[spec.model];

  function parse(body, { partial }) {
    const b = body && typeof body === 'object' ? body : {};
    const out = {};
    for (const [field, max] of Object.entries(spec.textFields)) {
      const v = text(b[field], field, max, { required: !partial && spec.requiredText.includes(field) });
      if (v !== undefined) out[field] = v;
    }
    if (!partial || b.amount !== undefined) {
      const amt = parseAmountToPaise(b.amount);
      if (amt.error) throw new EntryError(amt.error);
      out.amount = fromPaise(amt.paise);
    }
    if (!partial || b[spec.dateField] !== undefined) {
      const d = b[spec.dateField];
      const day = typeof d === 'string' && DATE_RE.test(d.slice(0, 10)) ? istDayStart(d.slice(0, 10)) : null;
      if (!day) throw new EntryError(`${spec.dateField} must be a real date (YYYY-MM-DD)`);
      out[spec.dateField] = day; // midnight India time
    }
    for (const [field, values] of Object.entries(spec.enums || {})) {
      if (b[field] === undefined) continue;
      if (!values.includes(b[field])) throw new EntryError(`${field} must be one of: ${values.join(', ')}`);
      out[field] = b[field];
    }
    if (b.currency !== undefined && b.currency !== 'INR') throw new EntryError('Only INR is supported');
    if (partial && Object.keys(out).length === 0) throw new EntryError('Nothing to update');
    return out;
  }

  const fail = (res, e, where) => {
    if (e instanceof EntryError) return res.status(400).json({ error: e.message });
    console.error(`[${spec.entityType} routes] ${where} failed:`, e);
    return res.status(500).json({ error: 'Internal server error' });
  };

  router.get('/', ...guard, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 200, 1), 500);
      const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
      const rows = await Model().findAll({ order: [[spec.dateField, 'DESC'], ['created_at', 'DESC']], limit, offset });
      res.json(rows);
    } catch (e) { fail(res, e, 'list'); }
  });

  router.get('/:id', ...guard, async (req, res) => {
    try {
      if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Record not found' });
      const row = await Model().findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Record not found' });
      res.json(row);
    } catch (e) { fail(res, e, 'get'); }
  });

  router.post('/', ...guard, async (req, res) => {
    try {
      const data = parse(req.body, { partial: false });
      const row = await db.sequelize.transaction(async (t) => {
        const created = await Model().create({ ...data, currency: 'INR', recorded_by: req.user.id, created_at: new Date(), updated_at: new Date() }, { transaction: t });
        await Audit.write({ actor: req.user, action: `${spec.entityType}.create`, entityType: spec.entityType, entityId: created.id, amountPaise: toPaise(data.amount), after: data, req, transaction: t });
        return created;
      });
      res.status(201).json(row);
    } catch (e) { fail(res, e, 'create'); }
  });

  router.put('/:id', ...guard, async (req, res) => {
    try {
      if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Record not found' });
      const data = parse(req.body, { partial: true });
      const row = await db.sequelize.transaction(async (t) => {
        const found = await Model().findByPk(req.params.id, { transaction: t, lock: t.LOCK ? t.LOCK.UPDATE : undefined });
        if (!found) return null;
        const before = {};
        for (const k of Object.keys(data)) before[k] = found[k] ?? null;
        await found.update({ ...data, updated_at: new Date() }, { transaction: t });
        await Audit.write({ actor: req.user, action: `${spec.entityType}.update`, entityType: spec.entityType, entityId: found.id, amountPaise: toPaise(found.amount), before, after: data, req, transaction: t });
        return found;
      });
      if (!row) return res.status(404).json({ error: 'Record not found' });
      res.json(row);
    } catch (e) { fail(res, e, 'update'); }
  });

  router.delete('/:id', ...guard, async (req, res) => {
    try {
      if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Record not found' });
      const ok = await db.sequelize.transaction(async (t) => {
        const found = await Model().findByPk(req.params.id, { transaction: t, lock: t.LOCK ? t.LOCK.UPDATE : undefined });
        if (!found) return false;
        const snapshot = typeof found.toJSON === 'function' ? found.toJSON() : { ...found };
        await found.destroy({ transaction: t });
        await Audit.write({ actor: req.user, action: `${spec.entityType}.delete`, entityType: spec.entityType, entityId: req.params.id, amountPaise: toPaise(snapshot.amount), before: snapshot, req, transaction: t });
        return true;
      });
      if (!ok) return res.status(404).json({ error: 'Record not found' });
      res.json({ success: true });
    } catch (e) { fail(res, e, 'delete'); }
  });

  return router;
}

module.exports = { financeEntryRouter };
