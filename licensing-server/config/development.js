/**
 * Development Configuration
 * For testing with short subscription intervals and quick email notifications
 */

module.exports = {
    // Development mode flags
    isDevelopment: process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true',
    
    // Subscription testing intervals
    subscriptionInterval: 'day', // Instead of 'year'
    renewalPeriod: 1, // 1 day instead of 1 year
    
    // Payment failure testing
    paymentRetryDays: [1, 2, 3], // Instead of [1, 3, 7]
    gracePeriodHours: 2, // 2 hours instead of 30 days
    
    // Email testing intervals
    reminderEmailDays: [1], // Send reminder 1 day before expiry
    
    // Development pricing (much lower for testing)
    developmentPricing: {
        'Tier 1': 100,  // $1.00 instead of $500
        'Tier 2': 200,  // $2.00 instead of $1,200
        'Tier 3': 300,  // $3.00 instead of $2,500
        'Tier 4': 500,  // $5.00 instead of $5,000
    },
    
    // Test webhook events
    enableTestEndpoints: true,
    
    // Development logging
    verboseLogging: true,
    
    // Simulate faster time for testing
    timeMultiplier: 1440, // 1 day = 1 minute in testing (1440 minutes in a day)
    
    // Development email settings
    emailTestingMode: true,
    emailCooldownMinutes: 1 // Instead of hours
}; 