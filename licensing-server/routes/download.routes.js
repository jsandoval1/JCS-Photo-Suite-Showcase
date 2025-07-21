const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/download.controller');

// POST route for programmatic downloads (existing)
router.post('/', downloadController.download);

// GET route for direct download links (new - more user-friendly)
router.get('/:token', downloadController.downloadByToken);

// Status check route
router.get('/status/:token', downloadController.status);

module.exports = router; 