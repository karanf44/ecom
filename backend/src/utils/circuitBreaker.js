const CircuitBreaker = require('opossum');
const logger = require('./logger');

// Circuit breaker configurations for different types of operations
const circuitBreakerConfigs = {
  // Database operations - more lenient for slow queries
  database: {
    timeout: 15000, // Increase to 15 seconds to accommodate slow queries
    errorThresholdPercentage: 60, // More tolerant - open when 60% fail
    resetTimeout: 60000, // Increase to 1 minute reset timeout
    rollingCountTimeout: 30000, // Increase to 30 second rolling window
    rollingCountBuckets: 6, // Reduce buckets for more stable measurements
    name: 'DatabaseCircuitBreaker',
    group: 'database'
  },

  // External API calls
  externalApi: {
    timeout: 10000, // 10 seconds for external APIs
    errorThresholdPercentage: 60, // More tolerance for external APIs
    resetTimeout: 60000, // 1 minute reset timeout
    rollingCountTimeout: 30000, // 30 second rolling window
    rollingCountBuckets: 6,
    name: 'ExternalAPICircuitBreaker',
    group: 'external-api'
  },

  // Critical user operations (auth, checkout)
  critical: {
    timeout: 8000, // Increase to 8 seconds for critical ops
    errorThresholdPercentage: 40, // Slightly more tolerant
    resetTimeout: 30000, // 30 seconds reset
    rollingCountTimeout: 15000, // 15 second window
    rollingCountBuckets: 5,
    name: 'CriticalOperationCircuitBreaker',
    group: 'critical'
  },

  // File operations and less critical services
  fileOps: {
    timeout: 15000, // 15 seconds for file operations
    errorThresholdPercentage: 70,
    resetTimeout: 45000,
    rollingCountTimeout: 20000,
    rollingCountBuckets: 4,
    name: 'FileOperationCircuitBreaker',
    group: 'file-ops'
  }
};

// Global registry to track all circuit breakers
const circuitBreakers = new Map();

// Create a circuit breaker with comprehensive monitoring
function createCircuitBreaker(name, config, action) {
  const options = {
    ...circuitBreakerConfigs[config] || circuitBreakerConfigs.database,
    name: name || 'UnnamedCircuitBreaker'
  };

  const breaker = new CircuitBreaker(action, options);

  // Event listeners for monitoring and logging
  breaker.on('open', () => {
    logger.error('Circuit breaker opened', null, {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      state: 'open',
      timeout: options.timeout,
      errorThresholdPercentage: options.errorThresholdPercentage
    });
  });

  breaker.on('halfOpen', () => {
    logger.warn('Circuit breaker half-open', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      state: 'half-open'
    });
  });

  breaker.on('close', () => {
    logger.info('Circuit breaker closed', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      state: 'closed'
    });
  });

  breaker.on('success', (result) => {
    logger.debug('Circuit breaker success', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      operation: 'success'
    });
  });

  breaker.on('failure', (error) => {
    logger.warn('Circuit breaker failure', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      operation: 'failure',
      error: error.message
    });
  });

  breaker.on('timeout', () => {
    logger.warn('Circuit breaker timeout', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      operation: 'timeout',
      timeoutMs: options.timeout
    });
  });

  breaker.on('reject', () => {
    logger.warn('Circuit breaker rejected request', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      operation: 'reject',
      state: breaker.opened ? 'open' : 'half-open'
    });
  });

  // Fallback function for when circuit is open
  breaker.fallback((error) => {
    logger.warn('Circuit breaker fallback triggered', {
      service: 'circuit-breaker',
      circuitBreaker: options.name,
      group: options.group,
      operation: 'fallback',
      error: error.message
    });

    // Return appropriate fallback based on circuit breaker type
    switch (options.group) {
      case 'database':
        throw new Error('Database temporarily unavailable - please try again later');
      case 'external-api':
        throw new Error('External service temporarily unavailable');
      case 'critical':
        throw new Error('Service temporarily unavailable - please try again in a few moments');
      case 'file-ops':
        throw new Error('File operation temporarily unavailable');
      default:
        throw new Error('Service temporarily unavailable');
    }
  });

  // Register the circuit breaker
  circuitBreakers.set(name || options.name, breaker);

  return breaker;
}

// Database circuit breaker wrapper
const dbCircuitBreaker = createCircuitBreaker(
  'DatabaseOperations',
  'database',
  async (operation) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.performance('database', 'QUERY', duration, 200, {
        service: 'circuit-breaker',
        circuitBreaker: 'DatabaseOperations'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.performance('database', 'QUERY', duration, 500, {
        service: 'circuit-breaker',
        circuitBreaker: 'DatabaseOperations',
        error: error.message
      });
      
      throw error;
    }
  }
);

// External API circuit breaker wrapper
const externalApiCircuitBreaker = createCircuitBreaker(
  'ExternalAPIOperations',
  'externalApi',
  async (operation) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.performance('external-api', 'CALL', duration, 200, {
        service: 'circuit-breaker',
        circuitBreaker: 'ExternalAPIOperations'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.performance('external-api', 'CALL', duration, 500, {
        service: 'circuit-breaker',
        circuitBreaker: 'ExternalAPIOperations',
        error: error.message
      });
      
      throw error;
    }
  }
);

// Critical operations circuit breaker
const criticalCircuitBreaker = createCircuitBreaker(
  'CriticalOperations',
  'critical',
  async (operation) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.performance('critical', 'OPERATION', duration, 200, {
        service: 'circuit-breaker',
        circuitBreaker: 'CriticalOperations'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.performance('critical', 'OPERATION', duration, 500, {
        service: 'circuit-breaker',
        circuitBreaker: 'CriticalOperations',
        error: error.message
      });
      
      throw error;
    }
  }
);

// Utility functions for common operations
const circuitBreakerUtils = {
  // Wrap database queries
  async executeDbQuery(queryFunction, queryName = 'unknown') {
    return dbCircuitBreaker.fire(async () => {
      logger.debug('Executing database query', {
        service: 'circuit-breaker',
        operation: 'database-query',
        queryName
      });
      return await queryFunction();
    });
  },

  // Wrap external API calls
  async executeExternalApiCall(apiFunction, apiName = 'unknown') {
    return externalApiCircuitBreaker.fire(async () => {
      logger.debug('Executing external API call', {
        service: 'circuit-breaker',
        operation: 'external-api-call',
        apiName
      });
      return await apiFunction();
    });
  },

  // Wrap critical operations (auth, checkout)
  async executeCriticalOperation(operationFunction, operationName = 'unknown') {
    return criticalCircuitBreaker.fire(async () => {
      logger.debug('Executing critical operation', {
        service: 'circuit-breaker',
        operation: 'critical-operation',
        operationName
      });
      return await operationFunction();
    });
  },

  // Get health status of all circuit breakers
  getHealthStatus() {
    const status = {};
    
    circuitBreakers.forEach((breaker, name) => {
      const stats = breaker.stats;
      status[name] = {
        state: breaker.opened ? 'open' : (breaker.halfOpen ? 'half-open' : 'closed'),
        stats: {
          requests: stats.requests,
          successes: stats.successes,
          failures: stats.failures,
          rejects: stats.rejects,
          timeouts: stats.timeouts,
          successRate: stats.requests > 0 ? (stats.successes / stats.requests * 100).toFixed(2) + '%' : '0%',
          failureRate: stats.requests > 0 ? (stats.failures / stats.requests * 100).toFixed(2) + '%' : '0%'
        },
        config: {
          timeout: breaker.options.timeout,
          errorThresholdPercentage: breaker.options.errorThresholdPercentage,
          resetTimeout: breaker.options.resetTimeout
        }
      };
    });
    
    return status;
  },

  // Reset all circuit breakers (admin function)
  resetAllCircuitBreakers() {
    logger.info('Resetting all circuit breakers', {
      service: 'circuit-breaker',
      operation: 'reset-all',
      count: circuitBreakers.size
    });
    
    circuitBreakers.forEach((breaker, name) => {
      breaker.close();
      logger.info('Circuit breaker reset', {
        service: 'circuit-breaker',
        circuitBreaker: name,
        operation: 'reset'
      });
    });
  },

  // Force open a specific circuit breaker (for testing/maintenance)
  forceOpenCircuitBreaker(name) {
    const breaker = circuitBreakers.get(name);
    if (breaker) {
      breaker.open();
      logger.warn('Circuit breaker force opened', {
        service: 'circuit-breaker',
        circuitBreaker: name,
        operation: 'force-open'
      });
      return true;
    }
    return false;
  },

  // Force close a specific circuit breaker
  forceCloseCircuitBreaker(name) {
    const breaker = circuitBreakers.get(name);
    if (breaker) {
      breaker.close();
      logger.info('Circuit breaker force closed', {
        service: 'circuit-breaker',
        circuitBreaker: name,
        operation: 'force-close'
      });
      return true;
    }
    return false;
  }
};

// Export circuit breaker utilities
module.exports = {
  createCircuitBreaker,
  dbCircuitBreaker,
  externalApiCircuitBreaker,
  criticalCircuitBreaker,
  circuitBreakerUtils,
  
  // Direct access to main utility functions
  executeDbQuery: circuitBreakerUtils.executeDbQuery,
  executeExternalApiCall: circuitBreakerUtils.executeExternalApiCall,
  executeCriticalOperation: circuitBreakerUtils.executeCriticalOperation,
  getHealthStatus: circuitBreakerUtils.getHealthStatus,
  resetAllCircuitBreakers: circuitBreakerUtils.resetAllCircuitBreakers,
  
  // Configuration
  configs: circuitBreakerConfigs,
  
  // Registry access
  getCircuitBreaker: (name) => circuitBreakers.get(name),
  getAllCircuitBreakers: () => Array.from(circuitBreakers.entries())
}; 