const pool = require('../config/db');
const emailService = require('../utils/email');
const cron = require('node-cron');

/**
 * License Automation Service
 * Handles automated license renewal, reminders, and deactivation
 */
class LicenseAutomationService {
    constructor() {
        this.setupCronJobs();
    }

    /**
     * Setup automated cron jobs
     */
    setupCronJobs() {
        // Run daily at 9 AM
        cron.schedule('0 9 * * *', () => {
            console.log('🕘 Running daily license automation checks...');
            this.runDailyChecks();
        });

        // Run payment retries every 6 hours
        cron.schedule('0 */6 * * *', () => {
            console.log('🔄 Running payment retry checks...');
            this.processPaymentRetries();
        });
    }

    /**
     * Main daily automation routine
     */
    async runDailyChecks() {
        try {
            await this.send30DayReminders();
            await this.send7DayReminders();
            await this.handleExpiredLicenses();
            await this.handleGracePeriodExpiry();
            await this.cleanupOldReminders();
        } catch (error) {
            console.error('❌ Error in daily automation checks:', error);
        }
    }

    /**
     * Send 30-day expiry reminders
     */
    async send30DayReminders() {
        const { rows: expiringLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
                AND l.expiry_date > CURRENT_DATE + INTERVAL '29 days'
                AND NOT EXISTS (
                    SELECT 1 FROM payment_reminders pr 
                    WHERE pr.license_key = l.license_key 
                    AND pr.reminder_type = '30_day'
                    AND pr.sent_at > CURRENT_DATE - INTERVAL '7 days'
                )
        `);

        for (const license of expiringLicenses) {
            await this.sendReminderEmail(license, '30_day');
        }

        console.log(`📧 Sent ${expiringLicenses.length} 30-day reminders`);
    }

    /**
     * Send 7-day expiry reminders
     */
    async send7DayReminders() {
        const { rows: expiringLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
                AND l.expiry_date > CURRENT_DATE + INTERVAL '6 days'
                AND NOT EXISTS (
                    SELECT 1 FROM payment_reminders pr 
                    WHERE pr.license_key = l.license_key 
                    AND pr.reminder_type = '7_day'
                    AND pr.sent_at > CURRENT_DATE - INTERVAL '2 days'
                )
        `);

        for (const license of expiringLicenses) {
            await this.sendReminderEmail(license, '7_day');
        }

        console.log(`📧 Sent ${expiringLicenses.length} 7-day reminders`);
    }

    /**
     * Handle newly expired licenses (start grace period)
     */
    async handleExpiredLicenses() {
        const { rows: expiredLicenses } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.expiry_date <= CURRENT_DATE
                AND l.grace_period_end IS NULL
        `);

        for (const license of expiredLicenses) {
            // Start 3-day grace period
            const gracePeriodEnd = new Date();
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

            await pool.query(`
                UPDATE licenses 
                SET grace_period_end = $1, updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $2
            `, [gracePeriodEnd.toISOString(), license.license_key]);

            await this.sendReminderEmail(license, 'expired');
        }

        console.log(`⏰ Started grace period for ${expiredLicenses.length} expired licenses`);
    }

    /**
     * Handle grace period expiry (deactivate licenses)
     */
    async handleGracePeriodExpiry() {
        const { rows: gracePeriodExpired } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.is_active = true
                AND l.grace_period_end IS NOT NULL
                AND l.grace_period_end <= CURRENT_TIMESTAMP
        `);

        for (const license of gracePeriodExpired) {
            await this.deactivateLicense(license);
        }

        console.log(`🚫 Deactivated ${gracePeriodExpired.length} licenses after grace period`);
    }

    /**
     * Process payment retries for failed payments
     */
    async processPaymentRetries() {
        const { rows: failedPayments } = await pool.query(`
            SELECT pf.*, l.*, u.email, u.first_name
            FROM payment_failures pf
            JOIN licenses l ON pf.license_key = l.license_key
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE pf.resolved_at IS NULL
                AND pf.next_retry_at <= CURRENT_TIMESTAMP
                AND pf.retry_count < 3
        `);

        for (const payment of failedPayments) {
            await this.retryFailedPayment(payment);
        }

        console.log(`🔄 Processed ${failedPayments.length} payment retries`);
    }

    /**
     * Send reminder email
     */
    async sendReminderEmail(license, reminderType) {
        try {
            let subject, template;
            const daysUntilExpiry = Math.ceil(
                (new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            switch (reminderType) {
                case '30_day':
                    subject = `Your JCS Photo Suite License Expires in 30 Days`;
                    template = this.get30DayReminderTemplate(license, daysUntilExpiry);
                    break;
                case '7_day':
                    subject = `URGENT: Your JCS Photo Suite License Expires in ${daysUntilExpiry} Days`;
                    template = this.get7DayReminderTemplate(license, daysUntilExpiry);
                    break;
                case 'expired':
                    subject = `Your JCS Photo Suite License Has Expired - Grace Period Active`;
                    template = this.getExpiredReminderTemplate(license);
                    break;
                case 'grace_period':
                    subject = `FINAL NOTICE: License Deactivation Tomorrow`;
                    template = this.getGracePeriodReminderTemplate(license);
                    break;
            }

            const result = await emailService.sendEmail({
                to: license.email,
                subject,
                html: template
            });

            // Log the reminder
            await pool.query(`
                INSERT INTO payment_reminders (license_key, reminder_type, email_message_id)
                VALUES ($1, $2, $3)
            `, [license.license_key, reminderType, result.messageId]);

            console.log(`✅ Sent ${reminderType} reminder to ${license.email} for license ${license.license_key}`);

        } catch (error) {
            console.error(`❌ Failed to send ${reminderType} reminder for license ${license.license_key}:`, error);
        }
    }

    /**
     * Deactivate a license
     */
    async deactivateLicense(license) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Deactivate license
            await client.query(`
                UPDATE licenses 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $1
            `, [license.license_key]);

            // Deactivate all servers
            await client.query(`
                UPDATE license_servers 
                SET is_active = false 
                WHERE license_key = $1
            `, [license.license_key]);

            // Log deactivation
            await client.query(`
                INSERT INTO subscription_history (
                    license_key, user_id, old_plan_tier, new_plan_tier, 
                    change_type, amount, notes, effective_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [
                license.license_key,
                license.created_by_user_id,
                license.plan_tier,
                'Deactivated',
                'auto_deactivation',
                0,
                'License automatically deactivated after grace period expiry'
            ]);

            await client.query('COMMIT');

            // Send deactivation email
            await this.sendDeactivationEmail(license);

            console.log(`🚫 License ${license.license_key} deactivated automatically`);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to deactivate license ${license.license_key}:`, error);
        } finally {
            client.release();
        }
    }

    /**
     * Clean up old reminder records (keep last 90 days)
     */
    async cleanupOldReminders() {
        const { rowCount } = await pool.query(`
            DELETE FROM payment_reminders 
            WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
        `);

        if (rowCount > 0) {
            console.log(`🧹 Cleaned up ${rowCount} old reminder records`);
        }
    }

    /**
     * Email templates
     */
    get30DayReminderTemplate(license, daysLeft) {
        const renewUrl = `${process.env.FRONTEND_URL}/pricing?renew=${license.license_key}`;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>License Renewal Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1>JCS Photo Suite</h1>
                    <h2>License Renewal Reminder</h2>
                </div>
                
                <div style="background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>Hi ${license.first_name},</h3>
                    <p>Your JCS Photo Suite license for <strong>${license.district_name}</strong> will expire in <strong>${daysLeft} days</strong> on ${new Date(license.expiry_date).toLocaleDateString()}.</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4>License Details:</h4>
                        <p><strong>License Key:</strong> ${license.license_key}</p>
                        <p><strong>Current Plan:</strong> ${license.plan_tier}</p>
                        <p><strong>District:</strong> ${license.district_name}</p>
                        <p><strong>Expires:</strong> ${new Date(license.expiry_date).toLocaleDateString()}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${renewUrl}" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Renew License Now</a>
                    </div>
                    
                    <p><strong>What happens if you don't renew:</strong></p>
                    <ul>
                        <li>Your license will expire on ${new Date(license.expiry_date).toLocaleDateString()}</li>
                        <li>You'll have a 3-day grace period to renew</li>
                        <li>After the grace period, your license will be deactivated</li>
                        <li>The plugin will stop working on your PowerSchool servers</li>
                    </ul>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 14px;">
                    <p>Questions? Contact us at support@jcsphotosuite.com</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    get7DayReminderTemplate(license, daysLeft) {
        const renewUrl = `${process.env.FRONTEND_URL}/pricing?renew=${license.license_key}`;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>URGENT: License Expires Soon</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1>⚠️ URGENT NOTICE</h1>
                    <h2>Your License Expires in ${daysLeft} Days!</h2>
                </div>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                    <h3>Hi ${license.first_name},</h3>
                    <p><strong>Your JCS Photo Suite license expires on ${new Date(license.expiry_date).toLocaleDateString()} - that's only ${daysLeft} days away!</strong></p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${renewUrl}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 18px;">RENEW NOW</a>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 6px;">
                        <h4>⏰ Timeline:</h4>
                        <ul>
                            <li><strong>${new Date(license.expiry_date).toLocaleDateString()}:</strong> License expires</li>
                            <li><strong>3-day grace period:</strong> License still works but shows warnings</li>
                            <li><strong>After grace period:</strong> License deactivated, plugin stops working</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getExpiredReminderTemplate(license) {
        const renewUrl = `${process.env.FRONTEND_URL}/pricing?renew=${license.license_key}`;
        const gracePeriodEnd = new Date(license.grace_period_end).toLocaleDateString();
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>License Expired - Grace Period Active</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1>🚨 LICENSE EXPIRED</h1>
                    <h2>Grace Period: 3 Days Remaining</h2>
                </div>
                
                <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3>Hi ${license.first_name},</h3>
                    <p><strong>Your JCS Photo Suite license has expired, but you're in a 3-day grace period.</strong></p>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                        <h4>⚠️ What's happening:</h4>
                        <ul>
                            <li>Your license expired on ${new Date(license.expiry_date).toLocaleDateString()}</li>
                            <li>You have until <strong>${gracePeriodEnd}</strong> to renew</li>
                            <li>After ${gracePeriodEnd}, your license will be <strong>automatically deactivated</strong></li>
                            <li>The plugin will stop working on your PowerSchool servers</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${renewUrl}" style="background: #dc2626; color: white; padding: 20px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 20px;">RENEW IMMEDIATELY</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Manual trigger methods for testing
     */
    async triggerRenewalCheck(licenseKey) {
        const { rows } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.license_key = $1
        `, [licenseKey]);

        if (rows.length > 0) {
            const license = rows[0];
            const daysUntilExpiry = Math.ceil(
                (new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry <= 0) {
                await this.sendReminderEmail(license, 'expired');
            } else if (daysUntilExpiry <= 7) {
                await this.sendReminderEmail(license, '7_day');
            } else if (daysUntilExpiry <= 30) {
                await this.sendReminderEmail(license, '30_day');
            }
        }
    }
}

module.exports = new LicenseAutomationService(); 