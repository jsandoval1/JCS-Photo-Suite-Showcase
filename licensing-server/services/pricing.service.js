const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Pricing Service
 * Handles all pricing calculations and Stripe price management
 */
class PricingService {
    constructor() {
        // Base plan prices in cents (before processing fees)
        this.basePrices = {
            'Tier 1': 50000,  // $500
            'Tier 2': 120000, // $1,200
            'Tier 3': 250000, // $2,500
            'Tier 4': 500000, // $5,000
        };
        
        this.additionalServerPrice = 5000; // $50 per server per year
        this.stripeProcessingRate = 0.029; // 2.9%
        this.stripeFixedFee = 30; // 30 cents in cents
    }

    /**
     * Calculate subscription pricing with processing fees
     * @param {string} planTier - Plan tier (e.g., 'Tier 1')
     * @param {string} paymentMethod - 'stripe' or 'check'
     * @param {number} additionalServers - Number of additional servers
     * @returns {Object} Pricing breakdown
     */
    calculateSubscriptionPricing(planTier, paymentMethod, additionalServers = 0) {
        if (!this.basePrices[planTier]) {
            throw new Error(`Invalid plan tier: ${planTier}`);
        }

        const basePrice = this.basePrices[planTier];
        const additionalServerCost = additionalServers * this.additionalServerPrice;
        const subtotal = basePrice + additionalServerCost;
        
        // Only add processing fees for Stripe payments
        const processingFee = paymentMethod === 'stripe' 
            ? Math.round((subtotal * this.stripeProcessingRate) + this.stripeFixedFee)
            : 0;
        
        return {
            planTier,
            paymentMethod,
            basePrice,
            additionalServers,
            additionalServerCost,
            subtotal,
            processingFee,
            total: subtotal + processingFee,
            breakdown: this.generateBreakdown(basePrice, additionalServerCost, processingFee)
        };
    }

    /**
     * Calculate prorated pricing for additional servers
     * @param {string} licenseKey - License key to get remaining time
     * @param {number} additionalServers - Number of servers to add
     * @returns {Object} Prorated pricing
     */
    async calculateAdditionalServerProration(licenseKey, additionalServers) {
        const pool = require('../config/db');
        
        // Get license expiry date
        const { rows } = await pool.query(
            'SELECT expiry_date, payment_method FROM licenses WHERE license_key = $1',
            [licenseKey]
        );

        if (rows.length === 0) {
            throw new Error('License not found');
        }

        const license = rows[0];
        const expiryDate = new Date(license.expiry_date);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
        const yearlyPortion = daysRemaining / 365;

        const fullYearCost = additionalServers * this.additionalServerPrice;
        const proratedCost = Math.round(fullYearCost * yearlyPortion);
        
        // Add processing fees if original payment was via Stripe
        const processingFee = license.payment_method === 'stripe'
            ? Math.round((proratedCost * this.stripeProcessingRate) + this.stripeFixedFee)
            : 0;

        return {
            additionalServers,
            daysRemaining,
            yearlyPortion: Math.round(yearlyPortion * 100) / 100, // Round to 2 decimal places
            fullYearCost,
            proratedCost,
            processingFee,
            total: proratedCost + processingFee,
            expiryDate
        };
    }

    /**
     * Generate pricing breakdown string
     */
    generateBreakdown(basePrice, additionalServerCost, processingFee) {
        const parts = [];
        
        parts.push(`Base Plan: $${(basePrice / 100).toFixed(2)}`);
        
        if (additionalServerCost > 0) {
            const serverCount = additionalServerCost / this.additionalServerPrice;
            parts.push(`Additional Servers (${serverCount}): $${(additionalServerCost / 100).toFixed(2)}`);
        }
        
        if (processingFee > 0) {
            parts.push(`Processing Fee: $${(processingFee / 100).toFixed(2)}`);
        }
        
        return parts.join(' | ');
    }

    /**
     * Create or get Stripe price for a plan configuration
     * @param {string} planTier - Plan tier
     * @param {string} paymentMethod - Payment method
     * @param {number} additionalServers - Number of additional servers
     * @returns {Promise<string>} Stripe price ID
     */
    async getOrCreateStripePrice(planTier, paymentMethod, additionalServers = 0) {
        const pricing = this.calculateSubscriptionPricing(planTier, paymentMethod, additionalServers);
        
        // Development mode: Use 2-minute intervals for testing
        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true';
        const interval = isDevelopment ? 'day' : 'year'; // Stripe doesn't support minutes, so we'll use day
        const intervalCount = isDevelopment ? 1 : 1; // 1 day in dev, 1 year in prod
        
        // Create a unique price lookup key including development mode
        const lookupKey = `${planTier.toLowerCase().replace(' ', '_')}_${paymentMethod}_servers_${additionalServers}_${isDevelopment ? 'dev' : 'prod'}`;
        
        // For development mode, reduce the price significantly for testing
        const testAmount = isDevelopment ? Math.max(100, Math.floor(pricing.total / 365)) : pricing.total; // Minimum $1 for testing
        
        try {
            // Try to find existing price by lookup key
            const existingPrices = await stripe.prices.list({
                lookup_keys: [lookupKey],
                limit: 1
            });

            if (existingPrices.data.length > 0) {
                return existingPrices.data[0].id;
            }

            // Create new price if not found
            const priceData = {
                unit_amount: testAmount,
                currency: 'usd',
                recurring: { 
                    interval: interval,
                    interval_count: intervalCount
                },
                lookup_key: lookupKey,
                product_data: {
                    name: this.generateProductName(planTier, additionalServers, paymentMethod) + (isDevelopment ? ' (DEV)' : ''),
                    description: isDevelopment 
                        ? `DEV MODE: ${pricing.breakdown} - Daily billing for testing`
                        : pricing.breakdown,
                    metadata: {
                        plan_tier: planTier,
                        payment_method: paymentMethod,
                        additional_servers: additionalServers.toString(),
                        base_price: pricing.basePrice.toString(),
                        processing_fee: pricing.processingFee.toString(),
                        development_mode: isDevelopment.toString()
                    }
                }
            };

            const price = await stripe.prices.create(priceData);
            console.log(`✅ Created new Stripe price: ${price.id} for ${lookupKey} ${isDevelopment ? '(DEVELOPMENT MODE)' : ''}`);
            
            return price.id;

        } catch (error) {
            console.error('Error creating/getting Stripe price:', error);
            throw error;
        }
    }

    /**
     * Generate product name for Stripe
     */
    generateProductName(planTier, additionalServers, paymentMethod) {
        let name = `JCS Photo Suite - ${planTier} Annual`;
        
        if (additionalServers > 0) {
            name += ` + ${additionalServers} Additional Server${additionalServers > 1 ? 's' : ''}`;
        }
        
        if (paymentMethod === 'check') {
            name += ' (Check Payment)';
        }
        
        return name;
    }

    /**
     * Get all available pricing tiers for frontend
     * @param {string} paymentMethod - 'stripe' or 'check'
     * @returns {Array} Array of pricing objects
     */
    getAvailablePlans(paymentMethod = 'stripe') {
        return Object.keys(this.basePrices).map(planTier => {
            const pricing = this.calculateSubscriptionPricing(planTier, paymentMethod, 0);
            
            return {
                tier: planTier,
                name: this.getPlanDisplayName(planTier),
                description: this.getPlanDescription(planTier),
                basePrice: pricing.basePrice,
                processingFee: pricing.processingFee,
                total: pricing.total,
                displayPrice: `$${(pricing.total / 100).toLocaleString()}`,
                paymentMethod,
                features: this.getPlanFeatures(planTier)
            };
        });
    }

    /**
     * Get plan display names
     */
    getPlanDisplayName(planTier) {
        const names = {
            'Tier 1': 'Small Districts',
            'Tier 2': 'Medium Districts', 
            'Tier 3': 'Large Districts',
            'Tier 4': 'Enterprise Districts'
        };
        return names[planTier] || planTier;
    }

    /**
     * Get plan descriptions
     */
    getPlanDescription(planTier) {
        const descriptions = {
            'Tier 1': 'Perfect for smaller schools',
            'Tier 2': 'Great for growing districts',
            'Tier 3': 'Ideal for established districts', 
            'Tier 4': 'For large organizations'
        };
        return descriptions[planTier] || '';
    }

    /**
     * Get plan features
     */
    getPlanFeatures(planTier) {
        const features = {
            'Tier 1': [
                '5,000 Student Uploads',
                '500 Staff Uploads',
                'Email Support',
                'Test Server Access'
            ],
            'Tier 2': [
                '10,000 Student Uploads',
                '1,000 Staff Uploads',
                'Priority Email Support',
                'Test Server Access'
            ],
            'Tier 3': [
                '15,000 Student Uploads', 
                '2,500 Staff Uploads',
                'Phone Support',
                'Test Server Access'
            ],
            'Tier 4': [
                '50,000 Student Uploads',
                '5,000 Staff Uploads',
                'Dedicated Support',
                'Test Server Access'
            ]
        };
        return features[planTier] || [];
    }

    /**
     * Validate plan tier
     */
    isValidPlanTier(planTier) {
        return this.basePrices.hasOwnProperty(planTier);
    }

    /**
     * Convert cents to dollars for display
     */
    centsToDisplay(cents) {
        return `$${(cents / 100).toFixed(2)}`;
    }
}

module.exports = new PricingService(); 