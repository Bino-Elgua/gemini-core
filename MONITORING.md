# Monitoring & Observability Guide
## Sacred Core - Performance, Reliability & Alerts

---

## Overview

Sacred Core includes comprehensive monitoring across:
- **Performance:** Response times, throughput, latency percentiles
- **Reliability:** Success rates, error tracking, provider health
- **Usage:** Cost tracking, operation counts, quotas
- **Infrastructure:** Service health, database performance

---

## Performance Monitoring

### Real-Time Metrics

```typescript
import { performanceMonitoringService } from './services/performanceMonitoringService';

// Get metrics for a provider
const metrics = await performanceMonitoringService.getProviderMetrics('openai');
console.log(metrics);
// {
//   provider: 'openai',
//   operationCount: 5000,
//   successCount: 4987,
//   failureCount: 13,
//   successRate: 99.74,
//   avgResponseTime: 245,    // ms
//   minResponseTime: 50,
//   maxResponseTime: 2840,
//   p50ResponseTime: 210,    // Median
//   p95ResponseTime: 850,    // 95th percentile
//   p99ResponseTime: 1420    // 99th percentile
// }
```

### All Providers Dashboard

```typescript
// Get metrics for all providers
const allMetrics = await performanceMonitoringService.getAllProviderMetrics();
// Sorted by operation count
```

### By Operation Type

```typescript
// Get metrics filtered by operation
const imageMetrics = await performanceMonitoringService.getMetricsByOperationType('image_generation');
// Compare all providers for image generation
```

---

## Health Checks

### Provider Health Status

```typescript
// Check if a provider is healthy (>95% success rate)
const isHealthy = await performanceMonitoringService.isProviderHealthy('openai');

if (!isHealthy) {
  // Fall back to another provider
  console.warn('OpenAI is degraded, using fallback');
}
```

### Complete Health Summary

```typescript
const health = await performanceMonitoringService.getProviderHealth();
// {
//   'openai': {
//     healthy: true,
//     successRate: 99.74,
//     avgResponseTime: 245
//   },
//   'stability-ultra': {
//     healthy: true,
//     successRate: 99.92,
//     avgResponseTime: 1200
//   },
//   'google-veo': {
//     healthy: false,  // ⚠️ Issues detected
//     successRate: 92.3,
//     avgResponseTime: 2500
//   }
// }

// Alert on unhealthy providers
for (const [provider, status] of Object.entries(health)) {
  if (!status.healthy) {
    sendAlert(`${provider} is degraded: ${status.successRate}% success rate`);
  }
}
```

---

## Error Tracking

### Get Failed Operations

```typescript
// Get recent failures
const failures = await performanceMonitoringService.getFailedOperations(10);
failures.forEach(failure => {
  console.log(`
    Provider: ${failure.provider}
    Type: ${failure.operationType}
    Error: ${failure.errorMessage}
    Time: ${failure.timestamp}
  `);
});
```

### Success Rate by Provider

```typescript
const rates = await performanceMonitoringService.getSuccessRateByProvider();
// {
//   'openai': 99.74,
//   'stability-ultra': 99.92,
//   'google-veo': 92.30  // ⚠️
// }

// Alert on low success rates
for (const [provider, rate] of Object.entries(rates)) {
  if (rate < 95) {
    sendAlert(`${provider} has low success rate: ${rate}%`);
  }
}
```

### Error Rate Tracking

```typescript
const errors = await performanceMonitoringService.getErrorRateByProvider();
// {
//   'openai': 0.26,
//   'stability-ultra': 0.08,
//   'google-veo': 7.70  // ⚠️ High error rate
// }
```

---

## Performance Trends

### Response Time Trend

```typescript
// Get 30-day trend
const trend = await performanceMonitoringService.getResponseTimeTrend(30);
// [
//   {
//     date: '2026-01-10',
//     avgResponseTime: 200,
//     operationCount: 500
//   },
//   {
//     date: '2026-01-11',
//     avgResponseTime: 250,  // Getting slower
//     operationCount: 650
//   },
//   // ...
// ]
```

### Slowest Operations

```typescript
// Find performance bottlenecks
const slowest = await performanceMonitoringService.getSlowestOperations(20);
slowest.forEach(op => {
  if (op.duration > 2000) {
    console.warn(`⚠️ Slow operation: ${op.provider} took ${op.duration}ms`);
  }
});
```

---

## Integration with Sentry

### Automatic Error Tracking

```typescript
import * as Sentry from '@sentry/react';

// Initialize Sentry
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Errors automatically tracked
try {
  const result = await generateCampaign(...);
} catch (error) {
  Sentry.captureException(error);
}
```

### Performance Monitoring with Sentry

```typescript
// Sentry automatically tracks:
// - Page load performance
// - API response times
// - Error rates
// - Resource usage
// - User interactions

// Custom performance tracking
const transaction = Sentry.startTransaction({
  name: 'campaign.generate',
  op: 'http.client'
});

try {
  const campaign = await generateCampaign(...);
} finally {
  transaction.finish();
}
```

---

## Dashboards

### Admin Dashboard

Access metrics at `/admin`:

**Performance Tab:**
- Response times by provider
- Success rates
- Error trends
- Health status

**Cost Tab:**
- Daily spending
- Cost by provider
- Cost efficiency
- Quota usage

**Operations Tab:**
- Operation counts
- Throughput metrics
- Peak usage times
- Usage patterns

### Custom Dashboards

```typescript
// Build custom dashboard data
const allMetrics = await performanceMonitoringService.getAllProviderMetrics();
const costSummary = await costTrackingService.getCostSummary(30);
const costTrend = await costTrackingService.getDailyCostTrend(30);

// Display in your dashboard
dashboard.render({
  metrics: allMetrics,
  costs: costSummary,
  trend: costTrend
});
```

---

## Alerting

### Alert Thresholds

Configure in admin dashboard:

**Performance Alerts:**
- Response time > 2000ms
- Success rate < 95%
- Error spike > 2x normal

**Cost Alerts:**
- Daily spend > budget * 1.5
- Monthly spend > monthly budget
- Quota nearly exhausted (80%)

**System Alerts:**
- Service unavailable
- High error rate
- Database slow queries

### Custom Alerts

```typescript
// Daily health check
async function dailyHealthCheck() {
  const health = await performanceMonitoringService.getProviderHealth();
  const costs = await costTrackingService.getCostSummary(1);

  const alerts = [];

  // Check health
  for (const [provider, status] of Object.entries(health)) {
    if (!status.healthy) {
      alerts.push({
        severity: 'warning',
        message: `${provider} success rate: ${status.successRate}%`
      });
    }
  }

  // Check costs
  if (costs.totalCost > DAILY_LIMIT * 1.5) {
    alerts.push({
      severity: 'critical',
      message: `Daily cost spike: $${costs.totalCost}`
    });
  }

  // Send alerts
  if (alerts.length > 0) {
    sendAlertsToOncall(alerts);
  }
}
```

---

## Exporting Data

### Export Metrics

```typescript
// Export as CSV
const csv = await performanceMonitoringService.exportAsCSV();
downloadFile(csv, 'performance-metrics.csv');

// Export as JSON
const json = await performanceMonitoringService.exportAsJSON();
downloadFile(json, 'performance-metrics.json');
```

### Generate Reports

```typescript
// Weekly performance report
async function generateWeeklyReport() {
  const metrics = await performanceMonitoringService.getAllProviderMetrics();
  const costs = await costTrackingService.getCostSummary(7);
  const trend = await costTrackingService.getDailyCostTrend(7);

  return {
    period: 'Last 7 days',
    providers: metrics,
    totalCost: costs.totalCost,
    costTrend: trend,
    timestamp: new Date()
  };
}
```

---

## Maintenance

### Clear Old Data

```typescript
// Clean up metrics older than 90 days
const metricsRemoved = await performanceMonitoringService.clearOldMetrics(90);
console.log(`Cleared ${metricsRemoved} old metrics`);

// Clean up cost logs older than 90 days
const logsRemoved = await costTrackingService.clearOldLogs(90);
console.log(`Cleared ${logsRemoved} old logs`);
```

### Reset Data (for testing)

```typescript
// WARNING: Destructive operation
await performanceMonitoringService.reset();
await costTrackingService.reset();
```

---

## Troubleshooting

### No Metrics Showing

1. **Check initialization**
   ```typescript
   await performanceMonitoringService.initialize();
   await costTrackingService.initialize();
   ```

2. **Verify storage**
   ```typescript
   const metrics = await hybridStorage.get('performance-metrics');
   console.log('Metrics stored:', metrics?.length || 0);
   ```

3. **Check operations are being logged**
   ```typescript
   const summary = await performanceMonitoringService.getAllProviderMetrics();
   console.log('Operations:', summary);
   ```

### Metrics Inaccurate

1. **Verify timestamp accuracy**
   ```typescript
   const metrics = await hybridStorage.get('performance-metrics');
   metrics.forEach(m => console.log(m.timestamp));
   ```

2. **Check cost calculation**
   ```typescript
   const estimated = costTrackingService.estimateCost('openai', 'text_generation');
   console.log('Estimated cost:', estimated);
   ```

### Missing Provider Data

1. **Ensure operations are using provider**
   ```typescript
   const { providers } = useStore.getState();
   console.log('Active provider:', providers.activeLLM);
   ```

2. **Verify service is tracking**
   ```typescript
   // Manually log
   await performanceMonitoringService.recordMetric({
     provider: 'test',
     operationType: 'text_generation',
     duration: 100,
     success: true
   });
   ```

---

## Best Practices

1. **Monitor continuously** - Don't wait for problems
2. **Set thresholds** - Define acceptable performance levels
3. **Alert early** - React before issues impact users
4. **Review trends** - Identify patterns and optimize
5. **Clean data** - Remove old metrics to save storage
6. **Export regularly** - Backup and analyze data
7. **Respond quickly** - Act on alerts immediately
8. **Communicate** - Share metrics with team

---

**Next:** [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
