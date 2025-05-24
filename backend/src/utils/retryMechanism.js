const pRetry = require('p-retry');
const logger = require('./logger');

// Retry configurations for different types of operations
const retryConfigs = {
  // Database operations - quick retries for transient issues
  database: {
    retries: 3,
    factor: 2,
    minTimeout: 1000, // 1 second
    maxTimeout: 5000, // 5 seconds
    randomize: true, // Add jitter
    onFailedAttempt: (error) => {
      logger.warn('Database operation retry attempt failed', {
        service: 'retry-mechanism',
        type: 'database',
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  },

  // External API calls - more patient retries
  externalApi: {
    retries: 5,
    factor: 2,
    minTimeout: 2000, // 2 seconds
    maxTimeout: 30000, // 30 seconds
    randomize: true,
    onFailedAttempt: (error) => {
      logger.warn('External API retry attempt failed', {
        service: 'retry-mechanism',
        type: 'external-api',
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  },

  // Critical operations - conservative retries
  critical: {
    retries: 2,
    factor: 1.5,
    minTimeout: 500, // 500ms
    maxTimeout: 2000, // 2 seconds
    randomize: true,
    onFailedAttempt: (error) => {
      logger.warn('Critical operation retry attempt failed', {
        service: 'retry-mechanism',
        type: 'critical',
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  },

  // File operations - aggressive retries for I/O
  fileOps: {
    retries: 4,
    factor: 2,
    minTimeout: 1500, // 1.5 seconds
    maxTimeout: 10000, // 10 seconds
    randomize: true,
    onFailedAttempt: (error) => {
      logger.warn('File operation retry attempt failed', {
        service: 'retry-mechanism',
        type: 'file-ops',
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  },

  // Network operations - balanced approach
  network: {
    retries: 4,
    factor: 2,
    minTimeout: 1000, // 1 second
    maxTimeout: 8000, // 8 seconds
    randomize: true,
    onFailedAttempt: (error) => {
      logger.warn('Network operation retry attempt failed', {
        service: 'retry-mechanism',
        type: 'network',
        attempt: error.attemptNumber,
        retriesLeft: error.retriesLeft,
        error: error.message
      });
    }
  }
};

// Error classification for retry decisions
const isRetryableError = (error, type = 'default') => {
  // Don't retry these error types
  const nonRetryableErrors = [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'BadRequestError',
    'NotFoundError',
    'ConflictError',
    'UnprocessableEntityError'
  ];

  // Don't retry based on HTTP status codes
  const nonRetryableStatusCodes = [400, 401, 403, 404, 409, 422];

  // Check error type/name
  if (nonRetryableErrors.includes(error.name) || nonRetryableErrors.includes(error.constructor.name)) {
    return false;
  }

  // Check HTTP status codes
  if (error.status && nonRetryableStatusCodes.includes(error.status)) {
    return false;
  }

  if (error.response && nonRetryableStatusCodes.includes(error.response.status)) {
    return false;
  }

  // Type-specific retry logic
  switch (type) {
    case 'database':
      // Retry database connection issues, timeouts, but not constraint violations
      if (error.code === '23505' || error.code === '23503') { // Unique/foreign key violations
        return false;
      }
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code) ||
             error.message.includes('timeout') ||
             error.message.includes('connection');

    case 'external-api':
      // Retry on network issues and 5xx errors
      return error.code === 'ECONNRESET' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND' ||
             (error.status >= 500 && error.status < 600);

    case 'critical':
      // More conservative - only retry clear network/timeout issues
      return error.code === 'ETIMEDOUT' ||
             error.message.includes('timeout');

    case 'file-ops':
      // Retry file system issues
      return ['ENOENT', 'EACCES', 'EMFILE', 'ENFILE', 'EAGAIN'].includes(error.code);

    default:
      // Default retry logic for network and timeout issues
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code) ||
             (error.status >= 500 && error.status < 600);
  }
};

// Main retry function with comprehensive logging
async function retryOperation(operation, type = 'default', customConfig = {}) {
  const config = { ...retryConfigs[type] || retryConfigs.database, ...customConfig };
  const operationName = operation.name || 'unknown';
  
  logger.debug('Starting retry operation', {
    service: 'retry-mechanism',
    operation: operationName,
    type,
    config: {
      retries: config.retries,
      minTimeout: config.minTimeout,
      maxTimeout: config.maxTimeout
    }
  });

  const startTime = Date.now();
  let lastError = null;

  try {
    const result = await pRetry(async (attemptNumber) => {
      try {
        logger.debug('Retry attempt started', {
          service: 'retry-mechanism',
          operation: operationName,
          type,
          attempt: attemptNumber
        });

        const result = await operation();
        
        if (attemptNumber > 1) {
          logger.info('Retry operation succeeded', {
            service: 'retry-mechanism',
            operation: operationName,
            type,
            attempt: attemptNumber,
            totalDuration: Date.now() - startTime
          });
        }

        return result;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!isRetryableError(error, type)) {
          logger.warn('Non-retryable error encountered', {
            service: 'retry-mechanism',
            operation: operationName,
            type,
            attempt: attemptNumber,
            error: error.message,
            errorType: error.name || error.constructor.name
          });
          
          // Abort retries for non-retryable errors
          throw new pRetry.AbortError(error);
        }

        logger.warn('Retryable error encountered', {
          service: 'retry-mechanism',
          operation: operationName,
          type,
          attempt: attemptNumber,
          error: error.message,
          errorCode: error.code,
          errorStatus: error.status
        });

        throw error;
      }
    }, {
      ...config,
      onFailedAttempt: (error) => {
        // Call the original onFailedAttempt if it exists
        if (config.onFailedAttempt) {
          config.onFailedAttempt(error);
        }
        
        // Additional logging
        logger.warn('Retry attempt failed', {
          service: 'retry-mechanism',
          operation: operationName,
          type,
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          nextRetryIn: error.retriesLeft > 0 ? `${error.attemptNumber * config.minTimeout}ms` : 'none',
          error: error.message
        });
      }
    });

    const totalDuration = Date.now() - startTime;
    logger.debug('Retry operation completed successfully', {
      service: 'retry-mechanism',
      operation: operationName,
      type,
      totalDuration
    });

    return result;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    logger.error('Retry operation failed after all attempts', lastError, {
      service: 'retry-mechanism',
      operation: operationName,
      type,
      totalAttempts: config.retries + 1,
      totalDuration,
      finalError: error.message
    });

    // Re-throw the original error if it was aborted
    if (error instanceof pRetry.AbortError) {
      throw error.originalError;
    }

    throw error;
  }
}

// Specialized retry functions for different operation types
const retryUtils = {
  // Database operations with circuit breaker integration
  async retryDatabaseOperation(operation, operationName = 'database-operation') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'database');
  },

  // External API calls
  async retryExternalApiCall(operation, operationName = 'api-call') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'externalApi');
  },

  // Critical operations (auth, checkout)
  async retryCriticalOperation(operation, operationName = 'critical-operation') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'critical');
  },

  // File operations
  async retryFileOperation(operation, operationName = 'file-operation') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'fileOps');
  },

  // Network operations
  async retryNetworkOperation(operation, operationName = 'network-operation') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'network');
  },

  // Custom retry with specific configuration
  async retryWithCustomConfig(operation, customConfig, operationName = 'custom-operation') {
    const namedOperation = Object.defineProperty(operation, 'name', { value: operationName });
    return retryOperation(namedOperation, 'default', customConfig);
  }
};

// Enhanced retry wrapper that combines with circuit breaker
const createRetryableOperation = (operation, type = 'default', options = {}) => {
  const { useCircuitBreaker = false, circuitBreakerType = 'database', customRetryConfig = {} } = options;
  
  return async (...args) => {
    const wrappedOperation = async () => {
      if (useCircuitBreaker) {
        const { executeDbQuery, executeExternalApiCall, executeCriticalOperation } = require('./circuitBreaker');
        
        switch (circuitBreakerType) {
          case 'database':
            return executeDbQuery(() => operation(...args), operation.name || 'unknown');
          case 'external-api':
            return executeExternalApiCall(() => operation(...args), operation.name || 'unknown');
          case 'critical':
            return executeCriticalOperation(() => operation(...args), operation.name || 'unknown');
          default:
            return operation(...args);
        }
      } else {
        return operation(...args);
      }
    };

    return retryOperation(wrappedOperation, type, customRetryConfig);
  };
};

// Utility to create exponential backoff delays manually
const calculateBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 30000, factor = 2, jitter = true) => {
  let delay = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay);
  
  if (jitter) {
    // Add ±25% jitter to prevent thundering herd
    const jitterRange = delay * 0.25;
    delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
  }
  
  return Math.floor(delay);
};

// Export retry utilities
module.exports = {
  retryOperation,
  retryUtils,
  createRetryableOperation,
  calculateBackoffDelay,
  isRetryableError,
  
  // Direct access to specialized retry functions
  retryDatabaseOperation: retryUtils.retryDatabaseOperation,
  retryExternalApiCall: retryUtils.retryExternalApiCall,
  retryCriticalOperation: retryUtils.retryCriticalOperation,
  retryFileOperation: retryUtils.retryFileOperation,
  retryNetworkOperation: retryUtils.retryNetworkOperation,
  
  // Configuration access
  configs: retryConfigs,
  
  // Error handling utilities
  AbortError: pRetry.AbortError
}; 