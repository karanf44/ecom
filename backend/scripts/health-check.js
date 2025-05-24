#!/usr/bin/env node

/**
 * Comprehensive Health Check Script
 * Tests all critical endpoints and services for deployment verification
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Environment configurations
const ENVIRONMENTS = {
  dev: {
    baseUrl: process.env.API_URL_DEV || 'https://your-dev-api.execute-api.us-east-1.amazonaws.com/dev',
    timeout: 10000
  },
  staging: {
    baseUrl: process.env.API_URL_STAGING || 'https://your-staging-api.execute-api.us-east-1.amazonaws.com/staging',
    timeout: 15000
  },
  prod: {
    baseUrl: process.env.API_URL_PROD || 'https://your-prod-api.execute-api.us-east-1.amazonaws.com/prod',
    timeout: 5000
  },
  local: {
    baseUrl: 'http://localhost:3003',
    timeout: 5000
  }
};

// Health check test suite
const HEALTH_TESTS = [
  {
    name: 'Basic Health Check',
    path: '/health',
    method: 'GET',
    expectedStatus: 200,
    critical: true,
    timeout: 5000
  },
  {
    name: 'API Root',
    path: '/',
    method: 'GET',
    expectedStatus: 200,
    critical: true,
    timeout: 5000
  },
  {
    name: 'Products Endpoint',
    path: '/api/products',
    method: 'GET',
    expectedStatus: [200, 401], // Might require auth
    critical: false,
    timeout: 10000
  },
  {
    name: 'Auth Endpoint Structure',
    path: '/api/auth/login',
    method: 'POST',
    expectedStatus: [400, 422], // Bad request expected (no body)
    critical: false,
    timeout: 5000
  }
];

class HealthChecker {
  constructor(environment = 'local') {
    this.environment = environment;
    this.config = ENVIRONMENTS[environment];
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}. Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    }
    
    this.results = [];
    this.startTime = Date.now();
  }

  async makeRequest(test) {
    return new Promise((resolve) => {
      const url = new URL(test.path, this.config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: test.method,
        timeout: test.timeout || this.config.timeout,
        headers: {
          'User-Agent': 'HealthChecker/1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const startTime = Date.now();
      
      const req = client.request(requestOptions, (res) => {
        const duration = Date.now() - startTime;
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            ...test,
            status: res.statusCode,
            duration,
            success: Array.isArray(test.expectedStatus) 
              ? test.expectedStatus.includes(res.statusCode)
              : res.statusCode === test.expectedStatus,
            response: data,
            error: null
          });
        });
      });

      req.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          ...test,
          status: 0,
          duration,
          success: false,
          response: null,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const duration = Date.now() - startTime;
        resolve({
          ...test,
          status: 0,
          duration,
          success: false,
          response: null,
          error: `Request timeout after ${test.timeout || this.config.timeout}ms`
        });
      });

      if (test.method === 'POST') {
        req.write('{}'); // Empty JSON body for POST tests
      }
      
      req.end();
    });
  }

  async runAllTests() {
    console.log(`🏥 Running health checks for ${this.environment.toUpperCase()} environment`);
    console.log(`📍 Base URL: ${this.config.baseUrl}`);
    console.log(`⏱️  Timeout: ${this.config.timeout}ms\n`);

    for (const test of HEALTH_TESTS) {
      console.log(`Testing: ${test.name}...`);
      const result = await this.makeRequest(test);
      this.results.push(result);
      
      const statusIcon = result.success ? '✅' : (result.critical ? '❌' : '⚠️');
      const statusText = result.success ? 'PASS' : 'FAIL';
      const durationText = `${result.duration}ms`;
      
      console.log(`  ${statusIcon} ${statusText} (${result.status}) - ${durationText}`);
      
      if (!result.success && result.error) {
        console.log(`Error: ${result.error}`);
      }
    }
    
    return this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const criticalFailed = this.results.filter(r => !r.success && r.critical).length;
    
    const avgResponseTime = this.results
      .filter(r => r.success)
      .reduce((acc, r) => acc + r.duration, 0) / (passedTests || 1);

    const report = {
      environment: this.environment,
      baseUrl: this.config.baseUrl,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        criticalFailed,
        successRate: Math.round((passedTests / totalTests) * 100),
        avgResponseTime: Math.round(avgResponseTime),
        totalDuration
      },
      status: criticalFailed === 0 ? 'HEALTHY' : 'UNHEALTHY',
      tests: this.results
    };

    this.printReport(report);
    return report;
  }

  printReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH CHECK REPORT');
    console.log('='.repeat(60));
    console.log(`Environment: ${report.environment.toUpperCase()}`);
    console.log(`Status: ${report.status === 'HEALTHY' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
    console.log(`Total Duration: ${report.summary.totalDuration}ms`);
    
    if (report.summary.criticalFailed > 0) {
      console.log(`\n⚠️  Critical Issues: ${report.summary.criticalFailed} critical test(s) failed`);
      console.log('❌ Deployment should NOT proceed');
    } else if (report.summary.failed > 0) {
      console.log(`\n⚠️  Non-critical Issues: ${report.summary.failed} non-critical test(s) failed`);
      console.log('✅ Deployment can proceed with caution');
    } else {
      console.log('\n🎉 All tests passed! System is healthy');
      console.log('✅ Deployment can proceed safely');
    }
    
    console.log('='.repeat(60));
  }
}

// CLI execution
async function main() {
  const environment = process.argv[2] || 'local';
  
  try {
    const checker = new HealthChecker(environment);
    const report = await checker.runAllTests();
    
    // Exit with appropriate code for CI/CD
    if (report.summary.criticalFailed > 0) {
      process.exit(1); // Critical failure
    } else if (report.summary.failed > 0) {
      process.exit(2); // Non-critical failures
    } else {
      process.exit(0); // Success
    }
    
  } catch (error) {
    console.error('❌ Health check failed to run:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { HealthChecker, ENVIRONMENTS, HEALTH_TESTS }; 