# Grafana Observability Quick Reference

Quick commands and queries for the observability stack.

---

## Grafana Access

**URL**: http://localhost:3300  
**Default Credentials**: admin/admin  
**Change Password**: First login recommended

---

## Loki Queries (Logs)

### Basic Queries

```logql
# All logs
{job="fluentbit"}

# Specific service
{service="gateway-service"}

# Error logs only
{level="error"}

# Combined filter
{service="gateway-service", level="error"}

# Contains text
{job="fluentbit"} |= "failed"

# Does NOT contain
{job="fluentbit"} != "success"
```

### Advanced Queries

```logql
# Error rate in last hour
count_over_time({level="error"} [1h])

# Errors per service
sum by (service) (count_over_time({level="error"} [5m]))

# Response time by traceId
{job="fluentbit"} | json | duration_ms > 1000

# Failed requests
{job="fluentbit"} | json message =~ "error|failed|exception"

# Log stats
{job="fluentbit"} | stats count() as total, count_distinct(traceId) as traces
```

### Filter Patterns

```logql
# By level
level="debug"
level="info"
level="warn"
level="error"

# By service
service="gateway-service"
service="billing-service"
service="inventory-service"

# By environment
environment="development"
environment="staging"
environment="production"
```

---

## Tempo Queries (Traces)

### Service Map
Shows dependencies between services:
- Click **Service Map** tab in Explore
- See which services call which
- Click service to zoom into traces

### Trace Search

```
# All traces
No filter

# By duration
Min Duration: 500ms
Max Duration: 5000ms

# By service name
gateway-service

# By error status
Status: error

# By operation
spanKind=server (inbound requests)
spanKind=client (outbound calls)
```

### Common Use Cases

**Find Slow Requests**:
1. Open Explore
2. Select Tempo
3. Click Search
4. Set Min Duration: 1000ms
5. Sort by Duration descending

**Find Errors**:
1. Open Explore
2. Select Tempo
3. Click Search
4. Status: error
5. View error message in trace

**Trace a Specific User Request**:
1. Find traceId in logs
2. Open Tempo
3. Search → Search by Trace ID
4. Paste traceId
5. See full request flow across services

---

## OpenSearch Queries (Logs + Traces)

### Basic Lucene Syntax

```
# Exact match
level:error

# Wildcard
message:*failed*

# Range
@timestamp:[now-1h TO now]

# Logical operators
level:error AND service:gateway-service
level:error OR level:warn
NOT level:debug

# Phrase
message:"user not found"
```

### Advanced Queries

```
# Find by traceId
traceId:abc123def456

# Search in specific field
message:timeout

# Multiple conditions
level:error AND service:billing-service AND @timestamp:[now-1d TO now]

# Count by service
service:*  [aggregation: count by service]

# Errors with latency
level:error AND latency:>1000
```

### Useful Patterns

```
# API Errors
path:/api/* AND statusCode:[400 TO 599]

# Database Issues
message:*database* OR message:*connection*

# Timeout errors
message:timeout OR message:TIMEOUT OR duration:>5000

# Service startup logs
message:*started* OR message:*initialized*

# User activity
action:login OR action:logout OR action:signup
```

---

## Common Workflows

### 1. **Investigate Error Alert**

1. **Check Loki for error logs**:
   ```logql
   {level="error"} | json
   ```

2. **Get traceId from log**:
   - Look for `traceId` field in log entry

3. **Open Tempo with traceId**:
   - Search → Search by Trace ID
   - Paste traceId

4. **View full trace**:
   - See which service caused error
   - Check latency of each span
   - Look for exceptions recorded

5. **Correlate with other logs**:
   - Search Loki with same traceId
   - See all logs from same request

### 2. **Debug Slow Request**

1. **Find slow traces in Tempo**:
   - Set Min Duration: 1000ms
   - Sort by Duration

2. **Identify bottleneck**:
   - Look for longest-running span
   - Check if external call or local logic

3. **Check logs from that service**:
   - Filter Loki by service name
   - Look for debug-level details

4. **Check resource usage**:
   - If multiple slow traces
   - Check system resources (CPU/memory)

### 3. **Trace User Request End-to-End**

1. **User reports issue**:
   - Get timestamp from user (or approximate)

2. **Find in Loki**:
   - Search logs near that time
   - Filter by user ID if logged
   - Find related traceId

3. **Open Tempo**:
   - Search by traceId
   - See complete request flow:
     - Gateway request
     - Inventory call
     - Billing call
     - Response

4. **Drill into each service**:
   - Click span to see details
   - Check latency
   - Look for errors or warnings

5. **Correlate with logs**:
   - View all logs from same trace
   - Understand what happened at each step

### 4. **Monitor Service Health**

1. **Service availability**:
   ```logql
   {service="gateway-service"} | json | status="running"
   ```

2. **Error rate**:
   ```logql
   sum(rate({level="error"}[5m])) by (service)
   ```

3. **Response times**:
   - Tempo: View Service Map
   - Check latency metrics per service

4. **Dependencies**:
   - Tempo: Service Map shows which services call which
   - Identify if one service is slow
   - See cascading effects

### 5. **Debug Service-to-Service Communication**

1. **Verify traceparent header**:
   - Check logs for `traceparent` in request
   - Should show parent traceId and spanId

2. **Check trace flow**:
   - Tempo: Search
   - Select calling service
   - See if called service appears

3. **Look for errors at boundary**:
   - Search logs at service entry points
   - Check for network/timeout errors

---

## Dashboard Examples

### Service Overview Dashboard

**Panels to create**:
1. **Error Rate** (last 1h)
   ```logql
   sum by (service) (rate({level="error"}[1m]))
   ```

2. **Request Count** (last 1h)
   ```logql
   sum by (service) (count_over_time({service=~".*"}[1m]))
   ```

3. **Slow Requests** (>1s)
   ```logql
   sum by (service) (count_over_time({duration_ms>1000}[5m]))
   ```

4. **Service Dependencies**
   - Panel Type: Node Graph
   - Data Source: Tempo
   - Query: Select all services

### Request Tracing Dashboard

**Panels**:
1. **Recent Traces**
   - Data Source: Tempo
   - Show last 20 traces
   - Colored by status (error/success)

2. **Trace Duration Stats**
   - Min/Max/Avg duration
   - P50/P95/P99 latency

3. **Service Latency Breakdown**
   - Bar chart: avg latency per service

### Troubleshooting Dashboard

**Panels**:
1. **Errors (Last 1h)**
   ```logql
   {level="error"} | json | line_format "{{.service}}: {{.message}}"
   ```

2. **Error Rate Trend**
   ```logql
   rate({level="error"}[5m])
   ```

3. **Failed Requests by Service**
   ```logql
   sum by (service) (count_over_time({statusCode>=400}[5m]))
   ```

4. **Recent Error Traces**
   - Data Source: Tempo
   - Status: error

---

## Keyboard Shortcuts & Navigation

| Action | Shortcut |
|--------|----------|
| Open Dashboard List | Ctrl+K |
| Open Command Palette | Ctrl+Shift+P |
| Go to Home | Click Grafana Logo |
| Search Dashboards | Ctrl+F |
| Refresh Dashboard | Ctrl+R |
| Fullscreen Panel | Click Panel → Fullscreen |
| Open Explore | Grafana Menu → Explore |
| Copy Dashboard Link | Click Share → Copy Dashboard Link |

---

## Alert Examples

### Alert: High Error Rate

**Condition**:
```
Avg(errors_per_minute) > 10
```

**Action**: Notify Slack channel #alerts

### Alert: High Latency

**Condition**:
```
Avg(request_duration_ms) > 1000
  for 5 minutes
```

**Action**: Page on-call engineer

### Alert: Service Down

**Condition**:
```
count(traces_in_last_5m) == 0
```

**Action**: Critical page

---

## Performance Tips

### Optimize Queries

1. **Use time filters**:
   - Always specify time range (not `Last 7 days` if not needed)
   - Narrower ranges = faster queries

2. **Use specific labels**:
   ```logql
   # Fast ✅
   {service="gateway-service"}
   
   # Slower ❌
   {job="fluentbit"}
   ```

3. **Avoid expensive operations**:
   ```
   # Slower: regex on every log
   {service=~".*service.*"}
   
   # Faster: exact match
   {service="gateway-service"}
   ```

4. **Use aggregations**:
   ```
   # Group and count (faster than viewing all logs)
   {level="error"} | stats count() by service
   ```

---

## Troubleshooting

### "No data in Loki"
- Verify Fluent Bit logs show tailing: `docker logs fluent-bit`
- Check logs exist: `ls -la logs/*/`
- Restart Fluent Bit: `docker restart fluent-bit`

### "Traces not appearing in Tempo"
- Check OTEL Collector: `docker logs otel-collector`
- Verify service sends to 4317: Check service logs
- Check Tempo container: `docker logs tempo`

### "OpenSearch shows 0 documents"
- Query directly: `curl http://localhost:9200/_cat/indices`
- Check index exists: `curl http://localhost:9200/service-logs/_count`
- Verify Fluent Bit is shipping: `docker logs fluent-bit`

### "Grafana datasource test failing"
- Check OpenSearch port 9200 is accessible
- Verify credentials in datasource config
- Restart Grafana: `docker restart grafana`

---

## Resources

- **Loki Query Language**: https://grafana.com/docs/loki/latest/logql/
- **PromQL (Metrics)**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Grafana Dashboard Guide**: https://grafana.com/docs/grafana/latest/dashboards/
- **Tempo Search**: https://grafana.com/docs/tempo/latest/querying/

---

**Last Updated**: May 2026  
**Version**: 1.0
