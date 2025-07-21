const express = require('express');
const router = express.Router();
const cdnController = require('../controllers/cdn.controller');

// CDN Module Delivery Routes
router.post('/validate-cdn', cdnController.validateCDNAccess);
router.get('/cdn/:module', cdnController.serveModule);

// Enhanced License Validation Routes
router.post('/heartbeat', cdnController.heartbeat);
router.post('/validate-usage', cdnController.validateUsage);

// Image Processing Routes
router.post('/process-image', cdnController.processImage);
router.post('/validate-image', cdnController.validateImage);

// Security & Monitoring Routes
router.post('/security-report', cdnController.reportSecurityViolation);
router.post('/webcam-access-check', cdnController.validateWebcamAccess);
router.post('/log-webcam-usage', cdnController.logWebcamUsage);

module.exports = router; 