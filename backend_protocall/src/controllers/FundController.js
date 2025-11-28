const { FundTransaction } = require("../models");

class FundController {
  static async createTransaction(req, res) {
    try {
      const transaction = await FundTransaction.create(req.body);
      return res.status(201).json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async listTransactions(req, res) {
    try {
      const { investor_id, transaction_type, status, limit = 100, offset = 0 } = req.query;
      const where = {};
      
      if (investor_id) where.investor_id = investor_id;
      if (transaction_type) where.transaction_type = transaction_type;
      if (status) where.status = status;

      const transactions = await FundTransaction.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['transaction_date', 'DESC']]
      });

      return res.status(200).json(transactions);
    } catch (error) {
      console.error("List transactions error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updated] = await FundTransaction.update(updates, {
        where: { id }
      });

      if (!updated) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const transaction = await FundTransaction.findByPk(id);
      return res.status(200).json(transaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = FundController;
