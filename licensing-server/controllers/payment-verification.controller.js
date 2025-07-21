const pool = require('../config/db');
const { determineChangeType, logSubscriptionHistory } = require('../utils/subscription-utils');
const emailService = require('../utils/email');

/**
 * Payment Verification Controller
 * Handles Stripe payment verification and license activation
 */

/**
 * Verify Stripe payment intent and activate license
 */
exports.verifyPayment = async (req, res) => {
    const { payment_intent_id, license_key } = req.body;
    
    if (!payment_intent_id || !license_key) {
        return res.status(400).json({ error: 'Missing required parameters: payment_intent_id and license_key' });
    }
    
    try {
        let license = null;
        let isNewLicense = false;
        
        if (license_key === 'CREATE_NEW_LICENSE') {
            // This is a new license creation case
            isNewLicense = true;
            
            // Check if user already has a license (shouldn't happen, but safety check)
            const { rows: existingLicenses } = await pool.query(`
                SELECT l.* FROM licenses l
                JOIN user_licenses ul ON l.license_key = ul.license_key
                WHERE ul.user_id = $1
            `, [req.user.userId]);
            
            if (existingLicenses.length > 0) {
                return res.status(400).json({ 
                    error: 'User already has a license. Use existing license for upgrades.' 
                });
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
        }
        
        // First, verify payment with Stripe to get the plan tier
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        console.log(`🔄 Verifying payment for license: ${license_key}, payment_intent: ${payment_intent_id}`);
        
        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
            
            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({ 
                    error: 'Payment not completed', 
                    payment_status: paymentIntent.status 
                });
            }
            
            console.log(`✅ Payment verified successfully: ${payment_intent_id}`);
        } catch (stripeError) {
            console.error('Stripe API error:', stripeError);
            return res.status(400).json({ 
                error: 'Invalid payment intent ID', 
                details: stripeError.message 
            });
        }

        const newPlanTier = paymentIntent.metadata.plan_tier;

        // Check if license is already at this exact plan tier (only for existing licenses)
        if (!isNewLicense && license.is_active && license.payment_status === 'active' && license.plan_tier === newPlanTier) {
            return res.json({ 
                success: true, 
                message: `License is already active with ${newPlanTier} plan`,
                license_key: license_key,
                payment_status: 'active'
            });
        }

        const paymentAmount = paymentIntent.amount / 100; // Convert from cents to dollars
        const { TIER_PLANS, generateLicenseKey } = require('../utils/constants');
        const newPlan = TIER_PLANS[newPlanTier];
        
        let actualLicenseKey = license_key;
        let oldPlanTier = null;
        
        if (isNewLicense) {
            // Create new license
            const { rows: userRows } = await pool.query(
                'SELECT * FROM users WHERE id = $1', 
                [req.user.userId]
            );
            
            if (userRows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = userRows[0];
            actualLicenseKey = generateLicenseKey();
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year for paid plans
            
            console.log(`🔄 Creating new license with ${newPlanTier} plan for user ${req.user.userId}`);
            console.log(`💰 Payment amount: $${paymentAmount}`);
            
            // Create license with the correct plan tier from the start
            await pool.query(`
                INSERT INTO licenses (
                    license_key, district_name, district_uid, expiry_date, 
                    plan_tier, max_student_uploads, max_staff_uploads,
                    created_by_user_id, primary_contact_id, is_installed, installed_at,
                    payment_status, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                actualLicenseKey, user.district_name, user.district_uid, expiryDate.toISOString(), 
                newPlanTier, newPlan.max_student_uploads, newPlan.max_staff_uploads,
                user.id, user.id, false, null, 'active', true
            ]);
            
            // Link user to license as primary contact
            await pool.query(`
                INSERT INTO user_licenses (user_id, license_key, role) 
                VALUES ($1, $2, $3)
            `, [user.id, actualLicenseKey, 'primary']);
            
            // Add server URLs if provided
            if (user.powerschool_url) {
                await pool.query(`
                    INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
                    VALUES ($1, $2, $3, $4)
                `, [actualLicenseKey, user.powerschool_url, 'production', false]);
            }
            
            if (user.test_url) {
                await pool.query(`
                    INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
                    VALUES ($1, $2, $3, $4)
                `, [actualLicenseKey, user.test_url, 'test', false]);
            }
            
            console.log(`✅ New license created successfully: ${actualLicenseKey} → ${newPlanTier}`);
            oldPlanTier = null; // No previous plan for new license
        } else {
            // Update existing license
            oldPlanTier = license.plan_tier;
            console.log(`🔄 Processing license upgrade: ${oldPlanTier} → ${newPlanTier} for license ${license_key}`);
            console.log(`💰 Payment amount: $${paymentAmount}`);
            
            const updateResult = await pool.query(`
                UPDATE licenses 
                SET plan_tier = $1, max_student_uploads = $2, max_staff_uploads = $3, payment_status = 'active', is_active = true, updated_at = CURRENT_TIMESTAMP 
                WHERE license_key = $4
            `, [newPlanTier, newPlan.max_student_uploads, newPlan.max_staff_uploads, license_key]);

            console.log(`✅ License updated successfully: ${license_key} → ${newPlanTier}`);
            console.log(`📊 Update affected ${updateResult.rowCount} rows`);
            
            // Verify the update by checking the database
            const { rows: verifyRows } = await pool.query(
                'SELECT plan_tier, payment_status, is_active FROM licenses WHERE license_key = $1',
                [license_key]
            );
            console.log(`🔍 Database verification for ${license_key}:`, verifyRows[0]);
        }
        
        // Determine change type using shared utility
        const changeType = determineChangeType(oldPlanTier, newPlanTier);

        // Log the payment verification in subscription history using shared utility
        await logSubscriptionHistory({
            licenseKey: actualLicenseKey,
            userId: req.user.userId,
            oldPlanTier,
            newPlanTier,
            changeType,
            amount: paymentAmount,
            notes: `Payment verified: ${payment_intent_id}`
        });

        console.log(`📝 Subscription history logged for ${actualLicenseKey}`);

        // Send appropriate email notification (should work in both dev and production)
        // Note: Only webhook emails are restricted to dev mode, not direct payment confirmations
        try {
            // Get updated license details with user email by joining tables
            const { rows: updatedLicenseRows } = await pool.query(`
                SELECT l.*, u.email, u.first_name, u.last_name
                FROM licenses l
                JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
                JOIN users u ON ul.user_id = u.id
                WHERE l.license_key = $1
            `, [actualLicenseKey]);
            
            if (updatedLicenseRows.length > 0) {
                const updatedLicense = updatedLicenseRows[0];
                
                // Calculate new expiry date (development mode uses days instead of years for testing)
                const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true';
                const extensionPeriod = isDevelopmentMode ? 1 : 365; // 1 day vs 1 year
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + extensionPeriod);
                
                if (isNewLicense) {
                    // New subscription - send welcome email
                    console.log(`📧 Sending subscription welcome email to ${updatedLicense.email}`);
                    await emailService.sendSubscriptionWelcomeEmail(updatedLicense, paymentAmount);
                } else {
                    // Check if this is an upgrade or renewal using the change type
                    const changeType = determineChangeType(oldPlanTier, newPlanTier);
                    
                    if (changeType === 'upgrade') {
                        // Plan upgrade - send upgrade email
                        console.log(`📧 Sending plan upgrade email to ${updatedLicense.email} (${oldPlanTier} → ${newPlanTier})`);
                        await emailService.sendPlanUpgradeEmail(updatedLicense, oldPlanTier, newPlanTier, paymentAmount);
                    } else if (changeType === 'downgrade') {
                        // Plan downgrade - send downgrade email
                        console.log(`📧 Sending plan downgrade email to ${updatedLicense.email} (${oldPlanTier} → ${newPlanTier})`);
                        await emailService.sendPlanDowngradeEmail(updatedLicense, oldPlanTier, newPlanTier, paymentAmount);
                    } else {
                        // License renewal - send renewal success email  
                        console.log(`📧 Sending renewal success email to ${updatedLicense.email}`);
                        await emailService.sendRenewalSuccessEmail(updatedLicense, newExpiry, paymentAmount);
                    }
                }
                
                console.log(`✅ Email notification sent successfully`);
            }
        } catch (emailError) {
            console.error('❌ Failed to send email notification:', emailError);
            // Don't fail the payment verification if email fails
        }

        res.json({
            success: true,
            message: isNewLicense 
                ? 'Payment verified and license created successfully'
                : 'Payment verified and license upgraded successfully',
            license_key: actualLicenseKey,
            old_plan: oldPlanTier,
            new_plan: newPlanTier,
            payment_status: 'active'
        });
        
    } catch (err) {
        console.error('Payment verification error:', err);
        return res.status(500).json({ error: 'Internal server error during payment verification' });
    }
};

/**
 * Get payment status for a license
 */
exports.getPaymentStatus = async (req, res) => {
    const { license_key } = req.params;
    
    try {
        // Verify user owns this license
        const { rows: userLicenseRows } = await pool.query(`
            SELECT l.payment_status, l.is_active, l.plan_tier, l.created_at, l.updated_at 
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE l.license_key = $1 AND ul.user_id = $2
        `, [license_key, req.user.userId]);
        
        if (userLicenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or access denied' });
        }
        
        const license = userLicenseRows[0];
        
        res.json({
            success: true,
            license_key: license_key,
            payment_status: license.payment_status,
            is_active: license.is_active,
            plan_tier: license.plan_tier,
            created_at: license.created_at,
            updated_at: license.updated_at
        });
        
    } catch (err) {
        console.error('Get payment status error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Admin function to manually confirm check payments
 */
exports.confirmCheckPayment = async (req, res) => {
    const { license_key, amount, check_number, notes } = req.body;
    
    if (!license_key) {
        return res.status(400).json({ error: 'Missing required parameter: license_key' });
    }
    
    try {
        // Get license details
        const { rows: licenseRows } = await pool.query(`
            SELECT * FROM licenses WHERE license_key = $1
        `, [license_key]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found' });
        }
        
        const license = licenseRows[0];
        
        // Update license to active status
        await pool.query(`
            UPDATE licenses 
            SET payment_status = 'active', is_active = true, updated_at = CURRENT_TIMESTAMP 
            WHERE license_key = $1
        `, [license_key]);
        
        // Log the check payment in subscription history
        const checkNotes = `Check payment confirmed${check_number ? ` - Check #${check_number}` : ''}${notes ? ` - ${notes}` : ''}`;
        
        // For check payment confirmation, this is activating an existing license
        // The change type should be 'purchase' since it's the first activation of a paid plan
        await logSubscriptionHistory({
            licenseKey: license_key,
            userId: license.created_by_user_id,
            oldPlanTier: null, // No previous active plan
            newPlanTier: license.plan_tier,
            changeType: 'purchase',
            amount: amount || 0,
            notes: checkNotes
        });
        
        res.json({
            success: true,
            message: 'Check payment confirmed and license activated',
            license_key: license_key,
            payment_status: 'active'
        });
        
    } catch (err) {
        console.error('Check payment confirmation error:', err);
        return res.status(500).json({ error: 'Internal server error during check payment confirmation' });
    }
};