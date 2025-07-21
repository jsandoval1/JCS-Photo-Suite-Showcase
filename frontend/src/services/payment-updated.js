/**
 * UPDATED Payment service with new route structure
 * This shows what payment.js would look like after route refactoring
 */

import api from './api';

/**
 * Verify a payment intent and activate license
 */
const verifyPayment = async (paymentIntentId, licenseKey) => {
  try {
    // CHANGED: /users/verify-payment → /payments/verify-payment
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
 */
const getPaymentStatus = async (licenseKey) => {
  try {
    // CHANGED: /users/payment-status/:license_key → /payments/status/:license_key
    const response = await api.get(`/payments/status/${licenseKey}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create Stripe payment intent via backend
 */
const createPaymentIntent = async (paymentData) => {
  try {
    // CHANGED: /users/create-payment-intent → /payments/create-payment-intent
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
 * Get plan pricing information (unchanged)
 */
const getPlanPricing = (planTier) => {
  const pricing = {
    'Trial': { amount: 0, currency: 'usd', description: 'Free 30-day trial' },
    'Tier 1': { amount: 50000, currency: 'usd', description: 'Small Districts - $500/year' },
    'Tier 2': { amount: 120000, currency: 'usd', description: 'Medium Districts - $1,200/year' },
    'Tier 3': { amount: 250000, currency: 'usd', description: 'Large Districts - $2,500/year' },
    'Tier 4': { amount: 500000, currency: 'usd', description: 'Enterprise Districts - $5,000/year' },
    'Enterprise': { amount: null, currency: 'usd', description: 'Contact for custom pricing' }
  };
  
  return pricing[planTier] || null;
};

/**
 * Format amount from cents to dollars (unchanged)
 */
const formatAmount = (cents) => {
  if (cents === null || cents === undefined) return 'Contact for pricing';
  return `$${(cents / 100).toLocaleString()}`;
};

/**
 * Check if plan requires payment (unchanged)
 */
const requiresPayment = (planTier) => {
  return planTier !== 'Trial' && planTier !== 'Enterprise';
};

/**
 * Get check payment instructions (unchanged)
 */
const getCheckPaymentInstructions = (planTier, licenseKey) => {
  const pricing = getPlanPricing(planTier);
  if (!pricing || pricing.amount === null) {
    return {
      amount: 'Contact for pricing',
      instructions: 'Please contact us for Enterprise pricing and payment instructions.'
    };
  }
  
  return {
    amount: formatAmount(pricing.amount),
    instructions: `
      Please mail a check for ${formatAmount(pricing.amount)} to:
      
      JCS Photo Suite
      License Payment
      [Your Address]
      [City, State ZIP]
      
      Please include your license key (${licenseKey}) in the memo line.
      Your license will be activated within 1-2 business days after we receive your payment.
    `
  };
};

/**
 * Simulate payment for testing (unchanged)
 */
const simulatePayment = async (testData) => {
  try {
    // This would be used in development/testing only
    console.log('Simulating payment:', testData);
    
    // Simulate a successful payment
    return {
      success: true,
      payment_intent: {
        id: `pi_test_${Date.now()}`,
        status: 'succeeded'
      }
    };
  } catch (error) {
    throw error;
  }
};

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