# Observability Implementation Checklist

Use this checklist to implement the observability setup in your project.

---

## Phase 1: Setup Shared Observability Package

- [ ] Create directory: `shared/observability/`
- [ ] Create `shared/observability/package.json` with OTEL dependencies
- [ ] Create `shared/observability/tsconfig.json`
- [ ] Create `shared/observability/tracing.ts` with `initializeTracing()` function
- [ ] Create `shared/observability/logger.config.ts` with Winston + trace context
- [ ] Create `shared/observability/trace.decorator.ts` for `@Traced()` decorator
- [ ] Create `shared/observability/trace.interceptor.ts` for automatic HTTP tracing
- [ ] Run: `npm install` in `shared/observability/`
- [ ] Run: `npm run build` to verify TypeScript compilation
- [ ] Verify exports in `package.json` for all modules

---

## Phase 2: Update Each Microservice

For each service (gateway, billing, inventory):

### 2.1: Update Dependencies
- [ ] Add `@myapp/observability` to `package.json`: 
  ```json
  "@myapp/observability": "file:../shared/observability"
  ```
- [ ] Run: `npm install`

### 2.2: Initialize Tracing
- [ ] Open `src/main.ts`
- [ ] Add at top:
  ```typescript
  import { initializeTracing } from '@myapp/observability/tracing';
  ```
- [ ] Call in `bootstrap()` BEFORE creating app:
  ```typescript
  initializeTracing('gateway-service');
  ```

### 2.3: Configure Winston Logger
- [ ] Open `src/app.module.ts`
- [ ] Add import:
  ```typescript
  import { WinstonModule } from 'nest-winston';
  import { loggerConfig } from '@myapp/observability/logger.config';
  ```
- [ ] Add to imports:
  ```typescript
  WinstonModule.forRoot(loggerConfig),
  ```
- [ ] Register trace interceptor as global
- [ ] Update logger calls: `this.logger.info('message', { context })`

### 2.4: Create Log Directories
- [ ] Create: `logs/gateway-service/` (and billing, inventory)
- [ ] Add `.gitkeep` to log directories
- [ ] Update `.gitignore` to exclude log files: `logs/**/*.log`

### 2.5: Verify Service Runs
- [ ] Start service: `npm start` or `npm run start:dev`
- [ ] Check for OTEL initialization logs
- [ ] Verify no errors connecting to `localhost:4317`
- [ ] Make test request to service
- [ ] Verify log files are created in `logs/service-name/`
- [ ] Verify logs contain `traceId`, `spanId`, `traceFlags`

---

## Phase 3: Docker Infrastructure

### 3.1: Create Observability Config Files
- [ ] Create `observability/otel-collector/otel-collector.yaml`
- [ ] Create `observability/fluent-bit/fluent-bit.conf`
- [ ] Create `observability/fluent-bit/parsers.conf`
- [ ] Create `observability/fluent-bit/mask-sensitive.lua`
- [ ] Create `observability/tempo/tempo.yaml`
- [ ] Create `observability/grafana/datasources.yml`

### 3.2: Create docker-compose.yml
- [ ] Create root-level `docker-compose.yml`
- [ ] Include services:
  - [ ] otel-collector (ports 4317, 4318)
  - [ ] fluent-bit
  - [ ] tempo (port 3200)
  - [ ] loki (port 3100)
  - [ ] grafana (port 3300)
  - [ ] opensearch (port 9200)
- [ ] Setup volume mounts:
  - [ ] `./logs:/fluent-bit/logs:ro` for Fluent Bit
  - [ ] `./observability/*/` config files
  - [ ] Named volumes for persistence

### 3.3: Start Infrastructure
- [ ] Run: `docker-compose up -d`
- [ ] Verify all containers are healthy:
  ```bash
  docker-compose ps
  # All should show "healthy" or "running"
  ```
- [ ] Check container logs:
  ```bash
  docker logs otel-collector
  docker logs fluent-bit
  docker logs grafana
  ```

---

## Phase 4: Verify Integration

### 4.1: Service-to-Collector Communication
- [ ] Start one microservice locally
- [ ] Make API request to service
- [ ] Check OTEL Collector logs:
  ```bash
  docker logs otel-collector | grep "Received"
  ```
  Should show received spans/metrics

### 4.2: Logs in Fluent Bit
- [ ] Verify log files are created:
  ```bash
  ls -la logs/gateway-service/
  ```
- [ ] Check Fluent Bit is tailing:
  ```bash
  docker logs fluent-bit | grep "tail"
  ```

### 4.3: Data in OpenSearch
- [ ] Query service-logs index:
  ```bash
  curl http://localhost:9200/service-logs/_count
  ```
  Should return count > 0

- [ ] Query otel-traces index:
  ```bash
  curl http://localhost:9200/otel-traces/_count
  ```

### 4.4: Grafana Datasources
- [ ] Open Grafana: http://localhost:3300 (admin/admin)
- [ ] Go to: Configuration → Data Sources
- [ ] Verify all datasources exist:
  - [ ] Loki (green checkmark when tested)
  - [ ] Tempo (green checkmark when tested)
  - [ ] OpenSearch (green checkmark when tested)

### 4.5: View Logs in Grafana
- [ ] Open Grafana Explore
- [ ] Select Loki datasource
- [ ] Run query: `{job="fluentbit"}`
- [ ] Should show recent logs with traceId

### 4.6: View Traces in Grafana
- [ ] Select Tempo datasource
- [ ] Click "Search"
- [ ] Should list recent traces with latency

---

## Phase 5: Service-to-Service Communication

- [ ] Make request from Gateway → Inventory → Billing
- [ ] In Grafana Tempo, find the trace
- [ ] Verify all three services appear in trace
- [ ] Verify `traceparent` header propagated:
  ```bash
  # Check in request logs for traceparent header
  ```
- [ ] Click on trace to see full timeline
- [ ] Correlate logs with trace using traceId

---

## Phase 6: Advanced Features

### 6.1: Custom Spans
- [ ] Add `@Traced()` decorator to custom methods:
  ```typescript
  @Traced()
  async complexLogic() {
    // Automatically wrapped in span
  }
  ```
- [ ] Verify in Tempo: new span appears under service

### 6.2: Error Handling
- [ ] Throw error in service
- [ ] Verify error appears in Grafana Loki logs
- [ ] Verify error span shows in Tempo
- [ ] Query errors in Loki: `level:error`

### 6.3: Sensitive Data Masking
- [ ] Log a credit card number: `4532-1111-2222-3333`
- [ ] Check OpenSearch: should be masked
- [ ] Verify in `mask-sensitive.lua` is running

### 6.4: Custom Resource Attributes
- [ ] Add environment variable: `DEPLOYMENT_ENVIRONMENT=staging`
- [ ] Restart service
- [ ] Verify in trace resource attributes

---

## Phase 7: Production Checklist

- [ ] Sampling reduced to 10-50% in otel-collector.yaml
- [ ] Debug exporter disabled in otel-collector.yaml
- [ ] Sensitive data filtering enabled in Fluent Bit
- [ ] Error logging configured appropriately
- [ ] Resource attributes set correctly for environment
- [ ] Batch processor timeouts tuned for load
- [ ] Alerts configured in Grafana
- [ ] Backup/retention policy for OpenSearch indices
- [ ] Load testing performed (verify no bottlenecks)
- [ ] Team trained on Grafana dashboards and queries

---

## Phase 8: Documentation

- [ ] Team has copy of OBSERVABILITY_SETUP_GUIDE.md
- [ ] Dashboard examples documented
- [ ] Query syntax reference provided
- [ ] Troubleshooting guide shared
- [ ] On-call runbook created for observability issues
- [ ] Architecture diagram saved in wiki/docs

---

## Common Issues & Fixes

### Issue: "OTEL not initializing"
- [ ] Verify `initializeTracing()` called BEFORE `NestFactory.create()`
- [ ] Check NODE_ENV set correctly
- [ ] Verify `@myapp/observability` installed

### Issue: "Logs not appearing"
- [ ] Check `logs/service-name/` directories exist
- [ ] Verify Winston file transports configured
- [ ] Check Fluent Bit volume mount: `./logs:/fluent-bit/logs:ro`
- [ ] Restart Fluent Bit: `docker restart fluent-bit`

### Issue: "Traces missing"
- [ ] Check OTEL_EXPORTER_OTLP_ENDPOINT points to localhost:4317
- [ ] Verify otel-collector container running
- [ ] Check service logs for OTEL errors
- [ ] Verify tracing.ts properly imported

### Issue: "Grafana shows no data"
- [ ] Verify datasource type is `opensearch` (not `elasticsearch`)
- [ ] Check OpenSearch port 9200 accessible
- [ ] Verify indices exist: `curl http://localhost:9200/_cat/indices`
- [ ] Check datasource credentials/connection

---

## Support & Resources

- **OTEL Documentation**: https://opentelemetry.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **Loki Queries**: https://grafana.com/docs/loki/latest/logql/
- **Tempo Queries**: https://grafana.com/docs/tempo/latest/querying/
- **OpenSearch Docs**: https://opensearch.org/docs/

---

**Last Updated**: May 2026  
**Version**: 1.0
