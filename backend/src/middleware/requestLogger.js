const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');

// Request logging middleware with OpenTelemetry integration
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  // Add request ID to request object
  req.requestId = requestId;
  req.startTime = startTime;
  
  // Extract relevant information
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  const userAgent = req.get('User-Agent') || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user ? req.user.id : null;
  
  // Create span for this request
  const span = logger.getTracer().startSpan(`${method} ${endpoint}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': method,
      'http.route': endpoint,
      'http.url': req.originalUrl,
      'http.user_agent': userAgent,
      'http.client_ip': ipAddress,
      'http.request.id': requestId,
      'service.name': 'ecommerce-backend',
      'service.component': getServiceFromEndpoint(endpoint)
    }
  });

  // Set user context if available
  if (userId) {
    span.setAttributes({
      'user.id': userId,
      'user.email': req.user.email || 'unknown'
    });
    logger.setUserContext(userId, req.user.email);
  }

  // Set request context in logger
  logger.setRequestContext(requestId, endpoint, method, userAgent, ipAddress);
  
  // Store span in request for access in handlers
  req.span = span;
  
  // Log incoming request
  logger.info('Incoming request', {
    service: getServiceFromEndpoint(endpoint),
    endpoint,
    method,
    requestId,
    userId,
    userAgent,
    ipAddress,
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params
  });
  
  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Set span attributes for response
    span.setAttributes({
      'http.status_code': statusCode,
      'http.response.duration_ms': duration,
      'http.response.size_bytes': JSON.stringify(data).length
    });
    
    // Set span status
    if (statusCode >= 400) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: `HTTP ${statusCode}` 
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    
    // Log performance metrics
    logger.performance(endpoint, method, duration, statusCode, {
      service: getServiceFromEndpoint(endpoint),
      requestId,
      userId,
      responseSize: JSON.stringify(data).length
    });
    
    // Log successful requests
    if (statusCode < 400) {
      logger.info('Request completed successfully', {
        service: getServiceFromEndpoint(endpoint),
        endpoint,
        method,
        statusCode,
        duration,
        requestId,
        userId
      });
    }
    
    // End the span
    span.end();
    
    return originalJson.call(this, data);
  };
  
  // Override res.status to capture error responses early
  const originalStatus = res.status;
  res.status = function(code) {
    if (code >= 400) {
      const duration = Date.now() - startTime;
      
      // Update span with error information
      span.setAttributes({
        'http.status_code': code,
        'http.response.duration_ms': duration
      });
      
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: `HTTP ${code}` 
      });
      
      logger.error('Request failed', null, {
        service: getServiceFromEndpoint(endpoint),
        endpoint,
        method,
        statusCode: code,
        duration,
        requestId,
        userId
      });
    }
    return originalStatus.call(this, code);
  };
  
  // Handle request completion/error cleanup
  const cleanup = () => {
    if (!span.ended) {
      span.end();
    }
  };
  
  res.on('finish', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  next();
};

// Error logging middleware with OpenTelemetry integration
const errorLogger = (error, req, res, next) => {
  const duration = Date.now() - req.startTime;
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  const requestId = req.requestId;
  const userId = req.user ? req.user.id : null;
  const span = req.span;
  
  // Record exception in current span
  if (span) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
    });
    span.setAttributes({
      'error.name': error.name,
      'error.message': error.message,
      'error.stack': error.stack,
      'http.response.duration_ms': duration
    });
  }
  
  // Log the error with full context
  logger.error('Unhandled error in request', error, {
    service: getServiceFromEndpoint(endpoint),
    endpoint,
    method,
    duration,
    requestId,
    userId,
    statusCode: res.statusCode || 500,
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params,
    stack: error.stack
  });
  
  // Continue with next error handler
  next(error);
};

// Middleware to add database operation tracing
const dbOperationLogger = (operation, table) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Create database operation span
    const dbSpan = logger.getTracer().startSpan(`db.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.operation': operation,
        'db.sql.table': table,
        'db.system': 'postgresql',
        'service.component': 'database'
      }
    });
    
    // Store original end method
    const originalEnd = dbSpan.end;
    dbSpan.end = function() {
      const duration = Date.now() - startTime;
      
      // Log database operation
      logger.dbOperation(operation, table, duration, {
        service: 'database',
        requestId: req.requestId,
        userId: req.user ? req.user.id : null
      });
      
      // Set duration attribute
      dbSpan.setAttributes({
        'db.operation.duration_ms': duration
      });
      
      originalEnd.call(this);
    };
    
    // Add to request for access in handlers
    req.dbSpan = dbSpan;
    
    next();
  };
};

// Helper function to determine service from endpoint
function getServiceFromEndpoint(endpoint) {
  if (endpoint.includes('/auth')) return 'auth';
  if (endpoint.includes('/products')) return 'products';
  if (endpoint.includes('/cart')) return 'cart';
  if (endpoint.includes('/wallet')) return 'wallet';
  if (endpoint.includes('/checkout')) return 'checkout';
  if (endpoint.includes('/health')) return 'health';
  return 'unknown';
}

// Helper function to sanitize request body (remove sensitive data)
function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

module.exports = {
  requestLogger,
  errorLogger,
  dbOperationLogger
}; 