const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Revenue Transactions
const transactionRouter = express.Router();
const transactionController = createCrudController(db.RevenueTransaction, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get revenue summary
transactionRouter.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    
    if (start_date && end_date) {
      where.created_at = {
        [db.Sequelize.Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    
    const total = await db.RevenueTransaction.sum('amount', { where });
    const count = await db.RevenueTransaction.count({ where });
    
    const byType = await db.RevenueTransaction.findAll({
      where,
      attributes: [
        'type',
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['type']
    });
    
    res.json({ total: total || 0, count, byType });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(transactionRouter, transactionController);
router.use('/transactions', transactionRouter);

// Payout Requests
const payoutRouter = express.Router();
const payoutController = createCrudController(db.PayoutRequest, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Request payout
payoutRouter.post('/request', authMiddleware, async (req, res) => {
  try {
    const { amount, payment_method, payment_details } = req.body;
    
    // Check available balance
    const balance = await db.RevenueTransaction.sum('amount', {
      where: { user_id: req.user.id, status: 'completed' }
    });
    
    const pendingPayouts = await db.PayoutRequest.sum('amount', {
      where: { user_id: req.user.id, status: 'pending' }
    });
    
    const availableBalance = (balance || 0) - (pendingPayouts || 0);
    
    if (amount > availableBalance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const payout = await db.PayoutRequest.create({
      user_id: req.user.id,
      amount,
      payment_method,
      payment_details,
      status: 'pending',
      created_at: new Date()
    });
    
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's payouts
payoutRouter.get('/my-payouts', authMiddleware, async (req, res) => {
  try {
    const payouts = await db.PayoutRequest.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(payoutRouter, payoutController);
router.use('/payouts', payoutRouter);

module.exports = router;