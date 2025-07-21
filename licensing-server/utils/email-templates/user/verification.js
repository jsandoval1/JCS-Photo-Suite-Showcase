/**
 * Email Verification Template
 */
function getVerificationEmailTemplate(firstName, verificationUrl, supportEmail) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - JCS Photo Suite</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">JCS Photo Suite</h1>
            <p style="color: #6b7280; margin: 0;">Professional Photo Management for Schools</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${firstName}!</h2>
            <p style="margin-bottom: 20px;">Thanks for creating your JCS Photo Suite account. To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email Address</a>
            </div>
            
            <p style="margin-bottom: 20px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb; margin-bottom: 20px;">${verificationUrl}</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a></p>
            <p>&copy; 2024 JCS Photo Suite. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getVerificationEmailTemplate
}; 