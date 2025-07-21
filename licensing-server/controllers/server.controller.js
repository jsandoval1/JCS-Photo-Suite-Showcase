const pool = require('../config/db');

// Add Additional Server ($50 charge)
exports.addServer = async (req, res) => {
    const { license_key } = req.params;
    const { server_url, server_type = 'production', payment_intent_id } = req.body;
    
    if (!server_url) {
        return res.status(400).json({ error: 'Server URL is required' });
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
        
        // Check if server URL already exists
        const { rows: existingServerRows } = await pool.query(`
            SELECT * FROM license_servers 
            WHERE license_key = $1 AND server_url = $2
        `, [license_key, server_url]);
        
        if (existingServerRows.length > 0) {
            return res.status(400).json({ error: 'Server URL already exists for this license' });
        }
        
        // Check if trying to add a production server when one already exists
        if (server_type === 'production') {
            const { rows: productionServerRows } = await pool.query(`
                SELECT * FROM license_servers 
                WHERE license_key = $1 AND server_type = 'production' AND is_active = true
            `, [license_key]);
            
            if (productionServerRows.length > 0) {
                return res.status(400).json({ 
                    error: 'Only one production server is allowed per license. You can add test servers or contact support to change your production server.' 
                });
            }
        }
        
        // TODO: Verify payment of $50 using payment_intent_id
        // For now, skip payment verification
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Add server URL
            await client.query(`
                INSERT INTO license_servers (license_key, server_url, server_type, is_additional) 
                VALUES ($1, $2, $3, $4)
            `, [license_key, server_url, server_type, true]);
            
            // Record in subscription history
            await client.query(`
                INSERT INTO subscription_history (license_key, user_id, old_plan_tier, new_plan_tier, change_type, amount, notes, effective_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [license_key, req.user.userId, null, null, 'server_added', 50, `Added server: ${server_url}`]);
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: 'Server added successfully',
                server_url: server_url,
                charge_amount: 50
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Add server error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Remove Server
exports.removeServer = async (req, res) => {
    const { license_key } = req.params;
    const { server_id } = req.body;
    
    if (!server_id) {
        return res.status(400).json({ error: 'Server ID is required' });
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
        
        // Get server details
        const { rows: serverRows } = await pool.query(`
            SELECT * FROM license_servers 
            WHERE id = $1 AND license_key = $2
        `, [server_id, license_key]);
        
        if (serverRows.length === 0) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        const server = serverRows[0];
        
        // Prevent removal of non-additional servers
        if (!server.is_additional) {
            return res.status(400).json({ error: 'Cannot remove primary server URLs' });
        }
        
        // Deactivate server
        await pool.query(`
            UPDATE license_servers 
            SET is_active = false 
            WHERE id = $1
        `, [server_id]);
        
        // Record in subscription history
        await pool.query(`
            INSERT INTO subscription_history (license_key, user_id, old_plan_tier, new_plan_tier, change_type, amount, notes, effective_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [license_key, req.user.userId, null, null, 'server_removed', 0, `Removed server: ${server.server_url}`]);
        
        res.json({
            success: true,
            message: 'Server removed successfully'
        });
        
    } catch (err) {
        console.error('Remove server error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};