const pool = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pricingService = require('../services/pricing.service');
const { TIER_PLANS, generateLicenseKey } = require('../utils/constants');
const { determineChangeType, logSubscriptionHistory } = require('../utils/subscription-utils');

/**
 * Create Stripe subscription for new license
 */
exports.createSubscription = async (req, res) => {
    const { plan_tier, payment_method = 'stripe', additional_servers = 0 } = req.body;
    
    if (!plan_tier || !pricingService.isValidPlanTier(plan_tier)) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }

    if (!['stripe', 'check'].includes(payment_method)) {
        return res.status(400).json({ error: 'Payment method must be stripe or check' });
    }

    try {
        // Get user info
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        if (!user.district_name || !user.district_uid) {
            return res.status(400).json({ error: 'District information required. Please update your profile.' });
        }

        // Check if user already has a license
        const { rows: existingLicenses } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1
        `, [user.id]);
        
        if (existingLicenses.length > 0) {
            return res.status(400).json({ 
                error: 'User already has a license. Use upgrade endpoint to change plans.' 
            });
        }

        // Calculate pricing
        const pricing = pricingService.calculateSubscriptionPricing(plan_tier, payment_method, additional_servers);
        console.log('💰 Calculated pricing:', pricing);

        const client = await pool.connect();
        let licenseKey, stripeCustomerId, stripeSubscriptionId;

        try {
            await client.query('BEGIN');
            
            // Generate license key
            licenseKey = generateLicenseKey();
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            // Determine license status based on payment method
            const isActive = payment_method === 'check' ? false : true; // Check payments start inactive
            const paymentStatus = payment_method === 'check' ? 'pending_payment' : 'active';

            // Create license record
            const planConfig = TIER_PLANS[plan_tier];
            await client.query(`
                INSERT INTO licenses (
                    license_key, district_name, district_uid, expiry_date,
                    plan_tier, max_student_uploads, max_staff_uploads,
                    created_by_user_id, primary_contact_id, is_installed, installed_at,
                    payment_status, is_active, payment_method, auto_renew,
                    additional_servers_count, additional_servers_fee
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                licenseKey, user.district_name, user.district_uid, expiryDate.toISOString(),
                plan_tier, planConfig.max_student_uploads, planConfig.max_staff_uploads,
                user.id, user.id, false, null,
                paymentStatus, isActive, payment_method, payment_method === 'stripe',
                additional_servers, additional_servers * 50 // Store annual fee for servers
            ]);

            // Link user to license
            await client.query(`
                INSERT INTO user_licenses (user_id, license_key, role) 
                VALUES ($1, $2, $3)
            `, [user.id, licenseKey, 'primary']);

            // Add server URLs if provided
            if (user.powerschool_url) {
                await client.query(`
                    INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
                    VALUES ($1, $2, $3, $4)
                `, [licenseKey, user.powerschool_url, 'production', false]);
            }

            if (user.test_url) {
                await client.query(`
                    INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
                    VALUES ($1, $2, $3, $4)
                `, [licenseKey, user.test_url, 'test', false]);
            }

            // For Stripe payments, create subscription
            if (payment_method === 'stripe') {
                // Create or get customer
                stripeCustomerId = await getOrCreateStripeCustomer(user);
                
                // Get Stripe price ID
                const priceId = await pricingService.getOrCreateStripePrice(plan_tier, payment_method, additional_servers);
                
                // Create subscription
                const subscription = await stripe.subscriptions.create({
                    customer: stripeCustomerId,
                    items: [{ price: priceId }],
                    metadata: {
                        license_key: licenseKey,
                        plan_tier: plan_tier,
                        user_id: user.id.toString(),
                        district_name: user.district_name,
                        additional_servers: additional_servers.toString()
                    },
                    expand: ['latest_invoice.payment_intent']
                });

                stripeSubscriptionId = subscription.id;

                // Update license with Stripe IDs
                await client.query(`
                    UPDATE licenses 
                    SET stripe_customer_id = $1, stripe_subscription_id = $2
                    WHERE license_key = $3
                `, [stripeCustomerId, stripeSubscriptionId, licenseKey]);

                console.log(`✅ Created Stripe subscription: ${stripeSubscriptionId} for license: ${licenseKey}`);
            }

            // Log subscription creation
            await logSubscriptionHistory({
                licenseKey,
                userId: user.id,
                oldPlanTier: null,
                newPlanTier: plan_tier,
                changeType: 'purchase',
                amount: pricing.total / 100, // Convert to dollars
                notes: `Subscription created - Payment method: ${payment_method}`,
                paymentMethod: payment_method
            }, client);

            await client.query('COMMIT');

            const response = {
                success: true,
                license_key: licenseKey,
                plan_tier: plan_tier,
                payment_method: payment_method,
                pricing: pricing,
                expiry_date: expiryDate.toISOString(),
                is_active: isActive,
                requires_payment: payment_method === 'stripe',
                message: payment_method === 'stripe' 
                    ? 'Subscription created successfully! Complete payment to activate your license.'
                    : 'License created! Please send check payment to activate your license.'
            };

            // For Stripe payments, include payment intent for frontend
            if (payment_method === 'stripe' && stripeSubscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
                    expand: ['latest_invoice.payment_intent']
                });
                
                response.subscription_id = stripeSubscriptionId;
                response.client_secret = subscription.latest_invoice.payment_intent.client_secret;
            }

            res.json(response);

        } catch (err) {
            await client.query('ROLLBACK');
            
            // Clean up Stripe resources if created
            if (stripeSubscriptionId) {
                try {
                    await stripe.subscriptions.cancel(stripeSubscriptionId);
                } catch (cleanupErr) {
                    console.error('Failed to cleanup Stripe subscription:', cleanupErr);
                }
            }
            
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Create subscription error:', err);
        return res.status(500).json({ error: 'Internal server error creating subscription' });
    }
};

/**
 * Upgrade existing subscription
 */
exports.upgradeSubscription = async (req, res) => {
    const { plan_tier, additional_servers = 0 } = req.body;
    
    if (!plan_tier || !pricingService.isValidPlanTier(plan_tier)) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }

    try {
        // Get user's existing license
        const { rows: licenseRows } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1 AND ul.role = 'primary'
        `, [req.user.userId]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'No existing license found. Use create endpoint instead.' });
        }
        
        const license = licenseRows[0];
        
        if (license.plan_tier === plan_tier && license.additional_servers_count === additional_servers) {
            return res.status(400).json({ 
                error: `You already have ${plan_tier} with ${additional_servers} additional servers.` 
            });
        }

        // Calculate new pricing
        const newPricing = pricingService.calculateSubscriptionPricing(plan_tier, license.payment_method, additional_servers);
        const oldPricing = pricingService.calculateSubscriptionPricing(license.plan_tier, license.payment_method, license.additional_servers_count || 0);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update license
            const planConfig = TIER_PLANS[plan_tier];
            await client.query(`
                UPDATE licenses SET 
                    plan_tier = $1,
                    max_student_uploads = $2,
                    max_staff_uploads = $3,
                    additional_servers_count = $4,
                    additional_servers_fee = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $6
            `, [
                plan_tier, 
                planConfig.max_student_uploads, 
                planConfig.max_staff_uploads,
                additional_servers,
                additional_servers * 50,
                license.license_key
            ]);

            // Update Stripe subscription if using Stripe
            if (license.stripe_subscription_id) {
                const newPriceId = await pricingService.getOrCreateStripePrice(plan_tier, license.payment_method, additional_servers);
                
                // Update subscription with proration
                await stripe.subscriptions.update(license.stripe_subscription_id, {
                    items: [{
                        id: (await stripe.subscriptions.retrieve(license.stripe_subscription_id)).items.data[0].id,
                        price: newPriceId
                    }],
                    proration_behavior: 'create_prorations'
                });

                console.log(`✅ Updated Stripe subscription: ${license.stripe_subscription_id} to ${plan_tier}`);
            }

            // Log the change
            await logSubscriptionHistory({
                licenseKey: license.license_key,
                userId: req.user.userId,
                oldPlanTier: license.plan_tier,
                newPlanTier: plan_tier,
                changeType: determineChangeType(license.plan_tier, plan_tier),
                amount: newPricing.total / 100,
                notes: `Subscription upgraded from ${license.plan_tier} to ${plan_tier}`,
                paymentMethod: license.payment_method
            }, client);

            await client.query('COMMIT');

            res.json({
                success: true,
                license_key: license.license_key,
                old_plan_tier: license.plan_tier,
                new_plan_tier: plan_tier,
                old_pricing: oldPricing,
                new_pricing: newPricing,
                message: `Subscription upgraded from ${license.plan_tier} to ${plan_tier}!`
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Upgrade subscription error:', err);
        return res.status(500).json({ error: 'Internal server error upgrading subscription' });
    }
};

/**
 * Add additional servers to existing license (prorated)
 */
exports.addAdditionalServers = async (req, res) => {
    const { license_key } = req.params;
    const { additional_servers_to_add } = req.body;
    
    if (!additional_servers_to_add || additional_servers_to_add <= 0) {
        return res.status(400).json({ error: 'Number of additional servers must be greater than 0' });
    }

    try {
        // Verify user owns this license
        const { rows: licenseRows } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE l.license_key = $1 AND ul.user_id = $2 AND ul.role = 'primary'
        `, [license_key, req.user.userId]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or access denied' });
        }
        
        const license = licenseRows[0];
        const currentAdditionalServers = license.additional_servers_count || 0;
        const newTotalServers = currentAdditionalServers + additional_servers_to_add;

        // Calculate prorated pricing for the additional servers
        const prorationData = await pricingService.calculateAdditionalServerProration(license_key, additional_servers_to_add);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update license with new server count
            await client.query(`
                UPDATE licenses 
                SET additional_servers_count = $1,
                    additional_servers_fee = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $3
            `, [newTotalServers, newTotalServers * 50, license_key]);

            // For Stripe subscriptions, add the servers as a separate line item
            if (license.stripe_subscription_id) {
                // Get price for additional servers
                const serverPriceId = await pricingService.getOrCreateStripePrice('Additional Server', license.payment_method, 0);
                
                // Add servers to subscription
                await stripe.subscriptionItems.create({
                    subscription: license.stripe_subscription_id,
                    price: serverPriceId,
                    quantity: additional_servers_to_add,
                    proration_behavior: 'create_prorations'
                });

                console.log(`✅ Added ${additional_servers_to_add} servers to Stripe subscription: ${license.stripe_subscription_id}`);
            }

            // Log the addition
            await logSubscriptionHistory({
                licenseKey: license_key,
                userId: req.user.userId,
                oldPlanTier: license.plan_tier,
                newPlanTier: license.plan_tier,
                changeType: 'server_addition',
                amount: prorationData.total / 100,
                notes: `Added ${additional_servers_to_add} additional servers (prorated)`,
                paymentMethod: license.payment_method
            }, client);

            await client.query('COMMIT');

            res.json({
                success: true,
                license_key: license_key,
                servers_added: additional_servers_to_add,
                total_additional_servers: newTotalServers,
                proration_data: prorationData,
                message: `Added ${additional_servers_to_add} additional servers to your license`
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Add servers error:', err);
        return res.status(500).json({ error: 'Internal server error adding servers' });
    }
};

/**
 * Get or create Stripe customer
 */
async function getOrCreateStripeCustomer(user) {
    // Check if user already has a Stripe customer ID
    if (user.stripe_customer_id) {
        try {
            await stripe.customers.retrieve(user.stripe_customer_id);
            return user.stripe_customer_id;
        } catch (error) {
            console.log('Existing Stripe customer not found, creating new one');
        }
    }

    // Create new customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
            user_id: user.id.toString(),
            district_name: user.district_name,
            district_uid: user.district_uid
        }
    });

    // Update user record with customer ID
    await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, user.id]
    );

    console.log(`✅ Created Stripe customer: ${customer.id} for user: ${user.id}`);
    return customer.id;
}

// Keep existing trial eligibility and subscription history methods...
// Check Trial Eligibility
exports.checkTrialEligibility = async (req, res) => {
    try {
        // Get user's district information
        const { rows: userRows } = await pool.query(
            'SELECT district_uid, district_name FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Check if user currently has an active license
        const { rows: currentLicenseRows } = await pool.query(`
            SELECT l.plan_tier, l.is_active 
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1 AND l.is_active = true
        `, [req.user.userId]);
        
        // If user has an active paid plan, they cannot downgrade to trial
        if (currentLicenseRows.length > 0) {
            const currentPlan = currentLicenseRows[0].plan_tier;
            if (currentPlan !== 'Trial') {
                return res.json({
                    success: true,
                    eligible: false,
                    reason: 'Cannot downgrade from paid plan to trial',
                    currentPlan: currentPlan
                });
            }
        }
        
        // Check if this district has ever had a trial
        const { rows: trialHistoryRows } = await pool.query(`
            SELECT DISTINCT sh.license_key 
            FROM subscription_history sh
            JOIN licenses l ON sh.license_key = l.license_key
            WHERE l.district_uid = $1 AND (
                sh.new_plan_tier = 'Trial' OR 
                sh.old_plan_tier = 'Trial'
            )
            UNION
            SELECT DISTINCT l.license_key
            FROM licenses l
            WHERE l.district_uid = $1 AND l.plan_tier = 'Trial'
        `, [user.district_uid]);
        
        const hasUsedTrial = trialHistoryRows.length > 0;
        
        res.json({
            success: true,
            eligible: !hasUsedTrial,
            reason: hasUsedTrial ? 'District has already used trial period' : null,
            districtId: user.district_uid,
            districtName: user.district_name
        });
        
    } catch (err) {
        console.error('Check trial eligibility error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get Subscription History
exports.getSubscriptionHistory = async (req, res) => {
    try {
        // Get user's licenses
        const { rows: userLicenseRows } = await pool.query(`
            SELECT license_key FROM user_licenses 
            WHERE user_id = $1
        `, [req.user.userId]);
        
        if (userLicenseRows.length === 0) {
            return res.json({
                success: true,
                history: []
            });
        }
        
        const licenseKeys = userLicenseRows.map(row => row.license_key);
        
        // Get subscription history for all user's licenses
        const { rows: historyRows } = await pool.query(`
            SELECT sh.*, l.district_name 
            FROM subscription_history sh
            JOIN licenses l ON sh.license_key = l.license_key
            WHERE sh.license_key = ANY($1)
            ORDER BY sh.effective_date DESC
            LIMIT 100
        `, [licenseKeys]);
        
        res.json({
            success: true,
            history: historyRows
        });
        
    } catch (err) {
        console.error('Get subscription history error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Cancel Subscription (User self-cancellation)
exports.cancelSubscription = async (req, res) => {
    const { license_key } = req.body;
    
    if (!license_key) {
        return res.status(400).json({ error: 'License key is required' });
    }
    
    try {
        // Verify user owns this license
        const { rows: userLicenseRows } = await pool.query(`
            SELECT * FROM user_licenses 
            WHERE user_id = $1 AND license_key = $2
        `, [req.user.userId, license_key]);
        
        if (userLicenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or access denied' });
        }
        
        // Get license details
        const { rows: licenseRows } = await pool.query(`
            SELECT * FROM licenses WHERE license_key = $1
        `, [license_key]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found' });
        }
        
        const license = licenseRows[0];
        
        if (!license.is_active) {
            return res.status(400).json({ error: 'License is already canceled' });
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Cancel Stripe subscription if exists
            if (license.stripe_subscription_id) {
                await stripe.subscriptions.cancel(license.stripe_subscription_id);
                console.log(`✅ Cancelled Stripe subscription: ${license.stripe_subscription_id}`);
            }
            
            // Deactivate license
            await client.query('UPDATE licenses SET is_active = false, auto_renew = false, updated_at = CURRENT_TIMESTAMP WHERE license_key = $1', [license_key]);
            
            // Deactivate all associated servers
            await client.query('UPDATE license_servers SET is_active = false WHERE license_key = $1', [license_key]);
            
            // Record cancellation in subscription history
            await client.query(`
                INSERT INTO subscription_history (license_key, user_id, old_plan_tier, new_plan_tier, change_type, amount, notes, effective_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [license_key, req.user.userId, license.plan_tier, license.plan_tier, 'cancellation', 0, 'User canceled subscription']);
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: 'Subscription canceled successfully',
                license_key: license_key
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Cancel subscription error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};