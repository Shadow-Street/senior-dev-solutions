const { Pledge, PledgeSession, PledgeExecutionRecord, PledgeAccessRequest } = require("../models");
const { Op } = require("sequelize");

class PledgeController {
  // Pledge methods
  static async createPledge(req, res) {
    try {
      const userId = req.user.id;
      const pledgeData = { ...req.body, user_id: userId };
      
      const pledge = await Pledge.create(pledgeData);
      return res.status(201).json(pledge);
    } catch (error) {
      console.error("Create pledge error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async listPledges(req, res) {
    try {
      const { session_id, status, limit = 100, offset = 0 } = req.query;
      const where = {};
      
      if (session_id) where.session_id = session_id;
      if (status) where.status = status;

      const pledges = await Pledge.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json(pledges);
    } catch (error) {
      console.error("List pledges error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePledge(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updated] = await Pledge.update(updates, {
        where: { id }
      });

      if (!updated) {
        return res.status(404).json({ error: "Pledge not found" });
      }

      const pledge = await Pledge.findByPk(id);
      return res.status(200).json(pledge);
    } catch (error) {
      console.error("Update pledge error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  // Pledge Session methods
  static async createSession(req, res) {
    try {
      const session = await PledgeSession.create(req.body);
      return res.status(201).json(session);
    } catch (error) {
      console.error("Create session error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async listSessions(req, res) {
    try {
      const { status, execution_rule, limit = 100, offset = 0 } = req.query;
      const where = {};
      
      if (status) where.status = status;
      if (execution_rule) where.execution_rule = execution_rule;

      const sessions = await PledgeSession.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json(sessions);
    } catch (error) {
      console.error("List sessions error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateSession(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updated] = await PledgeSession.update(updates, {
        where: { id }
      });

      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = await PledgeSession.findByPk(id);
      return res.status(200).json(session);
    } catch (error) {
      console.error("Update session error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  // Execution Record methods
  static async createExecutionRecord(req, res) {
    try {
      const record = await PledgeExecutionRecord.create(req.body);
      return res.status(201).json(record);
    } catch (error) {
      console.error("Create execution record error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async listExecutionRecords(req, res) {
    try {
      const { session_id, user_id, limit = 100, offset = 0 } = req.query;
      const where = {};
      
      if (session_id) where.session_id = session_id;
      if (user_id) where.user_id = user_id;

      const records = await PledgeExecutionRecord.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['executed_at', 'DESC']]
      });

      return res.status(200).json(records);
    } catch (error) {
      console.error("List execution records error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Access Request methods
  static async createAccessRequest(req, res) {
    try {
      const userId = req.user.id;
      const requestData = { ...req.body, user_id: userId };
      
      const accessRequest = await PledgeAccessRequest.create(requestData);
      return res.status(201).json(accessRequest);
    } catch (error) {
      console.error("Create access request error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async listAccessRequests(req, res) {
    try {
      const { user_id, status, limit = 100, offset = 0 } = req.query;
      const where = {};
      
      if (user_id) where.user_id = user_id;
      if (status) where.status = status;

      const requests = await PledgeAccessRequest.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_date', 'DESC']]
      });

      return res.status(200).json(requests);
    } catch (error) {
      console.error("List access requests error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PledgeController;
