const pool = require('../config/db');

/**
 * Plugin Usage Controller
 * Handles plugin usage tracking and upload limits
 */

// Helper function to normalize URLs for comparison
function normalizeUrl(url) {
    if (!url) return '';
    // Remove trailing slash and common paths
    return url.replace(/\/+$/, '').replace(/\/admin\/home\.html$/, '').replace(/\/admin$/, '');
}

// Usage endpoint
exports.usage = async (req, res) => {
    const { license_key, upload_type, server_url, district_uniqueid } = req.body;
    if (!license_key || !upload_type || !server_url || !district_uniqueid || !['student', 'staff'].includes(upload_type)) {
        return res.status(400).json({ error: 'Missing or invalid parameters (license_key, upload_type, server_url, district_uniqueid required)' });
    }

    try {
        // Verify license exists and matches district
        const { rows } = await pool.query('SELECT * FROM licenses WHERE license_key = $1 AND district_uid = $2', [license_key, district_uniqueid]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'License not found or district mismatch' });
        }
        const license = rows[0];

        // Verify server URL is authorized for this license - first try exact match
        let { rows: serverRows } = await pool.query(
            'SELECT * FROM license_servers WHERE license_key = $1 AND server_url = $2 AND is_active = true', 
            [license_key, server_url]
        );
        
        // If no exact match, try flexible URL matching
        if (serverRows.length === 0) {
            console.log('🔍 usage: No exact server match found, trying flexible URL matching...');
            
            // Get all servers for this license
            const { rows: allServers } = await pool.query(
                'SELECT * FROM license_servers WHERE license_key = $1 AND is_active = true', 
                [license_key]
            );
            
            // Check if any stored URL matches the normalized request URL
            const normalizedRequestUrl = normalizeUrl(server_url);
            
            for (const server of allServers) {
                const normalizedStoredUrl = normalizeUrl(server.server_url);
                console.log('🔍 usage: Comparing server URLs:', {
                    request: normalizedRequestUrl,
                    stored: normalizedStoredUrl
                });
                
                if (normalizedRequestUrl === normalizedStoredUrl) {
                    console.log('✅ usage: Found matching server with flexible URL matching');
                    serverRows = [server];
                    break;
                }
            }
        }
        
        if (serverRows.length === 0) {
            return res.status(403).json({ error: 'Server URL not authorized for this license' });
        }
        
        const server = serverRows[0];
        
        // Only charge for production server uploads, not test servers
        const shouldCharge = server.server_type === 'production';

        // Check if they are allowed to upload (only count production uploads against limit)
        const isStudentUpload = upload_type === 'student';
        const usage = isStudentUpload ? license.used_student_uploads : license.used_staff_uploads;
        const max = isStudentUpload ? license.max_student_uploads : license.max_staff_uploads;

        if (shouldCharge && license.plan_tier !== 'Enterprise' && usage >= max) {
            return res.status(403).json({ error: `Upload limit reached for ${upload_type} photos on production server.` });
        }

        // Update usage only for production server uploads
        let updateResult = null;
        if (shouldCharge) {
            const columnToUpdate = isStudentUpload ? 'used_student_uploads' : 'used_staff_uploads';
            updateResult = await pool.query(`UPDATE licenses SET ${columnToUpdate} = ${columnToUpdate} + 1, updated_at = CURRENT_TIMESTAMP WHERE license_key = $1 RETURNING *`, [license_key]);
        }
        
        // Log usage (log all uploads, but mark server type)
        await pool.query('INSERT INTO usage_logs (license_key, district_name, action, upload_type, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)', 
            [license_key, license.district_name, `upload_${server.server_type}`, upload_type, req.ip, req.get('User-Agent')]);
        
        res.json({ 
            success: true, 
            server_type: server.server_type,
            charged: shouldCharge,
            updated_license: updateResult ? updateResult.rows[0] : null 
        });
    } catch (err) {
        console.error('Error updating usage:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};