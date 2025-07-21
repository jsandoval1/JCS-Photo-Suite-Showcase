const pool = require('../config/db');
const { determineChangeType, logSubscriptionHistory } = require('../utils/subscription-utils');

/**
 * Payment Controller
 * Handles payment status and check payment confirmation
 * 
 * Note: Payment intent creation has been moved to payment-intent.controller.js
 * Note: Payment verification has been moved to payment-verification.controller.js
 */

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
        await pool.query(`
            INSERT INTO subscription_history (license_key, user_id, old_plan_tier, new_plan_tier, change_type, amount, notes, effective_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [license_key, license.created_by_user_id, license.plan_tier, license.plan_tier, 'check_payment_confirmed', amount || 0, checkNotes]);
        
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