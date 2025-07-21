/**
 * Pricing utility for calculating costs and fees
 */

// Stripe processing fees: 2.9% + $0.30
// Match the exact calculation from the backend pricing service
const STRIPE_PERCENTAGE_FEE = 0.029;
const STRIPE_FIXED_FEE = 0.30;

/**
 * Convert plan price string to numeric value
 * @param {string} priceString - Price string like "$500" or "$1,200"
 * @returns {number} Numeric price value
 */
export const parsePrice = (priceString) => {
  if (!priceString || priceString === 'Contact Us') return 0;
  // Remove $ symbol, commas, and convert to number
  return parseFloat(priceString.replace(/[$,]/g, ''));
};

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Calculate Stripe processing fee (matches backend calculation exactly)
 * Backend: Math.round((subtotal * 0.029) + 30) cents
 * @param {number} amount - Base amount in dollars
 * @returns {number} Processing fee in dollars
 */
export const calculateProcessingFee = (amount) => {
  if (amount <= 0) return 0;
  
  // Convert to cents, calculate fee in cents, then convert back to dollars
  const amountInCents = Math.round(amount * 100);
  const feeInCents = Math.round((amountInCents * STRIPE_PERCENTAGE_FEE) + (STRIPE_FIXED_FEE * 100));
  
  return Math.round(feeInCents) / 100;
};

/**
 * Calculate total amount with Stripe fees
 * @param {number} baseAmount - Base license cost
 * @returns {number} Total amount including fees
 */
export const calculateTotalWithFees = (baseAmount) => {
  if (baseAmount <= 0) return 0;
  const processingFee = calculateProcessingFee(baseAmount);
  return Math.round((baseAmount + processingFee) * 100) / 100;
};

/**
 * Get pricing breakdown for a plan
 * @param {Object} plan - Plan object with price property
 * @param {string} paymentMethod - Payment method ('stripe' or 'check')
 * @returns {Object} Pricing breakdown
 */
export const getPricingBreakdown = (plan, paymentMethod = 'stripe') => {
  const baseAmount = parsePrice(plan.price);
  
  if (paymentMethod === 'check' || baseAmount === 0 || plan.price === 'Contact Us') {
    return {
      baseAmount,
      processingFee: 0,
      total: baseAmount,
      formattedBase: plan.price,
      formattedProcessingFee: formatCurrency(0),
      formattedTotal: plan.price,
      hasProcessingFee: false
    };
  }

  // Stripe payment
  const processingFee = calculateProcessingFee(baseAmount);
  const total = calculateTotalWithFees(baseAmount);

  return {
    baseAmount,
    processingFee,
    total,
    formattedBase: formatCurrency(baseAmount),
    formattedProcessingFee: formatCurrency(processingFee),
    formattedTotal: formatCurrency(total),
    hasProcessingFee: true
  };
};

/**
 * Get display price for payment button
 * @param {Object} plan - Plan object
 * @param {string} paymentMethod - Payment method
 * @returns {string} Formatted price for button display
 */
export const getPaymentButtonPrice = (plan, paymentMethod = 'stripe') => {
  const pricing = getPricingBreakdown(plan, paymentMethod);
  return pricing.formattedTotal;
}; 