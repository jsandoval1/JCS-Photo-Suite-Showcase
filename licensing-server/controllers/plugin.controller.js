const pool = require('../config/db');
const { TIER_PLANS, generateLicenseKey } = require('../utils/constants');

/**
 * Plugin Controller
 * This controller has been refactored - specific functionality has been moved to:
 * - plugin-validation.controller.js - Plugin installation, validation, and license retrieval
 * - plugin-usage.controller.js - Usage tracking and upload limits
 * 
 * This file now serves as a proxy to maintain backward compatibility
 */

// Re-export functions from the new controllers for backward compatibility
const pluginValidation = require('./plugin-validation.controller');
const pluginUsage = require('./plugin-usage.controller');

// Plugin Installation Callback (PowerSchool calls this)
exports.pluginInstalled = pluginValidation.pluginInstalled;

// Plugin validation endpoint
exports.validate = pluginValidation.validate;

// Get license endpoint  
exports.getLicense = pluginValidation.getLicense;

// Usage endpoint
exports.usage = pluginUsage.usage;