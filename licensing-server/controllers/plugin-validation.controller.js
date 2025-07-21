const pool = require('../config/db');
const { TIER_PLANS } = require('../utils/constants');

/**
 * Plugin Validation Controller
 * Handles plugin installation, validation, and license retrieval
 */

// Helper function to normalize URLs for comparison
function normalizeUrl(url) {
    if (!url) return '';
    // Remove trailing slash and common paths
    return url.replace(/\/+$/, '').replace(/\/admin\/home\.html$/, '').replace(/\/admin$/, '');
}

// Plugin Installation Callback (PowerSchool calls this)
exports.pluginInstalled = async (req, res) => {
    const { server_url, district_name, district_uniqueid } = req.body.parameters || {};
    
    if (!server_url || !district_name || !district_uniqueid) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('🔍 Plugin registration attempt:', {
        server_url,
        district_name,
        district_uniqueid
    });
    
    try {
        // First try exact match (district_name + district_uid + server_url)
        let { rows } = await pool.query(`
            SELECT l.* FROM licenses l 
            JOIN license_servers ls ON l.license_key = ls.license_key 
            WHERE l.district_name = $1 AND l.district_uid = $2 AND ls.server_url = $3 AND ls.is_active = true
        `, [district_name, district_uniqueid, server_url]);
        
        // If no exact match, try flexible matching
        if (rows.length === 0) {
            console.log('🔍 No exact match found, trying flexible matching...');
            
            // Strategy 1: Try district_uid + flexible URL matching (most reliable)
            console.log('🔍 Trying district_uid + flexible URL matching...');
            const { rows: districtLicenses } = await pool.query(`
                SELECT l.*, ls.server_url as stored_server_url FROM licenses l 
                JOIN license_servers ls ON l.license_key = ls.license_key 
                WHERE l.district_uid = $1 AND ls.is_active = true
            `, [district_uniqueid]);
            
            // Check if any stored URL matches the normalized PowerSchool URL
            const normalizedPowerSchoolUrl = normalizeUrl(server_url);
            
            for (const license of districtLicenses) {
                const normalizedStoredUrl = normalizeUrl(license.stored_server_url);
                console.log('🔍 Comparing URLs:', {
                    powerSchool: normalizedPowerSchoolUrl,
                    stored: normalizedStoredUrl,
                    storedDistrictName: license.district_name
                });
                
                if (normalizedPowerSchoolUrl === normalizedStoredUrl) {
                    console.log('✅ Found matching license with flexible URL matching');
                    rows = [license];
                    break;
                }
            }
            
            // Strategy 2: If still no match, try district_name + flexible URL matching
            if (rows.length === 0) {
                console.log('🔍 Trying district_name + flexible URL matching...');
                const { rows: nameBasedLicenses } = await pool.query(`
                    SELECT l.*, ls.server_url as stored_server_url FROM licenses l 
                    JOIN license_servers ls ON l.license_key = ls.license_key 
                    WHERE l.district_name = $1 AND ls.is_active = true
                `, [district_name]);
                
                for (const license of nameBasedLicenses) {
                    const normalizedStoredUrl = normalizeUrl(license.stored_server_url);
                    if (normalizedPowerSchoolUrl === normalizedStoredUrl) {
                        console.log('✅ Found matching license with district_name + flexible URL matching');
                        rows = [license];
                        break;
                    }
                }
            }
        }
        
        if (rows.length > 0) {
            // License exists, mark as installed and return license info
            const license = rows[0];
            
            // Update installation status
            await pool.query(`
                UPDATE licenses 
                SET is_installed = true, installed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE license_key = $1
            `, [license.license_key]);
            
            console.log('✅ Plugin installation confirmed for license:', license.license_key);
            
            return res.json({
                success: true,
                license_key: license.license_key,
                expiry_date: license.expiry_date,
                is_active: license.is_active,
                plan_tier: license.plan_tier,
                is_installed: true,
                message: 'Plugin installation confirmed'
            });
        } else {
            // No existing license found - this means someone is trying to use the plugin
            // without going through proper user registration. Deny access.
            console.log('❌ No license found for district:', district_name, district_uniqueid);
            return res.status(404).json({ 
                error: 'No license found for this district and server. Please register at https://jcsphotosuite.com first.',
                success: false
            });
        }
    } catch (err) {
        console.error('Plugin installation error:', err);
        return res.status(500).json({ error: 'Database error during plugin installation' });
    }
};

// Plugin validation endpoint
exports.validate = async (req, res) => {
    const { license_key, server_url, district_uniqueid } = req.body;
    if (!license_key || !server_url || !district_uniqueid) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        // First try exact match
        let { rows } = await pool.query(`
            SELECT l.* FROM licenses l 
            JOIN license_servers ls ON l.license_key = ls.license_key 
            WHERE l.license_key = $1 AND ls.server_url = $2 AND l.district_uid = $3 
            AND ls.is_active = true
        `, [license_key, server_url, district_uniqueid]);
        
        // If no exact match, try flexible matching prioritizing district_uid
        if (rows.length === 0) {
            // Strategy 1: Try district_uid + flexible URL matching (most reliable)
            const { rows: licenseServers } = await pool.query(`
                SELECT l.*, ls.server_url as stored_server_url FROM licenses l 
                JOIN license_servers ls ON l.license_key = ls.license_key 
                WHERE l.license_key = $1 AND l.district_uid = $2 AND ls.is_active = true
            `, [license_key, district_uniqueid]);
            
            // Check if any stored URL matches the normalized request URL
            const normalizedRequestUrl = normalizeUrl(server_url);
            
            for (const license of licenseServers) {
                const normalizedStoredUrl = normalizeUrl(license.stored_server_url);
                if (normalizedRequestUrl === normalizedStoredUrl) {
                    rows = [license];
                    break;
                }
            }
            
            // Strategy 2: If still no match, try just the license_key with flexible URL matching
            if (rows.length === 0) {
                const { rows: allLicenseServers } = await pool.query(`
                    SELECT l.*, ls.server_url as stored_server_url FROM licenses l 
                    JOIN license_servers ls ON l.license_key = ls.license_key 
                    WHERE l.license_key = $1 AND ls.is_active = true
                `, [license_key]);
                
                for (const license of allLicenseServers) {
                    const normalizedStoredUrl = normalizeUrl(license.stored_server_url);
                    if (normalizedRequestUrl === normalizedStoredUrl) {
                        rows = [license];
                        break;
                    }
                }
            }
        }
        
        if (rows.length === 0) {
            return res.json({ valid: false, error: 'Invalid license or server URL not authorized' });
        }
        
        const row = rows[0];
        const now = new Date();
        const expiryDate = new Date(row.expiry_date);
        const isExpired = now > expiryDate;
        
        if (isExpired || !row.is_active) {
            return res.json({ valid: false, error: isExpired ? 'License expired' : 'License inactive' });
        }

        // Check for unlimited uploads in Enterprise tier
        const isEnterprise = row.plan_tier === 'Enterprise';

        res.json({
            valid: true,
            license_key: row.license_key,
            expiry_date: row.expiry_date,
            is_active: row.is_active,
            plan_tier: row.plan_tier,
            used_student_uploads: row.used_student_uploads,
            max_student_uploads: isEnterprise ? 'Unlimited' : row.max_student_uploads,
            used_staff_uploads: row.used_staff_uploads,
            max_staff_uploads: isEnterprise ? 'Unlimited' : row.max_staff_uploads,
            is_installed: row.is_installed
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Get license endpoint
exports.getLicense = async (req, res) => {
    const { server_url, district_uniqueid } = req.body;
    if (!server_url || !district_uniqueid) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        // First try exact match
        let { rows } = await pool.query(`
            SELECT l.* FROM licenses l 
            JOIN license_servers ls ON l.license_key = ls.license_key 
            WHERE ls.server_url = $1 AND l.district_uid = $2 AND ls.is_active = true
        `, [server_url, district_uniqueid]);
        
        // If no exact match, try flexible URL matching prioritizing district_uid
        if (rows.length === 0) {
            console.log('🔍 getLicense: No exact match found, trying flexible matching...');
            
            // Strategy 1: Try district_uid + flexible URL matching (most reliable)
            const { rows: districtLicenses } = await pool.query(`
                SELECT l.*, ls.server_url as stored_server_url FROM licenses l 
                JOIN license_servers ls ON l.license_key = ls.license_key 
                WHERE l.district_uid = $1 AND ls.is_active = true
            `, [district_uniqueid]);
            
            // Check if any stored URL matches the normalized request URL
            const normalizedRequestUrl = normalizeUrl(server_url);
            
            for (const license of districtLicenses) {
                const normalizedStoredUrl = normalizeUrl(license.stored_server_url);
                console.log('🔍 getLicense: Comparing URLs:', {
                    request: normalizedRequestUrl,
                    stored: normalizedStoredUrl,
                    storedDistrictName: license.district_name
                });
                
                if (normalizedRequestUrl === normalizedStoredUrl) {
                    console.log('✅ getLicense: Found matching license with flexible URL matching');
                    rows = [license];
                    break;
                }
            }
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'License not found for this server' });
        }
        
        const row = rows[0];
        res.json({
            success: true,
            license_key: row.license_key,
            expiry_date: row.expiry_date,
            is_active: row.is_active,
            plan_tier: row.plan_tier,
            is_installed: row.is_installed
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};