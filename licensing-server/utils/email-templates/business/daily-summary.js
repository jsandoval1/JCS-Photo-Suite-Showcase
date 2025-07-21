/**
 * Business Daily Summary Template
 */
function getBusinessDailySummaryTemplate(summaryData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Daily Business Summary</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1f2937, #374151); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>📊 Daily Business Summary</h1>
            <p style="font-size: 18px; margin: 0;">${summaryData.date}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
            <!-- Key Metrics -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #22c55e;">
                    <h3 style="color: #22c55e; margin: 0; font-size: 24px;">$${summaryData.totalRevenue}</h3>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Total Revenue</p>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #2563eb;">
                    <h3 style="color: #2563eb; margin: 0; font-size: 24px;">${summaryData.newRegistrations}</h3>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">New Registrations</p>
                </div>
            </div>
            
            <!-- Activity Breakdown -->
            <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0;">📈 Activity Breakdown</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">New Trials:</td><td style="padding: 8px 0; text-align: right;">${summaryData.newTrials}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">New Subscriptions:</td><td style="padding: 8px 0; text-align: right;">${summaryData.newSubscriptions}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Renewals:</td><td style="padding: 8px 0; text-align: right;">${summaryData.renewals}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Upgrades:</td><td style="padding: 8px 0; text-align: right;">${summaryData.upgrades}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Downgrades:</td><td style="padding: 8px 0; text-align: right;">${summaryData.downgrades}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Cancellations:</td><td style="padding: 8px 0; text-align: right;">${summaryData.cancellations}</td></tr>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
                <p>JCS Photo Suite Business Intelligence</p>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getBusinessDailySummaryTemplate
}; 