const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailService = require('../utils/email');

function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
}

// User Registration
exports.register = async (req, res) => {
    const { 
        email, 
        password, 
        first_name, 
        last_name, 
        district_name, 
        district_uniqueid, 
        powerschool_url, 
        test_url 
    } = req.body;
    
    if (!email || !password || !first_name || !last_name || !district_name || !district_uniqueid) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Check if user already exists
        const { rows: existingUsers } = await pool.query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)', 
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);
        const verification_token = crypto.randomBytes(32).toString('hex');
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create user with district info
            const { rows: userRows } = await client.query(`
                INSERT INTO users (
                    email, password_hash, first_name, last_name, verification_token,
                    district_name, district_uid, powerschool_url, test_url
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
            `, [email, password_hash, first_name, last_name, verification_token, 
                district_name, district_uniqueid, powerschool_url, test_url]);
            
            const user = userRows[0];
            
            await client.query('COMMIT');
            
            // Send verification email (should work in both dev and production)
            try {
                console.log(`📧 Sending verification email to ${email}`);
                await emailService.sendVerificationEmail(email, first_name, verification_token);
                console.log(`✅ Verification email sent successfully`);
            } catch (emailError) {
                console.error('❌ Failed to send verification email:', emailError);
                // Don't fail registration if email fails, but log it
            }
            
            // Generate JWT tokens
            const { accessToken, refreshToken } = generateTokens(user.id);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            
            // Create session
            await pool.query(`
                INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) 
                VALUES ($1, $2, $3, $4, $5)
            `, [user.id, refreshToken, expiresAt, req.ip, req.get('User-Agent') || 'Unknown']);
            
            res.status(201).json({
                success: true,
                user: { 
                    id: user.id, 
                    email: user.email, 
                    first_name: user.first_name, 
                    last_name: user.last_name,
                    district_name: user.district_name,
                    district_uid: user.district_uid,
                    email_verified: user.email_verified
                },
                tokens: { accessToken, refreshToken },
                message: 'User registered successfully. Please check your email to verify your account.'
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('User registration error:', err);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
};

// User Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        // Find user by email
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)', 
            [email]
        );
        
        if (userRows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = userRows[0];
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Note: We removed the email verification check from login
        // Users can log in but will have limited functionality until verified
        
        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(user.id);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        // Create session
        await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) 
            VALUES ($1, $2, $3, $4, $5)
        `, [user.id, refreshToken, expiresAt, req.ip, req.get('User-Agent') || 'Unknown']);
        
        res.json({
            success: true,
            user: { 
                id: user.id, 
                email: user.email, 
                first_name: user.first_name, 
                last_name: user.last_name,
                district_name: user.district_name,
                district_uid: user.district_uid,
                email_verified: user.email_verified
            },
            tokens: { accessToken, refreshToken },
            message: 'Login successful'
        });
        
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
};

// Email verification functionality has been moved to email-verification.controller.js

// User Logout
exports.logout = async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
    }
    
    try {
        // Remove session from database
        await pool.query('DELETE FROM user_sessions WHERE session_token = $1', [refreshToken]);
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Internal server error during logout' });
    }
};

// Refresh Access Token
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
    }
    
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        
        // Check if session exists and is valid
        const { rows: sessionRows } = await pool.query(
            'SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()', 
            [refreshToken]
        );
        
        if (sessionRows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        
        // Generate new access token
        const accessToken = jwt.sign(
            { userId: decoded.userId, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        res.json({
            success: true,
            accessToken,
            message: 'Token refreshed successfully'
        });
        
    } catch (err) {
        console.error('Token refresh error:', err);
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
};