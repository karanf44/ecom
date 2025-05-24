#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Tests for single points of failure in configuration
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Critical environment variables that represent SPOFs
const criticalVars = {
  database: ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'],
  authentication: ['JWT_SECRET'],
  optional: ['REDIS_URL', 'JAEGER_ENDPOINT', 'PROMETHEUS_PORT']
};

function validateEnvironment() {
  log('blue', '🔍 SPOF Environment Variable Analysis');
  log('blue', '====================================');
  
  let hasIssues = false;
  
  // Check critical database variables
  log('yellow', '\n📊 Database Configuration (CRITICAL SPOF):');
  const missingDb = criticalVars.database.filter(key => !process.env[key]);
  
  if (missingDb.length > 0) {
    log('red', `  ❌ Missing database variables: ${missingDb.join(', ')}`);
    log('red', '  ⚠️  This is a CRITICAL SPOF - service will fail to start');
    hasIssues = true;
  } else {
    log('green', '  ✅ All database variables present');
    
    // Check for single host SPOF
    const dbHost = process.env.DB_HOST;
    if (dbHost && !dbHost.includes(',')) {
      log('yellow', `  ⚠️  Single database host detected: ${dbHost}`);
      log('yellow', '  📝 SPOF Risk: No failover if database goes down');
    }
  }
  
  // Check authentication variables
  log('yellow', '\n🔑 Authentication Configuration (CRITICAL SPOF):');
  const missingAuth = criticalVars.authentication.filter(key => !process.env[key]);
  
  if (missingAuth.length > 0) {
    log('red', `  ❌ Missing auth variables: ${missingAuth.join(', ')}`);
    log('red', '  ⚠️  This is a CRITICAL SPOF - authentication will fail');
    hasIssues = true;
  } else {
    log('green', '  ✅ JWT secret present');
    
    // Check for key rotation capability
    const hasRotation = process.env.JWT_SECRET_PREV || process.env.JWT_SECRET_NEXT;
    if (!hasRotation) {
      log('yellow', '  ⚠️  No JWT key rotation detected');
      log('yellow', '  📝 SPOF Risk: Secret rotation requires service restart');
    } else {
      log('green', '  ✅ JWT key rotation capability detected');
    }
  }
  
  // Check optional but recommended variables
  log('yellow', '\n🔧 Optional Services (Lower SPOF Risk):');
  criticalVars.optional.forEach(key => {
    if (process.env[key]) {
      log('green', `  ✅ ${key}: ${process.env[key]}`);
    } else {
      log('yellow', `  ⚠️  ${key}: Not configured (will use fallback)`);
    }
  });
  
  // Summary
  log('blue', '\n📋 SPOF Analysis Summary:');
  
  if (hasIssues) {
    log('red', '❌ CRITICAL SPOFs detected - immediate action required');
    log('red', '⚠️  Service may fail to start or operate correctly');
    process.exit(1);
  } else {
    log('green', '✅ No critical configuration SPOFs detected');
    
    // Check for improvement opportunities
    const improvements = [];
    
    if (process.env.DB_HOST && !process.env.DB_HOST.includes(',')) {
      improvements.push('Add database read replicas');
    }
    
    if (!process.env.JWT_SECRET_PREV) {
      improvements.push('Implement JWT key rotation');
    }
    
    if (!process.env.REDIS_URL) {
      improvements.push('Add Redis for distributed rate limiting');
    }
    
    if (improvements.length > 0) {
      log('yellow', '\n🎯 Recommended SPOF Improvements:');
      improvements.forEach(improvement => {
        log('yellow', `  • ${improvement}`);
      });
    } else {
      log('green', '🎉 Configuration is well optimized against SPOFs!');
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  try {
    validateEnvironment();
  } catch (error) {
    log('red', `\n❌ Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

module.exports = { validateEnvironment }; 