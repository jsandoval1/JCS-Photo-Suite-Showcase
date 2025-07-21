/**
 * Contact Form Notification Template
 */
function getContactFormNotificationTemplate(contactData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Contact Form Submission</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1>🔔 New Contact Form Submission</h1>
            <p>Someone has submitted a message through your website contact form</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <h3 style="color: #1f2937; margin-top: 0;">Contact Details</h3>
                <p><strong>Name:</strong> ${contactData.name}</p>
                <p><strong>Email:</strong> ${contactData.email}</p>
                <p><strong>Subject:</strong> ${contactData.subject}</p>
                ${contactData.licenseKey ? `<p><strong>License Key:</strong> ${contactData.licenseKey}</p>` : ''}
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
                <h3 style="color: #1f2937; margin-top: 0;">Message</h3>
                <div style="white-space: pre-line; color: #374151;">${contactData.message}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px; font-size: 14px; color: #6b7280;">
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getContactFormNotificationTemplate
}; 