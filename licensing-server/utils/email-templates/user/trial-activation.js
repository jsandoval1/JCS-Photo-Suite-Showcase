/**
 * Trial Activation Email Template
 */
function getTrialActivationTemplate(license, frontendUrl, supportEmail) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your JCS Photo Suite Trial is Active!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎯 Your JCS Photo Suite Trial is Active!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your 30-day free trial is now active</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #2563eb; margin-top: 0;">Hi ${license.first_name}! 🚀</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">Your JCS Photo Suite trial has been activated for 30 days. You can now access all features and manage your photos.</p>
                
                <!-- License Details Card -->
                <div style="background: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #1d4ed8; margin-top: 0; font-size: 18px;">📋 Your License Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License Key:</td><td style="padding: 8px 0;">${license.license_key}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Plan:</td><td style="padding: 8px 0;">${license.plan_tier}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">District:</td><td style="padding: 8px 0;">${license.district_name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Expires:</td><td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${new Date(license.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    </table>
                </div>
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl}/dashboard" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">Access Dashboard</a>
                    <br>
                    <a href="${frontendUrl}/features" style="background: #6b7280; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; margin: 10px;">View Features Guide</a>
                </div>
                
                <!-- Support -->
                <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                    <p style="margin: 0;"><strong>Need help?</strong> Contact our support team at <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a></p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;"><strong>JCS Photo Suite</strong> - Professional Photo Management for Schools</p>
                <p style="margin: 5px 0 0 0;"><a href="${frontendUrl}" style="color: #2563eb;">${frontendUrl}</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getTrialActivationTemplate
}; 