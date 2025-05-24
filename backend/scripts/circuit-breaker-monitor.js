#!/usr/bin/env node

const { 
  getHealthStatus, 
  resetAllCircuitBreakers, 
  forceCloseCircuitBreaker 
} = require('../src/utils/circuitBreaker');
const logger = require('../src/utils/logger');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function displayCircuitBreakerStatus() {
  colorLog('blue', '\n🔄 Circuit Breaker Health Status\n');
  
  const healthStatus = getHealthStatus();
  
  if (Object.keys(healthStatus).length === 0) {
    colorLog('yellow', 'No circuit breakers found.');
    return;
  }

  for (const [name, status] of Object.entries(healthStatus)) {
    const stateColor = status.state === 'closed' ? 'green' : 
                      status.state === 'half-open' ? 'yellow' : 'red';
    
    colorLog(stateColor, `\n📊 ${name}:`);
    console.log(`   State: ${status.state.toUpperCase()}`);
    console.log(`   Success Rate: ${status.stats.successRate}`);
    console.log(`   Failure Rate: ${status.stats.failureRate}`);
    console.log(`   Total Requests: ${status.stats.requests}`);
    console.log(`   Timeouts: ${status.stats.timeouts}`);
    console.log(`   Rejects: ${status.stats.rejects}`);
    console.log(`   Timeout Setting: ${status.config.timeout}ms`);
    console.log(`   Error Threshold: ${status.config.errorThresholdPercentage}%`);
    console.log(`   Reset Timeout: ${status.config.resetTimeout}ms`);
    
    // Provide recommendations
    if (status.state === 'open') {
      colorLog('red', '   ⚠️  RECOMMENDATION: Circuit breaker is OPEN - check database connectivity');
    } else if (status.state === 'half-open') {
      colorLog('yellow', '   ⚠️  RECOMMENDATION: Circuit breaker is testing - monitor closely');
    } else if (parseFloat(status.stats.failureRate) > 10) {
      colorLog('yellow', '   ⚠️  RECOMMENDATION: High failure rate detected - investigate');
    } else {
      colorLog('green', '   ✅ Circuit breaker is healthy');
    }
  }
}

function resetCircuitBreakers() {
  colorLog('cyan', '\n🔄 Resetting all circuit breakers...');
  
  try {
    resetAllCircuitBreakers();
    colorLog('green', '✅ All circuit breakers have been reset to closed state');
    
    logger.info('Circuit breakers manually reset', {
      service: 'circuit-breaker-monitor',
      operation: 'manual-reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    colorLog('red', `❌ Failed to reset circuit breakers: ${error.message}`);
  }
}

function forceCloseSpecificBreaker(name) {
  colorLog('cyan', `\n🔧 Force closing circuit breaker: ${name}...`);
  
  try {
    const success = forceCloseCircuitBreaker(name);
    if (success) {
      colorLog('green', `✅ Circuit breaker ${name} has been force closed`);
      
      logger.info('Circuit breaker manually force closed', {
        service: 'circuit-breaker-monitor',
        operation: 'force-close',
        circuitBreaker: name,
        timestamp: new Date().toISOString()
      });
    } else {
      colorLog('red', `❌ Circuit breaker ${name} not found`);
    }
  } catch (error) {
    colorLog('red', `❌ Failed to force close circuit breaker: ${error.message}`);
  }
}

function showHelp() {
  colorLog('blue', '\n🔧 Circuit Breaker Monitor - Usage:\n');
  console.log('node scripts/circuit-breaker-monitor.js [command]');
  console.log('');
  console.log('Commands:');
  console.log('  status                Show current circuit breaker status');
  console.log('  reset                 Reset all circuit breakers to closed state');
  console.log('  close <name>          Force close a specific circuit breaker');
  console.log('  help                  Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/circuit-breaker-monitor.js status');
  console.log('  node scripts/circuit-breaker-monitor.js reset');
  console.log('  node scripts/circuit-breaker-monitor.js close DatabaseOperations');
}

// Main execution
async function main() {
  const command = process.argv[2];
  const parameter = process.argv[3];

  switch (command) {
    case 'status':
    case undefined:
      displayCircuitBreakerStatus();
      break;
      
    case 'reset':
      resetCircuitBreakers();
      // Show status after reset
      setTimeout(() => {
        displayCircuitBreakerStatus();
      }, 1000);
      break;
      
    case 'close':
      if (!parameter) {
        colorLog('red', '❌ Please specify circuit breaker name');
        colorLog('yellow', 'Usage: node scripts/circuit-breaker-monitor.js close <name>');
        process.exit(1);
      }
      forceCloseSpecificBreaker(parameter);
      // Show status after closing
      setTimeout(() => {
        displayCircuitBreakerStatus();
      }, 1000);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      colorLog('red', `❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  colorLog('red', `❌ Unhandled error: ${error.message}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  colorLog('yellow', '\n👋 Circuit breaker monitor shutting down...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  colorLog('red', `❌ Script failed: ${error.message}`);
  process.exit(1);
}); 