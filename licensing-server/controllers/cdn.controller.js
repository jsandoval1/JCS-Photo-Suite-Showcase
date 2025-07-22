const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp'); // For image processing 
const jwt = require('jsonwebtoken'); // For CDN token generation and validation
const pool = require('../config/db');

// Import existing license validation and usage logic
const pluginValidation = require('./plugin-validation.controller');
const pluginUsage = require('./plugin-usage.controller');

class CDNController {
    constructor() {
        this.cdnModulesPath = path.join(__dirname, '../cdn');
        this.activeTokens = new Set(); // Track active CDN tokens
        
        // Performance optimizations
        this.licenseCache = new Map(); // Cache license validations for 5 minutes
        this.moduleCache = new Map(); // Cache module content and hashes
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Token persistence for better reliability
        this.tokenCleanupInterval = null;
        
        // PRIVACY POLICY: This server NEVER stores user photos in any database or filesystem
        // All image processing is done in-memory only and images are immediately returned to client
        
        // Preload and cache all modules on startup
        this.preloadModules();
        
        // Start cache cleanup interval (every 10 minutes)
        this.startCacheCleanup();
        
        // Start token cleanup interval (every hour)
        this.startTokenCleanup();
    }

    /**
     * Start periodic cache cleanup to prevent memory leaks
     */
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 10 * 60 * 1000); // 10 minutes
    }

    /**
     * Remove expired entries from caches
     */
    cleanupExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        
        // Clean license cache
        for (const [key, value] of this.licenseCache.entries()) {
            if (now - value.timestamp >= this.cacheExpiry) {
                this.licenseCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Start token cleanup interval to remove expired tokens
     */
    startTokenCleanup() {
        this.tokenCleanupInterval = setInterval(() => {
            const originalSize = this.activeTokens.size;
            const validTokens = new Set();
            
            // Check each token and keep only valid ones
            for (const token of this.activeTokens) {
                try {
                    jwt.verify(token, process.env.JWT_SECRET);
                    validTokens.add(token);
                } catch (error) {
                    // Token is expired or invalid, don't add to validTokens
                }
            }
            
            this.activeTokens = validTokens;
            const cleanedCount = originalSize - this.activeTokens.size;
            
            if (cleanedCount > 0) {
                console.log(`🧹 Token cleanup: Removed ${cleanedCount} expired tokens, ${this.activeTokens.size} active tokens remaining`);
            }
        }, 60 * 60 * 1000); // Every hour
    }

    /**
     * Get CDN access token - Entry point for plugin initialization
     */
    async getCDNAccess(req, res) {
        try {
            console.log('🔑 CDN ACCESS: Request received', {
                district_uniqueid: req.body.district_uniqueid,
                server_url: req.body.server_url,
                plugin_type: req.body.plugin_type
            });

            const { district_uniqueid, server_url, plugin_type, security_token } = req.body;

            // Validate required fields
            if (!district_uniqueid || !server_url || !plugin_type) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: district_uniqueid, server_url, plugin_type'
                });
            }

            // Basic validation of plugin type
            if (!['staff', 'student'].includes(plugin_type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid plugin_type. Must be "staff" or "student"'
                });
            }

            // Generate CDN token
            const token = this.generateCDNToken({
                district_uniqueid,
                plugin_type,
                server_url
            });
            
            console.log('✅ CDN ACCESS: Token generated successfully', {
                district_uniqueid,
                plugin_type,
                tokenPrefix: token.substring(0, 20) + '...'
            });

            res.json({
                success: true,
                token: token,
                message: 'CDN access granted'
            });

        } catch (error) {
            console.error('❌ CDN ACCESS: Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Preload and cache all CDN modules for better performance
     */
    async preloadModules() {
        try {
            const allowedModules = ['license-manager', 'photo-handler'];
            
            for (const module of allowedModules) {
                const modulePath = path.join(this.cdnModulesPath, `${module}.js`);
                try {
                    const moduleContent = await fs.readFile(modulePath, 'utf8');
                    const moduleHash = crypto.createHash('sha256').update(moduleContent).digest('hex');
                    
                    this.moduleCache.set(module, {
                        content: moduleContent,
                        hash: moduleHash,
                        lastModified: Date.now()
                    });
                    
                    console.log(`📦 Preloaded CDN module: ${module}`);
                } catch (error) {
                    console.warn(`⚠️  Failed to preload module ${module}:`, error.message);
                }
            }
            
            console.log(`🚀 CDN module cache initialized with ${this.moduleCache.size} modules`);
        } catch (error) {
            console.error('Failed to preload CDN modules:', error);
        }
    }

    /**
     * Check if cached license validation is still valid
     */
    isCacheValid(cacheEntry) {
        return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheExpiry;
    }

    /**
     * Log security events to database
     */
    async logSecurityEvent(license_key, district_name, event_type, event_data, user_id = null, ip_address = null, user_agent = null) {
        try {
            // LOAD TESTING: Uncomment below to skip database logging for demo licenses
            // if (license_key && license_key.startsWith('LK-DEMO-')) {
            //     console.log(`🔍 Load Test Event: ${event_type} for ${district_name || 'unknown'} with ${license_key}`);
            //     return; // Skip database insert for test data
            // }

            await pool.query(`
                INSERT INTO security_events (license_key, district_name, user_id, event_type, event_data, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [license_key, district_name, user_id, event_type, event_data, ip_address, user_agent]);
        } catch (error) {
            // More resilient error handling - don't let logging failures break the request
            console.warn(`⚠️  Security logging failed for ${license_key}: ${error.message}`);
            
            // Try to log without license_key constraint if it's a foreign key error
            if (error.code === '23503' && error.constraint === 'security_events_license_key_fkey') {
                try {
                    await pool.query(`
                        INSERT INTO security_events (license_key, district_name, user_id, event_type, event_data, ip_address, user_agent)
                        VALUES (NULL, $1, $2, $3, $4, $5, $6)
                    `, [district_name, user_id, event_type, event_data, ip_address, user_agent]);
                    console.log(`✅ Security event logged without license_key constraint`);
                } catch (fallbackError) {
                    console.error('Even fallback security logging failed:', fallbackError.message);
                }
            }
        }
    }

    /**
     * Validate license and generate CDN access token
     */
    async validateCDNAccess(req, res) {
        try {
            const { license_key, server_url, district_uniqueid, plugin_type } = req.body;

            if (!license_key || !server_url || !district_uniqueid) {
                return res.status(400).json({
                    valid: false,
                    error: 'Missing required parameters'
                });
            }

            // Validate the license (use your existing license validation logic)
            const licenseValidation = await this.validateLicense(license_key, server_url, district_uniqueid);
            
            if (!licenseValidation.valid) {
                // LOAD TESTING: Uncomment below for helpful test license error messages
                // let errorMessage = licenseValidation.error || 'Invalid license';
                // if (license_key && license_key.startsWith('LK-TEST-')) {
                //     errorMessage = `Test license ${license_key} not found in database. Please run: tools/create-test-licenses.sql`;
                // }
                
                return res.status(403).json({
                    valid: false,
                    error: licenseValidation.error || 'Invalid license',
                    license_key,
                    district_uniqueid
                });
            }

            // Generate CDN access token
            console.log('🔑 Generating CDN access token for:', district_uniqueid);
            const cdnToken = this.generateCDNToken({
                license_key,
                district_uniqueid,
                plugin_type,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });

            // Note: generateCDNToken already adds to activeTokens, but let's be explicit
            this.activeTokens.add(cdnToken);
            console.log('📊 Token added to activeTokens, total count:', this.activeTokens.size);

            // Log CDN access to database
            await this.logSecurityEvent(
                license_key,
                licenseValidation.district_name || district_uniqueid,
                'cdn_access',
                { 
                    plugin_type,
                    server_url,
                    success: true 
                },
                null,
                req.ip,
                req.get('User-Agent')
            );

            console.log(`CDN access granted: ${district_uniqueid} - ${plugin_type}`);

            res.json({
                valid: true,
                cdn_token: cdnToken,
                ...licenseValidation // Include license data
            });

        } catch (error) {
            console.error('CDN validation error:', error);
            res.status(500).json({
                valid: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Serve CDN modules with access control
     */
    async serveModule(req, res) {
        try {
            const { module } = req.params;
            const authHeader = req.headers.authorization;
            const pluginType = req.headers['x-plugin-type'];
            const districtUID = req.headers['x-district-uid'];

            console.log('📦 CDN Module Request:', {
                module,
                pluginType,
                districtUID,
                hasAuthHeader: !!authHeader
            });

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.error('❌ CDN: Missing or invalid authorization header');
                return res.status(401).json({ error: 'Missing or invalid authorization header' });
            }

            const token = authHeader.split(' ')[1];
            console.log('🔑 CDN: Validating token...');
            console.log('📊 CDN: Active tokens count:', this.activeTokens.size);
            
            // Validate CDN token
            if (!this.validateCDNToken(token)) {
                console.error('❌ CDN: Token validation failed');
                return res.status(403).json({ error: 'Invalid or expired CDN token' });
            }

            console.log('✅ CDN: Token validation successful');

            // Validate module name
            const allowedModules = ['license-manager', 'photo-handler'];
            if (!allowedModules.includes(module)) {
                return res.status(404).json({ error: 'Module not found' });
            }

            // Get module from cache (much faster than disk I/O)
            let moduleData = this.moduleCache.get(module);
            
            if (!moduleData) {
                // Fallback to disk if not in cache
                const modulePath = path.join(this.cdnModulesPath, `${module}.js`);
                const moduleContent = await fs.readFile(modulePath, 'utf8');
                const moduleHash = crypto.createHash('sha256').update(moduleContent).digest('hex');
                
                moduleData = {
                    content: moduleContent,
                    hash: moduleHash,
                    lastModified: Date.now()
                };
                
                // Cache for future requests
                this.moduleCache.set(module, moduleData);
            }
            
            const { content: moduleContent, hash: moduleHash } = moduleData;

            // Set security headers
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('X-Module-Hash', moduleHash);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // Log module access
            console.log(`Module served: ${module} to ${districtUID} (${pluginType})`);

            res.send(moduleContent);

        } catch (error) {
            console.error('Module serving error:', error);
            res.status(500).json({ error: 'Failed to serve module' });
        }
    }

    /**
     * Handle license heartbeat checks
     */
    async heartbeat(req, res) {
        try {
            const { cdn_token, server_url, district_uniqueid } = req.body;

            if (!this.validateCDNToken(cdn_token)) {
                return res.status(403).json({
                    valid: false,
                    error: 'Invalid or expired token'
                });
            }

            // Re-validate license
            const tokenData = this.decodeCDNToken(cdn_token);
            const licenseValidation = await this.validateLicense(
                tokenData.license_key, 
                server_url, 
                district_uniqueid
            );

            if (!licenseValidation.valid) {
                this.activeTokens.delete(cdn_token);
                return res.status(403).json({
                    valid: false,
                    error: 'License no longer valid'
                });
            }

            // Log heartbeat to database
            await this.logSecurityEvent(
                tokenData.license_key,
                licenseValidation.district_name || district_uniqueid,
                'heartbeat',
                { 
                    plugin_type: tokenData.plugin_type,
                    server_url,
                    license_status: licenseValidation.valid ? 'active' : 'invalid'
                },
                null,
                req.ip,
                req.get('User-Agent')
            );

            console.log(`Heartbeat: ${district_uniqueid}`);

            res.json({
                valid: true,
                license_updated: false // Set to true if license data changed
            });

        } catch (error) {
            console.error('Heartbeat error:', error);
            res.status(500).json({
                valid: false,
                error: 'Heartbeat failed'
            });
        }
    }

    /**
     * Process image server-side
     * PRIVACY POLICY: Images are processed in memory only and NEVER stored on server or database
     * 
     * SHOWCASE VERSION: Image processing logic has been replaced with placeholder for IP protection.
     * In production, this function handles Sharp image transformations including rotation, 
     * cropping, resizing, and watermarking with advanced algorithms.
     */
    async processImage(req, res) {
        try {
            const { license_key, district_uid, plugin_type } = req.body;
            const cropParams = JSON.parse(req.body.crop_parameters || '{}');

            if (!req.files || !req.files.image) {
                return res.status(400).json({ error: 'No image provided' });
            }

            // PRIVACY: Image exists only in memory - never written to disk or database
            const imageBuffer = req.files.image.data;

            // SHOWCASE: Placeholder for advanced image processing
            // In production, this would use Sharp for:
            // - Rotation based on cropParams.rotation
            // - Resizing to 120x144 with cover fit
            // - Cropping based on crop parameters
            // - Adding invisible watermark metadata
            // - Quality optimization to 95% JPEG

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 100));

            // SHOWCASE: Return placeholder response
            // In production, this would return the processed image buffer
            res.status(200).json({ 
                message: 'Image processing endpoint - showcase version',
                note: 'Production version includes Sharp image transformations',
                processed: true,
                dimensions: { width: 120, height: 144 },
                quality: 95
            });

        } catch (error) {
            console.error('Image processing error:', error);
            res.status(500).json({ error: 'Image processing failed' });
        }
    }

    /**
     * Validate image before processing
     * PRIVACY POLICY: Images are validated in memory only and NEVER stored on server or database
     * 
     * SHOWCASE VERSION: Validation logic has been simplified for IP protection.
     * In production, this includes advanced metadata analysis and security checks.
     */
    async validateImage(req, res) {
        try {
            if (!req.files || !req.files.image) {
                return res.json({
                    valid: false,
                    error: 'No image provided'
                });
            }

            const image = req.files.image;
            const validationRules = JSON.parse(req.body.validation_rules || '{}');

            // Check file size
            if (validationRules.max_size && image.size > validationRules.max_size) {
                return res.json({
                    valid: false,
                    error: 'Image file too large'
                });
            }

            // Check file type
            if (validationRules.allowed_types && 
                !validationRules.allowed_types.includes(image.mimetype)) {
                return res.json({
                    valid: false,
                    error: 'Invalid image type'
                });
            }

            // SHOWCASE: Placeholder for advanced metadata validation
            // In production, this would use Sharp to analyze:
            // - Image dimensions and aspect ratio
            // - Color space and bit depth
            // - EXIF data and security metadata
            // - Potential security threats or malformed data

            // Simulate validation
            const mockMetadata = {
                width: 800,
                height: 600,
                format: 'jpeg',
                size: image.size
            };

            // Check dimensions if specified
            if (validationRules.min_dimensions) {
                const { width: minW, height: minH } = validationRules.min_dimensions;
                if (mockMetadata.width < minW || mockMetadata.height < minH) {
                    return res.json({
                        valid: false,
                        error: 'Image dimensions too small'
                    });
                }
            }

            return res.json({
                valid: true,
                metadata: mockMetadata,
                note: 'Showcase version - production includes advanced Sharp analysis'
            });

        } catch (error) {
            console.error('Image validation error:', error);
            return res.json({
                valid: false,
                error: 'Image validation failed'
            });
        }
    }

    /**
     * Report security violations
     */
    async reportSecurityViolation(req, res) {
        try {
            const { 
                license_key, 
                server_url, 
                district_uniqueid, 
                violation_type, 
                timestamp,
                user_agent,
                additional_data = {}
            } = req.body;

            // LOAD TESTING: Uncomment below for debug logging
            // console.log(`🔍 Security Report Debug:`, {
            //     license_key: license_key || 'undefined',
            //     district_uniqueid: district_uniqueid || 'undefined', 
            //     violation_type: violation_type || 'undefined',
            //     body_keys: Object.keys(req.body)
            // });

            // Log security violation to database
            await this.logSecurityEvent(
                license_key,
                district_uniqueid,
                'security_violation',
                { 
                    violation_type,
                    server_url,
                    timestamp,
                    additional_data
                },
                null,
                req.ip,
                user_agent || req.get('User-Agent')
            );

            console.warn(`Security violation: ${violation_type} from ${district_uniqueid}`);

            res.json({ reported: true });

        } catch (error) {
            console.error('Security reporting error:', error);
            res.status(500).json({ error: 'Failed to report violation' });
        }
    }

    /**
     * Validate webcam access
     */
    async validateWebcamAccess(req, res) {
        try {
            const { license_key, district_uid } = req.body;

            // Check for excessive security violations
            const violations = await this.getSecurityViolations(district_uid);

            if (violations.length > 5) {
                return res.json({
                    allowed: false,
                    reason: 'Too many security violations'
                });
            }

            res.json({ allowed: true });

        } catch (error) {
            console.error('Webcam validation error:', error);
            res.status(500).json({ allowed: false, reason: 'Validation failed' });
        }
    }

    /**
     * Log webcam usage
     */
    async logWebcamUsage(req, res) {
        try {
            const { license_key, district_uid, action, timestamp } = req.body;

            console.log(`Webcam ${action}: ${district_uid} at ${new Date(timestamp)}`);

            // In production, store in database for analytics
            
            res.json({ logged: true });

        } catch (error) {
            console.error('Webcam logging error:', error);
            res.status(500).json({ logged: false });
        }
    }

    // Helper Methods

    generateCDNToken(data) {
        console.log('🔑 Generating CDN token for:', data.district_uniqueid);
        
        const token = jwt.sign(data, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });
        
        // Add token to active tokens set
        this.activeTokens.add(token);
        
        console.log('✅ CDN token generated and stored in activeTokens');
        console.log('📊 Active tokens count:', this.activeTokens.size);
        
        return token;
    }

    validateCDNToken(token) {
        try {
            // JWT.verify will throw if expired, so we don't need to check manually
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            console.log('🔍 CDN Token Debug:', {
                tokenExists: this.activeTokens.has(token),
                activeTokensSize: this.activeTokens.size,
                tokenPrefix: token.substring(0, 20) + '...',
                decodedDistrictUid: decoded.district_uniqueid
            });
            
            // Check if token is in our active tokens set
            let isValid = this.activeTokens.has(token);
            
            // FALLBACK: If token not in activeTokens but JWT is valid, re-add it
            // This handles cases where the server restarted or activeTokens was cleared
            if (!isValid && decoded && decoded.district_uniqueid) {
                console.log('🔄 CDN: Token not in activeTokens but JWT valid, re-adding token');
                this.activeTokens.add(token);
                isValid = true;
            }
            
            if (!isValid) {
                console.error('❌ Token not found in activeTokens:', {
                    tokenPrefix: token.substring(0, 20) + '...',
                    activeTokensArray: Array.from(this.activeTokens).map(t => t.substring(0, 20) + '...')
                });
            }
            
            return isValid;
        } catch (error) {
            console.warn('CDN token validation failed:', error.message);
            return false;
        }
    }

    decodeCDNToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return null;
        }
    }

    async validateLicense(license_key, server_url, district_uniqueid) {
        // Check cache first for better performance
        const cacheKey = `${license_key}:${district_uniqueid}`;
        const cachedResult = this.licenseCache.get(cacheKey);
        
        if (this.isCacheValid(cachedResult)) {
            console.log(`📋 Cache hit for license: ${district_uniqueid}`);
            return cachedResult.data;
        }

        // Use existing license validation logic - no more placeholders!
        try {
            // Create a mock request object that matches the existing validation controller
            const mockReq = {
                body: {
                    license_key,
                    server_url,
                    district_uniqueid
                }
            };
            
            // Create a mock response object to capture the result
            let result = null;
            const mockRes = {
                json: (data) => { result = data; },
                status: (code) => ({
                    json: (data) => { result = { ...data, statusCode: code }; }
                })
            };
            
            // Call existing validation logic
            await pluginValidation.validate(mockReq, mockRes);
            
            // Format the result
            let validationResult;
            if (result && result.valid) {
                validationResult = {
                    valid: true,
                    plan_tier: result.plan_tier,
                    used_staff_uploads: result.used_staff_uploads,
                    max_staff_uploads: result.max_staff_uploads,
                    used_student_uploads: result.used_student_uploads,
                    max_student_uploads: result.max_student_uploads,
                    license_key: result.license_key,
                    expiry_date: result.expiry_date,
                    is_active: result.is_active,
                    district_name: result.district_name
                };
            } else {
                validationResult = {
                    valid: false,
                    error: result?.error || 'License validation failed'
                };
            }
            
            // Cache the result for future requests (only cache valid licenses)
            if (validationResult.valid) {
                this.licenseCache.set(cacheKey, {
                    data: validationResult,
                    timestamp: Date.now()
                });
                console.log(`💾 Cached license validation for: ${district_uniqueid}`);
            }
            
            return validationResult;
            
        } catch (error) {
            console.error('CDN license validation error:', error);
            return {
                valid: false,
                error: 'License validation failed'
            };
        }
    }

    async getSecurityViolations(district_uid) {
        try {
            const { rows } = await pool.query(`
                SELECT event_data FROM security_events 
                WHERE district_name = $1 AND event_type = 'security_violation'
                AND created_at > NOW() - INTERVAL '24 hours'
            `, [district_uid]);
            
            return rows.map(row => row.event_data);
        } catch (error) {
            console.error('Failed to get security violations:', error);
            return [];
        }
    }

    // Placeholder method for usage validation (usage increment handled by existing /api/usage endpoint)
    async validateUsage(req, res) {
        res.json({ valid: true, usage_updated: false });
    }
}

console.log('🏗️ Creating CDN Controller instance');
const cdnController = new CDNController();
console.log('✅ CDN Controller instance created');

// Export individual methods for router
module.exports = {
    getCDNAccess: (req, res) => cdnController.getCDNAccess(req, res),
    validateCDNAccess: (req, res) => cdnController.validateCDNAccess(req, res),
    serveModule: (req, res) => cdnController.serveModule(req, res),
    heartbeat: (req, res) => cdnController.heartbeat(req, res),
    validateUsage: (req, res) => cdnController.validateUsage(req, res),
    processImage: (req, res) => cdnController.processImage(req, res),
    validateImage: (req, res) => cdnController.validateImage(req, res),
    reportSecurityViolation: (req, res) => cdnController.reportSecurityViolation(req, res),
    validateWebcamAccess: (req, res) => cdnController.validateWebcamAccess(req, res),
    logWebcamUsage: (req, res) => cdnController.logWebcamUsage(req, res)
}; 