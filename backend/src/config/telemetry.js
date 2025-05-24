// OpenTelemetry configuration - must be imported before any other modules
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION, 
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_DEPLOYMENT_ENVIRONMENT 
} = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Create resource with service information
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'ecommerce-backend',
  [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  [ATTR_SERVICE_INSTANCE_ID]: process.env.INSTANCE_ID || 'local-dev',
  [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure Jaeger exporter for distributed tracing
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

// Configure Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter({
  port: process.env.PROMETHEUS_PORT || 9090,
  endpoint: '/metrics',
}, () => {
  console.log('📊 Prometheus metrics available at http://localhost:9090/metrics');
});

// Initialize the Node SDK with auto-instrumentations
const sdk = new NodeSDK({
  resource,
  traceExporter: jaegerExporter,
  metricReader: prometheusExporter,
  instrumentations: [getNodeAutoInstrumentations({
    // Configure specific instrumentations
    '@opentelemetry/instrumentation-express': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-http': {
      enabled: true,
      requestHook: (span, request) => {
        // Add custom attributes to HTTP spans
        span.setAttributes({
          'http.request.body.size': request.headers['content-length'] || 0,
          'http.user_agent': request.headers['user-agent'] || 'unknown',
        });
      },
    },
    '@opentelemetry/instrumentation-pg': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-fs': {
      enabled: process.env.NODE_ENV === 'development', // Only in dev
    },
  })],
});

// Initialize the SDK
try {
  sdk.start();
  console.log('🔭 OpenTelemetry started successfully');
  console.log(`📈 Service: ${resource.attributes[ATTR_SERVICE_NAME]}`);
  console.log(`🌍 Environment: ${resource.attributes[ATTR_DEPLOYMENT_ENVIRONMENT]}`);
} catch (error) {
  console.error('❌ Error initializing OpenTelemetry', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('📊 OpenTelemetry terminated'))
    .catch((error) => console.log('❌ Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

module.exports = { sdk }; 