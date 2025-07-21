const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const emailVerificationController = require('../controllers/email-verification.controller');
const profileController = require('../controllers/profile.controller');
const licenseController = require('../controllers/license.controller');
const serverController = require('../controllers/server.controller');
const subscriptionController = require('../controllers/subscription.controller');
const downloadController = require('../controllers/download.controller');
const paymentIntentController = require('../controllers/payment-intent.controller');
const paymentVerificationController = require('../controllers/payment-verification.controller');
const paymentController = require('../controllers/payment.controller');
const contactController = require('../controllers/contact.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Validation middleware
const registrationValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name is required'),
    body('last_name').isLength({ min: 1 }).trim().withMessage('Last name is required'),
    body('district_name').isLength({ min: 1 }).trim().withMessage('District name is required'),
    body('district_uniqueid').isLength({ min: 1 }).trim().withMessage('District unique ID is required')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

const licenseValidation = [
    body('plan_tier').isIn(['Trial', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Enterprise']).withMessage('Valid plan tier is required')
];

const downloadTokenValidation = [
    body('license_key').notEmpty().withMessage('License key is required'),
    body('max_downloads').optional().isInt({ min: 1, max: 10 }).withMessage('Max downloads must be between 1 and 10'),
    body('expires_in_hours').optional().isInt({ min: 1, max: 168 }).withMessage('Expiry must be between 1 and 168 hours (7 days)')
];

// Contact form route (public)
router.post('/contact', contactController.submitContactForm);

// Authentication routes
router.post('/register', registrationValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Email verification routes
router.get('/verify-email', emailVerificationController.verifyEmail);
router.post('/resend-verification', authenticateToken, emailVerificationController.resendVerification);

// Profile routes
router.get('/profile', authenticateToken, profileController.getProfile);

// License management routes
router.post('/create-license', authenticateToken, licenseValidation, licenseController.createLicense);
router.post('/update-license', authenticateToken, licenseValidation, licenseController.updateLicense);
router.get('/license/:license_key', authenticateToken, licenseController.getLicenseDetails);

// Download management routes
router.post('/create-download-token', authenticateToken, downloadTokenValidation, downloadController.createUserDownloadToken);
router.get('/download-tokens/:license_key', authenticateToken, downloadController.getUserDownloadTokens);

// Payment management routes
router.post('/create-payment-intent', authenticateToken, paymentIntentController.createPaymentIntent);
router.post('/verify-payment', authenticateToken, paymentVerificationController.verifyPayment);
router.get('/payment-status/:license_key', authenticateToken, paymentController.getPaymentStatus);

// Server management routes
router.post('/license/:license_key/add-server', authenticateToken, serverController.addServer);
router.post('/license/:license_key/remove-server', authenticateToken, serverController.removeServer);

// Subscription management routes
router.get('/trial-eligibility', authenticateToken, subscriptionController.checkTrialEligibility);
router.get('/subscription-history', authenticateToken, subscriptionController.getSubscriptionHistory);
router.post('/cancel-subscription', authenticateToken, subscriptionController.cancelSubscription);

module.exports = router; 