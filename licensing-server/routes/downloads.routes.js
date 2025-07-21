const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const downloadController = require('../controllers/download.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Validation middleware
const downloadTokenValidation = [
    body('license_key').notEmpty().withMessage('License key is required'),
    body('max_downloads').optional().isInt({ min: 1, max: 10 }).withMessage('Max downloads must be between 1 and 10'),
    body('expires_in_hours').optional().isInt({ min: 1, max: 168 }).withMessage('Expiry must be between 1 and 168 hours (7 days)')
];

// Create download token
router.post('/create-token', authenticateToken, downloadTokenValidation, downloadController.createUserDownloadToken);

// Get download tokens for a license
router.get('/tokens/:license_key', authenticateToken, downloadController.getUserDownloadTokens);

// Download by token (GET route for direct download links)
router.get('/:token', downloadController.downloadByToken);

// Download status
router.get('/status/:token', downloadController.status);

// POST route for programmatic downloads
router.post('/', downloadController.download);

module.exports = router;