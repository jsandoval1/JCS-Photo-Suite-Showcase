/**
 * Email Templates Index
 * Aggregates all email templates for easy importing
 */

// User-facing email templates
const { getRenewalSuccessTemplate } = require('./user/renewal-success');
const { getPlanUpgradeTemplate } = require('./user/plan-upgrade');
const { getPlanDowngradeTemplate } = require('./user/plan-downgrade');
const { getPaymentFailedTemplate } = require('./user/payment-failed');
const { getSubscriptionWelcomeTemplate } = require('./user/subscription-welcome');
const { getTrialActivationTemplate } = require('./user/trial-activation');
const { get30DayExpiryTemplate } = require('./user/30-day-expiry');
const { get7DayExpiryTemplate } = require('./user/7-day-expiry');
const { getLicenseExpiredTemplate } = require('./user/license-expired');
const { getSubscriptionCancelledTemplate } = require('./user/subscription-cancelled');
const { getVerificationEmailTemplate } = require('./user/verification');
const { getPasswordResetEmailTemplate } = require('./user/password-reset');

// Business notification templates
const { getBusinessNotificationTemplate } = require('./business/notifications');
const { getBusinessDailySummaryTemplate } = require('./business/daily-summary');

// Support templates
const { getContactFormNotificationTemplate } = require('./support/contact-form');

module.exports = {
    // User templates
    getRenewalSuccessTemplate,
    getPlanUpgradeTemplate,
    getPlanDowngradeTemplate,
    getPaymentFailedTemplate,
    getSubscriptionWelcomeTemplate,
    getTrialActivationTemplate,
    get30DayExpiryTemplate,
    get7DayExpiryTemplate,
    getLicenseExpiredTemplate,
    getSubscriptionCancelledTemplate,
    getVerificationEmailTemplate,
    getPasswordResetEmailTemplate,
    
    // Business templates
    getBusinessNotificationTemplate,
    getBusinessDailySummaryTemplate,
    
    // Support templates
    getContactFormNotificationTemplate
}; 