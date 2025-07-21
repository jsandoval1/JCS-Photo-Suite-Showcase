/**
 * Plan Downgrade Email Template
 */
function getPlanDowngradeTemplate(license, oldPlan, newPlan, amount, frontendUrl, supportEmail) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Plan Changed Successfully</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📉 Plan Changed Successfully</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Welcome to ${newPlan} for ${license.district_name}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #f59e0b; margin-top: 0;">Hi ${license.first_name}! 📋</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">Your payment was successful and your JCS Photo Suite license has been changed from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>. Your new plan is now active with the updated features and limits.</p>
                
                <!-- Plan Change Details Card -->
                <div style="background: #fefbf3; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #d97706; margin-top: 0; font-size: 18px;">📋 Plan Change Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License Key:</td><td style="padding: 8px 0;">${license.license_key}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Previous Plan:</td><td style="padding: 8px 0; color: #6b7280;">${oldPlan}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">New Plan:</td><td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">${newPlan}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">District:</td><td style="padding: 8px 0;">${license.district_name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Amount:</td><td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">$${amount}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Expires:</td><td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">${new Date(license.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    </table>
                </div>
                
                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl}/dashboard" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">View Dashboard</a>
                </div>
                
                <!-- Support -->
                <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                    <p style="margin: 0;"><strong>Questions about your plan change?</strong> Contact our support team at <a href="mailto:${supportEmail}" style="color: #f59e0b;">${supportEmail}</a></p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;"><strong>JCS Photo Suite</strong> - Professional Photo Management for Schools</p>
                <p style="margin: 5px 0 0 0;"><a href="${frontendUrl}" style="color: #f59e0b;">${frontendUrl}</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getPlanDowngradeTemplate
}; 