# Cost Tracking Guide
## Sacred Core - API Usage & Billing

---

## Overview

Sacred Core includes comprehensive cost tracking across all AI providers. Every API call is logged with its associated cost, enabling real-time budget monitoring and optimization.

---

## How It Works

### Automatic Cost Logging

Every API operation automatically tracks cost:

```typescript
// LLM text generation
const result = await universalAiService.generateText({
  prompt: "Your prompt",
  // Cost automatically logged!
});

// Image generation
const image = await imageGenerationService.generate({
  prompt: "Your prompt",
  provider: "stability-ultra",
  // Cost automatically logged!
});

// Video generation (queued)
const video = await videoGenerationService.generate({
  prompt: "Your prompt",
  provider: "google-veo",
  // Cost automatically logged!
});
```

### Cost Calculation

Costs are estimated based on provider rates and operation complexity:

```typescript
// Estimate costs
const cost = costTrackingService.estimateCost('openai', 'text_generation');
// Returns: 0.003 (GPT-4 rate)

const imageCost = costTrackingService.estimateCost('stability-ultra', 'image_generation');
// Returns: 0.025
```

---

## Provider Costs

### LLM Providers

| Provider | Cost per Token | Notes |
|----------|---|---|
| Gemini | $0.0001 | Most economical |
| DeepSeek | $0.001 | Fast, reliable |
| Groq | $0.0001 | Ultra-fast |
| Mistral | $0.0007 | Balanced |
| Anthropic | $0.0015 | Highest quality |
| OpenAI | $0.003 | Most capable |

**Recommendation:** Use Groq for speed, Gemini for cost, OpenAI for capability.

### Image Providers

| Provider | Cost per Image | Notes |
|----------|---|---|
| Leonardo | $0.005 | Cheapest quality image |
| Kling | $0.010 | Fast generation |
| Black Forest | $0.008 | High quality |
| Stability Ultra | $0.025 | Best balance |
| Recraft | $0.015 | Good quality |
| Adobe Firefly | $0.012 | Creative |
| DALLE-4 | $0.08 | Most capable |
| Midjourney | $0.10 | Highest quality |

**Recommendation:** Leonardo for cost, Stability Ultra for quality, Midjourney for premium.

### Video Providers

| Provider | Cost per Video | Notes |
|----------|---|---|
| Kling | $0.05 | Budget option |
| Runway | $0.10 | General purpose |
| Luma | $0.08 | Balanced |
| LTX-2 | $0.12 | High quality |
| Veo | $0.15 | Very good quality |
| Sora | $0.20 | Best quality |

**Recommendation:** Kling for cost, Veo for quality, Sora for premium content.

---

## Accessing Cost Data

### Get Current Summary

```typescript
import { costTrackingService } from './services/costTrackingService';

// 30-day cost summary
const summary = await costTrackingService.getCostSummary(30);
console.log(summary);
// {
//   totalCost: 156.78,
//   costByProvider: {
//     'openai': 45.20,
//     'stability-ultra': 78.90,
//     'google-veo': 32.68
//   },
//   costByOperation: {
//     'text_generation': 45.20,
//     'image_generation': 78.90,
//     'video_generation': 32.68
//   },
//   costByDay: {
//     '2026-02-08': 15.45,
//     '2026-02-07': 12.30,
//     // ...
//   },
//   operationCount: {
//     'text_generation': 15000,
//     'image_generation': 3000,
//     'video_generation': 200
//   }
// }
```

### Cost by Provider

```typescript
const costByProvider = await costTrackingService.getCostByProvider();
// {
//   'openai': 45.20,
//   'stability-ultra': 78.90,
//   'google-veo': 32.68,
//   'gemini': 1.50,
//   // ...
// }
```

### Provider Efficiency

```typescript
const efficiency = await costTrackingService.getProviderEfficiency();
// {
//   'openai': {
//     avgCost: 0.003,
//     totalCost: 45.20,
//     operationCount: 15000
//   },
//   'stability-ultra': {
//     avgCost: 0.026,
//     totalCost: 78.90,
//     operationCount: 3000
//   },
//   // ...
// }
```

### Daily Trends

```typescript
const trend = await costTrackingService.getDailyCostTrend(30);
// [
//   { date: '2026-01-10', cost: 2.50, operations: 100 },
//   { date: '2026-01-11', cost: 3.20, operations: 125 },
//   { date: '2026-01-12', cost: 4.80, operations: 200 },
//   // ...
// ]
```

### Most Expensive Operations

```typescript
const expensive = await costTrackingService.getMostExpensiveOperations(10);
// Returns top 10 most expensive API calls
```

---

## Quota Management

### Check User Quota

```typescript
const limit = 100; // $100 per month

// Check if under budget
const isUnderBudget = await costTrackingService.checkQuota(limit);
if (isUnderBudget) {
  console.log('✅ Under budget');
} else {
  console.log('❌ Budget exceeded');
}

// Get remaining budget
const remaining = await costTrackingService.getRemainingQuota(limit);
console.log(`Remaining: $${remaining.toFixed(2)}`);
```

### Enforce Quotas

```typescript
// In campaign generation service
const remaining = await costTrackingService.getRemainingQuota(100);
if (remaining < 10) {
  throw new Error('Budget nearly exhausted. Please add credits.');
}

// Proceed with operation
const campaign = await generateCampaign(...);
```

---

## Cost Optimization Strategies

### 1. Use Cheaper Providers for High-Volume Tasks
```typescript
// Instead of:
const result = await universalAiService.generateText({
  prompt: "Simple classification task",
  // This will use default (expensive) provider
});

// Do this:
const result = await universalAiService.generateText({
  prompt: "Simple classification task",
  modelOverride: "groq", // Ultra-cheap, fast
});
```

### 2. Batch Operations
```typescript
// Instead of 100 individual calls:
const results = await Promise.all([
  generateCampaign(...),
  generateCampaign(...),
  // ...
]);

// Do batching:
const campaigns = await campaignService.generateBatch([
  {...},
  {...},
  // ...
]);
```

### 3. Cache Results
```typescript
// Enable caching (bypass=false, default)
const result = await universalAiService.generateText({
  prompt: "Common prompt",
  bypassCache: false, // Cache this result
});

// Same prompt hits cache (0 cost)
const result2 = await universalAiService.generateText({
  prompt: "Common prompt",
  bypassCache: false, // Returns cached result
});
```

### 4. Progressive Provider Selection
```typescript
// High-quality needs: Use expensive provider
const premium = await universalAiService.generateText({
  prompt: "Client-facing copy",
  modelOverride: "openai",
});

// Internal uses: Use cheaper provider
const internal = await universalAiService.generateText({
  prompt: "Internal analysis",
  modelOverride: "groq",
});
```

---

## Cost Reports

### Export as CSV

```typescript
const csv = await costTrackingService.exportAsCSV();
// Download and analyze in Excel/Sheets
```

### Export as JSON

```typescript
const json = await costTrackingService.exportAsJSON();
// Use in custom dashboards
```

### Admin Dashboard

Access cost dashboards at `/admin`:
- Real-time cost tracking
- Cost breakdown by provider
- Daily/monthly trends
- Provider efficiency comparisons
- Per-user cost allocation

---

## Alerts & Notifications

### Budget Threshold Alerts

Configure in admin dashboard:
```
- Alert at 50% of budget
- Alert at 75% of budget
- Hard limit at 100%
```

### Cost Anomaly Detection

Monitor for unusual usage:
```typescript
// Example: Cost jumped 2x normal daily spend
const trend = await costTrackingService.getDailyCostTrend(30);
const avgDaily = trend.reduce((sum, d) => sum + d.cost, 0) / trend.length;
const today = trend[trend.length - 1];

if (today.cost > avgDaily * 2) {
  console.warn('⚠️ Unusual cost spike detected');
}
```

---

## Cost Control Best Practices

1. **Monitor regularly** - Check costs daily
2. **Set budgets** - Use quota enforcement
3. **Optimize providers** - Use cheaper options for simple tasks
4. **Cache aggressively** - Reuse results when possible
5. **Batch operations** - Group similar tasks
6. **Review trends** - Identify cost patterns
7. **Test in dev** - Use cheap providers in development
8. **Alert early** - Set thresholds before overspend

---

## Troubleshooting

### Costs Seem High

1. **Check provider selection** - Are you using expensive providers?
   ```typescript
   const { providers } = useStore.getState();
   console.log('Active LLM:', providers.activeLLM);
   ```

2. **Review operation types** - Image/video more expensive than text
   ```typescript
   const summary = await costTrackingService.getCostSummary(7);
   console.log('Cost by operation:', summary.costByOperation);
   ```

3. **Analyze top costs** - What's using budget?
   ```typescript
   const expensive = await costTrackingService.getMostExpensiveOperations(20);
   console.log(expensive);
   ```

### Costs Not Tracking

1. **Verify service initialization**
   ```typescript
   await costTrackingService.initialize();
   ```

2. **Check storage**
   ```typescript
   const logs = await hybridStorage.get('cost-tracking-logs');
   console.log('Logs count:', logs?.length);
   ```

3. **Manual log entry**
   ```typescript
   await costTrackingService.logUsage({
     provider: 'openai',
     operationType: 'text_generation',
     cost: 0.05
   });
   ```

---

## Integration with Billing

### Connect to Payment System

```typescript
// When user approaches limit
const remaining = await costTrackingService.getRemainingQuota(budget);
if (remaining < 10) {
  // Trigger payment flow
  showUpgradeModal();
}
```

### Monthly Billing Report

```typescript
// Generate billing report
const summary = await costTrackingService.getCostSummary(30);
const csv = await costTrackingService.exportAsCSV();

// Send to billing system
sendToBillingSystem({
  userId: user.id,
  period: 'Feb 2026',
  totalCost: summary.totalCost,
  breakdown: summary.costByProvider,
  csv: csv
});
```

---

**Next:** [MONITORING.md](./MONITORING.md) for performance tracking
