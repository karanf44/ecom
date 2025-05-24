const helmet = require('helmet');
const rateLimit = require('./rateLimiting');
const logger = require('../utils/logger');
const { getHealthStatus } = require('../utils/circuitBreaker');

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout exceeded', {
          service: 'guard-rails',
          type: 'timeout',
          endpoint: req.originalUrl,
          method: req.method,
          timeout: timeoutMs,
          userId: req.user?.id,
          ip: req.ip
        });

        res.status(408).json({
          success: false,
          error: 'Request timeout',
          timeout: timeoutMs,
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    // Clear timeout on response finish
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// Request size validation middleware
const requestSizeLimit = (maxSizeBytes = 10 * 1024 * 1024) => { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length'), 10);
    
    if (contentLength && contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        service: 'guard-rails',
        type: 'size-limit',
        endpoint: req.originalUrl,
        method: req.method,
        contentLength,
        maxSize: maxSizeBytes,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize: maxSizeBytes,
        receivedSize: contentLength,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Request validation middleware
const requestValidation = () => {
  return (req, res, next) => {
    // Basic request validation
    const errors = [];

    // Check for required headers for certain endpoints
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!req.get('content-type')) {
        errors.push('Missing Content-Type header');
      }
    }

    // Validate JSON payload
    if (req.get('content-type')?.includes('application/json') && req.body) {
      try {
        // Body should already be parsed by express.json() middleware
        if (typeof req.body !== 'object') {
          errors.push('Invalid JSON payload');
        }
      } catch (error) {
        errors.push('Malformed JSON payload');
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /[<>\"']/g, // Basic XSS detection
      /union.*select/gi, // Basic SQL injection detection
      /(script|javascript|vbscript)/gi, // Script injection
      /\.\.\/|\.\.\\/g // Path traversal
    ];

    const checkValue = (value, key) => {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            errors.push(`Suspicious pattern detected in ${key}`);
            logger.warn('Suspicious request pattern detected', {
              service: 'guard-rails',
              type: 'suspicious-pattern',
              endpoint: req.originalUrl,
              method: req.method,
              field: key,
              pattern: pattern.toString(),
              userId: req.user?.id,
              ip: req.ip
            });
            break;
          }
        }
      }
    };

    // Check URL parameters
    for (const [key, value] of Object.entries(req.query)) {
      checkValue(value, `query.${key}`);
    }

    // Check body parameters
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        checkValue(value, `body.${key}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        service: 'guard-rails',
        type: 'validation-error',
        endpoint: req.originalUrl,
        method: req.method,
        errors,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Request validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Circuit breaker monitoring middleware
const circuitBreakerMonitoring = () => {
  return (req, res, next) => {
    // Add circuit breaker status to response headers (for debugging)
    if (process.env.NODE_ENV === 'development') {
      const cbStatus = getHealthStatus();
      const openCircuits = Object.entries(cbStatus)
        .filter(([name, status]) => status.state === 'open')
        .map(([name]) => name);

      if (openCircuits.length > 0) {
        res.set('X-Circuit-Breakers-Open', openCircuits.join(','));
      }
    }

    next();
  };
};

// Service health check middleware
const serviceHealthCheck = () => {
  return (req, res, next) => {
    // Skip health checks for the health endpoint itself
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }

    // Check if critical circuit breakers are open
    const cbStatus = getHealthStatus();
    const criticalCircuits = ['DatabaseOperations', 'CriticalOperations'];
    
    const openCriticalCircuits = criticalCircuits.filter(name => {
      const status = cbStatus[name];
      return status && status.state === 'open';
    });

    if (openCriticalCircuits.length > 0) {
      logger.error('Critical services unavailable', null, {
        service: 'guard-rails',
        type: 'service-unavailable',
        openCircuits: openCriticalCircuits,
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });

      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        reason: 'Critical services are experiencing issues',
        retryAfter: 30,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Enhanced error handling middleware
const errorBoundary = () => {
  return (error, req, res, next) => {
    // Classify error severity
    const isOperationalError = error.isOperational || 
                              error.name === 'ValidationError' ||
                              error.status < 500;

    if (!isOperationalError) {
      // Log system errors
      logger.error('System error in guard rails', error, {
        service: 'guard-rails',
        type: 'system-error',
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        stack: error.stack
      });
    }

    // Don't send detailed error info in production
    const errorResponse = {
      success: false,
      error: isOperationalError 
        ? error.message 
        : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = error;
    }

    const statusCode = error.status || error.statusCode || 500;
    res.status(statusCode).json(errorResponse);
  };
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' }
});

// Request correlation middleware
const requestCorrelation = () => {
  return (req, res, next) => {
    // Generate request ID if not present
    req.requestId = req.requestId || 
                   req.get('x-request-id') || 
                   require('uuid').v4();

    // Add to response headers
    res.set('X-Request-ID', req.requestId);

    // Track request start time
    req.startTime = Date.now();

    // Log request metrics on finish
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const statusClass = Math.floor(res.statusCode / 100);

      logger.performance(req.originalUrl, req.method, duration, res.statusCode, {
        service: 'guard-rails',
        requestId: req.requestId,
        userId: req.user?.id,
        userAgent: req.get('user-agent'),
        statusClass: `${statusClass}xx`
      });

      // Alert on slow requests
      if (duration > 5000) { // 5 seconds
        logger.warn('Slow request detected', {
          service: 'guard-rails',
          type: 'slow-request',
          endpoint: req.originalUrl,
          method: req.method,
          duration,
          requestId: req.requestId,
          userId: req.user?.id
        });
      }
    });

    next();
  };
};

// Graceful degradation middleware
const gracefulDegradation = () => {
  return (req, res, next) => {
    // Add degradation context to request
    req.degradationMode = {
      nonCritical: false,
      readOnly: false,
      cacheOnly: false
    };

    // Check system load and enable degradation modes
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 0.8; // 80% of heap
    const memoryRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

    if (memoryRatio > memoryThreshold) {
      req.degradationMode.nonCritical = true;
      logger.warn('High memory usage - enabling degradation mode', {
        service: 'guard-rails',
        type: 'degradation',
        memoryRatio: memoryRatio.toFixed(2),
        endpoint: req.originalUrl
      });
    }

    // Check circuit breaker status for degradation decisions
    const cbStatus = getHealthStatus();
    const failingServices = Object.entries(cbStatus)
      .filter(([name, status]) => status.state !== 'closed')
      .length;

    if (failingServices > 1) {
      req.degradationMode.readOnly = true;
      logger.warn('Multiple services failing - enabling read-only mode', {
        service: 'guard-rails',
        type: 'degradation',
        failingServices,
        endpoint: req.originalUrl
      });
    }

    next();
  };
};

// Main guard rails middleware factory
const createGuardRails = (options = {}) => {
  const {
    enableRateLimit = true,
    enableSecurity = true,
    enableTimeout = true,
    enableValidation = true,
    enableCircuitBreaker = true,
    enableHealthCheck = true,
    timeoutMs = 30000,
    maxRequestSize = 10 * 1024 * 1024 // 10MB
  } = options;

  const middlewares = [];

  // Security headers (should be first)
  if (enableSecurity) {
    middlewares.push(securityHeaders);
  }

  // Request correlation and tracking
  middlewares.push(requestCorrelation());

  // Request validation
  if (enableValidation) {
    middlewares.push(requestValidation());
  }

  // Request size limits
  middlewares.push(requestSizeLimit(maxRequestSize));

  // Request timeout
  if (enableTimeout) {
    middlewares.push(requestTimeout(timeoutMs));
  }

  // Rate limiting
  if (enableRateLimit) {
    middlewares.push(rateLimit.rateLimitMetrics);
    middlewares.push(rateLimit.global);
    middlewares.push(rateLimit.speedLimiter);
    middlewares.push(rateLimit.burstProtection);
  }

  // Circuit breaker monitoring
  if (enableCircuitBreaker) {
    middlewares.push(circuitBreakerMonitoring());
  }

  // Service health checks
  if (enableHealthCheck) {
    middlewares.push(serviceHealthCheck());
  }

  // Graceful degradation
  middlewares.push(gracefulDegradation());

  return middlewares;
};

// Export guard rails middleware and utilities
module.exports = {
  // Main factory function
  createGuardRails,
  
  // Individual middleware components
  requestTimeout,
  requestSizeLimit,
  requestValidation,
  circuitBreakerMonitoring,
  serviceHealthCheck,
  errorBoundary,
  securityHeaders,
  requestCorrelation,
  gracefulDegradation,
  
  // Specialized configurations
  auth: [
    securityHeaders,
    requestCorrelation(),
    requestValidation(),
    requestTimeout(10000), // 10 second timeout for auth
    rateLimit.auth
  ],
  
  api: [
    securityHeaders,
    requestCorrelation(),
    requestValidation(),
    requestTimeout(30000), // 30 second timeout for API
    rateLimit.api,
    circuitBreakerMonitoring(),
    serviceHealthCheck()
  ],
  
  checkout: [
    securityHeaders,
    requestCorrelation(),
    requestValidation(),
    requestTimeout(45000), // 45 second timeout for checkout
    rateLimit.checkout,
    circuitBreakerMonitoring(),
    serviceHealthCheck()
  ],
  
  // Default guard rails with all protections
  default: createGuardRails()
}; 