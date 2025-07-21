const pricingService = require('../services/pricing.service');

/**
 * Pricing Controller
 * Exposes pricing information to frontend with processing fees
 */

/**
 * Get all available plans with pricing
 */
exports.getAvailablePlans = async (req, res) => {
    const { payment_method = 'stripe' } = req.query;
    
    try {
        const plans = pricingService.getAvailablePlans(payment_method);
        
        res.json({
            success: true,
            payment_method,
            plans,
            processing_info: payment_method === 'stripe' ? {
                rate: '2.9%',
                fixed_fee: '$0.30',
                note: 'Processing fees are included in the displayed prices'
            } : {
                note: 'No processing fees for check payments'
            }
        });
        
    } catch (error) {
        console.error('Get available plans error:', error);
        res.status(500).json({ error: 'Failed to get pricing information' });
    }
};

/**
 * Calculate pricing for specific configuration
 */
exports.calculatePricing = async (req, res) => {
    const { plan_tier, payment_method = 'stripe', additional_servers = 0 } = req.body;
    
    if (!plan_tier || !pricingService.isValidPlanTier(plan_tier)) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }

    if (!['stripe', 'check'].includes(payment_method)) {
        return res.status(400).json({ error: 'Payment method must be stripe or check' });
    }

    try {
        const pricing = pricingService.calculateSubscriptionPricing(plan_tier, payment_method, additional_servers);
        
        res.json({
            success: true,
            pricing,
            display: {
                base_plan: `${plan_tier}: ${pricingService.centsToDisplay(pricing.basePrice)}`,
                additional_servers: additional_servers > 0 
                    ? `${additional_servers} Additional Servers: ${pricingService.centsToDisplay(pricing.additionalServerCost)}`
                    : null,
                processing_fee: pricing.processingFee > 0 
                    ? `Processing Fee: ${pricingService.centsToDisplay(pricing.processingFee)}`
                    : null,
                total: `Total: ${pricingService.centsToDisplay(pricing.total)}`
            }
        });
        
    } catch (error) {
        console.error('Calculate pricing error:', error);
        res.status(500).json({ error: 'Failed to calculate pricing' });
    }
};

/**
 * Calculate prorated pricing for additional servers
 */
exports.calculateServerProration = async (req, res) => {
    const { license_key } = req.params;
    const { additional_servers } = req.body;
    
    if (!additional_servers || additional_servers <= 0) {
        return res.status(400).json({ error: 'Number of additional servers must be greater than 0' });
    }

    try {
        // Verify user owns this license
        const pool = require('../config/db');
        const { rows: licenseRows } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE l.license_key = $1 AND ul.user_id = $2 AND ul.role = 'primary'
        `, [license_key, req.user.userId]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or access denied' });
        }

        const prorationData = await pricingService.calculateAdditionalServerProration(license_key, additional_servers);
        
        res.json({
            success: true,
            license_key,
            additional_servers,
            proration: prorationData,
            display: {
                servers: `${additional_servers} Additional Servers`,
                yearly_cost: `Full Year Cost: ${pricingService.centsToDisplay(prorationData.fullYearCost)}`,
                prorated_portion: `Prorated (${prorationData.yearlyPortion * 100}% of year): ${pricingService.centsToDisplay(prorationData.proratedCost)}`,
                processing_fee: prorationData.processingFee > 0 
                    ? `Processing Fee: ${pricingService.centsToDisplay(prorationData.processingFee)}`
                    : null,
                total: `Total Due Now: ${pricingService.centsToDisplay(prorationData.total)}`,
                expires_with_license: `Expires: ${prorationData.expiryDate.toLocaleDateString()}`
            }
        });
        
    } catch (error) {
        console.error('Calculate server proration error:', error);
        res.status(500).json({ error: 'Failed to calculate server proration' });
    }
};

/**
 * Compare pricing between payment methods
 */
exports.comparePricing = async (req, res) => {
    const { plan_tier, additional_servers = 0 } = req.body;
    
    if (!plan_tier || !pricingService.isValidPlanTier(plan_tier)) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }

    try {
        const stripePricing = pricingService.calculateSubscriptionPricing(plan_tier, 'stripe', additional_servers);
        const checkPricing = pricingService.calculateSubscriptionPricing(plan_tier, 'check', additional_servers);
        
        const savings = stripePricing.total - checkPricing.total;
        
        res.json({
            success: true,
            plan_tier,
            additional_servers,
            comparison: {
                stripe: {
                    ...stripePricing,
                    display_total: pricingService.centsToDisplay(stripePricing.total)
                },
                check: {
                    ...checkPricing,
                    display_total: pricingService.centsToDisplay(checkPricing.total)
                },
                savings: {
                    amount: savings,
                    display: pricingService.centsToDisplay(savings),
                    percentage: Math.round((savings / stripePricing.total) * 100 * 100) / 100, // Round to 2 decimals
                    note: `Save ${pricingService.centsToDisplay(savings)} by paying with check`
                }
            }
        });
        
    } catch (error) {
        console.error('Compare pricing error:', error);
        res.status(500).json({ error: 'Failed to compare pricing' });
    }
};

/**
 * Get pricing breakdown for display
 */
exports.getPricingBreakdown = async (req, res) => {
    const { plan_tier, payment_method = 'stripe', additional_servers = 0 } = req.query;
    
    if (!plan_tier || !pricingService.isValidPlanTier(plan_tier)) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }

    try {
        const pricing = pricingService.calculateSubscriptionPricing(plan_tier, payment_method, additional_servers);
        
        const breakdown = [
            {
                item: `${plan_tier} Annual License`,
                amount: pricing.basePrice,
                display: pricingService.centsToDisplay(pricing.basePrice)
            }
        ];
        
        if (additional_servers > 0) {
            breakdown.push({
                item: `${additional_servers} Additional Server${additional_servers > 1 ? 's' : ''} (Annual)`,
                amount: pricing.additionalServerCost,
                display: pricingService.centsToDisplay(pricing.additionalServerCost)
            });
        }
        
        if (pricing.processingFee > 0) {
            breakdown.push({
                item: 'Credit Card Processing Fee',
                amount: pricing.processingFee,
                display: pricingService.centsToDisplay(pricing.processingFee),
                note: '2.9% + $0.30 per transaction'
            });
        }
        
        res.json({
            success: true,
            plan_tier,
            payment_method,
            additional_servers,
            breakdown,
            subtotal: {
                amount: pricing.subtotal,
                display: pricingService.centsToDisplay(pricing.subtotal)
            },
            total: {
                amount: pricing.total,
                display: pricingService.centsToDisplay(pricing.total)
            },
            note: payment_method === 'check' 
                ? 'No processing fees for check payments'
                : 'Processing fees included for credit card payments'
        });
        
    } catch (error) {
        console.error('Get pricing breakdown error:', error);
        res.status(500).json({ error: 'Failed to get pricing breakdown' });
    }
}; 