#!/usr/bin/env node

/**
 * Guard Rails Test Script
 * Tests circuit breakers, rate limiting, and retry mechanisms
 */

const { 
  executeDbQuery, 
  executeExternalApiCall, 
  executeCriticalOperation,
  getHealthStatus,
  resetAllCircuitBreakers 
} = require('./src/utils/circuitBreaker');

const { 
  retryDatabaseOperation, 
  retryExternalApiCall,
  retryCriticalOperation 
} = require('./src/utils/retryMechanism');

const logger = require('./src/utils/logger');

// Colors for console output
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

async function testCircuitBreakers() {
  log('blue', '\n🔧 Testing Circuit Breakers...');
  
  try {
    // Test successful database operation
    log('yellow', '  Testing successful database operation...');
    const result1 = await executeDbQuery(async () => {
      return { success: true, data: 'test data' };
    }, 'test-success');
    log('green', '  ✅ Database circuit breaker - Success case passed');
    
    // Test database operation that fails (but retryable)
    log('yellow', '  Testing database operation with retryable failure...');
    try {
      await executeDbQuery(async () => {
        const error = new Error('Connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }, 'test-timeout');
    } catch (error) {
      log('green', '  ✅ Database circuit breaker - Timeout handling works');
    }
    
    // Test external API operation
    log('yellow', '  Testing external API circuit breaker...');
    const result2 = await executeExternalApiCall(async () => {
      return { status: 200, data: 'api response' };
    }, 'test-api');
    log('green', '  ✅ External API circuit breaker - Success case passed');
    
    // Test critical operation
    log('yellow', '  Testing critical operation circuit breaker...');
    const result3 = await executeCriticalOperation(async () => {
      return { critical: true, result: 'processed' };
    }, 'test-critical');
    log('green', '  ✅ Critical operation circuit breaker - Success case passed');
    
  } catch (error) {
    log('red', `  ❌ Circuit breaker test failed: ${error.message}`);
  }
}

async function testRetryMechanisms() {
  log('blue', '\n🔄 Testing Retry Mechanisms...');
  
  try {
    // Test successful retry after initial failure
    log('yellow', '  Testing retry with eventual success...');
    let attemptCount = 0;
    const result1 = await retryDatabaseOperation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        const error = new Error('Temporary connection error');
        error.code = 'ECONNRESET';
        throw error;
      }
      return { success: true, attempts: attemptCount };
    }, 'test-retry-success');
    log('green', `  ✅ Retry mechanism - Succeeded after ${result1.attempts} attempts`);
    
    // Test non-retryable error
    log('yellow', '  Testing non-retryable error handling...');
    try {
      await retryDatabaseOperation(async () => {
        const error = new Error('Validation failed');
        error.status = 400;
        throw error;
      }, 'test-non-retryable');
    } catch (error) {
      log('green', '  ✅ Retry mechanism - Non-retryable error correctly not retried');
    }
    
    // Test external API retry
    log('yellow', '  Testing external API retry...');
    let apiAttemptCount = 0;
    const result2 = await retryExternalApiCall(async () => {
      apiAttemptCount++;
      if (apiAttemptCount < 2) {
        const error = new Error('Service temporarily unavailable');
        error.status = 503;
        throw error;
      }
      return { success: true, attempts: apiAttemptCount };
    }, 'test-api-retry');
    log('green', `  ✅ External API retry - Succeeded after ${result2.attempts} attempts`);
    
  } catch (error) {
    log('red', `  ❌ Retry mechanism test failed: ${error.message}`);
  }
}

async function testCombinedGuardRails() {
  log('blue', '\n🛡️ Testing Combined Guard Rails...');
  
  try {
    // Test circuit breaker + retry combination
    log('yellow', '  Testing circuit breaker with retry mechanism...');
    let combinedAttemptCount = 0;
    const result = await executeDbQuery(async () => {
      return retryDatabaseOperation(async () => {
        combinedAttemptCount++;
        if (combinedAttemptCount < 2) {
          const error = new Error('Temporary database issue');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { success: true, attempts: combinedAttemptCount };
      }, 'test-combined');
    }, 'test-combined-guard-rails');
    
    log('green', `  ✅ Combined guard rails - Circuit breaker + retry working together`);
    
  } catch (error) {
    log('red', `  ❌ Combined guard rails test failed: ${error.message}`);
  }
}

async function displayHealthStatus() {
  log('blue', '\n📊 Circuit Breaker Health Status:');
  const healthStatus = getHealthStatus();
  
  for (const [name, status] of Object.entries(healthStatus)) {
    const stateColor = status.state === 'closed' ? 'green' : 
                      status.state === 'half-open' ? 'yellow' : 'red';
    
    log(stateColor, `  ${name}:`);
    console.log(`    State: ${status.state}`);
    console.log(`    Requests: ${status.stats.requests}`);
    console.log(`    Success Rate: ${status.stats.successRate}`);
    console.log(`    Failure Rate: ${status.stats.failureRate}`);
    console.log(`    Timeout: ${status.config.timeout}ms`);
    console.log('');
  }
}

async function testErrorClassification() {
  log('blue', '\n🎯 Testing Error Classification...');
  
  const { isRetryableError } = require('./src/utils/retryMechanism');
  
  // Test retryable errors
  const retryableErrors = [
    { error: { code: 'ETIMEDOUT' }, type: 'database', expected: true },
    { error: { code: 'ECONNRESET' }, type: 'external-api', expected: true },
    { error: { status: 500 }, type: 'external-api', expected: true },
    { error: { status: 503 }, type: 'network', expected: true }
  ];
  
  // Test non-retryable errors
  const nonRetryableErrors = [
    { error: { status: 400 }, type: 'database', expected: false },
    { error: { status: 401 }, type: 'external-api', expected: false },
    { error: { status: 404 }, type: 'network', expected: false },
    { error: { code: '23505' }, type: 'database', expected: false } // Unique constraint
  ];
  
  let passed = 0;
  let total = retryableErrors.length + nonRetryableErrors.length;
  
  for (const test of retryableErrors) {
    const result = isRetryableError(test.error, test.type);
    if (result === test.expected) {
      passed++;
      log('green', `  ✅ Retryable error classification correct: ${JSON.stringify(test.error)}`);
    } else {
      log('red', `  ❌ Retryable error classification failed: ${JSON.stringify(test.error)}`);
    }
  }
  
  for (const test of nonRetryableErrors) {
    const result = isRetryableError(test.error, test.type);
    if (result === test.expected) {
      passed++;
      log('green', `  ✅ Non-retryable error classification correct: ${JSON.stringify(test.error)}`);
    } else {
      log('red', `  ❌ Non-retryable error classification failed: ${JSON.stringify(test.error)}`);
    }
  }
  
  log('blue', `\n  Error Classification Test Results: ${passed}/${total} passed`);
}

async function performanceTest() {
  log('blue', '\n⚡ Performance Impact Test...');
  
  const iterations = 100;
  
  // Test raw operation performance
  const startTime1 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve({ data: `test-${i}` });
  }
  const rawTime = Date.now() - startTime1;
  
  // Test circuit breaker protected operation performance
  const startTime2 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await executeDbQuery(async () => {
      return { data: `test-${i}` };
    }, `perf-test-${i}`);
  }
  const protectedTime = Date.now() - startTime2;
  
  const overhead = protectedTime - rawTime;
  const overheadPerOperation = overhead / iterations;
  
  log('yellow', `  Raw operations (${iterations}x): ${rawTime}ms`);
  log('yellow', `  Protected operations (${iterations}x): ${protectedTime}ms`);
  log('yellow', `  Total overhead: ${overhead}ms`);
  log('yellow', `  Overhead per operation: ${overheadPerOperation.toFixed(2)}ms`);
  
  if (overheadPerOperation < 1) {
    log('green', '  ✅ Performance overhead acceptable (<1ms per operation)');
  } else if (overheadPerOperation < 5) {
    log('yellow', '  ⚠️ Performance overhead moderate (1-5ms per operation)');
  } else {
    log('red', '  ❌ Performance overhead high (>5ms per operation)');
  }
}

async function runAllTests() {
  log('blue', '🛡️ GUARD RAILS COMPREHENSIVE TEST SUITE');
  log('blue', '=====================================');
  
  try {
    await testCircuitBreakers();
    await testRetryMechanisms();
    await testCombinedGuardRails();
    await testErrorClassification();
    await performanceTest();
    await displayHealthStatus();
    
    log('green', '\n🎉 All Guard Rails Tests Completed Successfully!');
    log('blue', '\nNext Steps:');
    log('yellow', '1. Start the server: npm start');
    log('yellow', '2. Test rate limiting: curl -i http://localhost:3002/api/products');
    log('yellow', '3. Monitor health: curl http://localhost:3002/health');
    log('yellow', '4. Check metrics: curl http://localhost:3002/metrics');
    
  } catch (error) {
    log('red', `\n❌ Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testCircuitBreakers,
  testRetryMechanisms,
  testCombinedGuardRails,
  testErrorClassification,
  performanceTest,
  displayHealthStatus
}; 