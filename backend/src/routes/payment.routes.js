const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');
const { failureLimiters, userLimiter } = require('../utils/failureLimiters');

// create-order is also a promo-code oracle (a bad code is refused), so failed
// attempts are throttled per address and per account.
const orderLimits = failureLimiters();

// Create Order (Requires Auth)
router.post('/create-order', orderLimits.ip, authMiddleware, orderLimits.user, PaymentController.createOrder);

// Verify Payment (Requires Auth)
// Each verify can cost two gateway calls, so every call counts against the account's budget
// (a real checkout needs one, plus a few retries while the payment settles).
router.post('/verify', authMiddleware, userLimiter({ max: 60 }), PaymentController.verifyPayment);

// Webhook (No Auth - validated by signature)
router.post('/webhook', PaymentController.handleWebhook);

module.exports = router;
