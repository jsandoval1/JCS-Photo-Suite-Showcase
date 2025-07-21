const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/plugin.controller');

// Plugin installation callback (PowerSchool calls this)
router.post('/plugin-installed', pluginController.pluginInstalled);
// Plugin validation and management endpoints
router.post('/validate', pluginController.validate);
router.post('/get-license', pluginController.getLicense);
router.post('/usage', pluginController.usage);

module.exports = router; 