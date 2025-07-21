/**
 * Shared utilities for subscription and plan management
 */

const pool = require('../config/db');

// Plan hierarchy for upgrade/downgrade logic
const PLAN_HIERARCHY = ['Trial', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Enterprise'];

/**
 * Determine change type between two plan tiers
 * @param {string} oldPlan - Previous plan tier
 * @param {string} newPlan - New plan tier
 * @returns {string} - Change type: 'purchase', 'upgrade', 'downgrade', 'renewal'
 */
const determineChangeType = (oldPlan, newPlan) => {
    if (!oldPlan || oldPlan === null) {
        // For new licenses (both Trial and paid), use 'purchase'
        return 'purchase';
    }
    
    if (oldPlan === 'Trial' && newPlan !== 'Trial') {
        return 'upgrade';
    }
    
    const oldIndex = PLAN_HIERARCHY.indexOf(oldPlan);
    const newIndex = PLAN_HIERARCHY.indexOf(newPlan);
    
    if (newIndex > oldIndex) {
        return 'upgrade';
    } else if (newIndex < oldIndex) {
        return 'downgrade';
    } else {
        return 'renewal';
    }
};

/**
 * Log subscription history entry
 * @param {Object} params - History entry parameters
 * @param {string} params.licenseKey - License key
 * @param {number} params.userId - User ID
 * @param {string} params.oldPlanTier - Previous plan tier
 * @param {string} params.newPlanTier - New plan tier
 * @param {string} params.changeType - Type of change
 * @param {number} params.amount - Transaction amount
 * @param {string} params.notes - Additional notes
 * @param {string} [params.paymentMethod] - Payment method used
 * @param {string} [params.stripePaymentIntentId] - Stripe payment intent ID
 * @param {number} [params.prorationCredit] - Proration credit amount
 * @param {string} [params.failureReason] - Failure reason if applicable
 * @param {Object} [client] - Database client (for transactions)
 */
const logSubscriptionHistory = async (params, client = null) => {
    const { 
        licenseKey, 
        userId, 
        oldPlanTier, 
        newPlanTier, 
        changeType, 
        amount, 
        notes,
        paymentMethod,
        stripePaymentIntentId,
        prorationCredit,
        failureReason
    } = params;
    
    const query = `
        INSERT INTO subscription_history (
            license_key, user_id, old_plan_tier, new_plan_tier, change_type, 
            amount, notes, payment_method, stripe_payment_intent_id, 
            proration_credit, failure_reason, effective_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
    `;
    
    const values = [
        licenseKey, 
        userId, 
        oldPlanTier, 
        newPlanTier, 
        changeType, 
        amount, 
        notes,
        paymentMethod || null,
        stripePaymentIntentId || null,
        prorationCredit || null,
        failureReason || null
    ];
    
    if (client) {
        return await client.query(query, values);
    } else {
        return await pool.query(query, values);
    }
};

/**
 * Check if a plan tier is a paid plan
 * @param {string} planTier - Plan tier to check
 * @returns {boolean} - True if it's a paid plan
 */
const isPaidPlan = (planTier) => {
    return planTier && planTier !== 'Trial';
};

/**
 * Get plan hierarchy index
 * @param {string} planTier - Plan tier
 * @returns {number} - Index in hierarchy (-1 if not found)
 */
const getPlanIndex = (planTier) => {
    return PLAN_HIERARCHY.indexOf(planTier);
};

module.exports = {
    PLAN_HIERARCHY,
    determineChangeType,
    logSubscriptionHistory,
    isPaidPlan,
    getPlanIndex
}; 