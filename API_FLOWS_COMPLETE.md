# Sacred Core - Complete API Flows & AI Call Documentation

## Overview
Sacred Core has a **layered architecture** with 40+ services making API calls to external providers, internal databases, and real-time systems.

---

## I. BACKEND API ENDPOINTS (Fastify Server)

### Base URL: `http://localhost:4000` (or `API_PORT` env var)

### A. Authentication Routes

#### 1. **POST /api/auth/login**
```
Request Body: { email: string, password: string }
Response: { success: boolean, token: string, user: { id, email, name, tier, credits } }
Internal Flow:
  1. Validate email + password
  2. Sign JWT token (expires: 7d)
  3. Return JWT + user metadata (tier = 'pro', credits = 500)
External API: None (mock auth for dev)
```

#### 2. **POST /api/auth/logout**
```
Response: { success: true, message: 'Logged out' }
No API calls - client-side token cleanup
```

---

### B. Campaign Management Routes

#### 3. **GET /api/campaigns**
```
Response: 
{
  success: true,
  data: [{
    id: 'campaign-1',
    name: 'Summer Sale',
    status: 'active',
    createdAt: ISO timestamp,
    assets: [],
    stats: { impressions: 10000, clicks: 500, conversions: 50 }
  }],
  total: 1
}
Flow:
  1. Frontend calls GET /api/campaigns
  2. Backend queries Supabase for user's campaigns
  3. Returns campaign list with aggregated stats
```

#### 4. **POST /api/campaigns**
```
Request Body: { name: string, description: string }
Response:
{
  success: true,
  data: {
    id: 'campaign-{timestamp}',
    name, description,
    status: 'draft',
    createdAt: ISO timestamp,
    assets: [],
    stats: { impressions: 0, clicks: 0, conversions: 0 }
  }
}
Flow:
  1. Validate campaign name
  2. Create new campaign in Supabase
  3. Initialize empty assets & stats
```

#### 5. **GET /api/campaigns/:id**
```
Response:
{
  success: true,
  data: {
    id, name, status: 'active',
    assets: [{
      id: 'asset-1',
      title, content, imageUrl,
      cta: 'Shop Now',
      platform: 'instagram'
    }],
    stats: { impressions: 10000, clicks: 500, conversions: 50, roi: 245.67 }
  }
}
Flow:
  1. Query campaign by ID from Supabase
  2. Fetch associated assets
  3. Aggregate ROI from analyticsService
```

---

### C. Analytics Routes

#### 6. **GET /api/analytics/campaigns/:id**
```
Response:
{
  success: true,
  data: {
    campaignId, roi: 245.67, roas: 3.2,
    conversions: 50, revenue: 12450, cost: 3800,
    ctr: 5.0, conversionRate: 10.0
  }
}
Flow:
  1. Fetch all events for campaign from analyticsService
  2. Calculate ROI = (revenue - cost) / cost * 100
  3. Calculate ROAS = revenue / cost
  4. Filter events by type (impressions, clicks, conversions)
```

#### 7. **GET /api/analytics/performance**
```
Response:
{
  success: true,
  data: {
    totalImpressions: 100000,
    totalClicks: 5000,
    totalConversions: 500,
    totalRevenue: 125000,
    averageROI: 250,
    averageRoas: 3.5,
    topCampaigns: [{ campaignId, name, roi: 450 }]
  }
}
Flow:
  1. Query ALL events across campaigns
  2. Aggregate impressions, clicks, conversions
  3. Sum revenue from all campaigns
  4. Calculate average metrics (ROI, ROAS)
  5. Sort by performance
```

---

### D. Cost Tracking Routes

#### 8. **GET /api/costs/summary**
```
Response:
{
  success: true,
  data: {
    totalCost: 156.78,
    costByProvider: { openai: 45.20, 'stability-ultra': 78.90, 'google-veo': 32.68 },
    costByOperation: { text_generation: 45.20, image_generation: 78.90, video_generation: 32.68 },
    operationCount: { text_generation: 15000, image_generation: 3000, video_generation: 200 }
  }
}
Flow:
  1. Query costTrackingService for all tracked costs
  2. Group by provider (Google, OpenAI, Stability, etc.)
  3. Group by operation type (text, image, video)
  4. Sum costs per operation
```

#### 9. **GET /api/costs/daily-trend**
```
Response:
{
  success: true,
  data: [
    { date: '2025-02-27', cost: 15.45, operations: 500 },
    { date: '2025-02-26', cost: 12.30, operations: 450 }
  ]
}
Flow:
  1. Query costTrackingService metrics
  2. Bucket by date
  3. Sum cost and operation count per day
  4. Return last 30 days
```

---

### E. Provider Status Routes

#### 10. **GET /api/providers/status**
```
Response:
{
  success: true,
  data: {
    llm: [
      { name: 'gemini', status: 'healthy', successRate: 99.8, avgResponse: 150 },
      { name: 'openai', status: 'healthy', successRate: 99.7, avgResponse: 245 },
      { name: 'anthropic', status: 'healthy', successRate: 99.5, avgResponse: 320 }
    ],
    image: [
      { name: 'stability-ultra', status: 'healthy', successRate: 99.9, avgResponse: 2000 },
      { name: 'dalle-4', status: 'healthy', successRate: 99.8, avgResponse: 3000 }
    ],
    video: [
      { name: 'google-veo', status: 'healthy', successRate: 99.2, avgResponse: 'queued' },
      { name: 'sora', status: 'healthy', successRate: 99.1, avgResponse: 'queued' }
    ]
  }
}
Flow:
  1. Ping all configured LLM/image/video providers
  2. Track response times
  3. Calculate success rate from recent calls
  4. Return status object
```

---

### F. Settings Routes

#### 11. **GET /api/settings**
```
Response:
{
  success: true,
  data: {
    user: { id: 'user-123', email: 'user@example.com', name: 'User' },
    providers: { activeLLM: 'gemini', activeImage: 'stability-ultra', activeVideo: 'google-veo' },
    notifications: { email: true, slack: false }
  }
}
Flow:
  1. Fetch user settings from Supabase
  2. Return active provider preferences
  3. Return notification settings
```

#### 12. **PUT /api/settings**
```
Request Body: { providers: {...}, notifications: {...}, ... }
Response:
{
  success: true,
  message: 'Settings updated',
  data: { ...updates, updatedAt: ISO timestamp }
}
Flow:
  1. Validate settings payload
  2. Update Supabase user_settings table
  3. Clear provider cache if switching providers
  4. Return updated settings
```

---

## II. CORE AI & SERVICE LAYERS

### A. Universal AI Service (`universalAiService.ts`)

**Purpose:** Unified text generation with caching, cost tracking, and JSON repair.

#### **Method: `generateText(params: TextGenerationParams)`**

```typescript
interface TextGenerationParams {
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: string;  // 'text/plain' or 'application/json'
  responseSchema?: any;        // Structured output schema
  featureId?: string;          // For cost allocation
  bypassCache?: boolean;
  modelOverride?: string;
}
```

**Flow:**
```
1. Check neural cache (if !bypassCache)
   └─ Cache hit? Return cached response
   
2. Select model:
   └─ modelOverride provided? Use it
   └─ else use store.providers.activeLLM ('gemini', 'openai', etc.)
   
3. Call LLM API with retry logic:
   ├─ Google Gemini: GoogleGenAI SDK
   │  └─ POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
   ├─ OpenAI: fetch to https://api.openai.com/v1/chat/completions
   ├─ Anthropic: fetch to https://api.anthropic.com/v1/messages
   └─ Groq/Mistral: Similar REST endpoints
   
4. Parse response:
   └─ responseMimeType === 'application/json'?
      ├─ Yes: cleanJsonResponse() + repairTruncatedJson()
      └─ No: Return raw text
   
5. Track cost:
   └─ costTrackingService.recordCost(provider, model, tokens, cost)
   
6. Cache result:
   └─ neuralCache.set(cacheKey, response, ttl=3600s)
   
7. Return response
```

**External APIs Called:**
- **Google Gemini**: `v1beta/models/gemini-pro:generateContent` (POST)
- **OpenAI**: `v1/chat/completions` (POST)
- **Anthropic Claude**: `v1/messages` (POST)
- **Groq**: `openai/deployments/{model}/chat/completions` (POST)
- **Mistral**: `v1/chat/completions` (POST)
- **Cohere**: `v1/generate` (POST)

---

### B. Video Generation Service (`videoService.ts`)

**Purpose:** Generate videos from text prompts using multiple video AI engines.

#### **Method: `generateVideo(prompt, engine, onComplete)`**

**Supported Engines:**
```typescript
type VideoEngine = 'veo-3' | 'ltx-2' | 'luma' | 'kling' | 'sora-2-pro';

// Tier-based limits:
free:   5 videos/month, LTX-2 only
pro:    50 videos/month, LTX-2 only
hunter: unlimited, all engines
```

**Flow per Engine:**

**1. Google Veo-3 (via Gemini SDK)**
```
generateVeoVideo(prompt, geminiApiKey)
  1. Initialize GoogleGenAI({ apiKey })
  2. Call ai.models.generateVideos({
       model: 'veo-3.1-fast-generate-preview',
       prompt,
       config: {
         numberOfVideos: 1,
         resolution: '720p',
         aspectRatio: '16:9'
       }
     })
  3. Return operation handle (polling required)
  4. Frontend polls for status
  
External API:
  POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:generateContent
  Header: Authorization: Bearer {GEMINI_API_KEY}
```

**2. LTX-2 (via Fal.ai)**
```
generateLTXVideo(prompt, falApiKey)
  1. POST https://fal.run/fal-ai/ltx-video
  2. Body: { prompt }
  3. Header: Authorization: Key {FAL_API_KEY}
  4. Parse response.video.url
  
Polling: Not needed (synchronous)
Response: { video: { url: 'https://storage.../video.mp4' } }
```

**3. Luma Labs**
```
generateLumaVideo(prompt, lumaApiKey)
  1. POST https://api.lumalabs.ai/v1/generations
  2. Body: { prompt, aspect_ratio: '16:9' }
  3. Header: Authorization: Bearer {LUMA_API_KEY}
  4. Get generation ID: data.id
  
Polling Loop (30 iterations, 5s delay):
  GET https://api.lumalabs.ai/v1/generations/{id}
  Check: pollData.state
    ├─ 'completed': Return pollData.assets.video
    ├─ 'failed': Throw error
    └─ 'processing': Wait & retry
```

**4. Kling**
```
generateKlingVideo(prompt, klingApiKey)
  Returns mock URL (not yet implemented)
```

**Cost Tracking:**
```
Engine         Free    Pro    Hunter
veo-3          $5      $5     Free
ltx-2          $1      $1     Free
luma           $2      $2     Free
kling          $2      $2     Free
sora-2-pro     $10     $10    Free
```

---

### C. Lead Scraping Service (`leadScrapingService.ts`)

**Purpose:** Find and verify business email addresses from multiple sources.

#### **Method: `searchLeads(params: LeadSearchParams)`**

```typescript
interface LeadSearchParams {
  company?: string;
  domain?: string;
  keyword?: string;
  industry?: string;
  limit?: number;
  source?: 'hunter' | 'apollo' | 'web-scraper' | 'linkedin' | 'manual';
}
```

**Flow:**

**1. Hunter.io Integration**
```
searchHunterIO(params)
  1. Extract domain from company name
  2. GET https://api.hunter.io/v2/domain-search
     Query: ?domain={domain}&limit=100&api_key={HUNTER_API_KEY}
  3. Parse response.data.emails
  4. For each email, create ScrapedLead:
     {
       id: 'hunter_{email}',
       name: email.first_name + email.last_name,
       email: email.value,
       company: domain,
       title: email.position,
       linkedinUrl: email.linkedin_url,
       source: 'hunter',
       confidence: email.confidence (0-100),
       verificationStatus: email.verification.status,
       metadata: full email object,
       scrapedAt: now
     }
  5. Verify emails if config.verifyEmails
     GET https://api.hunter.io/v2/email-verifier?email={email}&domain={domain}
```

**2. Apollo.io Integration**
```
searchApollo(params)
  1. POST https://api.apollo.io/v1/contacts/search
  2. Body: {
       first_name: params.keyword,
       company_name: params.company,
       industry: params.industry,
       limit: params.limit
     }
  3. Header: Authorization: Bearer {APOLLO_API_KEY}
  4. Parse response.contacts[]
  5. Create ScrapedLead objects
  6. Verify emails via Apollo's verification endpoint
```

**3. Web Scraper (CORS Proxies)**
```
searchWebScraper(params)
  1. Build search URL from params
  2. Try CORS proxies in order:
     - allorigins.win/raw?url={targetUrl}
     - codetabs.com/api/proxy?quest={targetUrl}
     - corsproxy.io/?{targetUrl}
  3. Parse HTML response
  4. Extract email patterns: /[a-z.]+@company.com/gi
  5. Create ScrapedLead objects with source: 'web-scraper'
```

**Storage:**
```
Leads stored in:
  - this.leads[] (in-memory)
  - Supabase leads table (persistent)
  
Scraping history tracked:
  - Query string
  - Timestamp
  - Result count
```

---

### D. Analytics Service (`analyticsService.ts`)

**Purpose:** Real-time event tracking and performance analysis.

#### **Key Methods:**

**1. `trackEvent(userId, eventName, properties, eventType)`**
```
Tracks user actions as AnalyticsEvent
Event types: 'impression', 'click', 'conversion', 'like', 'share', etc.

Internal storage:
  - this.events[] (in-memory, max 100k)
  - Persisted to Supabase events table
```

**2. `getCampaignMetrics(campaignId, startDate, endDate)`**
```
Flow:
  1. Filter events for campaignId in date range
  2. Count impressions (eventName === 'impression')
  3. Count clicks (eventName === 'click')
  4. Count conversions (eventName === 'conversion')
  5. Calculate:
     - CTR = (clicks / impressions) * 100
     - conversionRate = (conversions / clicks) * 100
     - ROI = ((revenue - cost) / cost) * 100
     - costPerConversion = cost / conversions
```

**3. `getTimeSeriesData(metricNames, startDate, endDate, interval)`**
```
Buckets metrics by time:
  interval: 'hour' | 'day' | 'week'
  
Example:
  getTimeSeriesData(
    ['impression', 'click', 'conversion'],
    start,
    end,
    'day'
  )
  
Returns:
  [
    { timestamp: 2025-02-27, metrics: { impression: 1000, click: 50, conversion: 5 } },
    { timestamp: 2025-02-26, metrics: { impression: 900, click: 45, conversion: 4 } }
  ]
```

**4. `getFunnelAnalysis(steps, startDate, endDate)`**
```
Analyzes conversion funnel (e.g., view -> add_to_cart -> checkout -> purchase)

Returns:
  [
    { step: 'view', count: 1000, dropoffRate: 0 },
    { step: 'add_to_cart', count: 500, dropoffRate: 50 },
    { step: 'checkout', count: 250, dropoffRate: 50 },
    { step: 'purchase', count: 100, dropoffRate: 60 }
  ]
```

**5. `getAttributionMetrics(conversionWindow)`**
```
Last-click attribution: Which channel gets credit for conversions?

Flow:
  1. Get all conversions in window
  2. For each conversion:
     └─ Find last click event before conversion
     └─ Get channel from last click
     └─ Attribute conversion to that channel
  3. Aggregate by channel
  
Returns:
  [
    { channel: 'google', attributedConversions: 45, attributionPercentage: 45 },
    { channel: 'facebook', attributedConversions: 35, attributionPercentage: 35 },
    { channel: 'direct', attributedConversions: 20, attributionPercentage: 20 }
  ]
```

---

### E. Collaboration Service (`collaborationService.ts`)

**Purpose:** Real-time team collaboration with chat, activity logs, and permissions.

#### **Key Methods:**

**1. `createSession(sessionName, userId, userName)`**
```
Creates a live collaboration session
  └─ Session ID: `session_{timestamp}_{random}`
  └─ Initialize with creator as 'admin' role
  └─ Generate unique color for user
  └─ Broadcast to all subscribers
```

**2. `sendMessage(text)`**
```
Message:
  {
    id: 'msg_{timestamp}_{random}',
    userId, userName, text,
    timestamp: ISO string,
    type: 'chat' | 'system',
    edited?: boolean,
    editedAt?: Date
  }

Broadcast to subscribers: type='chat'
```

**3. `logActivity(userId, action, target, details)`**
```
Activity Log:
  {
    id: 'activity_{timestamp}',
    userId, action, target,
    timestamp: new Date(),
    details: optional metadata
  }

Example: User "Sarah" updated "Mission Statement"
  logActivity('user-2', 'updated', 'Mission Statement', { ... })

Broadcast to subscribers: type='activity'
```

**4. `addUserToSession(userId, userName, role)`**
```
role: 'admin' | 'editor' | 'viewer'

Permissions:
  admin:  ['read', 'write', 'delete', 'invite']
  editor: ['read', 'write']
  viewer: ['read']

Broadcast to subscribers: type='user'
```

---

## III. EXTERNAL API INTEGRATIONS

### Summary of External APIs by Provider

| Provider | Service | Endpoint | Method | Auth |
|----------|---------|----------|--------|------|
| Google | Gemini Text | `v1beta/models/gemini-pro:generateContent` | POST | API Key |
| Google | Veo-3 Video | `v1beta/models/veo-3.1-fast-generate-preview:generateContent` | POST | API Key |
| OpenAI | GPT Chat | `v1/chat/completions` | POST | Bearer Token |
| Anthropic | Claude | `v1/messages` | POST | Bearer Token |
| Groq | Groq LLM | `openai/deployments/{model}/chat/completions` | POST | API Key |
| Mistral | Mistral LLM | `v1/chat/completions` | POST | API Key |
| Cohere | Cohere LLM | `v1/generate` | POST | Bearer Token |
| Fal.ai | LTX Video | `fal-ai/ltx-video` | POST | Key Header |
| Luma Labs | Video Generation | `v1/generations` | POST | Bearer Token |
| Luma Labs | Status Poll | `v1/generations/{id}` | GET | Bearer Token |
| Hunter.io | Email Search | `v2/domain-search` | GET | API Key (query param) |
| Hunter.io | Email Verify | `v2/email-verifier` | GET | API Key (query param) |
| Apollo.io | Contact Search | `v1/contacts/search` | POST | Bearer Token |
| Supabase | Database | `{project}.supabase.co/rest/v1/*` | REST | Service Role Key |
| Supabase | Auth | `{project}.supabase.co/auth/v1/*` | REST | Anon Key |

---

## IV. DATA FLOW EXAMPLES

### Example 1: User Creates Campaign & Generates Content

```
1. Frontend: User clicks "Create Campaign"
   └─ POST /api/campaigns { name: 'Winter Sale', description: '...' }
   
2. Backend: 
   └─ Generate campaign ID
   └─ Insert into Supabase campaigns table
   └─ Return campaign object
   
3. Frontend: User generates campaign description via AI
   └─ Call universalAiService.generateText({
       prompt: 'Create a marketing description for a winter sale campaign',
       systemInstruction: 'You are a marketing expert...',
       responseMimeType: 'text/plain',
       featureId: 'campaign-description-gen'
     })
   
4. universalAiService:
   └─ Check neural cache for similar prompts
   └─ Cache miss → Call Google Gemini API
   └─ Parse response text
   └─ Track cost: $0.05 (1000 tokens at Gemini pricing)
   └─ Cache result for 1 hour
   └─ Return description
   
5. Frontend: Display description, allow user to save
   └─ Update campaign: PUT /api/campaigns/{id}
   └─ analyticsService.trackEvent(userId, 'campaign_created', { campaignId })
```

---

### Example 2: User Generates Video

```
1. Frontend: User clicks "Generate Video"
   └─ selectsEngine: 'ltx-2'
   └─ enters prompt: "A promotional video for winter clothing"
   
2. Check tier limits:
   └─ User tier: 'pro'
   └─ LTX-2 allowed? Yes
   └─ Monthly usage: 30/50 → Allowed
   
3. Call videoService.generateVideo(prompt, 'ltx-2', onComplete)
   
4. videoService → generateLTXVideo:
   └─ POST https://fal.run/fal-ai/ltx-video
   └─ Body: { prompt: "A promotional video..." }
   └─ Wait for response (synchronous)
   
5. Parse response → { video: { url: 'https://storage.../video.mp4' } }
   
6. costTrackingService.recordCost:
   └─ provider: 'fal-ai'
   └─ operation: 'video-generation'
   └─ model: 'ltx-2'
   └─ cost: 1.00 (for pro tier)
   
7. Store video metadata:
   └─ Supabase assets table: { campaignId, videoUrl, engine: 'ltx-2', cost: 1.00 }
   
8. analyticsService.trackEvent:
   └─ userId, 'video_generated', { engine: 'ltx-2', duration: 45s, cost: 1.00 }
   
9. onComplete callback → Update frontend, show video
```

---

### Example 3: Analytics Dashboard Load

```
1. Frontend: User opens Analytics Dashboard
   └─ GET /api/analytics/performance
   
2. Backend aggregates:
   └─ Query analyticsService.events[]
   └─ Filter events.eventType === 'user_action'
   └─ Calculate:
      - totalImpressions = count(eventName='impression')
      - totalClicks = count(eventName='click')
      - totalConversions = count(eventName='conversion')
      - totalRevenue = sum(metrics where metricName='revenue')
      
3. Return aggregated stats
   
4. Frontend: User selects campaign to drill down
   └─ GET /api/analytics/campaigns/{id}
   
5. Backend:
   └─ getCampaignMetrics(campaignId, last30days)
   └─ Calculate ROI, ROAS, CTR, conversionRate
   └─ Return metrics
   
6. Frontend: User views funnel chart
   └─ Call analyticsService.getFunnelAnalysis(
       ['impression', 'click', 'add_to_cart', 'checkout', 'purchase'],
       startDate, endDate
     )
   
7. analyticsService:
   └─ For each step, count unique users
   └─ Calculate dropoff rate = (prev_count - current_count) / prev_count
   └─ Return funnel data
   
8. Frontend renders funnel visualization
```

---

### Example 4: Lead Generation Search

```
1. Frontend: User enters search query
   └─ company: 'Acme Inc'
   └─ industry: 'technology'
   └─ source: 'multi' (all sources)
   
2. Call leadScrapingService.searchLeads({
     company: 'Acme Inc',
     industry: 'technology',
     limit: 100
   })
   
3. leadScrapingService with multi-source:
   
   a) Hunter.io:
      ├─ Extract domain: acme.com
      ├─ GET https://api.hunter.io/v2/domain-search?domain=acme.com&api_key=...
      ├─ Parse emails: [john@acme.com, jane@acme.com, ...]
      ├─ Verify each: GET v2/email-verifier?email=john@acme.com
      └─ Create ScrapedLead objects
   
   b) Apollo.io:
      ├─ POST https://api.apollo.io/v1/contacts/search
      ├─ Body: { company_name: 'Acme Inc', industry: 'technology' }
      ├─ Parse response.contacts[]
      └─ Create ScrapedLead objects
   
   c) Web Scraper (parallel):
      ├─ Build target URL from company name
      ├─ Proxy through allorigins.win (CORS)
      ├─ Parse HTML for email patterns
      └─ Create ScrapedLead objects
   
4. Merge results:
   └─ Deduplicate by email address
   └─ Remove duplicates, keep highest confidence
   
5. Persist to Supabase:
   └─ INSERT INTO leads TABLE
   
6. Return lead list to frontend
   
7. analyticsService:
   └─ trackEvent(userId, 'lead_search', {
       company: 'Acme Inc',
       resultsCount: 23,
       sources: ['hunter', 'apollo', 'web-scraper']
     })
```

---

## V. COST TRACKING FLOW

### How Costs Are Tracked

**1. Text Generation Costs (universalAiService)**
```
Google Gemini:
  - Input: $0.075 / 1M tokens
  - Output: $0.3 / 1M tokens
  
OpenAI GPT-4:
  - Input: $0.03 / 1K tokens
  - Output: $0.06 / 1K tokens
  
Calculation: cost = (inputTokens / 1M * inputRate) + (outputTokens / 1M * outputRate)
```

**2. Video Generation Costs (videoService)**
```
Free tier:   5 videos/month, LTX-2 only ($0)
Pro tier:    50 videos/month, LTX-2 ($1 each)
Hunter:      Unlimited, all engines ($0)

Tracked in costTrackingService.recordCost()
```

**3. Lead Scraping Costs (leadScrapingService)**
```
Hunter.io:  $49/month for API access
Apollo.io:  Pay-per-contact ($2-5 per contact)
Web Scraper: Free (no external API)

Tracked per lead generated
```

**4. API Flow for Cost Retrieval**
```
GET /api/costs/summary
  └─ costTrackingService.getCostSummary()
  
GET /api/costs/daily-trend
  └─ costTrackingService.getDailyTrend(last: 30)
```

---

## VI. ERROR HANDLING & RESILIENCE

### Retry Logic (universalAiService)
```
Max retries: 3
Initial delay: 1000ms
Backoff: exponential (1s, 2s, 4s)

Handled errors:
  - Rate limit (429) → Wait then retry
  - Server error (5xx) → Retry with backoff
  - Timeout → Retry with backoff
  - Invalid API key → Fail immediately
```

### Fallbacks
```
Video generation timeouts:
  └─ Return mock video URL: https://storage.googleapis.com/.../sample.mp4

Lead scraping failures:
  └─ Try next source (Hunter → Apollo → Web Scraper)

Cache misses:
  └─ Call real API, cache result for next request

Supabase connection error:
  └─ Queue operations, retry on reconnect
```

---

## VII. REAL-TIME UPDATES (WebSocket Layer)

### Collaboration Service Updates
```
subscribers[] array listens for:
  - type: 'chat' → New message broadcast
  - type: 'activity' → Action log broadcast
  - type: 'user' → User join/leave broadcast
  - type: 'session' → Session state change

In production, replaced with WebSocket:
  ws://localhost:3001/ws/session/{sessionId}
```

### Analytics Service Real-Time Events
```
analyticsService.trackEvent() triggers:
  1. Store event in memory
  2. Persist to Supabase
  3. Publish to subscribers
  4. Emit WebSocket message to connected clients
```

---

## VIII. COMPLETE API CALL SUMMARY

### Total External API Calls by Type:

**Text/Chat Generation:**
- Google Gemini
- OpenAI GPT
- Anthropic Claude
- Groq
- Mistral
- Cohere

**Video Generation:**
- Google Veo-3 (Gemini SDK)
- Fal.ai LTX-2
- Luma Labs (with polling)
- Kling (stub)

**Lead Data:**
- Hunter.io Domain Search
- Hunter.io Email Verification
- Apollo.io Contact Search
- CORS Proxies (Web Scraper)

**Data Persistence:**
- Supabase PostgreSQL (REST API)
- Supabase Auth
- Supabase Real-time Subscriptions

**Monitoring/Analytics:**
- Internal: analyticsService (in-memory)
- Internal: costTrackingService (in-memory)
- Internal: neuralCache (in-memory with TTL)

---

## IX. CONFIGURATION & ENVIRONMENT

### Required API Keys (`.env.local` / `.env`)
```
# LLM Providers
VITE_GEMINI_API_KEY=your_google_api_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key
VITE_GROQ_API_KEY=your_groq_key
VITE_MISTRAL_API_KEY=your_mistral_key
VITE_COHERE_API_KEY=your_cohere_key

# Video Providers
VITE_FAL_API_KEY=your_fal_key
VITE_LUMA_API_KEY=your_luma_key
VITE_KLING_API_KEY=your_kling_key

# Lead Providers
HUNTER_API_KEY=your_hunter_key
APOLLO_API_KEY=your_apollo_key

# Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Auth Providers
VITE_GOOGLE_CLIENT_ID=your_google_oauth_id
VITE_GITHUB_CLIENT_ID=your_github_oauth_id

# Server
API_PORT=4000
API_HOST=0.0.0.0
JWT_SECRET=your_jwt_secret_key
```

---

## X. PERFORMANCE TARGETS & LIMITS

### Response Times
```
API Response (P95):     150-250ms
Page Load (P95):        250-400ms
Video Generation:       2-60 minutes (async)
Lead Search:            5-30 seconds
```

### Rate Limits
```
API Global:             100 requests / 15 minutes per client
Video Generation:       5-50 per month (tier-dependent)
Lead Searches:          Unlimited (API provider limits apply)
```

### Storage Limits
```
Analytics Events:       100,000 in-memory (older purged)
Collaboration Messages: Unlimited (persisted to Supabase)
Leads Database:         Supabase quota (default 500MB)
```

---

This completes the full API documentation for Sacred Core. All flows, external APIs, and cost tracking mechanisms are documented above.
