const express = require('express');
const router = express.Router();
const emailService = require('../utils/email');

// Test email endpoint for development
router.get('/test-all-emails', async (req, res) => {
    try {
        console.log('\n🧪 COMPREHENSIVE EMAIL TESTING SUITE');
        console.log('=====================================\n');

        // Verify development mode
        const isDev = process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true';
        if (!isDev) {
            return res.status(400).json({
                success: false,
                error: 'This test must be run in development mode',
                message: 'Set DEVELOPMENT_MODE=true or NODE_ENV=development'
            });
        }

        const TEST_CONFIG = {
            TEST_EMAIL: 'jcsandoval978@gmail.com',
            BUSINESS_EMAIL: 'john@jcsphotosuite.com',
            TEST_LICENSE_KEY: 'TEST-EMAIL-FLOWS-2024',
            TEST_DISTRICT: 'Email Test District',
            TEST_DISTRICT_UID: 'EMAIL-TEST-001'
        };

        console.log('✅ Development mode confirmed - emails will be sent');
        console.log(`📧 User emails: ${TEST_CONFIG.TEST_EMAIL}`);
        console.log(`🏢 Business emails: ${TEST_CONFIG.BUSINESS_EMAIL}`);
        console.log('⏱️  Test includes rate limiting delays (will take ~30 seconds)\n');

        const results = [];

        // 1. Registration & Verification Flow
        console.log('1️⃣ TESTING USER REGISTRATION & VERIFICATION FLOW');
        console.log('================================================');
        
        try {
            console.log('📧 Testing registration/verification email...');
            await emailService.sendVerificationEmail(
                TEST_CONFIG.TEST_EMAIL, 
                'Test User', 
                'test_verification_token_123'
            );
            console.log('✅ Registration email sent successfully\n');
            results.push({ test: 'Registration Email', status: 'SUCCESS' });
            
            // Rate limiting: wait 1 second between email batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('❌ Registration flow failed:', error);
            results.push({ test: 'Registration Email', status: 'FAILED', error: error.message });
        }

        // 2. License Creation & Trial Flow
        console.log('2️⃣ TESTING LICENSE CREATION & TRIAL FLOW');
        console.log('=========================================');
        
        try {
            const mockLicense = {
                license_key: TEST_CONFIG.TEST_LICENSE_KEY,
                district_name: TEST_CONFIG.TEST_DISTRICT,
                plan_tier: 'Trial',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                email: TEST_CONFIG.TEST_EMAIL,
                first_name: 'Test',
                last_name: 'User'
            };
            
            console.log('📧 Testing trial activation email...');
            await emailService.sendTrialActivationEmail(mockLicense);
            console.log('✅ Trial activation email sent successfully\n');
            results.push({ test: 'Trial Activation Email', status: 'SUCCESS' });
            
            // Rate limiting: wait 1 second between email batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('❌ License creation flow failed:', error);
            results.push({ test: 'Trial Activation Email', status: 'FAILED', error: error.message });
        }

        // 3. Payment & Subscription Flow
        console.log('3️⃣ TESTING PAYMENT & SUBSCRIPTION FLOW');
        console.log('======================================');
        
        try {
            const mockLicense = {
                license_key: TEST_CONFIG.TEST_LICENSE_KEY,
                district_name: TEST_CONFIG.TEST_DISTRICT,
                plan_tier: 'Tier 1',
                expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                email: TEST_CONFIG.TEST_EMAIL,
                first_name: 'Test',
                last_name: 'User'
            };
            
            // Test new subscription welcome
            console.log('📧 Testing new subscription welcome email...');
            await emailService.sendSubscriptionWelcomeEmail(mockLicense, 500);
            console.log('✅ New subscription email sent successfully');
            results.push({ test: 'New Subscription Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test plan upgrade
            console.log('📧 Testing plan upgrade email...');
            await emailService.sendPlanUpgradeEmail({...mockLicense, plan_tier: 'Tier 2'}, 'Tier 1', 'Tier 2', 1000);
            console.log('✅ Plan upgrade email sent successfully');
            results.push({ test: 'Plan Upgrade Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test plan downgrade
            console.log('📧 Testing plan downgrade email...');
            await emailService.sendPlanDowngradeEmail({...mockLicense, plan_tier: 'Tier 1'}, 'Tier 2', 'Tier 1', 300);
            console.log('✅ Plan downgrade email sent successfully');
            results.push({ test: 'Plan Downgrade Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test renewal
            const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            console.log('📧 Testing license renewal email...');
            await emailService.sendRenewalSuccessEmail(mockLicense, newExpiry, 500);
            console.log('✅ License renewal email sent successfully');
            results.push({ test: 'License Renewal Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test payment failure
            const nextRetry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            console.log('📧 Testing payment failure email...');
            await emailService.sendPaymentFailedEmail(mockLicense, 1, nextRetry);
            console.log('✅ Payment failure email sent successfully\n');
            results.push({ test: 'Payment Failure Email', status: 'SUCCESS' });
            
            // Rate limiting: wait 1 second between sections
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ Payment subscription flow failed:', error);
            results.push({ test: 'Payment & Subscription Flow', status: 'FAILED', error: error.message });
        }

        // 4. License Lifecycle Flow
        console.log('4️⃣ TESTING LICENSE LIFECYCLE FLOW');
        console.log('==================================');
        
        try {
            const mockLicense = {
                license_key: TEST_CONFIG.TEST_LICENSE_KEY,
                district_name: TEST_CONFIG.TEST_DISTRICT,
                plan_tier: 'Tier 1',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                email: TEST_CONFIG.TEST_EMAIL,
                first_name: 'Test',
                last_name: 'User'
            };
            
            // Test 30-day warning
            console.log('📧 Testing 30-day expiry warning...');
            await emailService.send30DayExpiryWarning(mockLicense);
            console.log('✅ 30-day warning email sent successfully');
            results.push({ test: '30-Day Warning Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test 7-day warning
            const soonExpiryLicense = {...mockLicense, expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()};
            console.log('📧 Testing 7-day expiry warning...');
            await emailService.send7DayExpiryWarning(soonExpiryLicense);
            console.log('✅ 7-day warning email sent successfully');
            results.push({ test: '7-Day Warning Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test expired license
            const expiredLicense = {
                ...mockLicense, 
                expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                grace_period_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };
            console.log('📧 Testing license expired email...');
            await emailService.sendLicenseExpiredEmail(expiredLicense);
            console.log('✅ License expired email sent successfully');
            results.push({ test: 'License Expired Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Test subscription cancelled
            console.log('📧 Testing subscription cancelled email...');
            await emailService.sendSubscriptionCancelledEmail(mockLicense);
            console.log('✅ Subscription cancelled email sent successfully\n');
            results.push({ test: 'Subscription Cancelled Email', status: 'SUCCESS' });
            
            // Rate limiting: wait 1 second between sections
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ License lifecycle flow failed:', error);
            results.push({ test: 'License Lifecycle Flow', status: 'FAILED', error: error.message });
        }

        // 5. Contact & Support Flow
        console.log('5️⃣ TESTING CONTACT & SUPPORT FLOW');
        console.log('==================================');
        
        try {
            const contactData = {
                name: 'Test User',
                email: TEST_CONFIG.TEST_EMAIL,
                subject: 'Test Contact Form Submission',
                message: 'This is a test message from the email testing suite.',
                licenseKey: TEST_CONFIG.TEST_LICENSE_KEY
            };
            
            console.log('📧 Testing contact form submission...');
            await emailService.sendContactFormNotification(contactData);
            console.log('✅ Contact form notification sent successfully');
            results.push({ test: 'Contact Form Email', status: 'SUCCESS' });
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 600));
            
            console.log('📧 Testing password reset email...');
            await emailService.sendPasswordResetEmail(
                TEST_CONFIG.TEST_EMAIL, 
                'Test User', 
                'test_reset_token_123'
            );
            console.log('✅ Password reset email sent successfully\n');
            results.push({ test: 'Password Reset Email', status: 'SUCCESS' });
            
            // Rate limiting: wait 1 second between sections
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('❌ Contact support flow failed:', error);
            results.push({ test: 'Contact & Support Flow', status: 'FAILED', error: error.message });
        }

        // 6. Business Summary
        console.log('6️⃣ TESTING BUSINESS AUTOMATION FLOW');
        console.log('====================================');
        
        try {
            const summaryData = {
                date: new Date().toLocaleDateString(),
                newRegistrations: 2,
                newTrials: 1,
                newSubscriptions: 1,
                renewals: 0,
                upgrades: 1,
                downgrades: 0,
                cancellations: 0,
                totalRevenue: 1500
            };
            
            console.log('📧 Testing business daily summary...');
            await emailService.sendBusinessDailySummary(summaryData);
            console.log('✅ Business daily summary sent successfully\n');
            results.push({ test: 'Business Daily Summary', status: 'SUCCESS' });
            
        } catch (error) {
            console.error('❌ Business automation flow failed:', error);
            results.push({ test: 'Business Automation Flow', status: 'FAILED', error: error.message });
        }

        console.log('\n🎉 ALL EMAIL TESTS COMPLETED!');
        console.log('==============================');
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failCount = results.filter(r => r.status === 'FAILED').length;
        
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        
        if (failCount === 0) {
            console.log('🎯 Your email system is production-ready!');
        } else {
            console.log('⚠️  Some tests failed - check the details below');
        }

        res.json({
            success: true,
            message: 'Email test suite completed',
            summary: {
                total: results.length,
                successful: successCount,
                failed: failCount
            },
            results: results
        });

    } catch (error) {
        console.error('\n❌ EMAIL TEST FAILED:', error);
        res.status(500).json({
            success: false,
            error: 'Email test suite failed',
            message: error.message
        });
    }
});

module.exports = router; 