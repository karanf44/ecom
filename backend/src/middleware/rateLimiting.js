const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const redis = require('redis');
const logger = require('../utils/logger');

// Redis client for distributed rate limiting (optional - fallbacks to memory)
let redisClient = null;

try {
  if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      retry_unfulfilled_commands: true,
      retry_delay: 500
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err, { service: 'rate-limiting' });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting', { service: 'rate-limiting' });
    });

    redisClient.connect();
  }
} catch (error) {
  logger.warn('Redis not available, using memory store for rate limiting', { 
    service: 'rate-limiting',
    error: error.message 
  });
}

// Custom rate limit store using Redis or fallback to memory
const createStore = () => {
  if (redisClient) {
    return {
      // Redis-based store implementation
      async increment(key) {
        try {
          const current = await redisClient.incr(key);
          if (current === 1) {
            await redisClient.expire(key, 60); // 1 minute window
          }
          return { current, resetTime: new Date(Date.now() + 60000) };
        } catch (error) {
          logger.error('Redis increment error', error, { service: 'rate-limiting' });
          throw error;
        }
      },
      
      async get(key) {
        try {
          const current = await redisClient.get(key);
          const ttl = await redisClient.ttl(key);
          return {
            current: parseInt(current) || 0,
            resetTime: new Date(Date.now() + (ttl * 1000))
          };
        } catch (error) {
          logger.error('Redis get error', error, { service: 'rate-limiting' });
          return { current: 0, resetTime: new Date(Date.now() + 60000) };
        }
      }
    };
  }
  
  // Fallback to express-rate-limit's default memory store
  return undefined;
};

// Rate limit configuration
const rateLimitConfig = {
  // Global rate limit - applies to all requests
  global: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn('Global rate limit exceeded', {
        service: 'rate-limiting',
        type: 'global',
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // Strict limits for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        service: 'rate-limiting',
        type: 'auth',
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // API endpoints rate limiting
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each user to 100 API requests per minute
    message: {
      error: 'API rate limit exceeded, please slow down.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    keyGenerator: (req) => {
      return req.user ? `api:user:${req.user.id}` : `api:ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn('API rate limit exceeded', {
        service: 'rate-limiting',
        type: 'api',
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.originalUrl
      });
      
      res.status(429).json({
        success: false,
        error: 'API rate limit exceeded, please slow down.',
        retryAfter: 60,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // Checkout process has stricter limits
  checkout: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit checkout attempts
    message: {
      error: 'Too many checkout attempts, please wait before trying again.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    keyGenerator: (req) => {
      return req.user ? `checkout:user:${req.user.id}` : `checkout:ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn('Checkout rate limit exceeded', {
        service: 'rate-limiting',
        type: 'checkout',
        ip: req.ip,
        userId: req.user?.id
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many checkout attempts, please wait before trying again.',
        retryAfter: 60,
        timestamp: new Date().toISOString()
      });
    }
  })
};

// Progressive slow down middleware for suspicious behavior
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter (updated for v2)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.user ? `slow:user:${req.user.id}` : `slow:ip:${req.ip}`;
  },
  validate: {
    delayMs: false // Disable delayMs validation warnings
  }
});

// Middleware to track rate limit metrics
const rateLimitMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isRateLimited = res.statusCode === 429;
    
    if (isRateLimited) {
      logger.performance('rate-limiting', req.method, duration, res.statusCode, {
        service: 'rate-limiting',
        endpoint: req.originalUrl,
        rateLimited: true,
        userId: req.user?.id
      });
    }
  });
  
  next();
};

// Enhanced rate limiting with burst protection
const createBurstProtection = (windowMs = 1000, maxBurst = 10) => {
  return rateLimit({
    windowMs,
    max: maxBurst,
    message: {
      error: 'Request burst detected, please slow down.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    keyGenerator: (req) => {
      return req.user ? `burst:user:${req.user.id}` : `burst:ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn('Burst protection triggered', {
        service: 'rate-limiting',
        type: 'burst',
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.originalUrl
      });
      
      res.status(429).json({
        success: false,
        error: 'Request burst detected, please slow down.',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Export all rate limiting middleware
module.exports = {
  global: rateLimitConfig.global,
  auth: rateLimitConfig.auth,
  api: rateLimitConfig.api,
  checkout: rateLimitConfig.checkout,
  speedLimiter,
  rateLimitMetrics,
  burstProtection: createBurstProtection(),
  
  // Cleanup function for graceful shutdown
  cleanup: async () => {
    if (redisClient) {
      try {
        await redisClient.quit();
        logger.info('Redis client disconnected gracefully', { service: 'rate-limiting' });
      } catch (error) {
        logger.error('Error disconnecting Redis client', error, { service: 'rate-limiting' });
      }
    }
  }
}; 