/**
 * Renewal Success Email Template
 */
function getRenewalSuccessTemplate(license, newExpiry, amount, frontendUrl, supportEmail, licenseCost = null, processingFee = null) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>License Renewed Successfully</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Payment Successful!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your JCS Photo Suite license has been renewed</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #16a34a; margin-top: 0;">Hi ${license.first_name}! 🎉</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">Great news! Your payment was successful and your JCS Photo Suite license has been renewed for another year.</p>
                
                <!-- License Details Card -->
                <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #15803d; margin-top: 0; font-size: 18px;">📋 Renewal Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License Key:</td><td style="padding: 8px 0;">${license.license_key}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Plan:</td><td style="padding: 8px 0;">${license.plan_tier}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">District:</td><td style="padding: 8px 0;">${license.district_name}</td></tr>
                                                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License Cost:</td><td style="padding: 8px 0;">$${licenseCost || amount}</td></tr>
                            ${processingFee ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Processing Fee:</td><td style="padding: 8px 0;">$${processingFee}</td></tr>` : ''}
                            <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Charged:</td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">$${amount}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">New Expiry:</td><td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${newExpiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    </table>
                </div>
                
                <!-- What's Next -->
                <div style="background: #fafafa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #374151; margin-top: 0;">🚀 What happens next?</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Your plugin will continue working seamlessly on all your PowerSchool servers</li>
                        <li style="margin-bottom: 8px;">No action required - everything stays the same</li>
                        <li style="margin-bottom: 8px;">We'll send you a reminder before your next renewal date</li>
                        <li style="margin-bottom: 8px;">Access your dashboard anytime to view usage and manage settings</li>
                    </ul>
                </div>
                
                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl}/dashboard" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);">View Dashboard</a>
                </div>
                
                <!-- Support -->
                <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                    <p style="margin: 0;"><strong>Need help?</strong> Contact our support team at <a href="mailto:${supportEmail}" style="color: #16a34a;">${supportEmail}</a></p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;"><strong>JCS Photo Suite</strong> - Professional Photo Management for Schools</p>
                <p style="margin: 5px 0 0 0;"><a href="${frontendUrl}" style="color: #16a34a;">${frontendUrl}</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getRenewalSuccessTemplate
}; 