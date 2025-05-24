# 🔭 E-commerce Backend Observability with OpenTelemetry

This project uses **OpenTelemetry** for comprehensive observability including distributed tracing, metrics, and structured logging. OpenTelemetry is vendor-neutral, open-source, and provides industry-standard observability.

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Node.js App  │────│ OpenTelemetry    │────│    Backends     │
│                 │    │ Instrumentation  │    │                 │
│ • Express API   │    │ • Auto-instrument│    │ • Jaeger (Traces)│
│ • Custom Logger │    │ • Manual spans   │    │ • Prometheus     │
│ • Database      │    │ • Metrics        │    │ • File Logs     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ **Components**

### **1. Distributed Tracing** 🔗
- **Backend**: Jaeger
- **Features**: End-to-end request tracing, performance bottleneck detection
- **Access**: http://localhost:16686

### **2. Metrics Collection** 📊
- **Backend**: Prometheus + Grafana
- **Features**: API performance, error rates, database metrics, business metrics
- **Access**: 
  - Prometheus: http://localhost:9091
  - Grafana: http://localhost:3001 (admin/admin123)

### **3. Structured Logging** 📝
- **Format**: JSON with trace correlation
- **Storage**: Local files (`logs/` directory)
- **Features**: Request correlation, error tracking, performance logging

## 🚀 **Quick Start**

### **Step 1: Start Observability Stack**
```bash
# Start Jaeger, Prometheus, Grafana, and OTel Collector
docker-compose -f docker-compose.observability.yml up -d
```

### **Step 2: Start the Application**
```bash
# Install dependencies (if not already done)
npm install

# Start the application with OpenTelemetry
npm start
```

### **Step 3: Access Observability UIs**
- **Application**: http://localhost:3002
- **Jaeger (Tracing)**: http://localhost:16686
- **Prometheus (Metrics)**: http://localhost:9091
- **Grafana (Dashboards)**: http://localhost:3001
- **App Metrics Endpoint**: http://localhost:9090/metrics

## 📊 **Pre-built Dashboards**

### **E-commerce Overview Dashboard**
Located in Grafana under "E-commerce" folder:
- HTTP request rates and response times
- Error rates by service and endpoint
- Database query performance
- Service health status
- HTTP status code distribution

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Optional: Jaeger endpoint (defaults to localhost)
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Optional: Prometheus metrics port (defaults to 9090)
PROMETHEUS_PORT=9090

# Optional: App version for release tracking
APP_VERSION=1.0.0

# Optional: Instance ID for multi-instance deployments
INSTANCE_ID=backend-01
```

### **OpenTelemetry Auto-Instrumentation**
The following libraries are automatically instrumented:
- **Express.js**: HTTP requests and responses
- **HTTP/HTTPS**: Outbound HTTP calls
- **PostgreSQL**: Database queries
- **File System**: File operations (development only)

## 📈 **Custom Metrics**

### **Available Metrics**
- `http_requests_total`: Total HTTP requests counter
- `http_request_duration_ms`: HTTP request duration histogram
- `errors_total`: Total errors counter
- `db_query_duration_ms`: Database query duration histogram
- `service_health`: Service health gauge (1 = healthy, 0 = unhealthy)

### **Custom Metric Example**
```javascript
const logger = require('./utils/logger');

// Log a business metric
const meter = logger.getMeter();
const orderCounter = meter.createCounter('orders_completed_total');

// In your checkout service
orderCounter.add(1, {
  payment_method: 'wallet',
  user_type: 'premium'
});
```

## 🔍 **Distributed Tracing**

### **Automatic Tracing**
Every HTTP request automatically creates a trace with:
- Request details (method, URL, headers)
- Response details (status code, duration)
- User context (if authenticated)
- Error details (if any)

### **Custom Spans**
```javascript
const logger = require('./utils/logger');

// Create a custom span
await logger.withSpan('business-operation', 'checkout', async () => {
  // Your business logic here
  await processPayment();
  await updateInventory();
}, {
  user_id: userId,
  order_value: totalAmount
});
```

## 🐛 **Error Tracking**

### **Automatic Error Capture**
- Unhandled exceptions in requests
- Database query errors  
- HTTP client errors
- Custom logged errors

### **Error Context**
Each error includes:
- Full stack trace
- Request context (user, endpoint, method)
- Trace correlation ID
- Custom metadata

## 📊 **Monitoring & Alerting**

### **Key Metrics to Monitor**
1. **API Performance**
   - Request rate: `rate(http_requests_total[5m])`
   - Response time: `rate(http_request_duration_ms_sum[5m]) / rate(http_request_duration_ms_count[5m])`
   - Error rate: `rate(errors_total[5m])`

2. **Database Performance**
   - Query duration: `rate(db_query_duration_ms_sum[5m]) / rate(db_query_duration_ms_count[5m])`
   - Query rate: `rate(db_query_duration_ms_count[5m])`

3. **Service Health**
   - Health status: `service_health`
   - Memory usage: Built-in Node.js metrics
   - Uptime: Built-in Node.js metrics

### **Recommended Alerts**
- Response time > 1s (P95)
- Error rate > 1%
- Service health = 0
- Database query time > 500ms (P95)

## 🔧 **Troubleshooting**

### **Common Issues**

#### **No Traces in Jaeger**
1. Check if Jaeger is running: `docker ps | grep jaeger`
2. Verify application logs for OpenTelemetry initialization
3. Check Jaeger endpoint configuration

#### **No Metrics in Prometheus**
1. Verify metrics endpoint: `curl http://localhost:9090/metrics`
2. Check Prometheus configuration in `observability/prometheus.yml`
3. Ensure application is exposing metrics on port 9090

#### **Missing Data in Grafana**
1. Check if datasources are configured correctly
2. Verify Prometheus is scraping metrics
3. Check dashboard queries

### **Debug Mode**
Set `NODE_ENV=development` for verbose logging and additional instrumentation.

## 🔄 **Production Considerations**

### **Performance Impact**
- **Tracing**: ~1-5% overhead with 10% sampling rate
- **Metrics**: Minimal overhead
- **Logging**: File I/O overhead (use log rotation)

### **Sampling Strategies**
```javascript
// In config/telemetry.js, adjust sampling rates:
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
```

### **Log Rotation**
Implement log rotation for production:
```bash
# Example using logrotate
sudo nano /etc/logrotate.d/ecommerce-backend
```

### **Alerting Integration**
Configure Grafana alerts or integrate with:
- PagerDuty
- Slack
- Email notifications

## 📚 **Additional Resources**

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

## 🔗 **Useful Commands**

```bash
# View application logs
tail -f logs/app-$(date +%Y-%m-%d).log

# Stop observability stack
docker-compose -f docker-compose.observability.yml down

# View container logs
docker-compose -f docker-compose.observability.yml logs -f jaeger

# Check metrics endpoint
curl http://localhost:9090/metrics | grep http_requests_total
```

---

**Happy Observing! 🔭✨** 