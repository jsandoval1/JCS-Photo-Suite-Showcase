const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Create new subscription
router.post('/create', authenticateToken, subscriptionController.createSubscription);

// Upgrade existing subscription
router.post('/upgrade', authenticateToken, subscriptionController.upgradeSubscription);

// Add additional servers (prorated)
router.post('/licenses/:license_key/add-servers', authenticateToken, subscriptionController.addAdditionalServers);

// Trial eligibility check
router.get('/trial-eligibility', authenticateToken, subscriptionController.checkTrialEligibility);

// Subscription history
router.get('/history', authenticateToken, subscriptionController.getSubscriptionHistory);

// Cancel subscription
router.post('/cancel', authenticateToken, subscriptionController.cancelSubscription);

module.exports = router;