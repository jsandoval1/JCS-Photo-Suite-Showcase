#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class CDNPerformanceMonitor {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.results = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    async testCDNValidation() {
        const startTime = Date.now();
        
        // Use predefined test license keys that should exist in database
        const testLicenses = [
            {
                license_key: "LK-TEST-DISTRICT001",
                server_url: "https://test001.powerschool.com", 
                district_uniqueid: "district001"
            },
            {
                license_key: "LK-TEST-DISTRICT002",
                server_url: "https://test002.powerschool.com",
                district_uniqueid: "district002"
            }
        ];
        
        const randomLicense = testLicenses[Math.floor(Math.random() * testLicenses.length)];
        
        try {
            const response = await axios.post(`${this.baseURL}/api/validate-cdn`, {
                license_key: randomLicense.license_key,
                server_url: randomLicense.server_url,
                district_uniqueid: randomLicense.district_uniqueid,
                plugin_type: "staff"
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            return {
                success: true,
                responseTime,
                status: response.status,
                hasToken: !!response.data.cdn_token,
                cdn_token: response.data.cdn_token,
                districtUID: randomLicense.district_uniqueid
            };
        } catch (error) {
            const endTime = Date.now();
            return {
                success: false,
                responseTime: endTime - startTime,
                status: error.response?.status || 0,
                error: error.message
            };
        }
    }

    async testModuleServing(token, districtUID = 'district001') {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${this.baseURL}/api/cdn/license-manager`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-plugin-type': 'staff',
                    'x-district-uid': districtUID,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            const endTime = Date.now();
            return {
                success: true,
                responseTime: endTime - startTime,
                status: response.status,
                hasContent: response.data.length > 0
            };
        } catch (error) {
            const endTime = Date.now();
            return {
                success: false,
                responseTime: endTime - startTime,
                status: error.response?.status || 0,
                error: error.message
            };
        }
    }

    async runPerformanceTest(iterations = 50) {
        console.log(`🚀 Starting CDN Performance Test (${iterations} iterations)`);
        console.log(`📍 Target: ${this.baseURL}`);
        console.log('=====================================\n');

        let totalValidationTime = 0;
        let totalModuleTime = 0;
        let successfulValidations = 0;
        let successfulModuleRequests = 0;

        for (let i = 1; i <= iterations; i++) {
            process.stdout.write(`\rProgress: ${i}/${iterations} (${Math.round(i/iterations*100)}%)`);

            // Test validation
            const validationResult = await this.testCDNValidation();
            totalValidationTime += validationResult.responseTime;
            
            if (validationResult.success && validationResult.hasToken) {
                successfulValidations++;
                
                // Test module serving with the token and matching district UID
                const moduleResult = await this.testModuleServing(
                    validationResult.cdn_token, 
                    validationResult.districtUID
                );
                totalModuleTime += moduleResult.responseTime;
                
                if (moduleResult.success) {
                    successfulModuleRequests++;
                }
            }

            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n\n📊 Performance Test Results');
        console.log('=====================================');
        console.log(`✅ Successful Validations: ${successfulValidations}/${iterations} (${Math.round(successfulValidations/iterations*100)}%)`);
        console.log(`✅ Successful Module Requests: ${successfulModuleRequests}/${successfulValidations} (${successfulValidations > 0 ? Math.round(successfulModuleRequests/successfulValidations*100) : 0}%)`);
        console.log(`⚡ Average Validation Time: ${Math.round(totalValidationTime/iterations)}ms`);
        console.log(`⚡ Average Module Serving Time: ${successfulModuleRequests > 0 ? Math.round(totalModuleTime/successfulModuleRequests) : 'N/A'}ms`);
        console.log(`🔄 Total Requests: ${iterations * 2}`);

        // Performance benchmarks
        const avgValidationTime = totalValidationTime / iterations;
        const avgModuleTime = successfulModuleRequests > 0 ? totalModuleTime / successfulModuleRequests : 0;

        console.log('\n🎯 Performance Analysis');
        console.log('=====================================');
        
        if (avgValidationTime < 200) {
            console.log('✅ Validation Performance: EXCELLENT (<200ms)');
        } else if (avgValidationTime < 500) {
            console.log('🟡 Validation Performance: GOOD (200-500ms)');
        } else {
            console.log('🔴 Validation Performance: NEEDS IMPROVEMENT (>500ms)');
        }

        if (avgModuleTime > 0) {
            if (avgModuleTime < 100) {
                console.log('✅ Module Serving Performance: EXCELLENT (<100ms)');
            } else if (avgModuleTime < 300) {
                console.log('🟡 Module Serving Performance: GOOD (100-300ms)');
            } else {
                console.log('🔴 Module Serving Performance: NEEDS IMPROVEMENT (>300ms)');
            }
        }

        const successRate = successfulValidations / iterations;
        if (successRate > 0.95) {
            console.log('✅ Success Rate: EXCELLENT (>95%)');
        } else if (successRate > 0.8) {
            console.log('🟡 Success Rate: GOOD (80-95%)');
        } else {
            console.log('🔴 Success Rate: NEEDS IMPROVEMENT (<80%)');
        }

        return {
            iterations,
            successfulValidations,
            successfulModuleRequests,
            avgValidationTime,
            avgModuleTime,
            successRate
        };
    }
}

// Main execution
async function main() {
    const baseURL = process.argv[2] || 'https://9224849e9bb2.ngrok-free.app';
    const iterations = parseInt(process.argv[3]) || 25;

    console.log('🔍 CDN Performance Monitor');
    console.log('===========================\n');

    const monitor = new CDNPerformanceMonitor(baseURL);
    await monitor.runPerformanceTest(iterations);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CDNPerformanceMonitor; 