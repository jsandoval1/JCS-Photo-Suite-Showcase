/**
 * Subscription service for handling subscription management API calls
 */

import api from './api';

/**
 * Check if the current user's district is eligible for a trial
 * @returns {Promise<Object>} Trial eligibility response
 */
const checkTrialEligibility = async () => {
  try {
    const response = await api.get('/subscriptions/trial-eligibility');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get subscription history for the current user
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
 * Create a new license with the specified plan
 * @param {string} planTier - The plan tier to create
 * @param {string} paymentIntentId - Payment intent ID for paid plans (optional)
 * @returns {Promise<Object>} License creation response
 */
const createLicense = async (planTier, paymentIntentId = null) => {
  try {
    const requestData = { plan_tier: planTier };
    if (paymentIntentId) {
      requestData.payment_intent_id = paymentIntentId;
    }
    
    const response = await api.post('/licenses/create', requestData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing license to a new plan
 * @param {string} planTier - The new plan tier
 * @param {string} paymentIntentId - Payment intent ID for paid plans (optional)
 * @returns {Promise<Object>} License update response
 */
const updateLicense = async (planTier, paymentIntentId = null) => {
  try {
    const requestData = { plan_tier: planTier };
    if (paymentIntentId) {
      requestData.payment_intent_id = paymentIntentId;
    }
    
    const response = await api.post('/licenses/update', requestData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel the current subscription
 * @param {string} licenseKey - License key to cancel
 * @returns {Promise<Object>} Cancellation response
 */
const cancelSubscription = async (licenseKey) => {
  try {
    const response = await api.post('/subscriptions/cancel', {
      license_key: licenseKey
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available plans with pricing information
 * @returns {Array} Array of available plans
 */
const getAvailablePlans = () => {
  return [
    {
      tier: 'Trial',
      name: 'Trial',
      description: 'Perfect for testing',
      price: 'Free',
      duration: '30 days',
      features: [
        '50 Student Uploads',
        '50 Staff Uploads',
        'Basic Support',
      ],
      highlighted: false
    },
    {
      tier: 'Tier 1',
      name: 'Small Districts',
      description: 'Great for smaller schools',
      price: '$500',
      duration: 'per year',
      features: [
        '5,000 Student Uploads',
        '500 Staff Uploads',
        'Email Support',
        'Test Server Access'
      ],
      highlighted: false
    },
    {
      tier: 'Tier 2',
      name: 'Medium Districts',
      description: 'Perfect for growing schools',
      price: '$1,200',
      duration: 'per year',
      features: [
        '10,000 Student Uploads',
        '1,000 Staff Uploads',
        'Priority Email Support',
        'Test Server Access',
      ],
      highlighted: false
    },
    {
      tier: 'Tier 3',
      name: 'Large Districts',
      description: 'For established districts',
      price: '$2,500',
      duration: 'per year',
      features: [
        '15,000 Student Uploads',
        '2,500 Staff Uploads',
        'Phone Support',
        'Test Server Access',
      ],
      highlighted: false
    },
    {
      tier: 'Tier 4',
      name: 'Enterprise Districts',
      description: 'For large organizations',
      price: '$5,000',
      duration: 'per year',
      features: [
        '50,000 Student Uploads',
        '5,000 Staff Uploads',
        'Dedicated Support',
        'Test Server Access',
      ],
      highlighted: false
    },
    {
      tier: 'Enterprise',
      name: 'Custom Enterprise',
      description: 'Unlimited everything',
      price: 'Contact Us',
      features: [
        'Unlimited Student Uploads',
        'Unlimited Staff Uploads',
        'Dedicated Account Manager',
        'Multiple Server Access',
        'Custom Development'
      ],
      highlighted: false
    }
  ];
};

// Export the subscription service
export default {
  checkTrialEligibility,
  getSubscriptionHistory,
  createLicense,
  updateLicense,
  cancelSubscription,
  getAvailablePlans
}; 