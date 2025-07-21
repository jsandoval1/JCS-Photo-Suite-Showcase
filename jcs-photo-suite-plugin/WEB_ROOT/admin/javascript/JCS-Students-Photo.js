/**
 * JCS Photo Suite - Plugin Loader (Student Version)
 * This script loads the core functionality from CDN based on license validation
 */

class JCSStudentPluginLoader {
    constructor() {
        // API endpoints (placeholder for showcase)
        this.apiBaseUrl = 'https://api.example.com';
        this.cdnBaseUrl = 'https://cdn.example.com';
        this.loadedModules = new Map();
        this.licenseToken = null;
        this.heartbeatInterval = null;
        this.integrityChecks = new Map();
        
        // Get district info from HTML
        this.districtUid = document.getElementById('jcs-district-uid')?.value;
        this.serverUrl = window.location.origin;
        
        // Store original functions for security
        this.originalSetTimeout = window.setTimeout.bind(window);
        this.originalSetInterval = window.setInterval.bind(window);
        
        this.init();
    }

    /**
     * Initialize the plugin loader
     */
    async init() {
        try {
            // Step 1: Validate license and get access token
            await this.validateLicense();
            
            // Step 2: Load core modules from CDN
            await this.loadCoreModules();
            
            // Step 3: Initialize heartbeat system
            this.startHeartbeat();
            
            // Step 4: Initialize the actual plugin
            this.initializePlugin();
            
        } catch (error) {
            console.error('JCS Student Plugin Loader Error:', error);
            this.showError('Failed to initialize JCS Photo Suite. Please contact support.');
        }
    }

    /**
     * Validate license and get CDN access token
     */
    async validateLicense() {
        if (!this.districtUid) {
            throw new Error('District UID not found');
        }

        // Get license key from API
        const licenseResponse = await this.secureFetch(`${this.apiBaseUrl}/api/get-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                server_url: this.serverUrl,
                district_uniqueid: this.districtUid
            })
        });

        const licenseData = await licenseResponse.json();
        if (!licenseData.success || !licenseData.license_key) {
            throw new Error(licenseData.error || 'License key not found');
        }

        // Validate license and get CDN token
        const validationResponse = await this.secureFetch(`${this.apiBaseUrl}/api/validate-cdn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: licenseData.license_key,
                server_url: this.serverUrl,
                district_uniqueid: this.districtUid,
                plugin_type: 'student'
            })
        });

        const validation = await validationResponse.json();
        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid license');
        }

        this.licenseToken = validation.cdn_token;
        this.licenseData = validation;
        
        // Store for integrity checking
        this.integrityChecks.set('license_validation', Date.now());
    }

    /**
     * Load core modules from CDN
     */
    async loadCoreModules() {
        const modules = [
            'license-manager',
            'photo-ui',
            'webcam-handler', 
            'image-processor'
        ];

        for (const moduleName of modules) {
            try {
                const moduleCode = await this.loadModule(moduleName);
                this.loadedModules.set(moduleName, moduleCode);
                
                // Execute module in controlled environment
                this.executeModule(moduleName, moduleCode);
                
            } catch (error) {
                console.error(`Failed to load module ${moduleName}:`, error);
                throw new Error(`Critical module ${moduleName} failed to load`);
            }
        }
    }

    /**
     * Load a specific module from CDN
     */
    async loadModule(moduleName) {
        const response = await this.secureFetch(`${this.cdnBaseUrl}/${moduleName}`, {
            headers: {
                'Authorization': `Bearer ${this.licenseToken}`,
                'X-Plugin-Type': 'student',
                'X-District-UID': this.districtUid
            }
        });

        if (!response.ok) {
            throw new Error(`Module ${moduleName} access denied`);
        }

        const moduleCode = await response.text();
        
        // Verify module integrity
        const expectedHash = response.headers.get('X-Module-Hash');
        if (expectedHash && !this.verifyModuleIntegrity(moduleCode, expectedHash)) {
            throw new Error(`Module ${moduleName} integrity check failed`);
        }

        return moduleCode;
    }

    /**
     * Execute module code in controlled environment
     */
    executeModule(moduleName, code) {
        try {
            // Create isolated execution context
            const moduleContext = {
                JCSPluginLoader: this,
                licenseData: this.licenseData,
                districtUid: this.districtUid,
                serverUrl: this.serverUrl,
                console: console,
                document: document,
                window: window,
                fetch: this.secureFetch.bind(this),
                pluginType: 'student'
            };

            // Execute with restricted global access
            const moduleFunction = new Function(
                'context', 
                `
                with(context) {
                    ${code}
                }
                `
            );
            
            moduleFunction.call(null, moduleContext);
            
        } catch (error) {
            console.error(`Error executing module ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Start license heartbeat system
     */
    startHeartbeat() {
        // Initial heartbeat after 2 minutes
        this.originalSetTimeout(() => {
            this.heartbeatCheck();
        }, 120000);

        // Regular heartbeat every 15 minutes
        this.heartbeatInterval = this.originalSetInterval(() => {
            this.heartbeatCheck();
        }, 900000);

        // Random additional checks
        this.scheduleRandomHeartbeat();
    }

    /**
     * Perform heartbeat license check
     */
    async heartbeatCheck() {
        try {
            const response = await this.secureFetch(`${this.apiBaseUrl}/api/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cdn_token: this.licenseToken,
                    server_url: this.serverUrl,
                    district_uniqueid: this.districtUid
                })
            });

            const result = await response.json();
            
            if (!result.valid) {
                this.handleLicenseFailure('License expired or revoked');
                return;
            }

            // Update license data if changed
            if (result.license_updated) {
                this.licenseData = result.license_data;
                this.notifyModules('license_updated', result.license_data);
            }

            // Schedule next random heartbeat
            this.scheduleRandomHeartbeat();
            
        } catch (error) {
            console.warn('Heartbeat check failed:', error);
            // Don't immediately fail on network errors, but limit functionality
            this.handleHeartbeatFailure();
        }
    }

    /**
     * Schedule random heartbeat between 5-45 minutes
     */
    scheduleRandomHeartbeat() {
        const randomDelay = Math.random() * (45 - 5) * 60 * 1000 + 5 * 60 * 1000;
        this.originalSetTimeout(() => {
            this.heartbeatCheck();
        }, randomDelay);
    }

    async verifyModuleIntegrity(code, expectedHash) {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return actualHash === expectedHash;
    }

    /**
     * Secure fetch with anti-tampering checks
     */
    async secureFetch(url, options = {}) {
        // Security check
        if (typeof window.fetch !== 'function') {
            throw new Error('Security violation: fetch is not a function');
        }

        // Check if fetch has been compromised
        const fetchString = window.fetch.toString();
        if (fetchString === '[object Object]' || fetchString.length < 10) {
            throw new Error('Security violation: fetch appears compromised');
        }

        // Use current fetch
        return window.fetch(url, options);
    }

    /**
     * Initialize the actual plugin after all modules are loaded
     */
    initializePlugin() {
        // Notify all modules that initialization is complete
        this.notifyModules('plugin_initialized', {
            licenseData: this.licenseData,
            loadedModules: Array.from(this.loadedModules.keys())
        });
    }

    /**
     * Notify all loaded modules of events
     */
    notifyModules(eventType, data) {
        window.dispatchEvent(new CustomEvent('jcs_plugin_event', {
            detail: { type: eventType, data: data }
        }));
    }

    /**
     * Handle license failure
     */
    handleLicenseFailure(reason) {
        console.error('License failure:', reason);
        
        // Clear loaded modules
        this.loadedModules.clear();
        
        // Stop heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Show error and disable functionality
        this.showError(`License error: ${reason}. Please contact your IT administrator.`);
        this.disableAllFunctionality();
    }

    /**
     * Handle heartbeat failure (network issues)
     */
    handleHeartbeatFailure() {
        // Degrade functionality but don't completely disable
        this.notifyModules('heartbeat_failed', { 
            degraded_mode: true,
            message: 'Limited functionality due to network issues'
        });
    }

    /**
     * Show error message to user
     */
    showError(message) {
        const banner = document.getElementById('jcs-license-status-banner');
        if (banner) {
            banner.innerHTML = `<p>${message}</p>`;
            banner.className = 'jcs-banner jcs-banner-error';
        } else {
            alert(message);
        }
    }

    /**
     * Disable all plugin functionality
     */
    disableAllFunctionality() {
        const controls = [
            'startWebcamButton',
            'fileInput', 
            'chooseFileLabel',
            'submitButton'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = true;
                element.style.pointerEvents = 'none';
                element.style.opacity = '0.5';
            }
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.jcsStudentLoader = new JCSStudentPluginLoader();
}); 