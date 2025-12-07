const express = require("express");
const router = express.Router();
const db = require("../models");
const { authMiddleware } = require("../middleware/auth");

// Create payment intent
router.post('/intent', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR', metadata = {} } = req.body;
    
    // In production, integrate with Razorpay/Stripe
    // For now, create a pending payment record
    const payment = await db.FundTransaction.create({
      user_id: req.user.id,
      amount,
      currency,
      transaction_type: 'payment',
      status: 'pending',
      metadata: JSON.stringify(metadata),
      payment_intent_id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    res.json({
      payment_intent_id: payment.payment_intent_id,
      amount,
      currency,
      status: 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process payment
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR', method, metadata = {} } = req.body;
    
    // Create transaction record
    const transaction = await db.FundTransaction.create({
      user_id: req.user.id,
      amount,
      currency,
      transaction_type: 'payment',
      payment_method: method,
      status: 'completed',
      metadata: JSON.stringify(metadata),
      completed_at: new Date()
    });

    res.json({
      success: true,
      transaction_id: transaction.id,
      amount,
      status: 'completed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.get('/:paymentId/verify', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await db.FundTransaction.findOne({
      where: { 
        [db.Sequelize.Op.or]: [
          { id: paymentId },
          { payment_intent_id: paymentId }
        ]
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      completed_at: payment.completed_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const payments = await db.FundTransaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'payment'
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request refund
router.post('/:paymentId/refund', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    
    const payment = await db.FundTransaction.findByPk(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Payment cannot be refunded' });
    }

    // Create refund request
    const refund = await db.RefundRequest.create({
      payment_id: paymentId,
      user_id: req.user.id,
      amount: payment.amount,
      reason,
      status: 'pending'
    });

    res.json({
      success: true,
      refund_id: refund.id,
      status: 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
