# Sacred Core - API Documentation Complete Index

## 📚 Documentation Files

This package contains **4 comprehensive API documentation files**:

### 1. **API_FLOWS_COMPLETE.md** ⭐ START HERE
- **Purpose:** Detailed breakdown of all API flows from start to finish
- **Content:**
  - Backend endpoints (12 REST routes)
  - Core service methods (5 major services)
  - External API integrations (15+ providers)
  - Data flow examples (4 complete scenarios)
  - Cost tracking details
  - Error handling & resilience
  - Real-time updates (WebSocket layer)
  - Configuration & environment variables
  - Performance targets & limits

### 2. **API_QUICK_REFERENCE.md** 📋 FOR QUICK LOOKUPS
- **Purpose:** Fast reference table format
- **Content:**
  - Backend endpoints in table format
  - AI service methods with signatures
  - Video generation by engine
  - Lead search by source
  - Analytics tracking methods
  - Collaboration features
  - Request/response examples
  - Error handling strategies
  - Cost examples

### 3. **AI_CALL_SEQUENCES.md** 🔄 FOR UNDERSTANDING FLOWS
- **Purpose:** Step-by-step visual sequences of complex flows
- **Content:**
  - Flow 1: Campaign creation + AI description (5 API calls)
  - Flow 2: Video generation with cost tracking (6 API calls)
  - Flow 3: Multi-source lead generation (17 API calls)
  - Flow 4: Analytics dashboard analysis (4 API calls)
  - Flow 5: Live collaboration session (7 API calls)
  - Each flow shows:
    - Frontend interactions
    - Backend processing
    - External API calls
    - Data transformations
    - Event tracking
    - Real-time updates

### 4. **API_DOCUMENTATION_INDEX.md** (this file)
- Purpose: Navigation & overview

---

## 🎯 How to Use These Docs

### If you want to...

**Understand the complete architecture:**
→ Start with `API_FLOWS_COMPLETE.md` (Section I-X)

**Find a specific endpoint:**
→ Use `API_QUICK_REFERENCE.md` (Backend Endpoints table)

**See how data flows through the system:**
→ Read `AI_CALL_SEQUENCES.md` (5 flows with detailed sequences)

**Understand a specific service:**
→ Use `API_QUICK_REFERENCE.md` (Service methods section)
→ Then read detailed flow in `API_FLOWS_COMPLETE.md`

**Track API calls for cost analysis:**
→ See `API_QUICK_REFERENCE.md` (Cost examples)
→ See `AI_CALL_SEQUENCES.md` (Cost tracking in flows)

**Implement a feature:**
→ Find similar flow in `AI_CALL_SEQUENCES.md`
→ Check required API keys in `API_FLOWS_COMPLETE.md` (Section IX)
→ Reference error handling in `API_QUICK_REFERENCE.md`

---

## 📊 API Summary

### Backend Endpoints: 12 REST Routes
```
Authentication:     2 routes
Campaigns:          3 routes
Analytics:          2 routes
Costs:              2 routes
Providers:          1 route
Settings:           2 routes
```

### Core Services: 5 Major Services
```
universalAiService         (Text generation with caching)
videoService              (Video generation from 4+ providers)
leadScrapingService       (Lead data from 3+ sources)
analyticsService          (Event tracking & metrics)
collaborationService      (Real-time team features)
```

### External API Providers: 15+
```
LLM Providers:       6 (Google, OpenAI, Anthropic, Groq, Mistral, Cohere)
Video Providers:     4 (Google Veo, Fal.ai, Luma Labs, Kling)
Lead Providers:      3 (Hunter.io, Apollo.io, Web Scraper)
Database:            1 (Supabase)
Authentication:      Multiple (OAuth2, SCIM, MFA)
```

### Total API Calls by Scenario
```
Campaign + AI:       5 calls (1 external)
Video Generation:    6 calls (1 external)
Lead Search:         17 calls (15 external)
Analytics View:      4 calls (0 external)
Collaboration:       7 calls (0 external)
───────────────────────────
Average per session: 8-10 calls
```

---

## 🔌 Environment Setup

All API keys required:
```bash
# LLM Providers (pick at least 1)
VITE_GEMINI_API_KEY
VITE_OPENAI_API_KEY
VITE_ANTHROPIC_API_KEY
VITE_GROQ_API_KEY
VITE_MISTRAL_API_KEY
VITE_COHERE_API_KEY

# Video Providers (optional)
VITE_FAL_API_KEY
VITE_LUMA_API_KEY
VITE_KLING_API_KEY

# Lead Providers (optional)
HUNTER_API_KEY
APOLLO_API_KEY

# Core Services
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# OAuth (optional)
VITE_GOOGLE_CLIENT_ID
VITE_GITHUB_CLIENT_ID
VITE_MICROSOFT_CLIENT_ID

# Server Config
API_PORT=4000
API_HOST=0.0.0.0
JWT_SECRET=your-secret
```

---

## 📈 Performance Metrics

### Response Times (Target)
```
API endpoints (P95):        150-250ms ✓
Page load (P95):            250-400ms ✓
Video generation:           2-60 minutes (async) ✓
Lead search:                5-30 seconds ✓
Text generation:            1-5 seconds ✓
```

### Rate Limits
```
API global:                 100 req / 15 min
Video generation:           5-50 / month (tier-dependent)
Lead searches:              Unlimited
Analytics:                  No limit
```

### Storage
```
Events in-memory:           100,000 max
Cache TTL:                  1 hour
Supabase quota:             500MB default
```

---

## 💰 Cost Breakdown

### Text Generation (per 1000 tokens)
```
Google Gemini:              $0.075 input + $0.3 output = ~$0.000375
OpenAI GPT-4:               $0.03 input + $0.06 output = ~$0.00009
Anthropic Claude:           $0.04 input + $0.12 output = ~$0.00016
Groq:                       ~$0.0001
Mistral:                    ~$0.0001
Cohere:                     ~$0.0001
```

### Video Generation (per video)
```
Google Veo-3:               $5.00 (Hunter tier: free)
LTX-2:                      $1.00 (Pro), free (Hunter)
Luma Labs:                  $2.00
Kling:                      $2.00
Sora:                       $10.00
```

### Lead Generation (ongoing)
```
Hunter.io:                  $49/month (unlimited)
Apollo.io:                  $2-5 per contact
Web Scraper:                Free (no external API)
```

### Estimated Monthly Cost (Heavy User)
```
Text generation (1M tokens):    ~$0.375
Video generation (100 videos):  ~$100.00
Lead searches (1000 leads):     ~$4,900.00 (Apollo)
────────────────────────────────
Total estimate:                 ~$5,000/month
```

---

## 🚨 Important Notes

### Security
- All API keys stored in environment variables
- JWT tokens expire in 7 days
- CORS enabled for localhost only (dev)
- Rate limiting: 100 req/15 min per client
- HTTPS/TLS recommended for production

### Reliability
- Retry logic: Max 3 attempts with exponential backoff
- Fallbacks: Multi-source lead search fails gracefully
- Caching: Neural cache prevents duplicate API calls
- Circuit breaker: Error threshold stops cascade failures

### Monitoring
- Cost tracking: Every AI call logged with cost
- Analytics: Real-time event tracking (100k capacity)
- Activity logging: Collaboration session audit trail
- Performance: Response time tracking per endpoint

---

## 🔍 Documentation Structure

```
API_FLOWS_COMPLETE.md (10,000+ words)
├── I. Backend Endpoints (12 routes)
├── II. Core Services (5 services)
│   ├── A. Universal AI Service
│   ├── B. Video Service
│   ├── C. Lead Scraping
│   ├── D. Analytics Service
│   └── E. Collaboration Service
├── III. External APIs (15+ providers)
├── IV. Data Flow Examples (4 scenarios)
├── V. Cost Tracking
├── VI. Error Handling
├── VII. Real-Time Updates
├── VIII. API Call Summary
├── IX. Configuration
└── X. Performance Targets

API_QUICK_REFERENCE.md (5,000+ words)
├── Backend Endpoints (table)
├── AI Service Methods (code examples)
├── External API Calls (provider summary)
├── Data Models (TypeScript interfaces)
├── Request/Response Examples
├── Error Handling
├── Performance Metrics
└── Cost Examples

AI_CALL_SEQUENCES.md (8,000+ words)
├── Flow 1: Campaign + AI
├── Flow 2: Video Generation
├── Flow 3: Lead Search
├── Flow 4: Analytics Dashboard
├── Flow 5: Collaboration
└── Summary table

API_DOCUMENTATION_INDEX.md (this file)
├── Navigation guide
├── Quick lookup
├── Performance summary
└── Cost breakdown
```

---

## 🎓 Learning Path

**For Backend Developers:**
1. Read `API_FLOWS_COMPLETE.md` sections I-II (endpoints & services)
2. Study `AI_CALL_SEQUENCES.md` flows 1 & 2
3. Check `.env` setup
4. Review `API_QUICK_REFERENCE.md` error handling

**For Frontend Developers:**
1. Read `API_QUICK_REFERENCE.md` (endpoints & data models)
2. Study `AI_CALL_SEQUENCES.md` flows 3 & 5
3. Check request/response examples
4. Review performance targets

**For DevOps/Operations:**
1. Read `API_FLOWS_COMPLETE.md` section IX (configuration)
2. Review cost breakdown in `API_QUICK_REFERENCE.md`
3. Check rate limits & storage in `API_DOCUMENTATION_INDEX.md`
4. Monitor performance metrics

**For Product Managers:**
1. Read `AI_CALL_SEQUENCES.md` (5 user flows)
2. Review cost breakdown
3. Check performance targets
4. Understand feature limitations (tier-based)

---

## ✅ Quick Validation

### Verify Setup
```bash
# Check Vite dev server
curl http://localhost:3001/

# Check API server
curl http://localhost:4000/health

# Check env variables
echo $VITE_GEMINI_API_KEY  # Should show key
echo $HUNTER_API_KEY        # Should show key
```

### Test Basic Flow
1. Open http://localhost:3001
2. Navigate to Create Campaign
3. Try AI description generation
4. Check browser console for API calls
5. Verify cost tracking

### Verify Integrations
- Google Gemini: Test text generation
- Video provider: Test video generation
- Hunter.io: Test lead search
- Supabase: Check database connection
- Analytics: Check event tracking

---

## 📞 Troubleshooting

**API calls failing?**
→ Check `.env` variables
→ Verify API keys valid
→ Check rate limits
→ Review error logs

**Slow responses?**
→ Check cache hits (`neuralCache`)
→ Monitor external API latency
→ Check Supabase connection

**High costs?**
→ Review `costTrackingService` logs
→ Identify expensive calls
→ Optimize prompts
→ Use cache more

**Collaboration not real-time?**
→ Replace subscribers with WebSocket
→ Check Supabase real-time setup
→ Review permissions

---

## 🔗 Related Files in Sacred Core

- `server.ts` - Fastify API server
- `services/` - All 40+ service implementations
- `src/lib/store.ts` - State management
- `types.ts` - TypeScript definitions
- `package.json` - Dependencies & scripts
- `.env.example` - Environment template
- `vite.config.ts` - Frontend build config
- `playwright.config.ts` - E2E test config

---

## 📝 Version Info

- **Sacred Core**: v2.0
- **Documentation**: v1.0 (Feb 27, 2025)
- **Vite**: v6.4.1
- **React**: v19
- **TypeScript**: Strict mode
- **Fastify**: Latest
- **Supabase**: PostgreSQL

---

This documentation covers **100% of API calls** in Sacred Core.

For production deployment, add:
- SSL/TLS certificates
- Monitoring (Sentry, Datadog)
- Backup strategy
- Disaster recovery
- Cost optimization

Last updated: February 27, 2025
