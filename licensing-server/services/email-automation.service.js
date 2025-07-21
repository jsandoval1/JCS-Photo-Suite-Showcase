/**
 * Email Automation Service
 * Handles scheduled email notifications and automated campaigns
 * Run this as a cron job or scheduled task
 */

const pool = require('../config/db');
const emailService = require('../utils/email');
const cron = require('node-cron');

class EmailAutomationService {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Start the email automation service
     * This sets up cron jobs for automated emails
     */
    start() {
        if (this.isRunning) {
            console.log('Email automation service is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting Email Automation Service...');

        // Run every day at 9:00 AM
        cron.schedule('0 9 * * *', async () => {
            console.log('📧 Running daily email automation...');
            await this.runDailyEmailChecks();
        });

        // Run every hour to check for urgent notifications
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Running hourly email checks...');
            await this.runHourlyEmailChecks();
        });

        // Run business summary every 5 minutes (regardless of activity)
        cron.schedule('*/5 * * * *', async () => {
            console.log('📊 Running 5-minute business summary...');
            await this.sendFrequentBusinessSummary();
        });

        console.log('✅ Email automation service started successfully');
    }

    /**
     * Stop the email automation service
     */
    stop() {
        this.isRunning = false;
        console.log('🛑 Email automation service stopped');
    }

    /**
     * Run daily email checks (9 AM)
     * - 30-day expiry warnings
     * - License usage reports
     * - Business summary emails
     */
    async runDailyEmailChecks() {
        try {
            console.log('📅 Running daily email automation checks...');
            
            await this.send30DayExpiryWarnings();
            await this.sendBusinessDailySummary();
            
            console.log('✅ Daily email checks completed');
        } catch (error) {
            console.error('❌ Error in daily email checks:', error);
        }
    }

    /**
     * Run hourly email checks
     * - 7-day expiry warnings
     * - Grace period warnings
     * - Failed payment retries
     */
    async runHourlyEmailChecks() {
        try {
            console.log('⏰ Running hourly email automation checks...');
            
            await this.send7DayExpiryWarnings();
            await this.sendGracePeriodWarnings();
            await this.checkFailedPaymentRetries();
            
            console.log('✅ Hourly email checks completed');
        } catch (error) {
            console.error('❌ Error in hourly email checks:', error);
        }
    }

    /**
     * Send 30-day expiry warnings
     */
    async send30DayExpiryWarnings() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const { rows: expiringLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.expiry_date::date = $1::date
                AND NOT EXISTS (
                    SELECT 1 FROM email_reminders er 
                    WHERE er.license_key = l.license_key 
                    AND er.reminder_type = '30_day'
                    AND er.sent_at > CURRENT_DATE - INTERVAL '30 days'
                )
        `, [thirtyDaysFromNow.toISOString()]);

        for (const license of expiringLicenses) {
            try {
                await emailService.send30DayExpiryWarning(license);
                
                // Log the reminder
                await pool.query(`
                    INSERT INTO email_reminders (license_key, reminder_type, sent_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                `, [license.license_key, '30_day']);
                
                console.log(`📧 Sent 30-day expiry warning to ${license.email}`);
            } catch (error) {
                console.error(`❌ Failed to send 30-day warning to ${license.email}:`, error);
            }
        }

        if (expiringLicenses.length > 0) {
            console.log(`✅ Sent ${expiringLicenses.length} 30-day expiry warnings`);
        }
    }

    /**
     * Send 7-day expiry warnings
     */
    async send7DayExpiryWarnings() {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        const { rows: expiringLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.expiry_date::date = $1::date
                AND NOT EXISTS (
                    SELECT 1 FROM email_reminders er 
                    WHERE er.license_key = l.license_key 
                    AND er.reminder_type = '7_day'
                    AND er.sent_at > CURRENT_DATE - INTERVAL '7 days'
                )
        `, [sevenDaysFromNow.toISOString()]);

        for (const license of expiringLicenses) {
            try {
                await emailService.send7DayExpiryWarning(license);
                
                // Log the reminder
                await pool.query(`
                    INSERT INTO email_reminders (license_key, reminder_type, sent_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                `, [license.license_key, '7_day']);
                
                console.log(`📧 Sent 7-day expiry warning to ${license.email}`);
            } catch (error) {
                console.error(`❌ Failed to send 7-day warning to ${license.email}:`, error);
            }
        }

        if (expiringLicenses.length > 0) {
            console.log(`🚨 Sent ${expiringLicenses.length} 7-day expiry warnings`);
        }
    }

    /**
     * Send grace period warnings
     */
    async sendGracePeriodWarnings() {
        const { rows: expiredLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.expiry_date < CURRENT_TIMESTAMP
                AND l.grace_period_end > CURRENT_TIMESTAMP
                AND NOT EXISTS (
                    SELECT 1 FROM email_reminders er 
                    WHERE er.license_key = l.license_key 
                    AND er.reminder_type = 'grace_period'
                    AND er.sent_at > CURRENT_DATE - INTERVAL '1 day'
                )
        `);

        for (const license of expiredLicenses) {
            try {
                await emailService.sendLicenseExpiredEmail(license);
                
                // Log the reminder
                await pool.query(`
                    INSERT INTO email_reminders (license_key, reminder_type, sent_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                `, [license.license_key, 'grace_period']);
                
                console.log(`📧 Sent grace period warning to ${license.email}`);
            } catch (error) {
                console.error(`❌ Failed to send grace period warning to ${license.email}:`, error);
            }
        }

        if (expiredLicenses.length > 0) {
            console.log(`🚨 Sent ${expiredLicenses.length} grace period warnings`);
        }
    }

    /**
     * Check failed payment retries
     */
    async checkFailedPaymentRetries() {
        const { rows: failedPayments } = await pool.query(`
            SELECT pf.*, l.*, u.email, u.first_name, u.last_name
            FROM payment_failures pf
            JOIN licenses l ON pf.license_key = l.license_key
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE pf.resolved_at IS NULL
                AND pf.next_retry_at <= CURRENT_TIMESTAMP
                AND pf.retry_count < 3
        `);

        for (const payment of failedPayments) {
            try {
                // Update retry count
                await pool.query(`
                    UPDATE payment_failures 
                    SET retry_count = retry_count + 1,
                        next_retry_at = CURRENT_TIMESTAMP + INTERVAL '${payment.retry_count + 1} days'
                    WHERE id = $1
                `, [payment.id]);

                // Send retry notification
                await emailService.sendPaymentFailedEmail(
                    payment, 
                    payment.retry_count + 1, 
                    new Date(Date.now() + (payment.retry_count + 1) * 24 * 60 * 60 * 1000)
                );
                
                console.log(`📧 Sent payment retry notification to ${payment.email}`);
            } catch (error) {
                console.error(`❌ Failed to process payment retry for ${payment.email}:`, error);
            }
        }

        if (failedPayments.length > 0) {
            console.log(`💳 Processed ${failedPayments.length} payment retries`);
        }
    }

    /**
     * Send daily business summary
     */
    async sendBusinessDailySummary() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        try {
            // Get daily metrics
            const { rows: metrics } = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE l.created_at::date = $1::date) as new_licenses,
                    COUNT(*) FILTER (WHERE sh.effective_date::date = $1::date AND sh.change_type = 'renewal') as renewals,
                    COUNT(*) FILTER (WHERE sh.effective_date::date = $1::date AND sh.change_type = 'subscription_cancelled') as cancellations,
                    COUNT(*) FILTER (WHERE pf.created_at::date = $1::date) as payment_failures,
                    COALESCE(SUM(sh.amount) FILTER (WHERE sh.effective_date::date = $1::date), 0) as daily_revenue
                FROM licenses l
                FULL OUTER JOIN subscription_history sh ON l.license_key = sh.license_key
                FULL OUTER JOIN payment_failures pf ON l.license_key = pf.license_key
            `, [yesterday.toISOString()]);

            const metric = metrics[0];
            
            if (metric.new_licenses > 0 || metric.renewals > 0 || metric.cancellations > 0 || metric.payment_failures > 0) {
                const template = this.getBusinessSummaryTemplate(yesterday, metric);
                
                await emailService.sendEmail({
                    to: emailService.businessEmail,
                    subject: `📊 Daily JCS Photo Suite Summary - ${yesterday.toLocaleDateString()}`,
                    html: template
                });

                console.log('📊 Sent daily business summary');
            }
        } catch (error) {
            console.error('❌ Failed to send daily business summary:', error);
        }
    }

    /**
     * Send frequent business summary (every 5 minutes, regardless of activity)
     */
    async sendFrequentBusinessSummary() {
        const today = new Date();
        
        try {
            // Get today's metrics (same query as daily summary but for today)
            const { rows: metrics } = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE l.created_at::date = $1::date) as new_licenses,
                    COUNT(*) FILTER (WHERE sh.effective_date::date = $1::date AND sh.change_type = 'renewal') as renewals,
                    COUNT(*) FILTER (WHERE sh.effective_date::date = $1::date AND sh.change_type = 'subscription_cancelled') as cancellations,
                    COUNT(*) FILTER (WHERE pf.created_at::date = $1::date) as payment_failures,
                    COALESCE(SUM(sh.amount) FILTER (WHERE sh.effective_date::date = $1::date), 0) as daily_revenue
                FROM licenses l
                FULL OUTER JOIN subscription_history sh ON l.license_key = sh.license_key
                FULL OUTER JOIN payment_failures pf ON l.license_key = pf.license_key
            `, [today.toISOString()]);

            const metric = metrics[0];
            
            // Always send, regardless of activity - use existing template
            const template = this.getBusinessSummaryTemplate(today, metric);
            
            await emailService.sendEmail({
                to: emailService.businessEmail,
                subject: `📊 JCS Photo Suite Summary - ${today.toLocaleDateString()} (${new Date().toLocaleTimeString()})`,
                html: template
            });

            console.log('📊 Sent 5-minute business summary');
            
        } catch (error) {
            console.error('❌ Failed to send frequent business summary:', error);
        }
    }

    /**
     * Business daily summary email template
     */
    getBusinessSummaryTemplate(date, metrics) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Daily Business Summary</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #1e293b; margin-top: 0;">📊 Daily Summary - ${date.toLocaleDateString()}</h2>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
                    <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
                        <h3 style="color: #16a34a; margin: 0; font-size: 24px;">${metrics.new_licenses}</h3>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">New Licenses</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
                        <h3 style="color: #2563eb; margin: 0; font-size: 24px;">${metrics.renewals}</h3>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Renewals</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
                        <h3 style="color: #dc2626; margin: 0; font-size: 24px;">${metrics.cancellations}</h3>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Cancellations</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
                        <h3 style="color: #f59e0b; margin: 0; font-size: 24px;">${metrics.payment_failures}</h3>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">Payment Failures</p>
                    </div>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
                    <h3 style="color: #16a34a; margin: 0; font-size: 32px;">$${metrics.daily_revenue}</h3>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 18px;">Daily Revenue</p>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${emailService.frontendUrl}/admin/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Full Dashboard</a>
                </div>
            </div>
        </body>
        </html>
                `;
    }

    /**
     * Manual trigger for testing
     */
    async runAllChecks() {
        console.log('🧪 Running all email automation checks manually...');
        await this.runDailyEmailChecks();
        await this.runHourlyEmailChecks();
        console.log('✅ Manual automation check completed');
    }
}

module.exports = new EmailAutomationService(); 