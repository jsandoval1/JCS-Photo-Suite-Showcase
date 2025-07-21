const emailService = require('../utils/email');

/**
 * Handle contact form submissions
 * Sends emails to support team and auto-reply to user
 */
const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Send notification email to support team
    const supportEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Submission</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #1f2937; }
            .value { background: white; padding: 10px; border-radius: 4px; margin-top: 5px; }
            .message-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔔 New Contact Form Submission</h2>
              <p>Someone has submitted a message through your website contact form.</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${name} &lt;${email}&gt;</div>
              </div>
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="field">
                <div class="label">Submitted:</div>
                <div class="value">${new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send auto-reply to user
    const autoReplyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Thank you for contacting JCS Photo Suite</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.9em; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Message Received</h2>
              <p>Thank you for contacting JCS Photo Suite</p>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for reaching out to us! We've received your message about "<strong>${subject}</strong>" and will get back to you within 24 hours.</p>
              <p>Our team is committed to providing excellent support for all JCS Photo Suite users. In the meantime, you can:</p>
              <ul>
                <li>Visit our <a href="${process.env.FRONTEND_URL}/features">Features page</a> to learn more about our capabilities</li>
                <li>Check out our <a href="${process.env.FRONTEND_URL}/pricing">Pricing plans</a> if you're interested in upgrading</li>
                <li>Browse our <a href="${process.env.FRONTEND_URL}/legal">Documentation</a> for detailed guides</li>
              </ul>
              <div class="footer">
                <p><strong>JCS Photo Suite Support Team</strong><br>
                Professional Photo Management for Schools<br>
                <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails (contact forms should work in both dev and production)
    console.log(`📧 Sending contact form emails for ${name} <${email}>`);
    
    await Promise.all([
      // Email to support team
      emailService.sendEmail({
        to: process.env.SUPPORT_EMAIL || 'support@jcsphotosuite.com',
        subject: `[Contact Form] ${subject}`,
        html: supportEmailHtml,
        replyTo: email
      }),
      
      // Auto-reply to user
      emailService.sendEmail({
        to: email,
        subject: `Re: ${subject} - We've received your message`,
        html: autoReplyHtml
      })
    ]);

    console.log(`✅ Contact form emails sent successfully`);

    console.log(`📧 Contact form submitted by ${name} <${email}> - Subject: ${subject}`);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later or contact us directly.'
    });
  }
};

module.exports = {
  submitContactForm
}; 