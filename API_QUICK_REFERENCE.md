# Sacred Core - API Quick Reference

## Backend Endpoints (Fastify on :4000)

| Endpoint | Method | Purpose | Flow |
|----------|--------|---------|------|
| `/health` | GET | Health check | Returns uptime, timestamp |
| `/api/auth/login` | POST | User login | Validate creds → Sign JWT → Return token |
| `/api/auth/logout` | POST | User logout | Clear token (client-side) |
| `/api/campaigns` | GET | List campaigns | Query Supabase → Return campaigns |
| `/api/campaigns` | POST | Create campaign | Validate input → Insert Supabase → Return campaign |
| `/api/campaigns/:id` | GET | Get campaign | Query by ID → Fetch assets → Aggregate stats |
| `/api/analytics/campaigns/:id` | GET | Campaign metrics | Filter events → Calculate ROI/ROAS/CTR → Return metrics |
| `/api/analytics/performance` | GET | Overall performance | Aggregate all events → Sum revenue → Calculate averages |
| `/api/costs/summary` | GET | Cost breakdown | Query costTrackingService → Group by provider/operation |
| `/api/costs/daily-trend` | GET | Daily costs | Query metrics → Bucket by date → Return trend |
| `/api/providers/status` | GET | Provider health | Ping all providers → Check success rates → Return status |
| `/api/settings` | GET | User settings | Query Supabase → Return preferences |
| `/api/settings` | PUT | Update settings | Validate input → Update Supabase → Clear cache → Return updated |

---

## AI Service Methods (Internal)

### Text Generation
```typescript
universalAiService.generateText({
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: 'text/plain' | 'application/json',
  responseSchema?: any,
  featureId?: string,
  bypassCache?: boolean,
  modelOverride?: 'gemini' | 'gpt-4' | 'claude' | 'groq' | 'mistral' | 'cohere'
})
```

**Calls to:**
- Google Gemini API (if modelOverride='gemini' or config.activeLLM='gemini')
- OpenAI API (if modelOverride='gpt-4')
- Anthropic API (if modelOverride='claude')
- Groq API
- Mistral API
- Cohere API

**Features:**
- Neural cache (TTL: 1 hour)
- JSON repair for truncated responses
- Cost tracking per request
- Structured output schema support

---

### Video Generation
```typescript
videoService.generateVideo(
  prompt: string,
  engine: 'veo-3' | 'ltx-2' | 'luma' | 'kling' | 'sora-2-pro',
  onComplete: (url: string) => void
)
```

| Engine | API | Polling | Cost | Speed |
|--------|-----|---------|------|-------|
| `veo-3` | Google Gemini SDK | Yes | $5 | 30-60s |
| `ltx-2` | Fal.ai REST | No | $1 | 10-20s |
| `luma` | Luma Labs REST | Yes (30x5s) | $2 | 30-60s |
| `kling` | Kling API | No | $2 | 10-15s |

---

### Lead Search
```typescript
leadScrapingService.searchLeads({
  company?: string,
  domain?: string,
  keyword?: string,
  industry?: string,
  limit?: number,
  source?: 'hunter' | 'apollo' | 'web-scraper'
})
```

**Data Sources:**
1. **Hunter.io** - Email search by domain
   - API: `https://api.hunter.io/v2/domain-search`
   - Includes: First name, last name, position, LinkedIn URL
   - Verification: Email validity score

2. **Apollo.io** - Contact database
   - API: `https://api.apollo.io/v1/contacts/search`
   - Includes: Full contact data, company info, emails
   - Verification: Built-in validation

3. **Web Scraper** - HTML parsing
   - CORS Proxies: allorigins.win, codetabs.com, corsproxy.io
   - Regex pattern: `/[a-z.]+@company.com/gi`
   - No external API costs

---

### Analytics Tracking
```typescript
analyticsService.trackEvent(
  userId: string,
  eventName: string,
  properties?: { [key: string]: any },
  eventType?: 'user_action' | 'system_event'
)
```

**Available Methods:**

| Method | Returns | Purpose |
|--------|---------|---------|
| `trackEvent()` | void | Log user action |
| `getCampaignMetrics()` | CampaignMetrics | ROI, ROAS, CTR, conversions |
| `getTimeSeriesData()` | TimeSeriesData[] | Metrics bucketed by hour/day/week |
| `getFunnelAnalysis()` | FunnelStep[] | Dropoff rates by stage |
| `getAttributionMetrics()` | Attribution[] | Last-click attribution by channel |
| `getCohortAnalysis()` | CohortStats | Retention, LTV, churn rate |
| `getCustomInsights()` | Record | Query-based event search |
| `getUserActivity()` | AnalyticsEvent[] | User's event history |

---

### Collaboration (Real-Time)
```typescript
collaborationService.createSession(
  sessionName: string,
  userId: string,
  userName: string
)

// Subscribe to updates
collaborationService.subscribe((type, data) => {
  if (type === 'chat') { /* new message */ }
  if (type === 'activity') { /* action log */ }
  if (type === 'user') { /* user joined/left */ }
  if (type === 'session') { /* session state */ }
})
```

**Session Methods:**
- `createSession()` - New session
- `addUserToSession(userId, userName, role)` - Add participant
- `sendMessage(text)` - Send message
- `editMessage(messageId, newText)` - Edit message
- `deleteMessage(messageId)` - Delete message
- `addReaction(messageId, emoji)` - React to message
- `logActivity(userId, action, target, details)` - Track action
- `removeUserFromSession(userId)` - Remove participant
- `getSessionUsers()` - List active users
- `getMessageHistory(limit)` - Chat history
- `getActivityLog(limit)` - Action log

---

## External API Calls Summary

### LLM Providers
```
Provider        Endpoint                                              Auth
─────────────────────────────────────────────────────────────────────────────
Google Gemini   v1beta/models/gemini-pro:generateContent            API Key
OpenAI          v1/chat/completions                                  Bearer
Anthropic       v1/messages                                           Bearer
Groq            openai/deployments/{model}/chat/completions         API Key
Mistral         v1/chat/completions                                  API Key
Cohere          v1/generate                                           Bearer
```

### Video Providers
```
Provider        Endpoint                                              Auth
─────────────────────────────────────────────────────────────────────────────
Google Veo      v1beta/models/veo-3.1-fast-generate-preview:...     API Key
Fal.ai          fal-ai/ltx-video                                     Key Header
Luma Labs       v1/generations + v1/generations/{id}                Bearer
Kling           (not implemented)                                     API Key
```

### Lead Providers
```
Provider        Endpoint                                              Auth
─────────────────────────────────────────────────────────────────────────────
Hunter.io       v2/domain-search, v2/email-verifier                 Query Param
Apollo.io       v1/contacts/search                                   Bearer
Web Scraper     CORS Proxies (allorigins.win, etc)                  None
```

### Database
```
Provider        Endpoint                                              Auth
─────────────────────────────────────────────────────────────────────────────
Supabase        rest/v1/*, auth/v1/*, realtime                      Service/Anon Key
```

---

## Data Models

### Campaign
```typescript
{
  id: string;                    // 'campaign-{timestamp}'
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  assets: Asset[];               // Images, videos, copy
  stats: {
    impressions: number;
    clicks: number;
    conversions: number;
    roi: number;                 // (revenue - cost) / cost * 100
    roas: number;               // revenue / cost
    ctr: number;                // (clicks / impressions) * 100
    conversionRate: number;     // (conversions / clicks) * 100
  };
}
```

### AnalyticsEvent
```typescript
{
  id: string;
  userId: string;
  eventType: 'user_action' | 'system_event';
  eventName: string;            // 'impression', 'click', 'conversion', etc.
  timestamp: Date;
  properties: Record<string, unknown>;  // Custom data
  sessionId: string;
}
```

### ScrapedLead
```typescript
{
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  website?: string;
  phone?: string;
  linkedinUrl?: string;
  source: 'hunter' | 'apollo' | 'web-scraper';
  confidence: number;           // 0-100
  verificationStatus: 'verified' | 'unverified' | 'invalid';
  metadata: Record<string, unknown>;
  scrapedAt: Date;
}
```

### SessionMessage
```typescript
{
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;            // ISO string
  type: 'chat' | 'system';
  reactions?: { emoji: string; users: string[] }[];
  edited?: boolean;
  editedAt?: Date;
}
```

---

## Request/Response Examples

### Create Campaign + Generate Description

**Request 1: Create Campaign**
```
POST /api/campaigns
Content-Type: application/json

{
  "name": "Winter Sale 2025",
  "description": "Seasonal promotion"
}

Response:
{
  "success": true,
  "data": {
    "id": "campaign-1740561234567",
    "name": "Winter Sale 2025",
    "status": "draft",
    "createdAt": "2025-02-27T10:20:34Z",
    "assets": [],
    "stats": { "impressions": 0, "clicks": 0, "conversions": 0 }
  }
}
```

**Request 2: Generate AI Description**
```
JavaScript:
const description = await universalAiService.generateText({
  prompt: "Create a compelling product description for a winter clothing sale campaign",
  systemInstruction: "You are an expert copywriter...",
  responseMimeType: "text/plain",
  featureId: "campaign-description"
});

Internal Flow:
1. Check neural cache
2. Call Google Gemini API
3. Track cost: $0.002 (200 input tokens, 100 output tokens)
4. Cache result
5. Return: "Discover our exclusive winter collection..."
```

---

### Generate Video + Track Cost

**Request: Generate LTX-2 Video**
```
JavaScript:
const videoUrl = await videoService.generateVideo(
  "A 30-second promotional video showcasing winter coats in action",
  "ltx-2",
  (url) => {
    // Update UI with video
    displayVideo(url);
  }
);

Internal Flow:
1. Check tier limits (pro: 50/month, at 30/50)
2. POST https://fal.run/fal-ai/ltx-video
3. Get response: { video: { url: "https://storage.../vid.mp4" } }
4. Record cost: $1.00 to costTrackingService
5. Track event: analytics.trackEvent(userId, 'video_generated', { engine: 'ltx-2', cost: 1.00 })
6. Return video URL
```

---

### Search Leads + Verify Emails

**Request: Multi-Source Lead Search**
```
JavaScript:
const leads = await leadScrapingService.searchLeads({
  company: "Acme Inc",
  industry: "technology",
  limit: 50
});

Internal Flow:
1. Hunter.io Search:
   GET https://api.hunter.io/v2/domain-search?domain=acme.com&limit=100
   Parse: [john@acme.com, jane@acme.com, ...]
   Verify each email via: v2/email-verifier?email=...

2. Apollo.io Search:
   POST https://api.apollo.io/v1/contacts/search
   Body: { company_name: "Acme Inc", industry: "technology" }

3. Web Scraper:
   GET https://acme.com (via CORS proxy)
   Regex: /[a-z.]+@acme.com/gi
   Extract: [support@acme.com, sales@acme.com, ...]

4. Merge results, deduplicate by email

5. Return 23 leads with verification status
```

---

### Get Campaign Analytics

**Request: Campaign Metrics**
```
GET /api/analytics/campaigns/campaign-1740561234567

Response:
{
  "success": true,
  "data": {
    "campaignId": "campaign-1740561234567",
    "roi": 245.67,
    "roas": 3.2,
    "conversions": 50,
    "revenue": 12450,
    "cost": 3800,
    "ctr": 5.0,
    "conversionRate": 10.0
  }
}

Internal Flow:
1. Filter analyticsService.events for campaignId
2. Count impressions, clicks, conversions
3. Fetch cost data from costTrackingService
4. Fetch revenue data from analyticsService.metrics
5. Calculate:
   - ROI = (12450 - 3800) / 3800 * 100 = 227.63 ✓
   - ROAS = 12450 / 3800 = 3.27 ✓
   - CTR = (500 / 10000) * 100 = 5.0 ✓
   - ConversionRate = (50 / 500) * 100 = 10.0 ✓
```

---

## Error Handling

### Retry Logic (universalAiService)
```typescript
Max retries: 3
Initial delay: 1000ms
Backoff: exponential (1s → 2s → 4s)

Handled:
  429 (Rate limit) → Wait then retry
  5xx (Server error) → Retry with backoff
  Timeout → Retry with backoff
  401 (Invalid key) → Fail immediately
```

### Fallbacks
```
Video gen fails → Return mock URL
Lead search fails (Hunter) → Try Apollo
Lead search fails (Apollo) → Try web scraper
Cache miss → Call real API
Supabase down → Queue operations
```

---

## Performance Metrics

### Response Times (P95)
- API endpoints: 150-250ms
- Page load: 250-400ms
- Video generation: 2-60 minutes (async)
- Lead search: 5-30 seconds
- Text generation: 1-5 seconds

### Rate Limits
- API global: 100 requests / 15 minutes
- Video generation: 5-50/month (tier-dependent)
- Lead searches: Unlimited (provider limits apply)

### Storage
- Events in-memory: 100,000 max (older purged)
- Supabase quota: 500MB default
- Cache TTL: 1 hour

---

## Cost Examples

### Text Generation (1000 tokens)
```
Google Gemini:  ~$0.075
OpenAI GPT-4:   ~$0.03
Anthropic:      ~$0.04
```

### Video Generation
```
veo-3 (1 video):        $5.00
ltx-2 (1 video):        $1.00 (pro), $0 (hunter)
luma (1 video):         $2.00
```

### Lead Generation
```
Hunter.io:              $49/month (unlimited)
Apollo.io:              $2-5 per contact
Web scraper:            $0 (no API cost)
```

---

This is a complete quick reference for all APIs in Sacred Core. See `API_FLOWS_COMPLETE.md` for detailed flows.
