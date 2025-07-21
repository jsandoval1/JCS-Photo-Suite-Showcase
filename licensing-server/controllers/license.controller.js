const pool = require('../config/db');
const { TIER_PLANS, generateLicenseKey } = require('../utils/constants');
const { determineChangeType, logSubscriptionHistory, isPaidPlan } = require('../utils/subscription-utils');
const emailService = require('../utils/email');

// Helper function to check trial eligibility
const checkTrialEligibility = async (userId, districtUid) => {
    // Check if user currently has an active paid plan
    const { rows: currentLicenseRows } = await pool.query(`
        SELECT l.plan_tier, l.is_active 
        FROM licenses l
        JOIN user_licenses ul ON l.license_key = ul.license_key
        WHERE ul.user_id = $1 AND l.is_active = true
    `, [userId]);
    
    // If user has an active paid plan, they cannot downgrade to trial
    if (currentLicenseRows.length > 0) {
        const currentPlan = currentLicenseRows[0].plan_tier;
        if (currentPlan !== 'Trial') {
            return {
                eligible: false,
                reason: 'Cannot downgrade from paid plan to trial',
                currentPlan: currentPlan
            };
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
    `, [districtUid]);
    
    const hasUsedTrial = trialHistoryRows.length > 0;
    
    return {
        eligible: !hasUsedTrial,
        reason: hasUsedTrial ? 'District has already used trial period' : null
    };
};

// Create License (user chooses any plan - trial or paid)
exports.createLicense = async (req, res) => {
    const { plan_tier, payment_intent_id } = req.body;
    
    if (!plan_tier || !TIER_PLANS[plan_tier]) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }
    
    try {
        // Get user info including district details
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        if (!user.district_name || !user.district_uid) {
            return res.status(400).json({ error: 'District information not found. Please update your profile.' });
        }
        
        // Check if user already has a license
        const { rows: existingLicenses } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1
        `, [user.id]);
        
        if (existingLicenses.length > 0) {
            return res.status(400).json({ 
                error: 'User already has a license. Use update-license to change your plan.' 
            });
        }
        
        // Check trial eligibility if requesting Trial plan
        if (plan_tier === 'Trial') {
            const eligibilityCheck = await checkTrialEligibility(user.id, user.district_uid);
            if (!eligibilityCheck.eligible) {
                return res.status(400).json({ 
                    error: eligibilityCheck.reason,
                    trialEligible: false
                });
            }
        }
        
        // Determine payment status and activation state
        let paymentStatus, isActive, createPlanTier;
        
        if (!isPaidPlan(plan_tier)) {
            // Trial: immediate activation and plan tier assignment
            paymentStatus = 'active';
            isActive = true;
            createPlanTier = plan_tier;
        } else {
            // Paid plans: set to selected tier but inactive until payment is verified
            paymentStatus = 'pending_payment';
            isActive = false;
            createPlanTier = plan_tier; // Show actual selected tier immediately
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create license
            const licenseKey = generateLicenseKey();
            const expiryDate = new Date();
            
            // Set expiry based on plan
            if (plan_tier === 'Trial') {
                expiryDate.setDate(expiryDate.getDate() + 30); // 30 days for trial
            } else {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year for paid plans
            }
            
            // For upload limits, always use the target plan tier (what user selected)
            // For plan_tier field, use createPlanTier (Trial until payment verified for paid plans)
            const targetPlan = TIER_PLANS[plan_tier]; // What user wants
            
            await client.query(`
                INSERT INTO licenses (
                    license_key, district_name, district_uid, expiry_date, 
                    plan_tier, max_student_uploads, max_staff_uploads,
                    created_by_user_id, primary_contact_id, is_installed, installed_at,
                    payment_status, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                licenseKey, user.district_name, user.district_uid, expiryDate.toISOString(), 
                createPlanTier, targetPlan.max_student_uploads, targetPlan.max_staff_uploads,
                user.id, user.id, false, null, paymentStatus, isActive
            ]);
            
            // Link user to license as primary contact
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
            
            // Record creation in subscription_history (only for Trial - paid plans are logged when payment is verified)
            if (!isPaidPlan(plan_tier)) {
                const changeType = determineChangeType(null, createPlanTier);
                await logSubscriptionHistory({
                    licenseKey,
                    userId: user.id,
                    oldPlanTier: null,
                    newPlanTier: createPlanTier,
                    changeType,
                    amount: 0,
                    notes: 'Trial license created'
                }, client);
            }
            
            await client.query('COMMIT');
            
            // Send trial activation email for Trial plans (should work in both dev and production)
            if (!isPaidPlan(plan_tier)) {
                try {
                    // Get license with user email for email sending
                    const { rows: licenseWithUserRows } = await pool.query(`
                        SELECT l.*, u.email, u.first_name, u.last_name
                        FROM licenses l
                        JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
                        JOIN users u ON ul.user_id = u.id
                        WHERE l.license_key = $1
                    `, [licenseKey]);
                    
                    if (licenseWithUserRows.length > 0) {
                        const licenseWithUser = licenseWithUserRows[0];
                        console.log(`📧 Sending trial activation email to ${licenseWithUser.email}`);
                        await emailService.sendTrialActivationEmail(licenseWithUser);
                        console.log(`✅ Trial activation email sent successfully`);
                    }
                } catch (emailError) {
                    console.error('❌ Failed to send trial activation email:', emailError);
                    // Don't fail license creation if email fails
                }
            }
            
            res.json({
                success: true,
                license_key: licenseKey,
                plan_tier: plan_tier,
                expiry_date: expiryDate.toISOString(),
                pending_payment: isPaidPlan(plan_tier),
                message: !isPaidPlan(plan_tier)
                    ? `${plan_tier} license created successfully! You can now download and install the plugin.`
                    : `${plan_tier} plan selected. Please complete payment to activate your license.`
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Create license error:', err);
        return res.status(500).json({ error: 'Internal server error creating license' });
    }
};

// Update License (handles upgrades and downgrades)
exports.updateLicense = async (req, res) => {
    const { plan_tier, payment_intent_id } = req.body;
    
    if (!plan_tier || !TIER_PLANS[plan_tier]) {
        return res.status(400).json({ error: 'Valid plan tier is required' });
    }
    
    try {
        // Get user's existing license
        const { rows: existingLicenses } = await pool.query(`
            SELECT l.* FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1
        `, [req.user.userId]);
        
        if (existingLicenses.length === 0) {
            return res.status(404).json({ error: 'No existing license found. Use create-license instead.' });
        }
        
        const existingLicense = existingLicenses[0];
        
        if (existingLicense.plan_tier === plan_tier) {
            return res.status(400).json({ 
                error: `You already have a ${plan_tier} license.` 
            });
        }
        
        // Get user info for trial eligibility check
        const { rows: userRows } = await pool.query(
            'SELECT district_uid FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Prevent downgrading to trial from paid plans
        if (plan_tier === 'Trial' && existingLicense.plan_tier !== 'Trial') {
            return res.status(400).json({ 
                error: 'Cannot downgrade from a paid plan to Trial. Contact support if you need assistance.' 
            });
        }
        
        // Check trial eligibility if requesting Trial plan
        if (plan_tier === 'Trial') {
            const eligibilityCheck = await checkTrialEligibility(req.user.userId, user.district_uid);
            if (!eligibilityCheck.eligible) {
                return res.status(400).json({ 
                    error: eligibilityCheck.reason,
                    trialEligible: false
                });
            }
        }
        
        // For Trial plans: immediate activation
        // For Paid plans: update to selected tier but inactive until payment is verified
        let paymentStatus, isActive, updatePlanTier;
        
        if (!isPaidPlan(plan_tier)) {
            // Trial: immediate activation and plan tier change
            paymentStatus = 'active';
            isActive = true;
            updatePlanTier = plan_tier;
        } else {
            // Paid plans: update to selected tier but inactive until payment is verified
            paymentStatus = 'pending_payment';
            isActive = false; // Always set to inactive for paid plans until payment confirmed
            updatePlanTier = plan_tier; // Show actual selected tier immediately
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // For upload limits, always use the target plan tier (what user is upgrading TO)
            // For plan_tier field, use updatePlanTier (current until payment verified)
            const targetPlan = TIER_PLANS[plan_tier]; // What user wants
            
            // Update license (for paid plans, plan_tier stays the same until payment is verified)
            await client.query(`
                UPDATE licenses SET 
                    plan_tier = $1,
                    max_student_uploads = $2,
                    max_staff_uploads = $3,
                    payment_status = $4,
                    is_active = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $6
            `, [updatePlanTier, targetPlan.max_student_uploads, targetPlan.max_staff_uploads, paymentStatus, isActive, existingLicense.license_key]);
            
            // Record change in subscription_history (only for Trial - paid plans are logged when payment is verified)
            if (!isPaidPlan(plan_tier)) {
                const changeType = determineChangeType(existingLicense.plan_tier, plan_tier);
                await logSubscriptionHistory({
                    licenseKey: existingLicense.license_key,
                    userId: req.user.userId,
                    oldPlanTier: existingLicense.plan_tier,
                    newPlanTier: plan_tier,
                    changeType,
                    amount: 0,
                    notes: 'License changed to Trial'
                }, client);
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                license_key: existingLicense.license_key,
                old_plan_tier: existingLicense.plan_tier,
                new_plan_tier: plan_tier,
                pending_payment: isPaidPlan(plan_tier),
                message: !isPaidPlan(plan_tier)
                    ? `License changed from ${existingLicense.plan_tier} to ${plan_tier}!`
                    : `${plan_tier} plan selected. Please complete payment to activate your license.`
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Update license error:', err);
        return res.status(500).json({ error: 'Internal server error updating license' });
    }
};

// Get License Details (detailed view for user dashboard)
exports.getLicenseDetails = async (req, res) => {
    const { license_key } = req.params;
    
    try {
        // Verify user owns this license
        const { rows: userLicenseRows } = await pool.query(`
            SELECT * FROM user_licenses 
            WHERE user_id = $1 AND license_key = $2
        `, [req.user.userId, license_key]);
        
        if (userLicenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or access denied' });
        }
        
        // Get full license details
        const { rows: licenseRows } = await pool.query(`
            SELECT * FROM licenses WHERE license_key = $1
        `, [license_key]);
        
        if (licenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found' });
        }
        
        const license = licenseRows[0];
        
        // Get server URLs
        const { rows: serverRows } = await pool.query(`
            SELECT * FROM license_servers 
            WHERE license_key = $1 AND is_active = true
            ORDER BY created_at
        `, [license_key]);
        
        // Get recent usage logs
        const { rows: usageRows } = await pool.query(`
            SELECT * FROM usage_logs 
            WHERE license_key = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [license_key]);
        
        res.json({
            success: true,
            license: {
                ...license,
                servers: serverRows,
                recent_usage: usageRows
            }
        });
        
    } catch (err) {
        console.error('Get license details error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};