const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Public routes (no authentication required)
// Get all available plans with pricing
router.get('/plans', pricingController.getAvailablePlans);

// Compare pricing between payment methods
router.post('/compare', pricingController.comparePricing);

// Get pricing breakdown for display
router.get('/breakdown', pricingController.getPricingBreakdown);

// Calculate pricing for specific configuration
router.post('/calculate', pricingController.calculatePricing);

// Protected routes (authentication required)
// Calculate prorated pricing for additional servers
router.post('/licenses/:license_key/server-proration', authenticateToken, pricingController.calculateServerProration);

module.exports = router; 