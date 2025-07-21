/**
 * License service for handling license creation, updates, and management
 */

import api from './api';

/**
 * Available license tiers with their details
 */
export const LICENSE_TIERS = {
  'Trial': { 
    max_student_uploads: 50, 
    max_staff_uploads: 50, 
    price: 0,
    display_name: 'Trial',
    description: 'Perfect for testing'
  },
  'Tier 1': { 
    max_student_uploads: 5000, 
    max_staff_uploads: 500, 
    price: 500,
    display_name: 'Tier 1',
    description: 'Small districts'
  },
  'Tier 2': { 
    max_student_uploads: 10000, 
    max_staff_uploads: 1000, 
    price: 1200,
    display_name: 'Tier 2',
    description: 'Medium districts'
  },
  'Tier 3': { 
    max_student_uploads: 15000, 
    max_staff_uploads: 2500, 
    price: 2500,
    display_name: 'Tier 3',
    description: 'Large districts'
  },
  'Tier 4': { 
    max_student_uploads: 50000, 
    max_staff_uploads: 5000, 
    price: 5000,
    display_name: 'Tier 4',
    description: 'Very large districts'
  },
  'Enterprise': { 
    max_student_uploads: -1, 
    max_staff_uploads: -1, 
    price: -1,
    display_name: 'Enterprise',
    description: 'Unlimited uploads'
  }
};

/**
 * Create a new license for the authenticated user
 * @param {Object} licenseData - License creation data
 * @param {string} licenseData.plan_tier - The license tier to purchase
 * @param {string} licenseData.payment_intent_id - Payment intent ID (for paid plans)
 * @returns {Promise<Object>} License creation response
 */
const createLicense = async (licenseData) => {
  try {
    const response = await api.post('/licenses/create', licenseData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update/upgrade an existing license
 * @param {Object} updateData - License update data
 * @param {string} updateData.plan_tier - The new license tier
 * @param {string} updateData.payment_intent_id - Payment intent ID (for paid plans)
 * @returns {Promise<Object>} License update response
 */
const updateLicense = async (updateData) => {
  try {
    const response = await api.post('/licenses/update', updateData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get detailed license information
 * @param {string} licenseKey - The license key to get details for
 * @returns {Promise<Object>} License details response
 */
const getLicenseDetails = async (licenseKey) => {
  try {
    const response = await api.get(`/licenses/${licenseKey}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile including license information
 * This is a convenient way to get the user's current license status
 * @returns {Promise<Object>} User profile with license information
 */
const getUserLicenses = async () => {
  try {
    const response = await api.get('/profile/');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a download token for the user's license (USER ENDPOINT)
 * This allows authenticated users to generate customized plugin zip files for their own licenses
 * @param {Object} downloadData - Download request data
 * @param {string} downloadData.license_key - The license key (must belong to the authenticated user)
 * @param {number} downloadData.max_downloads - Maximum number of downloads (default: 3, max: 10)
 * @param {number} downloadData.expires_in_hours - Hours until expiration (default: 24, max: 168)
 * @returns {Promise<Object>} Download token response
 */
const createDownloadToken = async (downloadData) => {
  try {
    // Use the user-specific endpoint that includes proper authorization checks
    const response = await api.post('/downloads/create-token', downloadData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get existing download tokens for a user's license
 * @param {string} licenseKey - The license key to get download tokens for
 * @returns {Promise<Object>} Download tokens response
 */
const getUserDownloadTokens = async (licenseKey) => {
  try {
    const response = await api.get(`/downloads/tokens/${licenseKey}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Check download status
 * @param {string} token - The download token
 * @returns {Promise<Object>} Download status response
 */
const checkDownloadStatus = async (token) => {
  try {
    const response = await api.get(`/download/status/${token}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Download the plugin zip file
 * @param {string} token - The download token
 * @returns {Promise<Object>} Download response (redirects to blob URL)
 */
const downloadPlugin = async (token) => {
  try {
    // This will redirect to the blob URL
    const response = await api.post('/download', { token });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get subscription history
 * @returns {Promise<Object>} Subscription history response
 */
const getSubscriptionHistory = async () => {
  try {
    const response = await api.get('/subscriptions/history');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel subscription
 * @param {string} licenseKey - The license key to cancel
 * @returns {Promise<Object>} Cancellation response
 */
const cancelSubscription = async (licenseKey) => {
  try {
    const response = await api.post('/subscriptions/cancel', { license_key: licenseKey });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Add an additional server to a license
 * @param {string} licenseKey - The license key
 * @param {Object} serverData - Server data
 * @param {string} serverData.server_url - Server URL to add
 * @param {string} serverData.server_type - Server type ('production' or 'test')
 * @param {string} serverData.payment_intent_id - Payment intent ID for the $50 charge
 * @returns {Promise<Object>} Server addition response
 */
const addServer = async (licenseKey, serverData) => {
  try {
    const response = await api.post(`/servers/${licenseKey}/add`, serverData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a server from a license
 * @param {string} licenseKey - The license key
 * @param {Object} serverData - Server data
 * @param {number} serverData.server_id - Server ID to remove
 * @returns {Promise<Object>} Server removal response
 */
const removeServer = async (licenseKey, serverData) => {
  try {
    const response = await api.post(`/servers/${licenseKey}/remove`, serverData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Export the license service
export default {
  createLicense,
  updateLicense,
  getLicenseDetails,
  getUserLicenses,
  createDownloadToken,
  getUserDownloadTokens,
  checkDownloadStatus,
  downloadPlugin,
  getSubscriptionHistory,
  cancelSubscription,
  addServer,
  removeServer,
  LICENSE_TIERS,
}; 