const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Validation middleware
const licenseValidation = [
    body('plan_tier').isIn(['Trial', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Enterprise']).withMessage('Valid plan tier is required')
];

// License creation and updates
router.post('/create', authenticateToken, licenseValidation, licenseController.createLicense);
router.post('/update', authenticateToken, licenseValidation, licenseController.updateLicense);

// License details
router.get('/:license_key', authenticateToken, licenseController.getLicenseDetails);

module.exports = router;