const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { triggerWorkflow } = require('../utils/github-trigger');

// User-specific download token creation (for authenticated users)
exports.createUserDownloadToken = async (req, res) => {
    const { license_key, max_downloads = 3, expires_in_hours = 24 } = req.body;
    const userId = req.user.userId;
    
    if (!license_key) {
        return res.status(400).json({ error: 'Missing required parameter: license_key' });
    }
    
    try {
        // First, verify that this license belongs to the authenticated user
        const { rows: userLicenseRows } = await pool.query(`
            SELECT l.*, ul.role 
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE l.license_key = $1 AND ul.user_id = $2
        `, [license_key, userId]);
        
        if (userLicenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or you do not have access to this license' });
        }
        
        const license = userLicenseRows[0];
        
        // Check if license is active
        if (!license.is_active) {
            return res.status(400).json({ error: 'License is not active' });
        }
        
        // Check if license has expired
        const now = new Date();
        const expiryDate = new Date(license.expiry_date);
        if (now > expiryDate) {
            return res.status(400).json({ error: 'License has expired' });
        }
        
        // Get user details for the download token
        const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRows[0];
        
        // Check for existing valid download token first
        const { rows: existingTokenRows } = await pool.query(`
            SELECT * FROM downloads 
            WHERE license_key = $1 AND customer_email = $2 
            AND expires_at > CURRENT_TIMESTAMP 
            AND download_count < max_downloads 
            AND status IN ('pending', 'ready')
            ORDER BY created_at DESC 
            LIMIT 1
        `, [license.license_key, user.email]);
        
        if (existingTokenRows.length > 0) {
            // Return the existing valid token
            const existingDownload = existingTokenRows[0];
            console.log(`✅ Reusing existing download token: ${existingDownload.token} for user: ${user.email}`);
            
            return res.json({ 
                success: true, 
                token: existingDownload.token, 
                download: existingDownload,
                message: 'Using existing download token. Your plugin is ready or being built.',
                reused: true
            });
        }
        
        // No valid existing token found, create a new one
        console.log(`🆕 Creating new download token for user: ${user.email}, license: ${license.license_key}`);
        
        // Generate token and expiry
        const token = uuidv4();
        const expires_at = new Date(now.getTime() + expires_in_hours * 60 * 60 * 1000);
        
        // Insert into downloads table
        const insertQuery = `
            INSERT INTO downloads (
                token, license_key, customer_email, district_name, district_uniqueid, 
                expires_at, max_downloads, download_count, created_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_TIMESTAMP, 'pending') 
            RETURNING *
        `;
        const insertValues = [
            token, license.license_key, user.email, license.district_name, 
            license.district_uid, expires_at.toISOString(), max_downloads
        ];
        const { rows: downloadRows } = await pool.query(insertQuery, insertValues);
        
        // Trigger GitHub Actions workflow immediately
        try {
            const githubToken = process.env.GH_PAT;
            const owner = process.env.GH_OWNER || 'your-username';
            const repo = process.env.GH_REPO || 'JCS-Photo-Suite';
            
            if (!githubToken) {
                console.warn('GITHUB_PAT not set, skipping workflow trigger');
            } else {
                const workflowInputs = {
                    token: token,
                    license_key: license.license_key,
                    district_name: license.district_name,
                    customer_email: user.email,
                    timestamp: now.toISOString()
                };
                
                const result = await triggerWorkflow(githubToken, owner, repo, 'build_and_upload.yml', workflowInputs);
                
                if (result.success) {
                    console.log(`✅ GitHub workflow triggered successfully for new token: ${token}`);
                } else {
                    console.error(`❌ Failed to trigger GitHub workflow for new token: ${token}`, result);
                }
            }
        } catch (workflowError) {
            console.error('Error triggering GitHub workflow:', workflowError);
            // Don't fail the entire request if workflow trigger fails
        }
        
        res.json({ 
            success: true, 
            token, 
            download: downloadRows[0],
            message: 'Download token created successfully. Your plugin is being built.',
            reused: false
        });
    } catch (err) {
        console.error('Error creating user download token:', err);
        return res.status(500).json({ error: 'Server error creating download token' });
    }
};

// Get existing download tokens for a user's license
exports.getUserDownloadTokens = async (req, res) => {
    const { license_key } = req.params;
    const userId = req.user.userId;
    
    if (!license_key) {
        return res.status(400).json({ error: 'Missing license_key parameter' });
    }
    
    try {
        // Verify that this license belongs to the authenticated user
        const { rows: userLicenseRows } = await pool.query(`
            SELECT l.*, ul.role 
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key
            WHERE l.license_key = $1 AND ul.user_id = $2
        `, [license_key, userId]);
        
        if (userLicenseRows.length === 0) {
            return res.status(404).json({ error: 'License not found or you do not have access to this license' });
        }
        
        // Get user email
        const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRows[0];
        
        // Get all download tokens for this user/license, ordered by most recent
        const { rows: downloadTokens } = await pool.query(`
            SELECT * FROM downloads 
            WHERE license_key = $1 AND customer_email = $2 
            ORDER BY created_at DESC
        `, [license_key, user.email]);
        
        // Find the most recent valid token (if any)
        const now = new Date();
        const validToken = downloadTokens.find(token => 
            new Date(token.expires_at) > now && 
            token.download_count < token.max_downloads && 
            ['pending', 'ready'].includes(token.status)
        );
        
        res.json({ 
            success: true,
            tokens: downloadTokens,
            validToken: validToken || null,
            hasValidToken: !!validToken
        });
    } catch (err) {
        console.error('Error getting user download tokens:', err);
        return res.status(500).json({ error: 'Server error getting download tokens' });
    }
};

// GET endpoint for direct downloads (user-friendly)
exports.downloadByToken = async (req, res) => {
    const { token } = req.params;
    console.log('[DOWNLOAD-GET] Received token:', token);
    
    if (!token) {
        return res.status(400).json({ error: 'Missing download token' });
    }
    
    try {
        // Look up the download record for this token
        const { rows } = await pool.query('SELECT * FROM downloads WHERE token = $1', [token]);
        console.log('[DOWNLOAD-GET] DB result for token:', rows);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Download not found for this token' });
        }
        
        const download = rows[0];
        
        // Check if download is ready
        if (!download.blob_url) {
            if (download.status === 'pending') {
                return res.status(202).json({ 
                    status: 'building', 
                    message: 'Plugin is being built. Please try again in a few moments.',
                    token: token
                });
            } else if (download.status === 'error') {
                return res.status(500).json({ 
                    error: 'Build failed. Please contact support.',
                    token: token
                });
            } else {
                return res.status(404).json({ error: 'Download not ready yet' });
            }
        }
        
        // Check if download has expired
        const now = new Date();
        const expiresAt = new Date(download.expires_at);
        if (now > expiresAt) {
            return res.status(410).json({ error: 'Download link has expired' });
        }
        
        // Check download count limit
        if (download.download_count >= download.max_downloads) {
            return res.status(429).json({ error: 'Download limit reached' });
        }
        
        // Increment download count
        await pool.query('UPDATE downloads SET download_count = download_count + 1 WHERE token = $1', [token]);
        
        // For mock URLs, provide a helpful message instead of redirecting
        if (download.blob_url.includes('example-blob-storage.com')) {
            return res.json({ 
                success: true, 
                message: 'Demo mode: In production, this would redirect to your customized plugin ZIP file.',
                mock_download_url: download.blob_url,
                token: token
            });
        }
        
        // Redirect to the real Blob URL
        console.log('[DOWNLOAD-GET] Redirecting to:', download.blob_url);
        return res.redirect(download.blob_url);
    } catch (err) {
        console.error('Error in GET /api/download/:token:', err);
        return res.status(500).json({ error: 'Server error generating download' });
    }
};

exports.download = async (req, res) => {
    const { token } = req.body;
    console.log('[DOWNLOAD] Received token:', token);
    if (!token) {
        return res.status(400).json({ error: 'Missing download token' });
    }
    try {
        // Look up the download record for this token
        const { rows } = await pool.query('SELECT * FROM downloads WHERE token = $1', [token]);
        console.log('[DOWNLOAD] DB result for token:', rows);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Download not found for this token' });
        }
        
        const download = rows[0];
        
        // Check if download is ready
        if (!download.blob_url) {
            if (download.status === 'pending') {
                return res.status(202).json({ 
                    status: 'building', 
                    message: 'Plugin is being built. Please try again in a few moments.',
                    token: token
                });
            } else if (download.status === 'error') {
                return res.status(500).json({ 
                    error: 'Build failed. Please contact support.',
                    token: token
                });
            } else {
                return res.status(404).json({ error: 'Download not ready yet' });
            }
        }
        
        // Check if download has expired
        const now = new Date();
        const expiresAt = new Date(download.expires_at);
        if (now > expiresAt) {
            return res.status(410).json({ error: 'Download link has expired' });
        }
        
        // Check download count limit
        if (download.download_count >= download.max_downloads) {
            return res.status(429).json({ error: 'Download limit reached' });
        }
        
        // Increment download count
        await pool.query('UPDATE downloads SET download_count = download_count + 1 WHERE token = $1', [token]);
        
        return res.redirect(download.blob_url);
    } catch (err) {
        console.error('Error in /api/download:', err);
        return res.status(500).json({ error: 'Server error generating download' });
    }
};

exports.status = async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ error: 'Missing download token' });
    }
    try {
        const { rows } = await pool.query('SELECT * FROM downloads WHERE token = $1', [token]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Download not found' });
        }
        
        const download = rows[0];
        
        // Check if download has expired
        const now = new Date();
        const expiresAt = new Date(download.expires_at);
        if (now > expiresAt) {
            return res.json({ 
                status: 'expired', 
                message: 'Download link has expired',
                expires_at: download.expires_at
            });
        }
        
        if (download.blob_url) {
            return res.json({ 
                status: 'ready', 
                download_url: `/api/download`,
                expires_at: download.expires_at,
                download_count: download.download_count,
                max_downloads: download.max_downloads
            });
        } else if (download.status === 'pending') {
            return res.json({ 
                status: 'building', 
                message: 'Plugin is being built. Please check again in a moment.',
                created_at: download.created_at
            });
        } else if (download.status === 'error') {
            return res.json({ 
                status: 'error', 
                message: 'Build failed. Please contact support.',
                created_at: download.created_at
            });
        } else {
            return res.json({ 
                status: 'unknown', 
                message: 'Unknown status',
                status_value: download.status
            });
        }
    } catch (err) {
        console.error('Error checking download status:', err);
        return res.status(500).json({ error: 'Server error checking status' });
    }
}; 