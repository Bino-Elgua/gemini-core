# Sacred Core - AI Call Sequences (Call Graphs)

## Flow 1: Complete Campaign Creation + AI Content Generation

```
SEQUENCE:
┌─────────────────────────────────────────────────────────────┐
│ User: Create Campaign + Auto-Generate Description          │
└─────────────────────────────────────────────────────────────┘

1. Frontend (React Component)
   └─ User fills: name="Winter Sale", industry="Fashion"
   
2. Call API: POST /api/campaigns
   │
   ├─ Request: { name: "Winter Sale", description: "..." }
   │
   └─> Backend (Fastify)
       ├─ Generate ID: campaign-1740561234567
       ├─ Insert: Supabase.campaigns.insert({
       │   id, name, status: 'draft', createdAt, stats: {...}
       │ })
       └─ Response: { success: true, data: campaign }
       
3. Frontend receives campaign ID
   
4. Call AI Service: Generate Description
   │
   ├─ Request: universalAiService.generateText({
   │   prompt: "Create marketing description for winter fashion sale",
   │   systemInstruction: "You are an expert copywriter for fashion...",
   │   responseMimeType: "text/plain",
   │   featureId: "campaign-description-gen"
   │ })
   │
   └─> universalAiService
       ├─ 1. Check cache
       │   └─ Key: hash("description-winter-fashion-sale")
       │   └─ Miss (first time)
       │
       ├─ 2. Select LLM
       │   └─ Use config.activeLLM = "gemini"
       │
       ├─ 3. Call Google Gemini API
       │   └─ Method: GoogleGenAI SDK
       │   └─ Endpoint: v1beta/models/gemini-pro:generateContent
       │   └─ Payload: {
       │       contents: [{
       │         role: "user",
       │         parts: [{
       │           text: "Create marketing description for..."
       │         }]
       │       }],
       │       systemInstruction: "You are an expert copywriter...",
       │       generationConfig: {
       │         responseMimeType: "text/plain"
       │       }
       │     }
       │   └─ Auth: Header "Authorization: Bearer {GEMINI_API_KEY}"
       │
       ├─ 4. Parse Response
       │   └─ Response: {
       │       candidates: [{
       │         content: {
       │           parts: [{
       │             text: "Discover our exclusive winter collection..."
       │           }]
       │         }
       │       }],
       │       usageMetadata: {
       │         promptTokenCount: 200,
       │         candidatesTokenCount: 150
       │       }
       │     }
       │
       ├─ 5. Track Cost
       │   └─ costTrackingService.recordCost({
       │       provider: "google",
       │       model: "gemini-pro",
       │       operation: "text-generation",
       │       inputTokens: 200,
       │       outputTokens: 150,
       │       cost: 0.075 * (200/1000000) + 0.3 * (150/1000000) = 0.000065
       │     })
       │
       ├─ 6. Cache Result
       │   └─ neuralCache.set(
       │       "campaign-desc-hash",
       │       "Discover our exclusive winter...",
       │       ttl: 3600 // 1 hour
       │     )
       │
       └─ Response: "Discover our exclusive winter collection..."
       
5. Frontend displays AI-generated description
   
6. User approves and saves
   
7. Call API: UPDATE campaign
   └─ PATCH /api/campaigns/{id}
   └─ Body: { description: "Discover our exclusive..." }
   └─ Update Supabase
   
8. Track Event: analyticsService
   └─ trackEvent(userId, 'campaign_created', {
       campaignId: 'campaign-1740561234567',
       name: 'Winter Sale',
       aiGenerated: true,
       model: 'gemini-pro'
     })

TOTAL API CALLS:
  - 1x POST /api/campaigns
  - 1x Google Gemini API
  - 1x Supabase INSERT
  - 1x Supabase UPDATE
  - 1x Analytics event tracking
```

---

## Flow 2: Video Generation with Cost Tracking

```
SEQUENCE:
┌─────────────────────────────────────────────────────────────┐
│ User: Generate Promotional Video                            │
└─────────────────────────────────────────────────────────────┘

1. Frontend (React Component)
   └─ User input:
      - Prompt: "30-second winter sale promotional video"
      - Engine: "ltx-2"
      - campaignId: "campaign-1740561234567"

2. Frontend: Check Tier Limits
   └─ Store.user.tier = "pro"
   └─ Call videoService.checkVideoLimits(tier, currentJobs, "ltx-2")
   └─ Returns: { allowed: true } (30/50 used)

3. Call videoService.generateVideo(prompt, "ltx-2", onComplete)
   │
   └─> videoService
       ├─ 1. Deduct from tier quota
       │   └─ Store.user.videoJobs += 1 (30 → 31)
       │
       ├─ 2. Switch on engine
       │   └─ Case "ltx-2":
       │       └─ Call generateLTXVideo(prompt, API_KEY)
       │
       └─> generateLTXVideo()
           ├─ 1. Validate Fal API Key
           │   └─ if (!key) throw Error
           │
           ├─ 2. Make HTTP Request to Fal.ai
           │   └─ Method: POST
           │   └─ URL: https://fal.run/fal-ai/ltx-video
           │   └─ Headers: {
           │       'Content-Type': 'application/json',
           │       'Authorization': 'Key {FAL_API_KEY}'
           │     }
           │   └─ Body: {
           │       prompt: "30-second winter sale promotional video"
           │     }
           │
           ├─ 3. Wait for Response
           │   └─ Response (synchronous): {
           │       status: "success",
           │       video: {
           │         url: "https://storage.googleapis.com/fal.../vid_abc123.mp4",
           │         duration: 32,
           │         size: "45.2MB"
           │       }
           │     }
           │
           ├─ 4. Return Video URL
           │   └─ "https://storage.googleapis.com/fal.../vid_abc123.mp4"
           │
           └─ Return to videoService

4. videoService: onComplete(videoUrl)
   │
   ├─ 1. Track Cost
   │   └─ costTrackingService.recordCost({
   │       provider: "fal-ai",
   │       model: "ltx-2",
   │       operation: "video-generation",
   │       duration: 32,  // seconds
   │       cost: 1.00     // Pro tier pricing
   │     })
   │
   ├─ 2. Persist Video Asset
   │   └─ Supabase.assets.insert({
   │       id: "asset-{timestamp}",
   │       campaignId: "campaign-1740561234567",
   │       type: "video",
   │       url: videoUrl,
   │       engine: "ltx-2",
   │       cost: 1.00,
   │       createdAt: now
   │     })
   │
   ├─ 3. Track Event
   │   └─ analyticsService.trackEvent(
   │       userId,
   │       'video_generated',
   │       {
   │         campaignId: 'campaign-1740561234567',
   │         engine: 'ltx-2',
   │         duration: 32,
   │         cost: 1.00,
   │         tokenUsage: { promptTokens: 50 }
   │       }
   │     )
   │
   └─ Return URL to Frontend

5. Frontend: onComplete Callback
   └─ Update state: videoUrl
   └─ Display video player
   └─ Show "Cost: $1.00" label

6. User previews and saves asset

7. Call API: Add Asset to Campaign
   └─ POST /api/campaigns/{id}/assets
   └─ Body: { videoUrl, type: 'video', engine: 'ltx-2' }
   └─ Update Supabase campaign.assets

TOTAL API CALLS:
  - 1x Fal.ai video generation
  - 1x Supabase asset INSERT
  - 1x Supabase campaign UPDATE
  - 1x Cost tracking
  - 1x Analytics event
  - 1x POST /api/campaigns/{id}/assets

COST BREAKDOWN:
  - Video generation: $1.00 (LTX-2, pro tier)
  - Token usage: ~0 (no LLM call, just video gen)
  - Total cost: $1.00
```

---

## Flow 3: Multi-Source Lead Generation + Email Verification

```
SEQUENCE:
┌─────────────────────────────────────────────────────────────┐
│ User: Search Leads (Hunter + Apollo + Web Scraper)         │
└─────────────────────────────────────────────────────────────┘

1. Frontend (React Component)
   └─ User input:
      - company: "Acme Inc"
      - industry: "technology"
      - keyword: "marketing manager"
      - limit: 50

2. Call leadScrapingService.searchLeads(params)
   │
   └─> leadScrapingService.searchLeads()
       ├─ results = []
       │
       ├─ 1. HUNTER.IO SEARCH
       │   │
       │   ├─ Check if enabled: config.enableHunterIO = true
       │   │
       │   ├─ Call searchHunterIO(params)
       │   │   │
       │   │   ├─ Extract domain: "acme.com"
       │   │   │
       │   │   ├─ Make HTTP Request
       │   │   │   └─ Method: GET
       │   │   │   └─ URL: https://api.hunter.io/v2/domain-search
       │   │   │   └─ Query: {
       │   │   │       domain: "acme.com",
       │   │   │       limit: 100,
       │   │   │       api_key: "{HUNTER_API_KEY}"
       │   │   │     }
       │   │   │
       │   │   ├─ Response: {
       │   │   │   data: {
       │   │   │     emails: [
       │   │   │       {
       │   │   │         value: "john.smith@acme.com",
       │   │   │         first_name: "John",
       │   │   │         last_name: "Smith",
       │   │   │         position: "Marketing Manager",
       │   │   │         confidence: 95,
       │   │   │         verification: { status: "valid" },
       │   │   │         linkedin_url: "https://linkedin.com/.../john-smith"
       │   │   │       },
       │   │   │       // ... more emails
       │   │   │     ]
       │   │   │   }
       │   │   │ }
       │   │   │
       │   │   ├─ For each email, verify
       │   │   │   └─ GET https://api.hunter.io/v2/email-verifier
       │   │   │   └─ Query: {
       │   │   │       email: "john.smith@acme.com",
       │   │   │       domain: "acme.com",
       │   │   │       api_key: "{HUNTER_API_KEY}"
       │   │   │     }
       │   │   │   └─ Parse: verification.status
       │   │   │
       │   │   └─ Return [ScrapedLead, ScrapedLead, ...]
       │   │
       │   └─ results.push(...hunterResults) // 12 leads

       ├─ 2. APOLLO.IO SEARCH (Parallel)
       │   │
       │   ├─ Check if enabled: config.enableApollo = true
       │   │
       │   ├─ Call searchApollo(params)
       │   │   │
       │   │   ├─ Make HTTP Request
       │   │   │   └─ Method: POST
       │   │   │   └─ URL: https://api.apollo.io/v1/contacts/search
       │   │   │   └─ Headers: {
       │   │   │       'Authorization': 'Bearer {APOLLO_API_KEY}',
       │   │   │       'Content-Type': 'application/json'
       │   │   │     }
       │   │   │   └─ Body: {
       │   │   │       company_name: "Acme Inc",
       │   │   │       industry: "technology",
       │   │   │       limit: 50
       │   │   │     }
       │   │   │
       │   │   ├─ Response: {
       │   │   │   contacts: [
       │   │   │     {
       │   │   │       name: "Jane Doe",
       │   │   │       email: "jane.doe@acme.com",
       │   │   │       title: "VP Marketing",
       │   │   │       company_name: "Acme Inc",
       │   │   │       linkedin_url: "https://linkedin.com/.../jane-doe",
       │   │   │       verified: true
       │   │   │     },
       │   │   │     // ... more contacts
       │   │   │   ]
       │   │   │ }
       │   │   │
       │   │   └─ Return [ScrapedLead, ScrapedLead, ...]
       │   │
       │   └─ results.push(...apolloResults) // 8 leads

       ├─ 3. WEB SCRAPER (Parallel)
       │   │
       │   ├─ Check if enabled: config.enableWebScraper = true
       │   │
       │   ├─ Call searchWebScraper(params)
       │   │   │
       │   │   ├─ Build target URL: "https://acme.com/team" or similar
       │   │   │
       │   │   ├─ Try CORS Proxies
       │   │   │   ├─ Attempt 1: allorigins.win
       │   │   │   │  └─ GET https://api.allorigins.win/raw?url=https://acme.com/team
       │   │   │   │
       │   │   │   ├─ Attempt 2: codetabs.com
       │   │   │   │  └─ GET https://codetabs.com/api/proxy?quest=https://acme.com/team
       │   │   │   │
       │   │   │   └─ Attempt 3: corsproxy.io
       │   │   │      └─ GET https://corsproxy.io/?https://acme.com/team
       │   │   │
       │   │   ├─ Parse HTML response
       │   │   │   └─ Regex: /[a-zA-Z0-9._%+-]+@acme\.com/gi
       │   │   │   └─ Extract: [support@acme.com, sales@acme.com, info@acme.com]
       │   │   │
       │   │   └─ Return [ScrapedLead, ScrapedLead, ...]
       │   │
       │   └─ results.push(...webResults) // 3 leads

       ├─ 4. DEDUPLICATE
       │   │
       │   └─ By email address, keep highest confidence
       │       └─ Total: 20 unique leads (12+8+3-3 duplicates)
       │
       ├─ 5. STORE LEADS
       │   │
       │   ├─ In-memory: this.leads.push(...results)
       │   │
       │   ├─ Persistent: Supabase.leads.insert(results)
       │   │
       │   └─ Track history: scrapingHistory.push({
       │       query: JSON.stringify(params),
       │       timestamp: now,
       │       count: 20
       │     })
       │
       └─ Return [20 ScrapedLeads]

3. Frontend receives lead list
   
4. Display leads with:
   - Source badge (hunter, apollo, web-scraper)
   - Confidence score
   - Verification status
   - LinkedIn URL

5. User selects leads to add to campaign

6. Track Event
   └─ analyticsService.trackEvent(userId, 'lead_search', {
       company: 'Acme Inc',
       sources: ['hunter', 'apollo', 'web-scraper'],
       resultsCount: 20,
       selectedCount: 5
     })

TOTAL API CALLS:
  - 1x Hunter.io domain search
  - 12x Hunter.io email verification
  - 1x Apollo.io contacts search
  - 1x Web scraper (allorigins.win or alt)
  - 1x Supabase leads INSERT
  - 1x Analytics event
  
TOTAL: 17 API calls (highly parallelized)

ERROR HANDLING:
  - Hunter fails? Skip to Apollo
  - Apollo fails? Skip to Web Scraper
  - Web Scraper fails? Still have Hunter+Apollo results
  - Verification fails? Still return unverified lead
```

---

## Flow 4: Analytics Dashboard - Campaign Performance Analysis

```
SEQUENCE:
┌─────────────────────────────────────────────────────────────┐
│ User: View Campaign Analytics Dashboard                     │
└─────────────────────────────────────────────────────────────┘

1. Frontend: Load Dashboard
   └─ GET /api/analytics/performance

2. Backend: Aggregate Performance
   │
   └─> analyticsService.getDashboardData(dateRange)
       │
       ├─ 1. Query all events in date range
       │   └─ Filter: timestamp >= startDate && timestamp <= endDate
       │   └─ Result: [event1, event2, ..., event_n]
       │
       ├─ 2. Calculate Summary Metrics
       │   │
       │   ├─ impressions = count(eventName === 'impression')
       │   │   └─ = 10,000
       │   │
       │   ├─ clicks = count(eventName === 'click')
       │   │   └─ = 500
       │   │
       │   ├─ conversions = count(eventName === 'conversion')
       │   │   └─ = 50
       │   │
       │   ├─ ctr = (clicks / impressions) * 100
       │   │   └─ = (500 / 10,000) * 100 = 5.0%
       │   │
       │   └─ conversionRate = (conversions / clicks) * 100
       │       └─ = (50 / 500) * 100 = 10.0%
       │
       ├─ 3. Get Top Events
       │   │
       │   ├─ Count occurrences of each eventName
       │   ├─ Sort descending
       │   └─ Return top 5: [
       │       { event: 'impression', count: 10000 },
       │       { event: 'click', count: 500 },
       │       { event: 'conversion', count: 50 },
       │       { event: 'engagement', count: 1200 },
       │       { event: 'like', count: 450 }
       │     ]
       │
       ├─ 4. Get Top Users
       │   │
       │   ├─ Group events by userId
       │   ├─ Count events per user
       │   ├─ Sort descending
       │   └─ Return top 5: [
       │       { userId: 'user-1', eventCount: 3500 },
       │       { userId: 'user-2', eventCount: 2100 },
       │       { userId: 'user-3', eventCount: 1800 },
       │       { userId: 'user-4', eventCount: 1200 },
       │       { userId: 'user-5', eventCount: 890 }
       │     ]
       │
       └─ 5. Get Time Series Data
           │
           └─ Call getTimeSeriesData(
               ['impression', 'click', 'conversion'],
               startDate,
               endDate,
               'day'
             )
             │
             ├─ Filter metrics for each day
             ├─ Bucket by date
             ├─ Sum metrics per date
             └─ Return: [
                 {
                   timestamp: 2025-02-27,
                   metrics: { impression: 1500, click: 75, conversion: 8 }
                 },
                 {
                   timestamp: 2025-02-26,
                   metrics: { impression: 1400, click: 70, conversion: 7 }
                 },
                 // ... 28 more days
               ]

3. Frontend: Display Dashboard
   └─ Show cards:
      - Total impressions: 10,000
      - Total clicks: 500 (CTR: 5.0%)
      - Total conversions: 50 (Conv Rate: 10.0%)
   └─ Show top events/users
   └─ Show time series chart

4. User: Drill Down to Campaign
   └─ Click on campaign tile
   └─ GET /api/analytics/campaigns/{campaignId}

5. Backend: Get Campaign Metrics
   │
   └─> analyticsService.getCampaignMetrics(campaignId, startDate, endDate)
       │
       ├─ 1. Filter events for this campaign
       │   └─ Filter: properties.campaignId === campaignId
       │   └─ Filter: timestamp in dateRange
       │   └─ Result: [event1, event2, ...]
       │
       ├─ 2. Count event types
       │   ├─ impressions = 5,000
       │   ├─ clicks = 300
       │   └─ conversions = 45
       │
       ├─ 3. Fetch cost data
       │   └─ costTrackingService.getCostByCampaign(campaignId)
       │   └─ Total cost: $3,800
       │
       ├─ 4. Fetch revenue data
       │   └─ analyticsService.metrics.filter(m => m.metricName === 'revenue')
       │   └─ Total revenue: $12,450
       │
       ├─ 5. Calculate metrics
       │   ├─ roi = ((12450 - 3800) / 3800) * 100 = 227.63%
       │   ├─ roas = 12450 / 3800 = 3.27
       │   ├─ ctr = (300 / 5000) * 100 = 6.0%
       │   └─ conversionRate = (45 / 300) * 100 = 15.0%
       │
       └─ Return metrics

6. Frontend: Display Campaign Details
   └─ ROI: 227.63% ✓
   └─ ROAS: 3.27 ✓
   └─ Conversions: 45
   └─ Revenue: $12,450
   └─ Cost: $3,800

7. User: View Funnel Analysis
   └─ Call analyticsService.getFunnelAnalysis(
       ['impression', 'click', 'add_to_cart', 'checkout', 'purchase'],
       startDate,
       endDate
     )

8. Analytics: Calculate Funnel
   │
   ├─ For step 'impression': 5,000 users, dropoff: 0%
   ├─ For step 'click': 300 users, dropoff: 94%
   ├─ For step 'add_to_cart': 150 users, dropoff: 50%
   ├─ For step 'checkout': 90 users, dropoff: 40%
   └─ For step 'purchase': 45 users, dropoff: 50%
   
   Return: [
     { step: 'impression', count: 5000, dropoffRate: 0 },
     { step: 'click', count: 300, dropoffRate: 94 },
     { step: 'add_to_cart', count: 150, dropoffRate: 50 },
     { step: 'checkout', count: 90, dropoffRate: 40 },
     { step: 'purchase', count: 45, dropoffRate: 50 }
   ]

9. User: View Attribution
   └─ Call analyticsService.getAttributionMetrics(conversionWindow: 30)

10. Analytics: Calculate Last-Click Attribution
    │
    ├─ Get all conversions: [conv1, conv2, ..., conv45]
    │
    ├─ For each conversion:
    │   └─ Find all events for user before conversion
    │   └─ Get last click event
    │   └─ Extract channel: properties.channel
    │   └─ Attribute conversion to channel
    │
    ├─ Aggregate by channel:
    │   ├─ 'google': 20 conversions (44.4%)
    │   ├─ 'facebook': 15 conversions (33.3%)
    │   ├─ 'direct': 10 conversions (22.2%)
    │
    └─ Return: [
        { channel: 'google', attributedConversions: 20, attributionPercentage: 44.4 },
        { channel: 'facebook', attributedConversions: 15, attributionPercentage: 33.3 },
        { channel: 'direct', attributedConversions: 10, attributionPercentage: 22.2 }
      ]

11. Frontend: Display Multi-Touch Attribution
    └─ Show breakdown by channel
    └─ Show waterfall chart

TOTAL API CALLS:
  - 1x GET /api/analytics/performance (dashboard)
  - 1x GET /api/analytics/campaigns/{id} (drill-down)
  - 1x analyticsService.getFunnelAnalysis (internal)
  - 1x analyticsService.getAttributionMetrics (internal)
  
NO EXTERNAL API CALLS (all data computed from stored events)

CACHING:
  - Funnel analysis cached for 5 minutes
  - Attribution cached for 5 minutes
  - Dashboard data cached for 1 minute
```

---

## Flow 5: Live Collaboration Session

```
SEQUENCE:
┌─────────────────────────────────────────────────────────────┐
│ Multiple Users: Real-Time Collaboration                     │
└─────────────────────────────────────────────────────────────┘

1. User A opens Live Session Page
   │
   └─> collaborationService.createSession(
       'Winter Campaign Planning',
       'user-a',
       'Sarah Chen'
     )
       │
       ├─ Generate session ID: session_1740561234567_abc123
       ├─ Add Sarah as admin
       ├─ Generate color: #8b5cf6
       ├─ Broadcast: { type: 'session', action: 'created', session: {...} }
       │
       └─ Subscribe to updates:
           collaborationService.subscribe((type, data) => {
             if (type === 'chat') updateMessages(data);
             if (type === 'activity') updateActivityLog(data);
             if (type === 'user') updateUserList(data);
           })

2. User B joins session
   │
   └─> collaborationService.addUserToSession(
       'user-b',
       'Marcus Johnson',
       'editor'  // Not admin, can't invite others
     )
       │
       ├─ Create new SessionUser:
       │   {
       │     id: 'user-b',
       │     name: 'Marcus Johnson',
       │     avatar: 'MJ',
       │     role: 'editor',
       │     status: 'online',
       │     color: '#f59e0b',
       │     email: 'user-b@example.com'
       │   }
       │
       ├─ Set permissions: ['read', 'write']
       │
       ├─ Log activity:
       │   logActivity('user-a', 'invited', 'Marcus Johnson', { role: 'editor' })
       │
       ├─ Broadcast to subscribers:
       │   {
       │     type: 'user',
       │     action: 'joined',
       │     user: {...},
       │     totalUsers: 2
       │   }
       │
       └─ Both users receive update

3. Sarah sends message: "Let's update the mission statement"
   │
   └─> collaborationService.sendMessage(
       "Let's update the mission statement"
     )
       │
       ├─ Check permission: 'user-a' has 'write'? Yes ✓
       │
       ├─ Create message:
       │   {
       │     id: 'msg_1740561234567_xyz',
       │     userId: 'user-a',
       │     userName: 'Sarah Chen',
       │     text: "Let's update the mission statement",
       │     timestamp: '2025-02-27T10:20:34Z',
       │     type: 'chat'
       │   }
       │
       ├─ Store in session.messages[]
       ├─ Update session.updatedAt
       │
       ├─ Broadcast to subscribers:
       │   {
       │     type: 'chat',
       │     id: 'msg_...',
       │     userId: 'user-a',
       │     userName: 'Sarah Chen',
       │     text: "Let's update the mission statement",
       │     timestamp: '...'
       │   }
       │
       └─ Both users see message appear in chat

4. Marcus reacts to Sarah's message: 👍
   │
   └─> collaborationService.addReaction(
       'msg_1740561234567_xyz',
       '👍'
     )
       │
       ├─ Find message
       ├─ Add reaction:
       │   {
       │     emoji: '👍',
       │     users: ['user-b']
       │   }
       │
       ├─ Broadcast:
       │   {
       │     type: 'chat',
       │     action: 'reacted',
       │     message: {...}
       │   }
       │
       └─ Both users see reaction

5. Sarah edits Mission Statement field (shared canvas)
   │
   ├─ Old: "Empower creative professionals worldwide"
   └─ New: "Empower creative professionals with AI tools"
   
   Broadcast update (via real-time sync):
   {
     type: 'activity',
     id: 'activity_1740561234567',
     userId: 'user-a',
     action: 'updated',
     target: 'Mission Statement',
     timestamp: '2025-02-27T10:21:15Z'
   }

6. Frontend logs activity
   │
   └─> collaborationService.logActivity(
       'user-a',
       'updated',
       'Mission Statement',
       { oldValue: '...', newValue: '...' }
     )
       │
       ├─ Create activity log entry
       ├─ Broadcast to subscribers
       └─ Update activity feed

7. User C requests to join
   │
   └─ Frontend shows "User C requested access"
   └─ Sarah (admin) approves
   └─ collaborationService.addUserToSession('user-c', 'Emily Davis', 'viewer')

8. Export Session
   │
   └─> collaborationService.exportSession('json')
       │
       └─ Return:
           {
             session: {
               id: 'session_1740561234567_abc123',
               name: 'Winter Campaign Planning',
               createdAt: '2025-02-27T10:20:00Z',
               updatedAt: '2025-02-27T10:22:30Z'
             },
             users: [
               { id: 'user-a', name: 'Sarah Chen', role: 'admin', ... },
               { id: 'user-b', name: 'Marcus Johnson', role: 'editor', ... },
               { id: 'user-c', name: 'Emily Davis', role: 'viewer', ... }
             ],
             messages: [
               {
                 id: 'msg_...',
                 userId: 'user-a',
                 userName: 'Sarah Chen',
                 text: "Let's update the mission statement",
                 timestamp: '2025-02-27T10:20:34Z',
                 reactions: [{ emoji: '👍', users: ['user-b'] }]
               },
               // ... more messages
             ],
             activities: [
               {
                 id: 'activity_...',
                 userId: 'user-a',
                 action: 'updated',
                 target: 'Mission Statement',
                 timestamp: '2025-02-27T10:21:15Z'
               },
               // ... more activities
             ]
           }

TOTAL API CALLS:
  - 0x External API calls (all internal)
  - 1x Supabase INSERT (persist session to DB)
  - 5x WebSocket messages (message, reaction, activity x3)

REAL-TIME UPDATES:
  - Message: <100ms
  - Activity: <100ms
  - User presence: <100ms
  - All via subscribers pattern (can be replaced with WebSocket)
```

---

## Summary: Total API Calls by Feature

| Feature | Internal Calls | External API Calls | Total |
|---------|---|---|---|
| Campaign creation + AI description | 4 | 1 (Gemini) | 5 |
| Video generation | 4 | 1 (Fal.ai) | 5 |
| Lead search (multi-source) | 2 | 15 (Hunter x12, Apollo x1, Scraper x1, verify x1) | 17 |
| Analytics dashboard | 4 | 0 | 4 |
| Live collaboration | 7 | 0 | 7 |
| **Total Possible** | | | **38** |

This document shows the complete call sequences for all major flows in Sacred Core.
