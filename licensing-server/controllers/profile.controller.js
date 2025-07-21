const pool = require('../config/db');

// Get User Profile
exports.getProfile = async (req, res) => {
    try {
        const { rows: userRows } = await pool.query(
            'SELECT id, email, first_name, last_name, created_at, email_verified, district_name, district_uid, powerschool_url, test_url FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Get user's licenses with server URLs
        const { rows: licenseRows } = await pool.query(`
            SELECT l.license_key, l.district_name, l.plan_tier, l.is_active, l.is_installed,
                   ul.role, l.expiry_date, l.used_student_uploads, l.max_student_uploads,
                   l.used_staff_uploads, l.max_staff_uploads, l.created_at
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE ul.user_id = $1
        `, [user.id]);
        
        // Get server URLs for each license
        for (let license of licenseRows) {
            const { rows: serverRows } = await pool.query(`
                SELECT id, server_url, server_type, is_additional, is_active, created_at
                FROM license_servers 
                WHERE license_key = $1 AND is_active = true
                ORDER BY created_at
            `, [license.license_key]);
            license.servers = serverRows;
        }
        
        res.json({
            success: true,
            user: {
                ...user,
                licenses: licenseRows
            }
        });
        
    } catch (err) {
        console.error('Get profile error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};