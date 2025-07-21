require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload'); 
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_DB_URL', 'JWT_SECRET', 'RESEND_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    console.error('Please set these variables in your .env file');
    process.exit(1);
}

// Middleware
app.use(cors());

// Webhook routes need raw body parsing, so they go before express.json()
app.use('/api/webhooks', require('./routes/webhooks.routes'));

app.use(express.json());
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true
}));
app.set('trust proxy', 1);

// Rate limiting - Optimized for CDN performance
const generalRateLimiter = rateLimit({
	windowMs: 60 * 1000,        // 1 minute
	max: 500,                   // Increased from 100 to 500 requests/minute
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many requests from this IP, please try again later'
});

// CDN-specific rate limiting (more permissive for high-frequency operations)
const cdnRateLimiter = rateLimit({
	windowMs: 60 * 1000,        // 1 minute
	max: 2000,                  // 2000 requests/minute for CDN endpoints
	standardHeaders: true,
	legacyHeaders: false,
	message: 'CDN rate limit exceeded, please try again later',
	keyGenerator: (req) => {
		// Rate limit per district instead of per IP for CDN requests, so that one school can't block others
		const districtUID = req.headers['x-district-uid'] || req.body.district_uniqueid || req.ip;
		return `cdn:${districtUID}`;
	}
});

// Apply CDN rate limiting first (more permissive)
app.use('/api/cdn', cdnRateLimiter);
app.use('/api/validate-cdn', cdnRateLimiter);
app.use('/api/heartbeat', cdnRateLimiter);
app.use('/api/validate-usage', cdnRateLimiter);

// Apply general rate limiting to all other routes
app.use(generalRateLimiter);

// Import routes - CDN routes first to bypass general rate limiting
app.use('/api', require('./routes/cdn.routes')); // CDN module delivery and validation
app.use('/api', require('./routes/plugin.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/pricing', require('./routes/pricing.routes'));
app.use('/api/licenses', require('./routes/licenses.routes'));
app.use('/api/downloads', require('./routes/downloads.routes'));
app.use('/api/subscriptions', require('./routes/subscriptions.routes'));
app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/servers', require('./routes/servers.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Test routes for development
if (process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true') {
	app.use('/api/test', require('./routes/test.routes'));
	console.log('🧪 Test routes loaded! Available at:');
	console.log('   GET  /api/test/test-all-emails  - Comprehensive email testing');
}


// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
	res.send('JCS Photo Suite Licensing Server is running!');
});


if (require.main === module) {
	// Start email automation service
	const emailAutomation = require('./services/email-automation.service');
	emailAutomation.start();

	app.listen(PORT, () => {
		console.log(`🚀 JCS Photo Suite Licensing Server running on port ${PORT}`);
		console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
		console.log(`🔗 API root: http://localhost:${PORT}/`);
		console.log(`🏥 Health check: http://localhost:${PORT}/health`);
		console.log(`📧 Email automation: ${emailAutomation.isRunning ? '✅ Active' : '❌ Inactive'}`);
	});
}

module.exports = app; 