# Phase 2: Enterprise Hardening Roadmap

**Starting Point:** Production-ready baseline (Grade A-) | 0 TS errors | 28+ services | 204.80 KB gzipped

---

## Scheduled Implementations

### 1️⃣ Sentry Integration (Error Tracking + Performance Monitoring)
**Est. Time:** 30 min

**Changes:**
- Add `@sentry/react` package
- Initialize in `App.tsx` (before React mount)
- Add DSN to `.env.example`
- Wrap App with `Sentry.ErrorBoundary`
- Capture unhandled errors + performance metrics

**Impacts:**
- +~50 KB bundle (gzipped: ~230 KB total)
- No breaking changes to existing code
- Optional (can disable with env flag)

**Acceptance Criteria:**
- Sentry dashboard receives test error
- Performance metrics recorded
- No console errors

---

### 2️⃣ TypeScript Strict Mode
**Est. Time:** 15 min

**Changes:**
- Update `tsconfig.json`:
  ```json
  {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
  ```
- Fix any new type errors if needed (expect 0-5)

**Impacts:**
- Better IDE type checking
- Prevents `any` type usage
- No runtime changes

**Acceptance Criteria:**
- Build still succeeds with 0 errors
- No new runtime issues

---

### 3️⃣ Feature Flags System
**Est. Time:** 45 min

**Changes:**
- Create Supabase table `feature_flags`:
  ```sql
  CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- New service: `services/featureFlagService.ts`
  - `getFlag(name: string): Promise<boolean>`
  - Cached locally (5 min TTL)
- Add Zustand hook: `useFeatureFlags()`
- Wrap key features: campaign creation, video generation, analytics export
- Add admin toggle UI (in admin dashboard later)

**Impacts:**
- New Supabase table (small)
- +~5 KB bundle
- No breaking changes

**Acceptance Criteria:**
- Flags readable from Supabase
- Cache works (verified in browser dev tools)
- Features toggleable without redeploy

---

### 4️⃣ Admin Dashboard (Usage Stats, Quotas, Audit Logs)
**Est. Time:** 2 hours

**Changes:**
- New protected route: `/admin`
- New component: `AdminDashboard.tsx`
- Features:
  - **Usage Stats Card:** Show API calls this month, tokens used, cost
  - **Quota Settings:** Set per-user limits (LLM tokens, image generations, video renders)
  - **Audit Log:** Export user actions (login, campaign create, generate, etc.) as CSV/JSON
  - **Team Members:** List users, roles, usage breakdown
- New Supabase tables:
  - `audit_logs` (user_id, action, metadata, timestamp)
  - `user_quotas` (user_id, llm_tokens_limit, images_limit, videos_limit)
- Backend queries to aggregate usage
- Export buttons (CSV, JSON)

**Impacts:**
- +~30 KB bundle
- New database tables
- Protected by Supabase RLS (admin role only)

**Acceptance Criteria:**
- /admin loads only if user.role = 'admin'
- Usage stats match Supabase queries
- Audit log exports valid CSV/JSON
- Team members listed correctly

---

### 5️⃣ Usage Budget Caps (Per-User Hard Limits)
**Est. Time:** 1 hour

**Changes:**
- Add quota check to LLM, image, video services:
  ```typescript
  async generateText(prompt: string) {
    const quotas = await quotaService.getUserQuotas();
    const used = await quotaService.getUserUsage('llm_tokens');
    if (used >= quotas.llm_tokens_limit) {
      throw new Error('LLM token quota exceeded');
    }
    // proceed with generation
  }
  ```
- Update quotaService to track usage in Supabase
- Show warning at 80% quota, block at 100%
- UI toast alert when limit reached

**Impacts:**
- +~3 KB bundle
- Prevents cost overruns
- No breaking changes

**Acceptance Criteria:**
- Quotas enforced (test with low limit)
- Usage tracked in Supabase
- Warnings show correctly
- Admin can adjust limits

---

### 6️⃣ OIDC SSO (Single Sign-On)
**Est. Time:** 1.5 hours

**Changes:**
- Configure Supabase Auth providers (Google, GitHub, Microsoft)
- Update AuthService:
  - `signInWithProvider(provider: 'google' | 'github' | 'microsoft')`
  - Keep email/password as fallback
- New UI component: `SSOButtons.tsx`
- Add provider logos (Lucide icons)
- Supabase dashboard setup (client ID/secret per provider)

**Impacts:**
- +~10 KB bundle
- Supabase auth delegation (managed service)
- Optional feature (email/password still works)

**Acceptance Criteria:**
- Google SSO login works
- User logged in with correct email
- Fallback to email/password still works
- No console errors

---

### 7️⃣ Multi-Region Supabase + Load Testing Guide
**Est. Time:** 1 hour

**Changes:**
- New doc: `HARDENING.md`
  - Multi-region replication setup (PostgreSQL logical replication)
  - Connection pooling (PgBouncer config)
  - Read replicas for analytics
  - Failover strategy (DNS failover, connection retry logic)
- Load test script (Node.js + Artillery):
  ```bash
  artillery run load-test.yml --target http://localhost:3003
  ```
  - Simulate 50-100 concurrent users
  - 5 min duration
  - Monitor response times, errors, P95 latency
  - Report results in markdown

**Impacts:**
- Documentation only (no code changes to app)
- Artillery installed (dev dependency)
- +~5 KB docs

**Acceptance Criteria:**
- Load test runs without errors
- < 2s response time at 100 concurrent users
- < 5% error rate
- Report generated (markdown)

---

## Execution Order

Each feature will follow this pattern:

1. **Propose Changes** - Show diffs, explain trade-offs
2. **Await Confirmation** - Get "yes" before implementing
3. **Implement** - Add code, preserve existing functionality
4. **Test** - Run build + manual verification
5. **Commit** - Clear message (e.g., `feat: add Sentry error monitoring`)
6. **Verify** - Check bundle size + no regressions

---

## Bundle Size Target

| Phase | Current | After Feature | Target |
|-------|---------|---------------|---------| 
| Baseline | 204.80 KB | - | - |
| + Sentry | - | ~230 KB | < 250 KB |
| + Flags | - | ~235 KB | < 250 KB |
| + Admin | - | ~265 KB | < 300 KB |
| + Budget | - | ~268 KB | < 300 KB |
| + SSO | - | ~278 KB | < 300 KB |
| **Final** | - | ~278 KB | ✅ **< 300 KB** |

---

## Safety Checks

✅ No breaking changes to existing services  
✅ All features behind toggles/env vars where possible  
✅ Backward compatible with current auth (Supabase)  
✅ Full TypeScript type safety (after strict mode)  
✅ E2E tests can validate (once on CI platform)

---

## Next Step

**Awaiting confirmation to begin Phase 2.**

When ready, I will:
1. Show proposed changes for **Sentry Integration** first
2. Ask for confirmation
3. Implement, test, and commit
4. Move to next feature

Ready? Reply with **"start phase 2"** or ask questions.
