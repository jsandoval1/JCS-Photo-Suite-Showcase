/**
 * Payment Failed Email Template
 */
function getPaymentFailedTemplate(license, retryCount, nextRetryAt, frontendUrl, supportEmail) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Failed - Action Required</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⚠️ Payment Failed</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Attempt ${retryCount} of 3 - Action Required</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
                <h2 style="color: #dc2626; margin-top: 0;">Hi ${license.first_name},</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">We were unable to process your payment for the JCS Photo Suite license renewal. Don't worry - we'll automatically retry, but you can also update your payment method now.</p>
                
                <!-- Payment Issue Details -->
                <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #dc2626; margin-top: 0; font-size: 18px;">💳 Payment Issue Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">License:</td><td style="padding: 8px 0;">${license.license_key}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Plan:</td><td style="padding: 8px 0;">${license.plan_tier}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">District:</td><td style="padding: 8px 0;">${license.district_name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Retry Attempt:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${retryCount} of 3</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Next Retry:</td><td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${nextRetryAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    </table>
                </div>
                
                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl}/dashboard/billing" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; margin: 10px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">Update Payment Method</a>
                </div>
                
                <!-- Support -->
                <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 30px; font-size: 14px; color: #6b7280;">
                    <p style="margin: 0;"><strong>Need help?</strong> Contact our support team at <a href="mailto:${supportEmail}" style="color: #dc2626;">${supportEmail}</a></p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;"><strong>JCS Photo Suite</strong> - Professional Photo Management for Schools</p>
                <p style="margin: 5px 0 0 0;"><a href="${frontendUrl}" style="color: #dc2626;">${frontendUrl}</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getPaymentFailedTemplate
}; 