# Observability Setup Guide - Complete Implementation Reference

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Project:** Microservices Observability Stack  

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Workflow](#workflow)
4. [Technology Stack & Packages](#technology-stack--packages)
5. [Implementation Steps](#implementation-steps)
6. [Configuration Details](#configuration-details)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This observability setup provides comprehensive monitoring of distributed microservices across three pillars:

- **Traces**: Request tracing across services using OpenTelemetry
- **Logs**: Structured JSON logging with trace context correlation
- **Metrics**: Performance metrics collection (optional)

The stack is production-ready, containerized, and designed for easy adoption across projects.

### Key Benefits
✅ End-to-end request tracing across services  
✅ Centralized log aggregation with trace correlation  
✅ Automated instrumentation (no code changes needed)  
✅ Sensitive data masking (credit cards, PII)  
✅ Multi-backend support (Tempo for traces, Loki for logs, OpenSearch for both)  
✅ Ready-to-use Grafana dashboards  

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Microservices (NestJS)                                       │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │  Gateway     │  │  Billing     │  │  Inventory   │        │
│ │  (3000)      │  │  (3001)      │  │  (3002)      │        │
│ │              │  │              │  │              │        │
│ │ Winston      │  │ Winston      │  │ Winston      │        │
│ │ OTEL SDK     │  │ OTEL SDK     │  │ OTEL SDK     │        │
│ │ Auto-instr.  │  │ Auto-instr.  │  │ Auto-instr.  │        │
│ └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│        │                 │                 │                 │
│        └─────────────────┼─────────────────┘                 │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼─────┐            ┌─────▼────┐
         │           │            │           │
      Files         OTLP      Files         OTLP
      (logs)       (traces)   (logs)      (traces)
         │           │            │           │
    ┌────▼───────────▼──────┐     │           │
    │   Fluent Bit 2.2      │     │     ┌─────▼──────────┐
    │  (Log Collection)     │     │     │ OTEL Collector │
    │                       │     │     │ (9200:4317)    │
    │  - Parse JSON         │     │     │                │
    │  - Enrich metadata    │     │     │ Receivers:     │
    │  - Mask sensitive     │     │     │  - OTLP gRPC   │
    │  - Dual output        │     │     │  - OTLP HTTP   │
    │                       │     │     │                │
    └───────┬───────────────┘     │     │ Processors:    │
            │                     │     │  - Batch       │
      ┌─────┴──────┬──────────────┘     │  - Resource    │
      │            │                    │  - Sampler     │
   Loki         OpenSearch              │                │
 (3100)         (9200)                  │ Exporters:     │
                                        │  - Tempo       │
                                        │  - OpenSearch  │
                                        │  - Debug       │
                                        │                │
                                        └────┬───────────┘
                                             │
                                        ┌────┴───────────┐
                                        │                │
                                      Tempo           OpenSearch
                                     (3200)            (9200)
                                   (Traces)        (Traces+Logs)
                                        │                │
                                        └────┬───────────┘
                                             │
                                        ┌────▼────────┐
                                        │  Grafana    │
                                        │  (3300)     │
                                        │             │
                                        │ Dashboards  │
                                        │ Explore     │
                                        │ Alerts      │
                                        └─────────────┘
```

### Data Flow

1. **Application Layer**
   - NestJS microservices log to Winston (JSON format)
   - OTEL SDK auto-instruments HTTP, Express, NestJS
   - Each log gets traceId, spanId, traceFlags injected

2. **Collection Layer**
   - **Fluent Bit**: Tails service logs, enriches with metadata, masks PII, ships to Loki + OpenSearch
   - **OTEL Collector**: Receives OTLP telemetry from services, applies sampling/batch processing, exports to Tempo + OpenSearch

3. **Storage Layer**
   - **Loki**: Time-series log database (lightweight, labels-based)
   - **Tempo**: Distributed trace database (optimized for traces)
   - **OpenSearch**: Full-text search for logs and traces (redundant storage for flexibility)

4. **Visualization Layer**
   - **Grafana**: Unified dashboard with Loki, Tempo, OpenSearch datasources

---

## Workflow

### Complete Request Lifecycle

```
User Request
    │
    ├─► Gateway Service (3000)
    │   ├─► Auto-instrumented (HTTP, Express, NestJS)
    │   ├─► Trace created (traceId, spanId)
    │   ├─► Winston logs emitted (with traceId)
    │   └─► Call Inventory Service
    │       │
    │       ├─► propagates W3C traceparent header
    │       │
    │       ├─► Inventory Service (3002)
    │       │   ├─► Span linked to parent trace
    │       │   ├─► Winston logs (same traceId)
    │       │   └─► Calls Billing Service
    │       │       │
    │       │       ├─► propagates traceparent
    │       │       │
    │       │       ├─► Billing Service (3001)
    │       │       │   ├─► Span in trace
    │       │       │   ├─► Response returned
    │       │       │   └─► Logs → File
    │       │       │
    │       │       └─► Logs → File
    │       │
    │       └─► Logs → File
    │
    └─► Response to User
        │
        └─ All 3 services' logs + spans now in system
           │
           ├─► Fluent Bit reads logs from files
           │   ├─► Parses JSON
           │   ├─► Adds: environment, cluster, service metadata
           │   ├─► Runs Lua script: masks credit cards
           │   │
           │   ├─ Output 1: Loki (3100)
           │   │   └─ Used for log search/dashboard
           │   │
           │   └─ Output 2: OpenSearch (9200)
           │       └─ Full-text search capability
           │
           └─► OTEL Collector receives OTLP from services (4317/4318)
               ├─► Batch processor: waits 10s or 1024 spans
               ├─► Resource processor: adds environment=development
               ├─► Probabilistic sampler: 100% (record all)
               │
               ├─► Tempo (3200): stores complete trace
               │   └─ Trace reconstructed with all spans
               │
               ├─► OpenSearch (9200): stores raw spans
               │   └─ Alternative storage/search
               │
               └─► Debug exporter: console output (development)

Grafana now queries:
├─ Logs from Loki/OpenSearch (with traceId links)
├─ Traces from Tempo (complete request flow)
└─ Both correlated by traceId for debugging
```

### Trace Context Propagation

Each service receives and propagates W3C `traceparent` header:

```
Gateway → Inventory:
  Header: traceparent: 00-{traceId}-{spanId}-01

Inventory → Billing:
  Same traceId propagated
  New spanId for Inventory's child span
```

This ensures all logs and spans from a single user request stay correlated.

---

## Technology Stack & Packages

### Service Dependencies

#### Observability Shared Package (`@myapp/observability`)
```json
{
  "@opentelemetry/api": "^1.7.0",
  "@opentelemetry/sdk-node": "^0.45.0",
  "@opentelemetry/auto-instrumentations-node": "^0.40.0",
  "@opentelemetry/exporter-trace-otlp-grpc": "^0.45.0",
  "@opentelemetry/exporter-metrics-otlp-grpc": "^0.45.0",
  "@opentelemetry/instrumentation-http": "^0.45.0",
  "@opentelemetry/instrumentation-nestjs-core": "^0.34.0",
  "winston": "^3.11.0",
  "nest-winston": "^1.9.4"
}
```

#### Service-Level Dependencies
Each microservice adds:
```json
{
  "@myapp/observability": "file:../shared/observability",
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "winston": "^3.11.0",
  "nest-winston": "^1.9.4"
}
```

### Docker Services (docker-compose.yml)

| Service | Image | Version | Port | Purpose |
|---------|-------|---------|------|---------|
| **OTEL Collector** | `otel/opentelemetry-collector-contrib` | latest | 4317/4318 | Receives and processes OTLP telemetry |
| **Fluent Bit** | `fluent/fluent-bit` | 2.2 | N/A | Collects and ships logs |
| **Tempo** | `grafana/tempo` | latest | 3200 | Distributed trace storage |
| **Loki** | `grafana/loki` | 2.9.3 | 3100 | Log aggregation |
| **OpenSearch** | `opensearchproject/opensearch` | 2.12.0 | 9200 | Logs + traces search storage |
| **Grafana** | `grafana/grafana` | latest | 3300 | Visualization & dashboards |

### Key Package Roles

**OpenTelemetry SDK** (`@opentelemetry/*`)
- Instruments application code
- Collects spans and metrics
- Exports via OTLP protocol

**Auto-Instrumentation** (`auto-instrumentations-node`)
- Zero-code instrumentation
- Covers: HTTP, Express, NestJS, database drivers
- Automatically creates spans for requests

**Winston + nest-winston**
- Structured JSON logging
- Easy NestJS integration
- Trace context injection via custom format

**Fluent Bit**
- Lightweight log collector
- Tails files, parses, transforms, ships
- Lua support for complex filtering (credit card masking)

---

## Implementation Steps

### Step 1: Create Shared Observability Package

Create `shared/observability/package.json`:
```json
{
  "name": "@myapp/observability",
  "version": "1.0.0",
  "main": "dist/tracing.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.45.0",
    "@opentelemetry/exporter-metrics-otlp-grpc": "^0.45.0",
    "@opentelemetry/instrumentation-http": "^0.45.0",
    "@opentelemetry/instrumentation-nestjs-core": "^0.34.0",
    "@nestjs/common": "^10.0.0",
    "winston": "^3.11.0",
    "nest-winston": "^1.9.4"
  }
}
```

### Step 2: Implement Tracing SDK

Create `shared/observability/tracing.ts`:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export function initializeTracing(serviceName: string) {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    }),
    exportIntervalMillis: 10000,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    spanProcessor: new BatchSpanProcessor(traceExporter),
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}
```

### Step 3: Implement Winston Logger

Create `shared/observability/logger.config.ts`:
```typescript
import * as winston from 'winston';
import { trace } from '@opentelemetry/api';

const traceFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId || 'N/A';
  const spanId = span?.spanContext().spanId || 'N/A';
  const traceFlags = span?.spanContext().traceFlags || 0;

  return JSON.stringify({
    timestamp,
    level,
    message,
    traceId,
    spanId,
    traceFlags,
    ...meta,
  });
});

export const loggerConfig = {
  format: winston.format.combine(
    winston.format.timestamp(),
    traceFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
};
```

### Step 4: Initialize in Service

In each microservice's `src/main.ts`:
```typescript
import { initializeTracing } from '@myapp/observability/tracing';

async function bootstrap() {
  // Initialize tracing BEFORE creating app
  initializeTracing('gateway-service');

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

### Step 5: Configure Winston in AppModule

In each service's `src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from '@myapp/observability/logger.config';

@Module({
  imports: [
    WinstonModule.forRoot(loggerConfig),
  ],
})
export class AppModule {}
```

### Step 6: Setup Docker Observability Stack

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector.yaml"]
    volumes:
      - ./observability/otel-collector/otel-collector.yaml:/etc/otel-collector.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - tempo
      - opensearch

  fluent-bit:
    image: fluent/fluent-bit:2.2
    volumes:
      - ./observability/fluent-bit:/fluent-bit/etc:ro
      - ./logs:/fluent-bit/logs:ro
    depends_on:
      - loki
      - opensearch

  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./observability/tempo/tempo.yaml:/etc/tempo.yaml
    ports:
      - "3200:3200"

  loki:
    image: grafana/loki:2.9.3
    command: -config.file=/etc/loki/local-config.yaml
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_INSTALL_PLUGINS=grafana-opensearch-datasource
    ports:
      - "3300:3000"
    volumes:
      - ./observability/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
    depends_on:
      - tempo
      - opensearch

  opensearch:
    image: opensearchproject/opensearch:2.12.0
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
      - plugins.security.disabled=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - "9200:9200"

volumes:
  tempo-data:
  loki-data:
  grafana-data:
```

### Step 7: Configure OTEL Collector

Create `observability/otel-collector/otel-collector.yaml`:
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  
  resource:
    attributes:
      - key: environment
        value: development
        action: insert
  
  probabilistic_sampler:
    sampling_percentage: 100

exporters:
  otlp/tempo:
    endpoint: tempo:14317
    tls:
      insecure: true
  
  opensearch:
    http:
      endpoint: "http://opensearch:9200"
    logs_index: "otel-logs"
    traces_index: "otel-traces"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource, probabilistic_sampler]
      exporters: [otlp/tempo, opensearch]
    
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [opensearch]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: []
```

### Step 8: Configure Fluent Bit

Create `observability/fluent-bit/fluent-bit.conf`:
```conf
[SERVICE]
    Flush        5
    Daemon       Off
    Log_Level    info
    Parsers_File /fluent-bit/etc/parsers.conf

# === Service Logs ===
[INPUT]
    Name              tail
    Path              /fluent-bit/logs/*/error.log
    Parser            json
    Tag               app.error
    Refresh_Interval  5
    Mem_Buf_Limit     5MB

[INPUT]
    Name              tail
    Path              /fluent-bit/logs/*/combined.log
    Parser            json
    Tag               app.combined
    Refresh_Interval  5
    Mem_Buf_Limit     5MB

# === Enrichment ===
[FILTER]
    Name    modify
    Match   *
    Add     environment development
    Add     cluster local

# === Sensitive Data Masking ===
[FILTER]
    Name    lua
    Match   *
    script  /fluent-bit/etc/mask-sensitive.lua
    call    mask_credit_cards

# === Output to Loki ===
[OUTPUT]
    Name        loki
    Match       *
    Host        loki
    Port        3100
    auto_kubernetes_labels on

# === Output to OpenSearch ===
[OUTPUT]
    Name        opensearch
    Match       *
    Host        opensearch
    Port        9200
    Index       service-logs
    Type        _doc
```

### Step 9: Configure Grafana Datasources

Create `observability/grafana/datasources.yml`:
```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      tracesToLogs:
        datasourceUid: 'loki-uid'
    isDefault: false

  - name: OpenSearch
    type: opensearch
    access: proxy
    url: http://opensearch:9200
    jsonData:
      timeField: '@timestamp'
      logMessageField: message
      logLevelField: level
      database: service-logs
    isDefault: false
```

### Step 10: Start the Stack

```bash
docker-compose up -d
```

Access:
- **Grafana**: http://localhost:3300 (admin/admin)
- **OpenSearch**: http://localhost:9200
- **Loki**: http://localhost:3100
- **Tempo**: http://localhost:3200

---

## Configuration Details

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | OTEL Collector gRPC endpoint |
| `NODE_ENV` | `development` | Deployment environment |
| `SERVICE_VERSION` | `1.0.0` | Service version for traces |

### Batch Processing

**OTEL Collector** batches before export:
- **Timeout**: 10 seconds
- **Batch Size**: 1024 spans/logs

This reduces network calls while maintaining reasonable latency.

### Sampling Strategy

**Current**: 100% sampling (all traces collected)

**For production**, adjust in `otel-collector.yaml`:
```yaml
probabilistic_sampler:
  sampling_percentage: 10  # 10% of traces
```

### Indices in OpenSearch

- `service-logs`: Application logs from Fluent Bit
- `otel-logs`: Application logs from OTEL Collector
- `otel-traces`: Complete trace data

Query in Grafana using Lucene syntax:
```
level:error              # Error logs
service:gateway-service  # Gateway service
traceId:abc123*          # Specific trace
```

---

## Best Practices

### 1. **Sampling Strategy**
- **Development**: 100% sampling (all traces)
- **Production**: 10-50% sampling (reduce storage/cost)
- **Errors**: Always sample error traces (implement in code)

### 2. **Log Levels**
```typescript
// Use appropriate levels
logger.error('Critical failure', { userId, error });
logger.warn('Degraded performance', { latency });
logger.info('User action', { action, userId });
logger.debug('Internal details', { stackTrace });
```

### 3. **Manual Span Creation**
Use `@Traced()` decorator for custom logic:
```typescript
import { Traced } from '@myapp/observability/trace.decorator';

@Traced()
async complexLogic() {
  // Automatically wrapped in span
}
```

### 4. **Trace Context Propagation**
W3C `traceparent` header automatically propagates across services. Ensure services call each other using HTTP client with OTEL instrumentation.

### 5. **Sensitive Data**
- Configure Lua filters in Fluent Bit to mask PII
- Never log passwords, API keys, or full credit cards
- Use `mask-sensitive.lua` script for patterns

### 6. **Log Structure**
Keep logs structured and machine-readable:
```typescript
// Good ✅
logger.info('User login', { userId: 123, timestamp: Date.now() });

// Bad ❌
logger.info(`User ${userId} logged in at ${timestamp}`);
```

### 7. **Resource Attributes**
Add meaningful context to resource:
```typescript
[SemanticResourceAttributes.SERVICE_NAME]: serviceName,
[SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
```

### 8. **Error Handling**
Always capture errors in spans:
```typescript
try {
  await operation();
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
}
```

---

## Troubleshooting

### Problem: No Logs Appearing in Grafana

**Check 1**: Logs are being written to files
```bash
ls -la logs/*/error.log
tail -f logs/gateway-service/combined.log
```

**Check 2**: Fluent Bit is reading files
```bash
docker logs fluent-bit
# Should show: "[input_tail] /fluent-bit/logs/*/combined.log ... OK"
```

**Check 3**: Logs are in OpenSearch
```bash
curl http://localhost:9200/service-logs/_search | jq '.hits.total.value'
# Should show > 0
```

**Check 4**: Grafana datasource health
- Go to Grafana → Configuration → Data Sources → OpenSearch
- Click "Save & Test"

### Problem: Traces Not Appearing

**Check 1**: OTEL Collector is receiving data
```bash
docker logs otel-collector | grep "Received"
```

**Check 2**: Services are sending to OTEL Collector
```bash
# In service logs, should show no errors connecting to 4317
docker logs gateway-service | grep "4317\|OTEL"
```

**Check 3**: Tempo is storing traces
```bash
curl http://localhost:3200/api/traces/<traceId>
```

### Problem: High Resource Usage

**Solutions**:
1. Reduce sampling percentage (10% vs 100%)
2. Increase batch processor timeout (15s vs 10s)
3. Reduce Fluent Bit flush interval (10s vs 5s)
4. Disable debug exporter in production
5. Disable unused metrics export

### Problem: Trace Context Not Propagating

**Verify**:
1. Services use OTEL HTTP instrumentation (enabled by default)
2. HTTP client includes `traceparent` header:
   ```bash
   curl -v http://service2:3000/endpoint
   # Should show: traceparent: 00-{traceId}-{spanId}-01
   ```
3. Receiving service has `@opentelemetry/instrumentation-nestjs-core` enabled

### Problem: Credit Card Not Being Masked

**Check 1**: Mask script is loaded
```bash
docker exec fluent-bit cat /fluent-bit/etc/mask-sensitive.lua
```

**Check 2**: Filter is applied to all logs
```conf
[FILTER]
    Name    lua
    Match   *  # This must be * to catch all
    script  /fluent-bit/etc/mask-sensitive.lua
    call    mask_credit_cards
```

**Check 3**: Verify in OpenSearch
```bash
curl -X POST "http://localhost:9200/service-logs/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}, "size": 1}'
# Credit card fields should show masked values
```

---

## Maintenance & Monitoring

### Regular Tasks

**Weekly**:
- Check disk space: `du -sh logs/`
- Review error rates in Grafana
- Verify all services report traces

**Monthly**:
- Update container images (security patches)
- Review and optimize sampling rates
- Archive old indices in OpenSearch (if needed)

**Quarterly**:
- Capacity planning (storage growth)
- Performance tuning (batch sizes, flush intervals)
- Disaster recovery testing

### Useful Queries

**Errors in Last Hour**:
```
level:error | after:1h
```

**Slow Requests** (Tempo):
```
Search for traces with duration > 5s
```

**Service Dependencies**:
Use Tempo Service Map to visualize service communication

### Health Checks

```bash
# OTEL Collector
curl http://localhost:13133/healthz

# OpenSearch
curl http://localhost:9200/_cluster/health

# Loki
curl http://localhost:3100/ready

# Grafana
curl http://localhost:3300/api/health
```

---

## Conclusion

This observability setup provides a solid foundation for microservice monitoring. Key points:

✅ **Easy to adopt**: Shared package simplifies setup  
✅ **Low overhead**: Batch processing, optional sampling  
✅ **Production-ready**: Error handling, graceful shutdown  
✅ **Extensible**: Add more services by copying one package  
✅ **Observable**: Full trace correlation across services  

For questions or improvements, refer to:
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Loki Docs](https://grafana.com/docs/loki/)
- [Tempo Docs](https://grafana.com/docs/tempo/)

---

**Last Updated**: May 2026  
**Status**: Production Ready  
**Version**: 1.0
