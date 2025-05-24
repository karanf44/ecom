# 🚀 **QUICK REFERENCE: Plug-and-Play Guard Rails**

## ⚡ **TL;DR - How to Enable/Disable Components**

### **🔧 Individual Guard Rails**
```javascript
// Import the factory
const { createGuardRails } = require('./src/middleware/guardRails');

// Pick and choose what you want
const customGuardRails = createGuardRails({
  enableRateLimit: false,     // ❌ Disable rate limiting
  enableSecurity: true,       // ✅ Keep security headers
  enableTimeout: false,       // ❌ Disable timeouts for dev
  enableValidation: true,     // ✅ Keep input validation
  enableCircuitBreaker: true, // ✅ Keep circuit breakers
  enableHealthCheck: false,   // ❌ Disable health checks
  timeoutMs: 10000,          // ⚙️ Custom timeout
  maxRequestSize: 1048576    // ⚙️ 1MB size limit
});

// Apply to your app
customGuardRails.forEach(middleware => app.use(middleware));
```

### **🚦 Individual Rate Limiters**
```javascript
const rateLimiting = require('./src/middleware/rateLimiting');

// Use any combination
app.use(rateLimiting.global);        // Global limits
app.use(rateLimiting.api);          // API limits only
// Skip rateLimiting.auth             // No auth limits
```

### **🔄 Individual Circuit Breakers**
```javascript
const { executeDbQuery, executeExternalApiCall } = require('./src/utils/circuitBreaker');

// Use circuit breakers selectively
await executeDbQuery(() => dbOperation());     // Protected
await executeExternalApiCall(() => apiCall()); // Protected
await directOperation();                       // Not protected
```

---

## 📋 **Pre-built Configurations**

### **🛠️ Development Mode**
```javascript
// Fast iteration - minimal protection
const devGuardRails = createGuardRails({
  enableRateLimit: false,     // No rate limiting
  enableSecurity: false,      // No security headers
  enableTimeout: false,       // No timeouts
  enableValidation: false,    // No validation
  enableCircuitBreaker: true, // Keep circuit breakers
  enableHealthCheck: true     // Keep health checks
});
```

### **🧪 Testing Mode**
```javascript
// Testing-focused - specific protections
const testGuardRails = createGuardRails({
  enableRateLimit: false,     // No rate limiting
  enableSecurity: true,       // Security headers
  enableTimeout: true,        // Short timeouts
  enableValidation: true,     // Validation
  enableCircuitBreaker: true, // Circuit breakers
  enableHealthCheck: true,    // Health checks
  timeoutMs: 5000            // 5 second timeout
});
```

### **🚀 Production Mode**
```javascript
// Maximum protection
const prodGuardRails = createGuardRails({
  enableRateLimit: true,      // All rate limiting
  enableSecurity: true,       // All security
  enableTimeout: true,        // Timeouts
  enableValidation: true,     // Validation
  enableCircuitBreaker: true, // Circuit breakers
  enableHealthCheck: true,    // Health checks
  timeoutMs: 30000,          // 30 second timeout
  maxRequestSize: 50 * 1024 * 1024 // 50MB limit
});
```

---

## 🎛️ **Environment-Based Configuration**

### **📝 .env Configuration**
```env
# Guard Rails Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_CIRCUIT_BREAKERS=true
ENABLE_REQUEST_VALIDATION=false
ENABLE_SECURITY_HEADERS=true
ENABLE_HEALTH_CHECKS=true

# Rate Limiting Settings
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_API_MAX=100

# Circuit Breaker Settings
CB_DATABASE_TIMEOUT=5000
CB_DATABASE_ERROR_THRESHOLD=50
CB_API_TIMEOUT=10000

# Redis (optional for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

### **🎯 Environment-Aware Setup**
```javascript
// Auto-configure based on environment
const guardRailsConfig = {
  enableRateLimit: process.env.ENABLE_RATE_LIMITING !== 'false',
  enableSecurity: process.env.ENABLE_SECURITY_HEADERS !== 'false',
  enableValidation: process.env.ENABLE_REQUEST_VALIDATION !== 'false',
  enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKERS !== 'false',
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECKS !== 'false',
  timeoutMs: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
  maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760')
};

const guardRails = createGuardRails(guardRailsConfig);
```

---

## 🔧 **Runtime Control**

### **🎮 Control Circuit Breakers**
```javascript
const { 
  forceOpenCircuitBreaker, 
  forceCloseCircuitBreaker,
  getHealthStatus 
} = require('./src/utils/circuitBreaker');

// Emergency maintenance mode
forceOpenCircuitBreaker('DatabaseOperations');

// Resume normal operations
forceCloseCircuitBreaker('DatabaseOperations');

// Check status
const status = getHealthStatus();
console.log('Circuit Breaker Status:', status);
```

### **📊 Monitor Guard Rails**
```javascript
// Health check endpoint shows guard rail status
GET /health

// Response includes:
{
  "guardRails": {
    "rateLimiting": "Active",
    "circuitBreakers": "Monitoring", 
    "securityHeaders": "Enabled",
    "requestValidation": "Active"
  },
  "circuitBreakers": {
    "DatabaseOperations": { "state": "closed" },
    "ExternalAPIOperations": { "state": "closed" }
  }
}
```

---

## 🧪 **Testing Your Configuration**

### **🏃 Run the Test Suite**
```bash
# Test all guard rails configurations
node test-plug-and-play.js

# Test individual guard rails
node test-guard-rails.js
```

### **🔍 Check What's Enabled**
```javascript
// Root endpoint shows current configuration
GET /

// Response includes:
{
  "guardRails": {
    "rateLimiting": "Active",
    "circuitBreakers": "Monitoring",
    "securityHeaders": "Enabled", 
    "requestValidation": "Active"
  }
}
```

---

## ⚠️ **Common Patterns**

### **🛠️ Development: Disable Heavy Guards**
```javascript
// Keep debugging easy
app.use(guardRails.securityHeaders);     // Security only
app.use(guardRails.circuitBreakerMonitoring()); // Monitoring only
// Skip rate limiting, timeouts, validation
```

### **🧪 Testing: Enable Specific Guards**
```javascript
// Test specific functionality
app.use(guardRails.requestValidation()); // Test validation
app.use(rateLimiting.api);              // Test rate limiting
// Skip everything else
```

### **🚀 Production: Enable Everything**
```javascript
// Maximum protection
app.use(guardRails.auth);     // All auth protections
app.use(guardRails.api);      // All API protections  
app.use(guardRails.checkout); // All checkout protections
```

### **⚡ Performance: Selective Guards**
```javascript
// Keep performance, essential protection
app.use(guardRails.securityHeaders);           // Fast
app.use(guardRails.circuitBreakerMonitoring()); // Fast
app.use(rateLimiting.burstProtection);         // Fast
// Skip validation, timeouts for speed
```

---

## 🎯 **Summary Commands**

```bash
# Test plug-and-play functionality
npm run test:guard-rails

# Start with all guards enabled
npm start

# Start with minimal guards (if configured)
NODE_ENV=development npm start

# Start with custom configuration
ENABLE_RATE_LIMITING=false ENABLE_VALIDATION=false npm start
```

**Remember:** Any guard rail can be enabled/disabled without affecting core API functionality! 🎉 