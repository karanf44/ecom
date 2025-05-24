// OpenTelemetry must be initialized FIRST, before any other imports
require('./config/telemetry');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- BEGIN DEBUG LOGGING (app.js) ---
console.log('[APP_DEBUG] process.env.DB_NAME:', process.env.DB_NAME);
// --- END DEBUG LOGGING (app.js) ---

const express = require('express');
const cors = require('cors');
const app = express();

// Import OpenTelemetry-aware logger and middleware
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');

// Import guard rails middleware
const guardRails = require('./middleware/guardRails');
const rateLimiting = require('./middleware/rateLimiting');

// Import database connection (this will test the connection)
const db = require('./config/database');

// Import routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const walletRoutes = require('./routes/walletRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');

// Apply guard rails first - Security headers and global protections
app.use(guardRails.securityHeaders);
app.use(guardRails.requestCorrelation());

// Basic middleware
app.use(cors()); // Enable CORS for frontend integration
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded request bodies

// Apply global guard rails after body parsing
app.use(guardRails.requestValidation());
app.use(guardRails.requestSizeLimit());
app.use(guardRails.requestTimeout());

// Global rate limiting and monitoring
app.use(rateLimiting.rateLimitMetrics);
app.use(rateLimiting.global);
app.use(rateLimiting.speedLimiter);

// Circuit breaker monitoring and health checks
app.use(guardRails.circuitBreakerMonitoring());
app.use(guardRails.serviceHealthCheck());

// Graceful degradation
app.use(guardRails.gracefulDegradation());

// Add request logging middleware (must be after body parsing middleware)
app.use(requestLogger);

// Routes with specific guard rails
app.use('/api/products', guardRails.api);
app.use('/api/products', productRoutes);

app.use('/api/auth', guardRails.auth);
app.use('/api/auth', authRoutes);

app.use('/api/cart', guardRails.api);
app.use('/api/cart', cartRoutes);

app.use('/api/wallet', guardRails.api);
app.use('/api/wallet', walletRoutes);

app.use('/api/checkout', guardRails.checkout);
app.use('/api/checkout', checkoutRoutes);

// Root route for testing
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', {
    service: 'api',
    endpoint: '/',
    method: 'GET',
    requestId: req.requestId
  });

  res.status(200).json({
    success: true,
    message: 'E-commerce Backend API is running!',
    observability: {
      tracing: 'OpenTelemetry enabled',
      metrics: 'Available at /metrics',
      logging: 'Structured logging active'
    },
    guardRails: {
      rateLimiting: 'Active',
      circuitBreakers: 'Monitoring',
      securityHeaders: 'Enabled',
      requestValidation: 'Active'
    },
    endpoints: {
      products: '/api/products',
      auth: '/api/auth',
      cart: '/api/cart',
      wallet: '/api/wallet',
      checkout: '/api/checkout',
      metrics: '/metrics',
      health: '/health'
    }
  });
});

// Health check route with comprehensive monitoring
app.get('/health', async (req, res) => {
  const { getHealthStatus } = require('./utils/circuitBreaker');
  
  const checks = {
    api: 'healthy',
    database: 'unknown',
    circuitBreakers: getHealthStatus(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  try {
    // Test database connection
    await db.query('SELECT 1+1 as result');
    checks.database = 'connected';
    
    const healthStatus = 'healthy';
    logger.health(healthStatus, checks);
    
    res.status(200).json({
      success: true,
      status: healthStatus,
      checks,
      timestamp: new Date().toISOString(),
      service: 'ecommerce-backend',
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    checks.database = 'failed';
    const healthStatus = 'unhealthy';
    
    logger.health(healthStatus, checks);
    logger.error('Health check failed', error, {
      service: 'health',
      endpoint: '/health',
      requestId: req.requestId
    });

    res.status(500).json({
      success: false,
      status: healthStatus,
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add error logging middleware (must be after routes)
app.use(errorLogger);

// Enhanced error handling with guard rails
app.use(guardRails.errorBoundary());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', err, {
    service: 'error-handler',
    endpoint: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    userId: req.user ? req.user.id : null
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.requestId,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    service: 'router',
    endpoint: req.originalUrl,
    method: req.method,
    requestId: req.requestId
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.requestId,
    availableEndpoints: [
      '/api/products',
      '/api/auth',
      '/api/cart',
      '/api/wallet',
      '/api/checkout',
      '/health',
      '/metrics'
    ]
  });
});

// Define a port for the server to listen on
const PORT = process.env.PORT || 3002;

// Start the server
app.listen(PORT, () => {
  logger.info('Server started successfully', {
    service: 'startup',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    guardRails: {
      rateLimiting: 'enabled',
      circuitBreakers: 'enabled',
      securityHeaders: 'enabled',
      requestValidation: 'enabled'
    }
  });
  
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Guard Rails: Rate Limiting, Circuit Breakers, Security Headers`);
  console.log(`📊 Metrics available at: http://localhost:9090/metrics`);
  console.log(`🔍 Health check at: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, starting graceful shutdown', {
    service: 'shutdown'
  });
  
  // Cleanup rate limiting Redis connections
  try {
    await rateLimiting.cleanup();
  } catch (error) {
    logger.error('Error during rate limiting cleanup', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, starting graceful shutdown', {
    service: 'shutdown'
  });
  
  // Cleanup rate limiting Redis connections
  try {
    await rateLimiting.cleanup();
  } catch (error) {
    logger.error('Error during rate limiting cleanup', error);
  }
  
  process.exit(0);
});

// Export the app
module.exports = app;
