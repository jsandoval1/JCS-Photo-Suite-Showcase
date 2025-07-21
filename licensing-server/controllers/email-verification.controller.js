const pool = require('../config/db');
const crypto = require('crypto');
const emailService = require('../utils/email');

/**
 * Email Verification Controller
 * Handles email verification related functionality
 */

// Email Verification
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }
    
    try {
        // Find user with this verification token
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE verification_token = $1 AND email_verified = false', 
            [token]
        );
        
        if (userRows.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid or expired verification token',
                code: 'INVALID_TOKEN'
            });
        }
        
        const user = userRows[0];
        
        // Check if token is expired (24 hours)
        const tokenAge = Date.now() - new Date(user.created_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxAge) {
            return res.status(400).json({ 
                error: 'Verification token has expired. Please request a new one.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        // Mark user as verified
        await pool.query(
            'UPDATE users SET email_verified = true, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        console.log(`✅ Email verified for user: ${user.email}`);
        
        res.json({
            success: true,
            message: 'Email verified successfully! You can now access all features.',
            user: {
                id: user.id,
                email: user.email,
                email_verified: true
            }
        });
        
    } catch (err) {
        console.error('Email verification error:', err);
        return res.status(500).json({ error: 'Internal server error during email verification' });
    }
};

// Resend Verification Email
exports.resendVerification = async (req, res) => {
    try {
        // Get user from authenticated request
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE id = $1', 
            [req.user.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        if (user.email_verified) {
            return res.status(400).json({ 
                error: 'Email is already verified',
                code: 'ALREADY_VERIFIED'
            });
        }
        
        // Generate new verification token
        const verification_token = crypto.randomBytes(32).toString('hex');
        
        // Update user with new token
        await pool.query(
            'UPDATE users SET verification_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [verification_token, user.id]
        );
        
        // Send verification email (should work in both dev and production)
        try {
            console.log(`📧 Resending verification email to ${user.email}`);
            await emailService.sendVerificationEmail(user.email, user.first_name, verification_token);
            console.log(`✅ Verification email resent successfully`);
            
            res.json({
                success: true,
                message: 'Verification email sent! Please check your inbox.'
            });
        } catch (emailError) {
            console.error('❌ Failed to resend verification email:', emailError);
            return res.status(500).json({ 
                error: 'Failed to send verification email. Please try again later.' 
            });
        }
        
    } catch (err) {
        console.error('Resend verification error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};