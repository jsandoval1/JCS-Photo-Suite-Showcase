const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Get user profile
router.get('/', authenticateToken, profileController.getProfile);

module.exports = router;