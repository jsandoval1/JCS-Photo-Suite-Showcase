const pool = require('../config/db');

/**
 * Payment Intent Controller
 * Handles Stripe payment intent creation
 */

/**
 * Create Stripe payment intent for a license upgrade
 */
exports.createPaymentIntent = async (req, res) => {
    const { license_key, plan_tier } = req.body;
    
    if (!license_key || !plan_tier) {
        return res.status(400).json({ error: 'Missing required parameters: license_key and plan_tier' });
    }
    
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }
        
        let license = null;
        let districtName = null;
        
        if (license_key === 'CREATE_NEW_LICENSE') {
            // New user without existing license - get district info from user
            const { rows: userRows } = await pool.query(
                'SELECT district_name FROM users WHERE id = $1', 
                [req.user.userId]
            );
            
            if (userRows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            districtName = userRows[0].district_name;
            if (!districtName) {
                return res.status(400).json({ error: 'District information not found. Please update your profile.' });
            }
        } else {
            // Verify user owns this license
            const { rows: userLicenseRows } = await pool.query(`
                SELECT l.* FROM licenses l
                JOIN user_licenses ul ON l.license_key = ul.license_key
                WHERE l.license_key = $1 AND ul.user_id = $2
            `, [license_key, req.user.userId]);
            
            if (userLicenseRows.length === 0) {
                return res.status(404).json({ error: 'License not found or access denied' });
            }
            
            license = userLicenseRows[0];
            districtName = license.district_name;
        }
        
        // Get plan pricing with processing fees using pricing service
        const pricingService = require('../services/pricing.service');
        
        if (plan_tier === 'Trial') {
            return res.status(400).json({ error: 'Trial plan does not require payment' });
        }
        
        if (!pricingService.isValidPlanTier(plan_tier)) {
            return res.status(400).json({ error: 'Invalid plan tier or Enterprise plan requires contact' });
        }
        
        // Calculate total amount including Stripe processing fees
        const pricing = pricingService.calculateSubscriptionPricing(plan_tier, 'stripe', 0);
        const amount = pricing.total; // This includes the 2.9% + $0.30 processing fee
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            metadata: {
                license_key: license_key,
                plan_tier: plan_tier,
                user_id: req.user.userId,
                district_name: districtName
            },
            description: `JCS Photo Suite - ${plan_tier} Plan`
        });
        
        console.log(`💳 Payment intent created: ${paymentIntent.id} for ${license_key === 'CREATE_NEW_LICENSE' ? 'new license' : `license: ${license_key}`}`);
        
        res.json({
            success: true,
            payment_intent: {
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            }
        });
        
    } catch (err) {
        console.error('Create payment intent error:', err);
        return res.status(500).json({ error: 'Internal server error creating payment intent' });
    }
};