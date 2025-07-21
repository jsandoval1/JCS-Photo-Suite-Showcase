/**
 * Plan Upgrade Email Template
 */
function getPlanUpgradeTemplate(license, oldPlan, newPlan, amount, frontendUrl, supportEmail) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Plan Upgraded Successfully!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🚀 Plan Upgraded Successfully!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Welcome to ${newPlan} - More power for ${license.district_name}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #8b5cf6; margin-top: 0;">Hi ${license.first_name}! 🎉</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">Congratulations! Your payment was successful and your JCS Photo Suite license has been upgraded from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>. You now have access to enhanced features and capabilities.</p>
                
                <!-- Upgrade Details Card -->
                <div style="background: #faf5ff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #7c3aed; margin-top: 0; font-size: 18px;">📈 Upgrade Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License Key:</td><td style="padding: 8px 0;">${license.license_key}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Previous Plan:</td><td style="padding: 8px 0; color: #6b7280;">${oldPlan}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">New Plan:</td><td style="padding: 8px 0; color: #8b5cf6; font-weight: bold;">${newPlan}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">District:</td><td style="padding: 8px 0;">${license.district_name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Upgrade Cost:</td><td style="padding: 8px 0; color: #8b5cf6; font-weight: bold;">$${amount}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Expires:</td><td style="padding: 8px 0; color: #8b5cf6; font-weight: bold;">${new Date(license.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    </table>
                </div>
                
                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl}/dashboard" style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);">View Dashboard</a>
                </div>
                
                <!-- Support -->
                <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                    <p style="margin: 0;"><strong>Need help?</strong> Contact our support team at <a href="mailto:${supportEmail}" style="color: #8b5cf6;">${supportEmail}</a></p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;"><strong>JCS Photo Suite</strong> - Professional Photo Management for Schools</p>
                <p style="margin: 5px 0 0 0;"><a href="${frontendUrl}" style="color: #8b5cf6;">${frontendUrl}</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getPlanUpgradeTemplate
}; 