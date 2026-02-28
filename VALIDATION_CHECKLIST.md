# Full-Core Refactor - Validation Checklist

## Pre-Launch Verification (30 minutes)

Use this checklist to verify all fixes are working before production deployment.

---

## 1. Setup & Environment ✅

### 1.1 Repository State
```bash
cd /data/data/com.termux/files/home/Full-Core
git status
```

**Expected**:
- No uncommitted changes (or only .env.local)
- All new files present in git status

### 1.2 Dependencies
```bash
npm install
npm list | grep -E "react|vite|typescript|playwright"
```

**Expected**:
- React 19.2.3+
- Vite 6.2.0+
- TypeScript 5.8.2+
- Playwright 1.48.0+

### 1.3 Environment Variables
```bash
cat .env.local | grep -E "GEMINI|FIREBASE|STRIPE"
```

**Expected**:
```
VITE_GEMINI_API_KEY=AIzaSy_... (not empty)
VITE_FIREBASE_PROJECT_ID=... (not empty)
VITE_FIREBASE_API_KEY=... (not empty)
VITE_STRIPE_PUBLIC_KEY=pk_test_... (or similar)
```

---

## 2. Issue #1: Intelligence Hub / DNA Extraction ✅

### 2.1 Code Verification
```bash
grep -n "checkProviderStatus\|debounce\|fallback" services/dnaExtractionService.ts
```

**Expected output**:
- ✅ `checkProviderStatus()` method exists
- ✅ `extractionInProgress` Map for debounce
- ✅ Fallback prompt for vague sectors
- ✅ Provider health check before extraction

### 2.2 Manual Test: DNA Extraction
1. `npm run dev` (start server)
2. Open http://localhost:1111/extract
3. Enter URL: `https://example.com`
4. Click "INITIATE EXTRACTION"

**Expected**:
- ✅ "Connecting to extraction grid..." message
- ✅ After ~10s: "Analysis Complete" appears
- ✅ DNA Helix displays colors, mission, tone
- ✅ Click again immediately → "Please wait (debounced)" error

### 2.3 Provider Status Test
1. In browser console: 
   ```javascript
   const status = await dnaExtractionService.checkProviderStatus();
   console.log(status);
   ```

**Expected**:
- ✅ Returns `{ healthy: true }` or `{ healthy: false, message: "..." }`
- ✅ No errors thrown
- ✅ Message is user-friendly

### 2.4 Vague Sector Fallback
1. In /extract page
2. Enter sector: "services" (intentionally vague)

**Expected**:
- ✅ Error message: "Sector too vague... Please specify a niche"
- ✅ Suggests: "barbershop instead of services"

---

## 3. Issue #2: Campaign + Calendar Auto-Post ✅

### 3.1 Code Verification
```bash
grep -n "checkDailyCreditsAvailable\|postingInProgress\|refund\|retry" services/calendarService.ts | head -20
```

**Expected**:
- ✅ `checkDailyCreditsAvailable()` method
- ✅ `postingInProgress` Set for debounce
- ✅ `creditsService.refund()` calls
- ✅ `MAX_RETRIES = 3` with exponential backoff

### 3.2 Manual Test: Schedule Post
1. `npm run dev`
2. Go to http://localhost:1111/campaigns
3. Create campaign (if not exists)
4. Click "Schedule" on an asset
5. Set date to tomorrow
6. Select Instagram
7. Click "Schedule Post"

**Expected**:
- ✅ Post appears in calendar with "pending" status
- ✅ Date shows correctly
- ✅ No duplicate schedule if clicked twice (debounce)

### 3.3 Test Retry Logic (Simulated)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Simulate a failed post:
   ```javascript
   // Note: This is manual simulation
   // In real scenario, API failure triggers retry
   const post = calendarService.scheduledPosts.get(postId);
   console.log(post?.retryCount); // Should show 0 initially
   ```

**Expected**:
- ✅ Retry count increases on failure
- ✅ Exponential backoff: 5s, 10s, 20s delays

### 3.4 Test Daily Credit Cap
1. Go to http://localhost:1111/campaigns
2. Try scheduling multiple posts
3. Check if Starter tier hits 500-credit limit

**Expected**:
- ✅ After ~10 posts (50 credits each), error: "Daily cap reached"
- ✅ Message suggests: "Upgrade to Pro+ for unlimited"

### 3.5 Test Credit Refund
1. Schedule a post with low credits
2. Simulate API failure (or manually trigger)
3. Check credits were refunded

**Expected**:
- ✅ On error, credits returned to user
- ✅ Console shows: "Refund for failed post"

---

## 4. Issue #3: Website Builder ✅

### 4.1 Code Verification
```bash
grep -n "generateWebsite\|generateViaGemini\|createPreviewUrl\|generateZip" services/websiteBuilderService.ts
```

**Expected**:
- ✅ `generateWebsite()` method
- ✅ `generateViaGemini()` for Gemini API call
- ✅ `createPreviewUrl()` for in-app preview
- ✅ `generateZip()` for ZIP download

### 4.2 Manual Test: Website Generation
1. `npm run dev`
2. Go to http://localhost:1111/website-builder
3. Fill form:
   - Company: "Test Inc"
   - Tagline: "Innovation at scale"
   - Email: "hello@test.com"
   - CTA: "Get Started"
4. Click "Generate Website"

**Expected**:
- ✅ "Website generated" message appears
- ✅ Preview iframe shows HTML page
- ✅ Page has hero section, colors, CTA button
- ✅ "Download ZIP" button enabled

### 4.3 Manual Test: ZIP Download
1. Click "Download ZIP" button
2. Check downloaded file

**Expected**:
- ✅ Downloads as `website.zip` (or similar)
- ✅ ZIP contains:
  - `index.html` (full page)
  - `style.css` (styles)
  - `script.js` (JavaScript)
  - `README.md` (instructions)

### 4.4 Test ZIP Content Quality
1. Extract downloaded ZIP
2. Open `index.html` in browser locally

**Expected**:
- ✅ Page displays correctly
- ✅ Responsive on mobile (open with F12, resize)
- ✅ CTA button works
- ✅ Contact form visible

---

## 5. Issue #4: Live Sessions ✅

### 5.1 Code Verification
```bash
grep -n "initializeSession\|sendMessage\|setTyping\|inviteTeamMember" services/liveSessionsService.ts
```

**Expected**:
- ✅ `initializeSession()` connects to Firebase
- ✅ `sendMessage()` saves to Firebase
- ✅ `setTyping()` updates presence
- ✅ `inviteTeamMember()` sends invite

### 5.2 Manual Test: Live Chat
1. `npm run dev`
2. Go to http://localhost:1111/live-sessions
3. Create new session
4. Send message: "Hello"

**Expected**:
- ✅ Message appears immediately
- ✅ Message shows your username
- ✅ Message shows timestamp

### 5.3 Test Typing Indicators
1. In chat input, start typing
2. Watch for "is typing" indicator

**Expected**:
- ✅ Message shows: "User is typing..."
- ✅ Disappears after you stop typing (3s timeout)
- ✅ No "is typing" shown after send

### 5.4 Test Team Invites
1. In /live-sessions, click "Invite Team"
2. Enter email: `test@example.com`
3. Click "Send Invite"

**Expected**:
- ✅ Email shown in invite list
- ✅ Status shows "pending"
- ✅ Browser console shows: "[Mock Email] Sending invite to test@example.com"

### 5.5 Verify Firebase Integration
1. Go to Firebase Console
2. Navigate to Realtime Database
3. Look for `/sessions/{sessionId}/messages`

**Expected**:
- ✅ Messages appear in real-time DB
- ✅ Message structure: `{ id, userId, username, message, timestamp }`

---

## 6. Issue #5: Settings (Gemini-Only) ✅

### 6.1 Code Verification
```bash
grep -n "getApiKey\|setApiKey\|validateApiKey" services/settingsServiceGeminiOnly.ts
```

**Expected**:
- ✅ Only `getApiKey()` / `setApiKey()` (no provider selector)
- ✅ `validateApiKey()` method
- ✅ No old `generateOpenAI()`, `generateAnthropic()` references

### 6.2 Manual Test: Settings Page
1. `npm run dev`
2. Go to http://localhost:1111/settings
3. Look at form fields

**Expected**:
- ✅ Only 1 input field: "Gemini API Key"
- ✅ No "Provider" dropdown
- ✅ No "OpenAI Key", "Claude Key", etc. fields
- ✅ "Save" and "Validate" buttons visible

### 6.3 Test API Key Update
1. Clear the API key field
2. Paste test key: `AIzaSy_test_key_12345`
3. Click "Validate"
4. Click "Save"

**Expected**:
- ✅ "API key updated" message
- ✅ Key stored in localStorage (DevTools → Application → Local Storage)
- ✅ No errors

### 6.4 Verify No Provider Registry
1. Search codebase:
   ```bash
   grep -r "activeLLM\|llmRegistry\|providers.{" services/ | grep -v ".backup"
   ```

**Expected**:
- ✅ No provider branch logic in universalAiService
- ✅ Only Gemini calls
- ✅ No OpenAI/Claude/Anthropic references

---

## 7. Issue #6: Subscriptions ✅

### 7.1 Code Verification
```bash
grep -n "Starter\|Pro\|Enterprise\|creditPacks\|getTiers" services/pricingServiceExpanded.ts
```

**Expected**:
- ✅ 4 tiers: Starter, Pro, Pro+, Enterprise
- ✅ `getTiers()` returns all 4
- ✅ `creditPacks` array with 3 items

### 7.2 Manual Test: Subscriptions Page
1. `npm run dev`
2. Go to http://localhost:1111/dashboard
3. Click "Subscriptions"

**Expected**:
- ✅ 4 tier cards shown: Starter, Pro, Pro+, Enterprise
- ✅ Each shows:
  - Price ($0, $49, $99, $199)
  - Credits per month
  - Feature list
  - "Current" badge (Starter for new user)
  - "Upgrade" button

### 7.3 Test Tier Comparison
1. Scroll to comparison table (if present)

**Expected**:
- ✅ Matrix shows features vs. tiers
- ✅ Shows: credits, team size, auto-posting, support level

### 7.4 Test Credit Packs
1. Look for "Buy Credits" section
2. See $4.99, $19.99, $49.99 options

**Expected**:
- ✅ 3 packs visible
- ✅ Shows: 500, 3,000, 10,000 credits respectively
- ✅ Shows savings ("Save 15%", etc.)

### 7.5 Test Upgrade Flow
1. Click "Upgrade to Pro"
2. Check if Stripe checkout appears (or modal)

**Expected**:
- ✅ Stripe form appears (or loading state if integrated)
- ✅ No errors in browser console

---

## 8. Issue #7: Edge Cases ✅

### 8.1 Test Debounce (DNA Extraction)
1. Go to /extract
2. Fill URL
3. Click "INITIATE EXTRACTION" rapidly (3x clicks)

**Expected**:
- ✅ Only 1 API call made (debounce prevents duplicates)
- ✅ Console shows: "Extraction already in progress"

### 8.2 Test Daily Credit Cap
1. User with Starter tier
2. Create ~10 campaigns (300+ credits)
3. Try to auto-post

**Expected**:
- ✅ After using 500 free credits:
  - Error: "Daily cap reached"
  - Message: "Upgrade to Pro+ for unlimited"

### 8.3 Test Mobile Responsiveness (Calendar)
1. Open http://localhost:1111/campaigns
2. Press F12 (DevTools)
3. Click "Toggle device toolbar" (mobile icon)
4. Select iPhone 12 Pro (390x844)

**Expected**:
- ✅ Calendar displays full-width on mobile
- ✅ No horizontal scroll
- ✅ Dates readable
- ✅ Buttons clickable (min 48px touch target)

### 8.4 Test Mobile Responsiveness (Website Preview)
1. Go to /website-builder
2. Generate website
3. Press F12, toggle device mode
4. Select iPad (768x1024)

**Expected**:
- ✅ Preview responsive
- ✅ Mobile-first design
- ✅ Text readable

### 8.5 Test Error Recovery
1. Intentionally cause an error:
   - Invalid Gemini key
   - Disconnect Firebase
2. Try to extract DNA / schedule post

**Expected**:
- ✅ Clear error message shown
- ✅ User can retry
- ✅ No app crash

---

## 9. Performance & Load ✅

### 9.1 Check Bundle Size
```bash
npm run build
ls -lh dist/
```

**Expected**:
- ✅ Main bundle < 500KB
- ✅ No huge dependencies added

### 9.2 Check Load Time
1. `npm run dev`
2. Open http://localhost:1111
3. DevTools → Network tab
4. Note load time

**Expected**:
- ✅ Page loads in < 3 seconds (local)
- ✅ No console errors
- ✅ All assets loaded

### 9.3 Check API Call Count
1. DevTools → Network tab
2. Go through DNA extraction flow
3. Count API calls

**Expected**:
- ✅ DNA extraction: ~1-2 Gemini calls
- ✅ No duplicate calls (debounce working)
- ✅ Reasonable response times (< 5s)

---

## 10. E2E Test Suite ✅

### 10.1 Run Full Test Suite
```bash
npm run test:e2e 2>&1 | tee test-results.log
```

**Expected**:
- ✅ All 9 test flows pass
- ✅ No flaky tests
- ✅ Total time < 10 minutes

### 10.2 Specific Test: DNA Extraction
```bash
npm run test:e2e -- --grep "DNA extraction and auto-post"
```

**Expected**:
- ✅ Test passes
- ✅ Shows: DNA extracted → Campaign created → Post scheduled

### 10.3 Specific Test: Website Builder
```bash
npm run test:e2e -- --grep "Website builder generation"
```

**Expected**:
- ✅ Test passes
- ✅ Shows: Config entered → Website generated → ZIP downloaded

### 10.4 Specific Test: Edge Cases
```bash
npm run test:e2e -- --grep "Edge cases"
```

**Expected**:
- ✅ Debounce test passes
- ✅ Mobile responsive test passes
- ✅ Daily cap test passes

---

## 11. Documentation ✅

### 11.1 Verify All Docs Present
```bash
ls -1 *GEMINI*.md *REFACTOR*.md *MIGRATION*.md *QUICKSTART*.md
```

**Expected**:
- ✅ REFACTOR_COMPLETE.md (350+ lines)
- ✅ MIGRATION_GUIDE.md (400+ lines)
- ✅ QUICKSTART_GEMINI.md (300+ lines)
- ✅ REFACTOR_SUMMARY.md (exists)
- ✅ VALIDATION_CHECKLIST.md (this file)

### 11.2 Verify Documentation Quality
1. Read `QUICKSTART_GEMINI.md` (should take ~5 minutes)
2. Verify 5-minute setup is accurate
3. Check troubleshooting section

**Expected**:
- ✅ Clear, step-by-step instructions
- ✅ No outdated info
- ✅ All commands work

### 11.3 Verify Code Comments
```bash
grep -r "TODO\|FIXME\|XXX\|HACK" services/*.ts | wc -l
```

**Expected**:
- ✅ < 5 TODOs (acceptable for cleanup items)
- ✅ All major methods have JSDoc comments

---

## 12. Final Sign-Off ✅

### 12.1 Checklist Summary
```bash
cat << 'EOF' > VALIDATION_COMPLETE.txt
✅ Setup & Environment (1.1-1.3)
✅ DNA Extraction (2.1-2.4)
✅ Calendar Auto-Post (3.1-3.5)
✅ Website Builder (4.1-4.4)
✅ Live Sessions (5.1-5.5)
✅ Settings Gemini-Only (6.1-6.4)
✅ Subscriptions (7.1-7.5)
✅ Edge Cases (8.1-8.5)
✅ Performance & Load (9.1-9.3)
✅ E2E Test Suite (10.1-10.4)
✅ Documentation (11.1-11.3)

STATUS: PRODUCTION-READY ✅
DATE: 2026-02-28
VERSION: 1.0.0-gemini-only
EOF
cat VALIDATION_COMPLETE.txt
```

### 12.2 Final Tests
1. One more `npm run dev`
2. Manual walk-through of main flow:
   - DNA Extraction
   - Campaign Generation
   - Website Builder
   - Live Sessions
3. Run E2E suite: `npm run test:e2e`

### 12.3 Deploy Approval
- [ ] All checklist items complete
- [ ] E2E tests passing
- [ ] Manual testing successful
- [ ] Documentation accurate
- [ ] No console errors
- [ ] Performance acceptable

---

## Troubleshooting During Validation

### Issue: "Gemini API quota exceeded"
**Fix**: Check quotas at https://console.cloud.google.com  
→ Wait a few minutes and retry

### Issue: "Firebase connection timeout"
**Fix**: 
1. Verify Firebase keys in `.env.local`
2. Check Firebase console → Realtime DB is enabled
3. Check security rules allow read/write

### Issue: "E2E tests timeout"
**Fix**:
1. Ensure `npm run dev` is running
2. Check server is responding: `curl http://localhost:1111`
3. Run with longer timeout: `npm run test:e2e -- --timeout 60000`

### Issue: "ZIP download fails"
**Fix**: 
1. Check browser console for errors
2. Verify jszip library loaded
3. Try in different browser

---

## Sign-Off

**Validation Date**: ___________  
**Validator Name**: ___________  
**Status**: ☐ PASS / ☐ FAIL

**Issues Found** (if any):
```
[List any issues with reproduction steps]
```

---

**Congratulations!** 🎉  
Full-Core Gemini-Only Stack is ready for production.

**Next Steps**:
1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Monitor error rates for 24 hours

---

**Questions?** See documentation:
- `REFACTOR_COMPLETE.md` - Full features
- `QUICKSTART_GEMINI.md` - 5-minute setup
- `MIGRATION_GUIDE.md` - Detailed migration
