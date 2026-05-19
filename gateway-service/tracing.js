// Optional preload for legacy starts. src/main.ts initializes tracing for local dev.
const { initializeTracing } = require('@myapp/observability/tracing');

initializeTracing('gateway-service');
