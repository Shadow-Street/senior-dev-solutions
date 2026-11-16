/**
 * Audit trail for admin money actions (refunds, expenses, income,
 * reconciliation runs). Every entry goes to both logs:
 *   audit_logs            - the platform-wide trail (Activity Logs screen)
 *   financial_audit_logs  - the Financials > Audit Log screen
 * Written inside the caller's transaction when one is given, so the record of
 * a change commits or rolls back with the change itself.
 */
const db = require('../models');
const { fromPaise } = require('../utils/money');

const actorName = (actor) => (actor && (actor.display_name || actor.name || actor.email)) || null;

async function write({ actor, action, entityType, entityId = null, amountPaise = null, before = null, after = null, description, req, transaction }) {
  const opts = transaction ? { transaction } : undefined;
  const details = { ...(after || {}), ...(before ? { before } : {}) };
  await db.AuditLog.create({
    user_id: actor ? actor.id : null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: before,
    new_data: after,
    description: description ? String(description).slice(0, 2000) : `${action} on ${entityType}${entityId ? ` ${entityId}` : ''}`,
    ip_address: req && req.ip ? String(req.ip).slice(0, 45) : null,
    user_agent: req && req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
  }, opts);
  await db.FinancialAuditLog.create({
    admin_id: actor ? actor.id : null,
    admin_name: actorName(actor),
    action,
    entity_type: entityType,
    entity_id: entityId,
    amount: amountPaise === null || amountPaise === undefined ? null : fromPaise(amountPaise),
    details,
  }, opts);
}

module.exports = { write };
