const { trace, metrics, context, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const fs = require('fs');
const path = require('path');

// Get tracer and meter instances
const tracer = trace.getTracer('ecommerce-backend', '1.0.0');
const meter = metrics.getMeter('ecommerce-backend', '1.0.0');

// Create custom metrics
const httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'Duration of HTTP requests in milliseconds',
});

const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

const errorCounter = meter.createCounter('errors_total', {
  description: 'Total number of errors',
});

const dbQueryDuration = meter.createHistogram('db_query_duration_ms', {
  description: 'Duration of database queries in milliseconds',
});

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
      }
    }
  }

  formatLogMessage(level, message, metadata = {}) {
    // Get current span context for correlation
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan ? activeSpan.spanContext() : null;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: metadata.service || 'unknown',
      endpoint: metadata.endpoint,
      method: metadata.method,
      userId: metadata.userId,
      requestId: metadata.requestId,
      // Add OpenTelemetry trace correlation
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      metadata
    };
  }

  writeToFile(logEntry) {
    try {
      const logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Info level logging with OpenTelemetry integration
  info(message, metadata = {}) {
    const logEntry = this.formatLogMessage('INFO', message, metadata);
    
    // Console output (development)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, metadata);
    }
    
    // File logging (fallback)
    this.writeToFile(logEntry);
    
    // Add span attributes if active span exists
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent('log.info', {
        'log.message': message,
        'log.level': 'info',
        ...metadata
      });
    }
  }

  // Warning level logging
  warn(message, metadata = {}) {
    const logEntry = this.formatLogMessage('WARN', message, metadata);
    
    console.warn(`[WARN] ${message}`, metadata);
    this.writeToFile(logEntry);
    
    // Add span attributes and metrics
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent('log.warn', {
        'log.message': message,
        'log.level': 'warn',
        ...metadata
      });
      activeSpan.setStatus({ code: SpanStatusCode.ERROR, message });
    }
  }

  // Error level logging with OpenTelemetry error tracking
  error(message, error = null, metadata = {}) {
    const logEntry = this.formatLogMessage('ERROR', message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    });
    
    console.error(`[ERROR] ${message}`, error, metadata);
    this.writeToFile(logEntry);
    
    // Record error metrics
    errorCounter.add(1, {
      service: metadata.service || 'unknown',
      endpoint: metadata.endpoint || 'unknown',
      error_type: error?.name || 'unknown'
    });
    
    // Add span attributes and mark as error
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error || new Error(message));
      activeSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error?.message || message 
      });
      activeSpan.addEvent('log.error', {
        'log.message': message,
        'log.level': 'error',
        'error.name': error?.name,
        'error.message': error?.message,
        ...metadata
      });
    }
  }

  // Debug level logging (only in development)
  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.formatLogMessage('DEBUG', message, metadata);
      console.debug(`[DEBUG] ${message}`, metadata);
      this.writeToFile(logEntry);
      
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.addEvent('log.debug', {
          'log.message': message,
          'log.level': 'debug',
          ...metadata
        });
      }
    }
  }

  // Performance logging with metrics
  performance(endpoint, method, duration, statusCode, metadata = {}) {
    const performanceData = {
      endpoint,
      method,
      duration,
      statusCode,
      ...metadata
    };

    this.info(`${method} ${endpoint} - ${statusCode} - ${duration}ms`, performanceData);
    
    // Record HTTP metrics
    const labels = {
      method,
      endpoint,
      status_code: statusCode.toString(),
      service: metadata.service || 'unknown'
    };

    httpRequestDuration.record(duration, labels);
    httpRequestsTotal.add(1, labels);
  }

  // Database operation logging
  dbOperation(operation, table, duration, metadata = {}) {
    const logMessage = `DB ${operation} on ${table} - ${duration}ms`;
    this.info(logMessage, { operation, table, duration, ...metadata });
    
    // Record database metrics
    dbQueryDuration.record(duration, {
      operation,
      table,
      service: metadata.service || 'unknown'
    });
  }

  // Create a new span for custom operations
  createSpan(name, operation, attributes = {}) {
    return tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.name': operation,
        ...attributes
      }
    });
  }

  // Execute function within a span context
  async withSpan(spanName, operation, fn, attributes = {}) {
    const span = this.createSpan(spanName, operation, attributes);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  }

  // Set user context for tracing
  setUserContext(userId, email, metadata = {}) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        'user.id': userId,
        'user.email': email,
        ...Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[`user.${key}`] = value;
          return acc;
        }, {})
      });
    }
  }

  // Set request context
  setRequestContext(requestId, endpoint, method, userAgent, ipAddress) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        'http.request.id': requestId,
        'http.route': endpoint,
        'http.method': method,
        'http.user_agent': userAgent,
        'http.client_ip': ipAddress
      });
    }
  }

  // Health check logging
  health(status, checks = {}) {
    const message = `Health check: ${status}`;
    const metadata = { status, checks };
    
    if (status === 'healthy') {
      this.info(message, metadata);
    } else {
      this.error(message, null, metadata);
    }
    
    // Record health metrics
    const healthGauge = meter.createUpDownCounter('service_health', {
      description: 'Service health status (1 = healthy, 0 = unhealthy)',
    });
    
    healthGauge.add(status === 'healthy' ? 1 : 0, {
      service: 'ecommerce-backend'
    });
  }

  // Get tracer for manual instrumentation
  getTracer() {
    return tracer;
  }

  // Get meter for custom metrics
  getMeter() {
    return meter;
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 