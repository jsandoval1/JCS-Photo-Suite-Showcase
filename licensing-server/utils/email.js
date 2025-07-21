const { Resend } = require('resend');
const templates = require('./email-templates');

// Debug environment variable
const apiKey = process.env.RESEND_API_KEY;
console.log('🔑 RESEND_API_KEY status:', apiKey ? 'SET' : 'NOT SET');
console.log('🔑 API key prefix:', apiKey ? apiKey.substring(0, 12) + '...' : 'NONE');
console.log('🔑 API key length:', apiKey ? apiKey.length : 0);

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email service for sending transactional emails
 * Now uses modular templates for better maintainability!
 */
class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'support@jcsphotosuite.com';
        this.supportEmail = process.env.SUPPORT_EMAIL || 'support@jcsphotosuite.com';
        this.businessEmail = process.env.BUSINESS_EMAIL || 'business@jcsphotosuite.com';
        this.frontendUrl = process.env.FRONTEND_URL || 'https://jcsphotosuite.com';
        
        // Debug email configuration
        console.log('📧 Email Service Configuration:');
        console.log(`   FROM_EMAIL: ${this.fromEmail}`);
        console.log(`   SUPPORT_EMAIL: ${this.supportEmail}`);
        console.log(`   BUSINESS_EMAIL: ${this.businessEmail}`);
        console.log(`   FRONTEND_URL: ${this.frontendUrl}`);
    }

    // ========================================
    // USER NOTIFICATION EMAILS
    // ========================================

    /**
     * Send payment success email (subscription renewal)
     */
    async sendRenewalSuccessEmail(license, newExpiry, amount, licenseCost = null, processingFee = null) {
        const template = templates.getRenewalSuccessTemplate(
            license, newExpiry, amount, this.frontendUrl, this.supportEmail, licenseCost, processingFee
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: '✅ Payment Successful - JCS Photo Suite License Renewed',
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('License Renewed', {
                type: 'renewal',
                license: license,
                amount: amount,
                newExpiry: newExpiry
            });

            return result;
        } catch (error) {
            console.error('Failed to send renewal success email:', error);
            throw error;
        }
    }

    /**
     * Send payment failed email
     */
    async sendPaymentFailedEmail(license, retryCount, nextRetryAt) {
        const template = templates.getPaymentFailedTemplate(
            license, retryCount, nextRetryAt, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: `⚠️ Payment Failed - Attempt ${retryCount} of 3 - JCS Photo Suite`,
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('Payment Failed', {
                type: 'payment_failed',
                license: license,
                retryCount: retryCount,
                nextRetryAt: nextRetryAt
            });

            return result;
        } catch (error) {
            console.error('Failed to send payment failed email:', error);
            throw error;
        }
    }

    /**
     * Send plan downgrade email
     */
    async sendPlanDowngradeEmail(license, oldPlan, newPlan, amount) {
        const template = templates.getPlanDowngradeTemplate(
            license, oldPlan, newPlan, amount, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: `📉 Plan Changed - Welcome to ${newPlan}`,
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('Plan Downgraded', {
                type: 'plan_downgrade',
                license: license,
                oldPlan: oldPlan,
                newPlan: newPlan,
                amount: amount
            });

            return result;
        } catch (error) {
            console.error('Failed to send plan downgrade email:', error);
            throw error;
        }
    }

    /**
     * Send plan upgrade success email
     */
    async sendPlanUpgradeEmail(license, oldPlan, newPlan, amount) {
        const template = templates.getPlanUpgradeTemplate(
            license, oldPlan, newPlan, amount, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: `🚀 Plan Upgraded - Welcome to ${newPlan}!`,
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('Plan Upgraded', {
                type: 'plan_upgrade',
                license: license,
                oldPlan: oldPlan,
                newPlan: newPlan,
                amount: amount
            });

            return result;
        } catch (error) {
            console.error('Failed to send plan upgrade email:', error);
            throw error;
        }
    }

    /**
     * Send new subscription welcome email
     */
    async sendSubscriptionWelcomeEmail(license, amount) {
        const template = templates.getSubscriptionWelcomeTemplate(
            license, amount, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: '🎉 Welcome to JCS Photo Suite - Your License is Active!',
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('New Subscription', {
                type: 'new_subscription',
                license: license,
                amount: amount
            });

            return result;
        } catch (error) {
            console.error('Failed to send subscription welcome email:', error);
            throw error;
        }
    }

    /**
     * Send trial activation email
     */
    async sendTrialActivationEmail(license) {
        const template = templates.getTrialActivationTemplate(
            license, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: '🎯 Your JCS Photo Suite Trial is Active - 30 Days Free!',
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('Trial Started', {
                type: 'trial_started',
                license: license
            });

            return result;
        } catch (error) {
            console.error('Failed to send trial activation email:', error);
            throw error;
        }
    }

    /**
     * Send license expiry warning (30 days)
     */
    async send30DayExpiryWarning(license) {
        const daysLeft = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const template = templates.get30DayExpiryTemplate(
            license, daysLeft, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: `📅 License Renewal Reminder - ${daysLeft} Days Remaining`,
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('License Expiring Soon', {
                type: 'expiry_warning_30',
                license: license,
                daysLeft: daysLeft
            });

            return result;
        } catch (error) {
            console.error('Failed to send 30-day expiry warning:', error);
            throw error;
        }
    }

    /**
     * Send license expiry warning (7 days)
     */
    async send7DayExpiryWarning(license) {
        const daysLeft = Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const template = templates.get7DayExpiryTemplate(
            license, daysLeft, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: `🚨 URGENT: Your JCS Photo Suite License Expires in ${daysLeft} Days`,
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('License Expiring URGENTLY', {
                type: 'expiry_warning_7',
                license: license,
                daysLeft: daysLeft
            });

            return result;
        } catch (error) {
            console.error('Failed to send 7-day expiry warning:', error);
            throw error;
        }
    }

    /**
     * Send license expired email (grace period)
     */
    async sendLicenseExpiredEmail(license) {
        const gracePeriodEnd = new Date(license.grace_period_end);
        const daysLeft = Math.ceil((gracePeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
        const template = templates.getLicenseExpiredTemplate(
            license, gracePeriodEnd, daysLeft, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: '🚨 URGENT: License Expired - Grace Period Active - JCS Photo Suite',
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('License EXPIRED', {
                type: 'license_expired',
                license: license,
                gracePeriodEnd: gracePeriodEnd
            });

            return result;
        } catch (error) {
            console.error('Failed to send license expired email:', error);
            throw error;
        }
    }

    /**
     * Send subscription cancellation email
     */
    async sendSubscriptionCancelledEmail(license) {
        const template = templates.getSubscriptionCancelledTemplate(
            license, this.frontendUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                to: license.email,
                subject: '😔 Subscription Cancelled - JCS Photo Suite',
                html: template
            });

            // Send business notification
            await this.sendBusinessNotification('Subscription Cancelled', {
                type: 'subscription_cancelled',
                license: license
            });

            return result;
        } catch (error) {
            console.error('Failed to send subscription cancelled email:', error);
            throw error;
        }
    }

    /**
     * Send contact form notification to support team
     */
    async sendContactFormNotification(contactData) {
        const template = templates.getContactFormNotificationTemplate(contactData);
        
        try {
            const result = await this.sendEmail({
                to: this.supportEmail,
                subject: `[Contact Form] ${contactData.subject}`,
                html: template,
                replyTo: contactData.email
            });

            // Send business notification
            await this.sendBusinessNotification('Contact Form Submission', {
                type: 'contact_form',
                contactData: contactData
            });

            return result;
        } catch (error) {
            console.error('Failed to send contact form notification:', error);
            throw error;
        }
    }

    /**
     * Send business daily summary
     */
    async sendBusinessDailySummary(summaryData) {
        const template = templates.getBusinessDailySummaryTemplate(summaryData);
        
        try {
            const result = await this.sendEmail({
                to: this.businessEmail,
                subject: `📊 Daily Summary - ${summaryData.date} - JCS Photo Suite`,
                html: template
            });

            return result;
        } catch (error) {
            console.error('Failed to send business daily summary:', error);
            throw error;
        }
    }

    // ========================================
    // AUTH & VERIFICATION EMAILS
    // ========================================

    /**
     * Send email verification email
     */
    async sendVerificationEmail(email, firstName, verificationToken) {
        const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;
        const template = templates.getVerificationEmailTemplate(
            firstName, verificationUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                from: this.fromEmail,
                to: email,
                subject: 'Verify your JCS Photo Suite account',
                html: template,
            });

            console.log('✅ Verification email sent successfully:', result.messageId);
            
            // Send business notification for new user registration
            await this.sendBusinessNotification('New User Registration', {
                type: 'user_registration',
                license: { first_name: firstName, email: email, district_name: 'Pending verification' }
            });

            return { success: true, messageId: result.messageId };
        } catch (err) {
            console.error('Error sending verification email:', err);
            throw err;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
        const template = templates.getPasswordResetEmailTemplate(
            firstName, resetUrl, this.supportEmail
        );
        
        try {
            const result = await this.sendEmail({
                from: this.fromEmail,
                to: email,
                subject: 'Reset your JCS Photo Suite password',
                html: template,
            });

            console.log('✅ Password reset email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (err) {
            console.error('Error sending password reset email:', err);
            throw err;
        }
    }

    // ========================================
    // BUSINESS NOTIFICATION EMAILS
    // ========================================

    /**
     * Send business notification for important events
     */
    async sendBusinessNotification(eventType, data) {
        try {
            const template = templates.getBusinessNotificationTemplate(
                eventType, data, this.frontendUrl
            );
            
            console.log(`📧 Sending business notification to: ${this.businessEmail}`);
            
            // Create subject line - handle cases where there's no license data (like contact forms)
            const subjectSuffix = data.license ? ` - ${data.license.district_name}` : '';
            
            const result = await this.sendEmail({
                to: this.businessEmail,
                subject: `🏢 JCS Photo Suite: ${eventType}${subjectSuffix}`,
                html: template
            });

            console.log(`✅ Business notification sent successfully: ${eventType}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send business notification:', error);
            console.error('Business email target:', this.businessEmail);
            // Don't throw - business notifications shouldn't break user flow
        }
    }

    // ========================================
    // CORE UTILITIES
    // ========================================

    /**
     * Generic email sending method
     */
    async sendEmail({ to, subject, html, replyTo }) {
        try {
            const emailOptions = {
                from: this.fromEmail,
                to,
                subject,
                html,
            };

            if (replyTo) {
                emailOptions.reply_to = replyTo;
            }

            const { data, error } = await resend.emails.send(emailOptions);

            if (error) {
                console.error('Failed to send email:', error);
                throw new Error(`Email sending failed: ${error.message}`);
            }

            console.log('✅ Email sent successfully:', data.id);
            return { success: true, messageId: data.id };
        } catch (err) {
            console.error('Error sending email:', err);
            throw err;
        }
    }
}

module.exports = new EmailService(); 