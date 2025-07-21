/**
 * Payment service for handling Stripe payments and verification
 */

import api from './api';

/**
 * Verify a payment intent and activate license
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {string} licenseKey - License key to activate
 * @returns {Promise<Object>} Payment verification response
 */
const verifyPayment = async (paymentIntentId, licenseKey) => {
  try {
    const response = await api.post('/payments/verify-payment', {
      payment_intent_id: paymentIntentId,
      license_key: licenseKey
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get payment status for a license
 * @param {string} licenseKey - License key to check
 * @returns {Promise<Object>} Payment status response
 */
const getPaymentStatus = async (licenseKey) => {
  try {
    const response = await api.get(`/payments/status/${licenseKey}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create Stripe payment intent via backend
 * @param {Object} paymentData - Payment information
 * @param {string} paymentData.planTier - Plan tier being purchased
 * @param {string} paymentData.licenseKey - License key for metadata
 * @returns {Promise<Object>} Payment intent response
 */
const createPaymentIntent = async (paymentData) => {
  try {
    const response = await api.post('/payments/create-payment-intent', {
      license_key: paymentData.licenseKey,
      plan_tier: paymentData.planTier
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get plan pricing information
 * @param {string} planTier - Plan tier to get pricing for
 * @returns {Object} Plan pricing details
 */
const getPlanPricing = (planTier) => {
  const pricing = {
    'Trial': { amount: 0, currency: 'usd', description: 'Free 30-day trial' },
    'Tier 1': { amount: 50000, currency: 'usd', description: 'Small Districts - $500/year' }, // $500 in cents
    'Tier 2': { amount: 120000, currency: 'usd', description: 'Medium Districts - $1,200/year' }, // $1,200 in cents
    'Tier 3': { amount: 250000, currency: 'usd', description: 'Large Districts - $2,500/year' }, // $2,500 in cents
    'Tier 4': { amount: 500000, currency: 'usd', description: 'Enterprise Districts - $5,000/year' }, // $5,000 in cents
    'Enterprise': { amount: null, currency: 'usd', description: 'Contact for custom pricing' }
  };
  
  return pricing[planTier] || null;
};

/**
 * Format amount from cents to dollars
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted dollar amount
 */
const formatAmount = (cents) => {
  if (cents === null || cents === undefined) return 'Contact Us';
  return `$${(cents / 100).toLocaleString()}`;
};

/**
 * Check if a plan requires payment
 * @param {string} planTier - Plan tier to check
 * @returns {boolean} True if payment is required
 */
const requiresPayment = (planTier) => {
  return planTier !== 'Trial' && planTier !== 'Enterprise';
};

/**
 * Get payment instructions for check payments
 * @param {string} planTier - Plan tier being purchased
 * @param {string} licenseKey - License key for reference
 * @returns {Object} Check payment instructions
 */
const getCheckPaymentInstructions = (planTier, licenseKey) => {
  const pricing = getPlanPricing(planTier);
  
  return {
    amount: formatAmount(pricing?.amount),
    payToOrder: 'JCS Photo Suite',
    mailingAddress: {
      name: 'JCS Photo Suite',
      address1: '[Your Business Address]',
      address2: '[City, State ZIP]',
      country: '[Country]'
    },
    memo: `License: ${licenseKey} - ${planTier} Plan`,
    instructions: [
      `Make check payable to: JCS Photo Suite`,
      `Amount: ${formatAmount(pricing?.amount)}`,
      `Write license key in memo: ${licenseKey}`,
      `Mail to the address above`,
      `Your license will be activated within 1-2 business days after we receive your check`
    ]
  };
};

/**
 * Simulate payment for testing (will be replaced with real Stripe integration)
 * @param {Object} testData - Test payment data
 * @returns {Promise<Object>} Mock payment result
 */
const simulatePayment = async (testData) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate different outcomes based on test data
  if (testData.simulateFailure) {
    throw new Error('Payment failed: Test failure simulation');
  }
  
  if (testData.simulateDecline) {
    return {
      success: false,
      error: 'Your card was declined.',
      decline_code: 'generic_decline'
    };
  }
  
  // Simulate successful payment
  return {
    success: true,
    payment_intent: {
      id: `pi_test_${Date.now()}`,
      status: 'succeeded',
      amount: testData.amount,
      currency: 'usd'
    }
  };
};

// Export the payment service
export default {
  verifyPayment,
  getPaymentStatus,
  createPaymentIntent,
  getPlanPricing,
  formatAmount,
  requiresPayment,
  getCheckPaymentInstructions,
  simulatePayment
}; 