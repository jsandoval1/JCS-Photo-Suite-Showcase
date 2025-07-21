const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { triggerWorkflow } = require('../utils/github-trigger');

exports.createDownloadToken = async (req, res) => {
    const { license_key, customer_email, max_downloads = 3, expires_in_hours = 24 } = req.body;
    if (!license_key || !customer_email) {
        return res.status(400).json({ error: 'Missing required parameters: license_key and customer_email' });
    }
    try {
        // Validate license exists
        const { rows } = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [license_key]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'License not found' });
        }
        const license = rows[0];
        // Generate token and expiry
        const token = uuidv4();
        const now = new Date();
        const expires_at = new Date(now.getTime() + expires_in_hours * 60 * 60 * 1000);
        // Insert into downloads table
        const insertQuery = `INSERT INTO downloads (token, license_key, customer_email, district_name, district_uniqueid, expires_at, max_downloads, download_count, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_TIMESTAMP, 'pending') RETURNING *`;
        const insertValues = [token, license.license_key, customer_email, license.district_name, license.district_uid, expires_at.toISOString(), max_downloads];
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
                    customer_email: customer_email,
                    timestamp: now.toISOString()
                };
                
                const result = await triggerWorkflow(githubToken, owner, repo, 'build_and_upload.yml', workflowInputs);
                
                if (result.success) {
                    console.log(`✅ GitHub workflow triggered successfully for token: ${token}`);
                } else {
                    console.error(`❌ Failed to trigger GitHub workflow for token: ${token}`, result);
                }
            }
        } catch (workflowError) {
            console.error('Error triggering GitHub workflow:', workflowError);
            // Don't fail the entire request if workflow trigger fails
        }
        
        res.json({ success: true, token, download: downloadRows[0] });
    } catch (err) {
        console.error('Error creating download token:', err);
        return res.status(500).json({ error: 'Server error creating download token' });
    }
};