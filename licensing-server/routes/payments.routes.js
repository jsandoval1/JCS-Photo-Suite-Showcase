const express = require('express');
const router = express.Router();
const paymentIntentController = require('../controllers/payment-intent.controller');
const paymentVerificationController = require('../controllers/payment-verification.controller');
const paymentController = require('../controllers/payment.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Payment intent creation
router.post('/create-payment-intent', authenticateToken, paymentIntentController.createPaymentIntent);

// Payment verification
router.post('/verify-payment', authenticateToken, paymentVerificationController.verifyPayment);

// Payment status
router.get('/status/:license_key', authenticateToken, paymentController.getPaymentStatus);

module.exports = router;