/**
 * Business Notification Email Templates
 */
function getBusinessNotificationTemplate(eventType, data, frontendUrl) {
    const { license } = data;
    let eventDetails = '';
    
    switch (data.type) {
        case 'new_subscription':
            eventDetails = `
                <p><strong>💰 Revenue:</strong> $${data.amount}</p>
                <p><strong>📅 Expires:</strong> ${new Date(license.expiry_date).toLocaleDateString()}</p>
            `;
            break;
        case 'renewal':
            eventDetails = `
                <p><strong>💰 Revenue:</strong> $${data.amount}</p>
                <p><strong>📅 New Expiry:</strong> ${data.newExpiry.toLocaleDateString()}</p>
            `;
            break;
        case 'plan_upgrade':
            eventDetails = `
                <p><strong>📈 Upgrade:</strong> ${data.oldPlan} → ${data.newPlan}</p>
                <p><strong>💰 Revenue:</strong> $${data.amount}</p>
                <p><strong>📅 Expires:</strong> ${new Date(license.expiry_date).toLocaleDateString()}</p>
            `;
            break;
        case 'plan_downgrade':
            eventDetails = `
                <p><strong>📉 Downgrade:</strong> ${data.oldPlan} → ${data.newPlan}</p>
                <p><strong>💰 Amount:</strong> $${data.amount}</p>
                <p><strong>📅 Expires:</strong> ${new Date(license.expiry_date).toLocaleDateString()}</p>
            `;
            break;
        case 'payment_failed':
            eventDetails = `
                <p><strong>❌ Retry:</strong> ${data.retryCount} of 3</p>
                <p><strong>📅 Next Attempt:</strong> ${data.nextRetryAt.toLocaleDateString()}</p>
            `;
            break;
        case 'trial_started':
            eventDetails = `
                <p><strong>🎯 Trial Duration:</strong> 30 days</p>
                <p><strong>📅 Expires:</strong> ${new Date(license.expiry_date).toLocaleDateString()}</p>
            `;
            break;
        case 'contact_form':
            eventDetails = `
                <p><strong>👤 From:</strong> ${data.contactData.name} (${data.contactData.email})</p>
                <p><strong>📧 Subject:</strong> ${data.contactData.subject}</p>
                ${data.contactData.licenseKey ? `<p><strong>🔑 License:</strong> ${data.contactData.licenseKey}</p>` : ''}
                <p><strong>💬 Message Preview:</strong> ${data.contactData.message.substring(0, 100)}${data.contactData.message.length > 100 ? '...' : ''}</p>
            `;
            break;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Business Notification - ${eventType}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">🏢 ${eventType}</h2>
            
            <div style="background: white; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <h3 style="color: #475569; margin-top: 0;">Customer Details</h3>
                ${data.type === 'contact_form' ? `
                    <p><strong>👤 Name:</strong> ${data.contactData.name}</p>
                    <p><strong>📧 Email:</strong> ${data.contactData.email}</p>
                    <p><strong>📋 Subject:</strong> ${data.contactData.subject}</p>
                    ${data.contactData.licenseKey ? `<p><strong>🔑 License:</strong> ${data.contactData.licenseKey}</p>` : ''}
                ` : `
                    <p><strong>👤 Name:</strong> ${license.first_name} ${license.last_name}</p>
                    <p><strong>📧 Email:</strong> ${license.email}</p>
                    <p><strong>🏫 District:</strong> ${license.district_name}</p>
                    <p><strong>🔑 License:</strong> ${license.license_key}</p>
                    <p><strong>📊 Plan:</strong> ${license.plan_tier}</p>
                `}
            </div>
            
            <div style="background: white; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <h3 style="color: #475569; margin-top: 0;">Event Details</h3>
                ${eventDetails}
                <p><strong>⏰ Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="${frontendUrl}/admin/licenses" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">View in Admin</a>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getBusinessNotificationTemplate
}; 