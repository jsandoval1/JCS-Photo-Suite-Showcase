const express = require('express');
const router = express.Router();
const adminLicenseController = require('../controllers/admin.license.controller');
const adminDownloadController = require('../controllers/admin.download.controller');
const paymentVerificationController = require('../controllers/payment-verification.controller');
const adminAuth = require('../controllers/adminAuth.middleware');

router.use(adminAuth);

// Download token management
router.post('/create-download-token', adminDownloadController.createDownloadToken);

// Payment management
router.post('/confirm-check-payment', paymentVerificationController.confirmCheckPayment);

// License management
router.get('/licenses', adminLicenseController.getLicenses);
router.post('/licenses', adminLicenseController.createLicense);
router.put('/licenses/:licenseKey', adminLicenseController.updateLicense);
router.get('/stats', adminLicenseController.getStats);
router.post('/cancel-subscription', adminLicenseController.cancelSubscription);
router.post('/cleanup-expired-zips', adminLicenseController.cleanupExpiredZips);

module.exports = router; 