const express = require('express');
const router = express.Router();
const serverController = require('../controllers/server.controller');
const { authenticateToken } = require('../controllers/auth.middleware');

// Add server to license
router.post('/:license_key/add', authenticateToken, serverController.addServer);

// Remove server from license
router.post('/:license_key/remove', authenticateToken, serverController.removeServer);

module.exports = router;