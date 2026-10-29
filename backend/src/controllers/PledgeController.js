const { Pledge, PledgeSession, PledgeExecutionRecord, PledgeAccessRequest } = require("../models");
const { effectiveRole, ADMIN_ROLES } = require("../utils/roles");

/**
 * Every handler here assumes `authenticate` ran first (see pledge.routes.js).
 *
 * Pledges and execution records are a user's own trading data: the read
 * endpoints used to need no login and took `user_id` from the query string,
 * so anyone could page through every user's executions. Non-staff callers are
 * now always confined to their own rows, whatever the query says.
 */

// Same staff set as the CRUD factory's per-record checks (sub_admin: see BE-7).
const STAFF_ROLES = [...ADMIN_ROLES, 'sub_admin'];
const isStaff = (user) => STAFF_ROLES.includes(effectiveRole(user));
const isAdvisor = (user) => effectiveRole(user) === 'advisor';

const MAX_LIMIT = 200;

/** Coerces paging so ?limit=abc cannot 500 and no request reads a whole table. */
const paging = ({ limit, offset }) => ({
  limit: Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), MAX_LIMIT),
  offset: Math.max(Number.parseInt(offset, 10) || 0, 0),
});

/**
 * Copies the named query filters that are plain strings. A bracketed query
 * (?status[$in][]=x) parses to an object, which must never reach a WHERE.
 */
const stringFilters = (query, names) => {
  const where = {};
  for (const name of names) {
    if (typeof query[name] === 'string' && query[name] !== '') where[name] = query[name];
  }
  return where;
};

/** Keeps only `fields` from an untrusted payload. */
const pick = (body, fields) => {
  const out = {};
  for (const field of fields) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) out[field] = body[field];
  }
  return out;
};

// Writable fields. id, user_id and timestamps are never client-controlled,
// and pledge status is set by staff only (an owner may cancel): marking a
// pledge paid from the client would skip payment verification (SEC-6/SEC-17).
// demat_account_id is not yet checked against the caller — there is no demat
// model to check it against (tracked with SEC-31).
const PLEDGE_CREATE_FIELDS = ['session_id', 'demat_account_id', 'stock_symbol', 'side', 'qty', 'price_target'];
const PLEDGE_OWNER_UPDATE_FIELDS = ['demat_account_id', 'qty', 'price_target'];
const PLEDGE_STAFF_FIELDS = [...PLEDGE_CREATE_FIELDS, 'status'];
const SESSION_FIELDS = ['stock_symbol', 'session_start', 'session_end', 'status', 'execution_rule', 'last_executed_at'];
const EXECUTION_FIELDS = [
  'pledge_id', 'session_id', 'user_id', 'demat_account_id', 'stock_symbol', 'side',
  'pledged_qty', 'executed_qty', 'executed_price', 'total_execution_value',
  'platform_commission', 'commission_rate', 'status', 'executed_at',
];
const ACCESS_REQUEST_FIELDS = ['reason'];

class PledgeController {
  // Pledge methods
  static async createPledge(req, res) {
    try {
      const fields = isStaff(req.user) ? PLEDGE_STAFF_FIELDS : PLEDGE_CREATE_FIELDS;
      const pledgeData = { ...pick(req.body, fields), user_id: req.user.id };

      const pledge = await Pledge.create(pledgeData);
      return res.status(201).json(pledge);
    } catch (error) {
      console.error("Create pledge error:", error);
      return res.status(400).json({ error: 'Invalid pledge' });
    }
  }

  static async listPledges(req, res) {
    try {
      const where = stringFilters(req.query, ['session_id', 'status']);
      // Applied after the client filters, so ?user_id= cannot widen it.
      if (!isStaff(req.user)) where.user_id = req.user.id;
      else Object.assign(where, stringFilters(req.query, ['user_id']));

      const pledges = await Pledge.findAll({
        where,
        ...paging(req.query),
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json(pledges);
    } catch (error) {
      console.error("List pledges error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updatePledge(req, res) {
    try {
      const { id } = req.params;

      // Sequelize's affected-row count is 0 both when the record is missing and
      // when the new values equal the stored ones, so treating 0 as 'not found'
      // turned every no-op save into a 404. Check existence, then update.
      const existingPledge = await Pledge.findByPk(id);
      // 404 rather than 403 for someone else's pledge, so ids cannot be probed.
      if (!existingPledge || (!isStaff(req.user) && String(existingPledge.user_id) !== String(req.user.id))) {
        return res.status(404).json({ error: "Pledge not found" });
      }

      let updates;
      if (isStaff(req.user)) {
        updates = pick(req.body, PLEDGE_STAFF_FIELDS);
      } else {
        // Once paid or executed, the fee and the trade were computed from
        // qty and price, so the owner can no longer edit or cancel the pledge.
        if (existingPledge.status && existingPledge.status !== 'pending') {
          return res.status(409).json({ error: "Pledge can no longer be changed" });
        }
        updates = pick(req.body, PLEDGE_OWNER_UPDATE_FIELDS);
        if (req.body?.status === 'cancelled') updates.status = 'cancelled';
      }

      await Pledge.update(updates, { where: { id } });

      const pledge = await Pledge.findByPk(id);
      return res.status(200).json(pledge);
    } catch (error) {
      console.error("Update pledge error:", error);
      return res.status(400).json({ error: 'Invalid pledge update' });
    }
  }

  // Pledge Session methods

  // Sessions are the catalogue investors pledge into, so any signed-in user
  // may list them. Writes are staff work; an advisor may propose a session,
  // which starts pending until staff approve it.
  //
  // BE-8: the PledgeSession model has no advisor-ownership column (migration
  // 003 has a pledge_sessions.advisor_id the model never mapped, and the
  // frontend sends created_by_advisor_id), so an advisor cannot be matched to
  // "their" sessions. Until that is settled, updates are staff-only —
  // allowing any advisor would let one edit every session.
  static async createSession(req, res) {
    try {
      if (!isStaff(req.user) && !isAdvisor(req.user)) {
        return res.status(403).json({ error: 'Not permitted' });
      }
      const data = pick(req.body, SESSION_FIELDS);
      if (!isStaff(req.user)) {
        delete data.status;
        delete data.last_executed_at;
      }

      const session = await PledgeSession.create(data);
      return res.status(201).json(session);
    } catch (error) {
      console.error("Create session error:", error);
      return res.status(400).json({ error: 'Invalid session' });
    }
  }

  static async listSessions(req, res) {
    try {
      const where = stringFilters(req.query, ['status', 'execution_rule']);

      const sessions = await PledgeSession.findAll({
        where,
        ...paging(req.query),
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json(sessions);
    } catch (error) {
      console.error("List sessions error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateSession(req, res) {
    try {
      if (!isStaff(req.user)) {
        return res.status(403).json({ error: 'Not permitted' });
      }
      const { id } = req.params;
      const updates = pick(req.body, SESSION_FIELDS);

      // Sequelize's affected-row count is 0 both when the record is missing and
      // when the new values equal the stored ones, so treating 0 as 'not found'
      // turned every no-op save into a 404. Check existence, then update.
      const existingSession = await PledgeSession.findByPk(id);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      await PledgeSession.update(updates, { where: { id } });

      const session = await PledgeSession.findByPk(id);
      return res.status(200).json(session);
    } catch (error) {
      console.error("Update session error:", error);
      return res.status(400).json({ error: 'Invalid session update' });
    }
  }

  // Execution Record methods

  // An execution record states what was traded and the commission charged, so
  // only staff (who run executions from the super-admin pledge screens) write
  // them.
  static async createExecutionRecord(req, res) {
    try {
      if (!isStaff(req.user)) {
        return res.status(403).json({ error: 'Not permitted' });
      }
      const record = await PledgeExecutionRecord.create(pick(req.body, EXECUTION_FIELDS));
      return res.status(201).json(record);
    } catch (error) {
      console.error("Create execution record error:", error);
      return res.status(400).json({ error: 'Invalid execution record' });
    }
  }

  static async listExecutionRecords(req, res) {
    try {
      const where = stringFilters(req.query, ['session_id']);
      // Only staff may look at another user's executions. Advisors also get
      // only their own until sessions record their advisor (BE-8).
      if (!isStaff(req.user)) where.user_id = req.user.id;
      else Object.assign(where, stringFilters(req.query, ['user_id']));

      const records = await PledgeExecutionRecord.findAll({
        where,
        ...paging(req.query),
        order: [['executed_at', 'DESC']]
      });

      return res.status(200).json(records);
    } catch (error) {
      console.error("List execution records error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Access Request methods
  static async createAccessRequest(req, res) {
    try {
      // status is decided by staff, never by the requester.
      const requestData = { ...pick(req.body, ACCESS_REQUEST_FIELDS), user_id: req.user.id };

      const accessRequest = await PledgeAccessRequest.create(requestData);
      return res.status(201).json(accessRequest);
    } catch (error) {
      console.error("Create access request error:", error);
      return res.status(400).json({ error: 'Invalid access request' });
    }
  }

  static async listAccessRequests(req, res) {
    try {
      const where = stringFilters(req.query, ['status']);
      if (!isStaff(req.user)) where.user_id = req.user.id;
      else Object.assign(where, stringFilters(req.query, ['user_id']));

      const requests = await PledgeAccessRequest.findAll({
        where,
        ...paging(req.query),
        order: [['created_date', 'DESC']]
      });

      return res.status(200).json(requests);
    } catch (error) {
      console.error("List access requests error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = PledgeController;
