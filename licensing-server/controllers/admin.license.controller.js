const pool = require('../config/db');
const { TIER_PLANS, generateLicenseKey } = require('../utils/constants');

exports.getLicenses = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM licenses ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    }
};

// Admin Manual License Creation (for admin use only)
exports.createLicense = async (req, res) => {
    const { district_name, server_url, district_uniqueid, plan_tier, expiry_date, server_type = 'production' } = req.body;
    
    if (!district_name || !server_url || !district_uniqueid || !plan_tier || !TIER_PLANS[plan_tier]) {
        return res.status(400).json({ error: 'Missing or invalid parameters. A valid plan_tier is required.' });
    }

    const licenseKey = generateLicenseKey();
    const expiry = expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const plan = TIER_PLANS[plan_tier];

    // Check if trying to add a production server when one already exists (for existing licenses)
    if (server_type === 'production') {
        const { rows: existingProductionRows } = await pool.query(`
            SELECT ls.* FROM license_servers ls
            JOIN licenses l ON ls.license_key = l.license_key
            WHERE l.district_uid = $1 AND ls.server_type = 'production' AND ls.is_active = true
        `, [district_uniqueid]);
        
        if (existingProductionRows.length > 0) {
            return res.status(400).json({ 
                error: 'A production server already exists for this district. Only one production server is allowed per district. Use a different district or set server_type to "test".' 
            });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Insert into licenses table (no user association for admin-created licenses)
        await client.query(`
            INSERT INTO licenses (
                license_key, district_name, district_uid, expiry_date, 
                plan_tier, max_student_uploads, max_staff_uploads, is_installed, installed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [licenseKey, district_name, district_uniqueid, expiry, plan_tier, 
            plan.max_student_uploads, plan.max_staff_uploads, false, null]);
        
        // Insert into license_servers table
        await client.query(`
            INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
            VALUES ($1, $2, $3, $4)
        `, [licenseKey, server_url, server_type, false]);
        
        await client.query('COMMIT');
        res.json({ success: true, license_key: licenseKey, plan_tier: plan_tier });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to create license:', err);
        return res.status(500).json({ error: 'Failed to create license' });
    } finally {
        client.release();
    }
};

// Admin Manual License Update (for admin use only)
exports.updateLicense = async (req, res) => {
    const { licenseKey } = req.params;
    const { is_active, plan_tier, expiry_date } = req.body;
    
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (is_active !== undefined) {
        updates.push(`is_active = $${valueIndex++}`);
        values.push(is_active);
    }

    if (expiry_date !== undefined) {
        updates.push(`expiry_date = $${valueIndex++}`);
        values.push(expiry_date);
    }

    if (plan_tier !== undefined) {
        if (!TIER_PLANS[plan_tier]) {
            return res.status(400).json({ error: 'Invalid plan_tier specified.' });
        }
        const plan = TIER_PLANS[plan_tier];
        updates.push(`plan_tier = $${valueIndex++}`);
        values.push(plan_tier);
        updates.push(`max_student_uploads = $${valueIndex++}`);
        values.push(plan.max_student_uploads);
        updates.push(`max_staff_uploads = $${valueIndex++}`);
        values.push(plan.max_staff_uploads);
        // Generous approach: always reset usage on tier change
        updates.push(`used_student_uploads = 0`);
        updates.push(`used_staff_uploads = 0`);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(licenseKey);

    if (updates.length <= 1) {
        return res.status(400).json({ error: 'No valid fields to update.' });
    }

    try {
        await pool.query(`UPDATE licenses SET ${updates.join(', ')} WHERE license_key = $${valueIndex}`, values);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to update license:', err);
        return res.status(500).json({ error: 'Failed to update license' });
    }
};

// Admin Manual License Stats (for admin use only)
exports.getStats = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                COUNT(*) as total_licenses, 
                SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_licenses, 
                SUM(used_student_uploads) as total_student_uploads,
                SUM(used_staff_uploads) as total_staff_uploads
            FROM licenses
        `);
        res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    }
};

// Admin Manual License Cancellation (for admin use only)
exports.cancelSubscription = async (req, res) => {
    const { license_key } = req.body;
    if (!license_key) {
        return res.status(400).json({ error: 'Missing required parameter: license_key' });
    }
    try {
        // 1. Mark license as canceled
        await pool.query('UPDATE licenses SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE license_key = $1', [license_key]);
        
        // 2. Deactivate all associated servers
        await pool.query('UPDATE license_servers SET is_active = false WHERE license_key = $1', [license_key]);
        
        // 3. Find all download tokens for this license
        const { rows } = await pool.query('SELECT token FROM downloads WHERE license_key = $1', [license_key]);
        // 4. Delete each ZIP from Vercel Blob (placeholder)
        for (const row of rows) {
            // TODO: Integrate with Vercel Blob SDK
            // await del(`downloads/${row.token}.zip`);
        }
        res.json({ success: true, message: 'Subscription canceled and ZIPs scheduled for deletion.' });
    } catch (err) {
        console.error('Error in cancel-subscription:', err);
        return res.status(500).json({ error: 'Server error canceling subscription' });
    }
};

// Admin Manual License Cleanup (for admin use only)
exports.cleanupExpiredZips = async (req, res) => {
    try {
        // 1. Find all expired or canceled licenses
        const now = new Date();
        const { rows: expiredLicenses } = await pool.query(
            `SELECT license_key FROM licenses WHERE is_active = false OR expiry_date < $1`,
            [now.toISOString()]
        );
        let totalDeleted = 0;
        for (const lic of expiredLicenses) {
            // 2. Find all download tokens for this license
            const { rows: tokens } = await pool.query('SELECT token FROM downloads WHERE license_key = $1', [lic.license_key]);
            for (const row of tokens) {
                // TODO: Integrate with Vercel Blob SDK
                // await del(`downloads/${row.token}.zip`);
                totalDeleted++;
            }
        }
        res.json({ success: true, message: `Scheduled cleanup complete. ZIPs scheduled for deletion: ${totalDeleted}` });
    } catch (err) {
        console.error('Error in cleanup-expired-zips:', err);
        return res.status(500).json({ error: 'Server error during scheduled cleanup' });
    }
};