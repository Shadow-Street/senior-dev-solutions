const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

// Create Order (Requires Auth)
router.post('/create-order', authMiddleware, PaymentController.createOrder);

// Verify Payment (Requires Auth)
router.post('/verify', authMiddleware, PaymentController.verifyPayment);

// Webhook (No Auth - validated by signature)
router.post('/webhook', PaymentController.handleWebhook);

module.exports = router;
