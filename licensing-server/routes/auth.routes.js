const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const emailVerificationController = require('../controllers/email-verification.controller');
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

module.exports = router;