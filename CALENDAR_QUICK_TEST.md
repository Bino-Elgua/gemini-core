# Calendar + Auto-Post - Quick Test Guide

## ⚡ 5-Minute Test

### Step 1: Start the app
```bash
cd Full-Core
npm run dev
# Should see: "Local: http://localhost:3001/"
```

### Step 2: Open in browser
```
http://localhost:3001/#/campaigns
```

### Step 3: Create a test campaign
1. Click **"CREATE CAMPAIGN"**
2. Fill in:
   - Name: "Test Campaign"
   - Goal: "Engagement"
   - Add text: "Check out our latest collection!"
3. Click **"GENERATE ASSETS"**
4. Wait for assets to generate (image, video, jingle)
5. Click **"SAVE"**

### Step 4: Schedule it
1. Navigate to **Scheduler** (/#/scheduler)
2. See your campaign in left panel under "Unscheduled"
3. **Drag** campaign asset to any date on calendar (e.g., tomorrow)
4. You'll see:
   - ✅ Badge appears on calendar date
   - ✅ Post status shows "Pending"

### Step 5: Watch it auto-post
1. **Wait ~60 seconds** (mock timer for testing)
2. Watch browser console for logs:
   ```
   ⏰ Timer set for post ... in XXXms
   ⚡ Initializing Week 3 features...
   📢 [WebSocket]: Campaign live on Instagram! 🎉
   ✅ Post executed successfully
   ```
3. See status change: **"Pending" → "Posted"**
4. Post link appears (e.g., `instagram.com/p/ABC123`)

### Step 6: Verify credits deducted
1. Check credits balance (header or Settings)
2. Should see: `-50 credits` for the auto-post
3. View deduction in Settings → Usage

---

## 🧪 Running E2E Tests

### Option A: Run all calendar tests
```bash
npx playwright test tests/e2e/calendar.spec.ts
```

### Option B: Run specific test
```bash
# Test scheduling
npx playwright test calendar.spec.ts -g "should schedule campaign"

# Test execution
npx playwright test calendar.spec.ts -g "should execute post"

# Test credits
npx playwright test calendar.spec.ts -g "should deduct credits"
```

### Option C: Run with UI
```bash
npx playwright test tests/e2e/calendar.spec.ts --ui
```

---

## 📋 What Gets Tested

### Scheduling Tests
- ✅ Drag campaign to calendar date
- ✅ Scheduled badge appears
- ✅ Tier gating (Pro+ only)

### Execution Tests
- ✅ Post executes at scheduled time
- ✅ Status: "Pending" → "Posted"
- ✅ Post URL appears

### Credit Tests
- ✅ Credits NOT deducted on schedule (0 change)
- ✅ Credits ARE deducted on post execution (50 credits)

### Error Handling Tests
- ✅ Retry 3x on API failure
- ✅ Show error after max retries
- ✅ Disable retry button if failed

### Notification Tests
- ✅ WebSocket notification on success
- ✅ WebSocket notification on failure
- ✅ Toast message appears

### Formatting Tests
- ✅ Instagram carousel with image + audio
- ✅ TikTok video with audio + text

---

## 🔧 Troubleshooting

### "Timer set for post ... in -XXXms" (negative time)
**Why:** Scheduled time is in the past  
**Fix:** Drag to future date (tomorrow or later)

### "No scheduled badge appears"
**Why:** Tier gate or not Pro+  
**Fix:** 
1. Check user tier (Settings)
2. Ensure Pro+ subscription
3. Verify Supabase is configured

### "Post never executes (status stays 'Pending')"
**Why:** Timer not triggered or error in execution  
**Fix:**
1. Check browser console for errors
2. Verify Meta API credentials
3. Check Supabase connection

### "Credits not deducted"
**Why:** Execution failed or credits already deducted  
**Fix:**
1. Verify post status is "Posted" (not "Failed")
2. Check usage history in Settings
3. Refresh page to see updated balance

### "Meta Graph API error"
**Why:** Access token invalid or API limits hit  
**Fix:**
1. Mock API calls in tests (already done)
2. Use test access tokens
3. Verify API credentials in .env.local

---

## 🎯 Expected Results

### After drag-drop to calendar:
```
📋 Status: Pending
📅 Date: Tomorrow 9:00 AM
🔗 Post URL: (empty, will populate after execution)
💳 Credits: No change (not deducted yet)
```

### After scheduled time passes (60 seconds):
```
✅ Status: Posted
🔗 Post URL: https://instagram.com/p/ABC123
💳 Credits: -50 (deducted now)
📢 WebSocket notification: "Campaign live on IG! 🎉"
```

---

## 💡 Tips

### Speed up testing
Edit `calendarService.ts` line ~235:
```typescript
private RETRY_DELAY_MS = 5000;  // Change to 1000 for faster tests
```

### Mock longer delays
To test retries faster, reduce:
```typescript
private MAX_RETRIES = 3;  // Test with 2 or 1
```

### Check logs
Browser console shows:
- ⏰ Timer set/triggered
- 🔄 Retry attempts
- ✅ Success/failure
- 📢 WebSocket notifications

---

## ✅ Checklist Before Claiming "Done"

- [ ] Campaign generates (copy, image, video, jingle)
- [ ] Can drag to calendar (no errors)
- [ ] Scheduled badge appears on date
- [ ] Status shows "Pending"
- [ ] After 60s, status → "Posted"
- [ ] Post URL appears (instagram.com/p/...)
- [ ] Credits balance decreased by 50
- [ ] No console errors
- [ ] All E2E tests pass

---

## 🚀 Next Steps

Once verified locally:
1. **Deploy** (follow DEPLOY_NOW.md)
2. **Test in production** with real Instagram access token
3. **Monitor** WebSocket notifications
4. **Track** usage and credits
5. **Celebrate** 🎉

---

## 📞 Quick Links

- **Calendar Service:** `services/calendarService.ts`
- **E2E Tests:** `tests/e2e/calendar.spec.ts`
- **Pricing:** `HYBRID_PRICING.md`
- **Full Docs:** `CALENDAR_AUTO_POST_IMPLEMENTATION.md`
- **Scheduler UI:** `pages/SchedulerPage.tsx`

---

**Status:** ✅ Ready to test  
**Start:** `npm run dev`  
**Expected Time:** 5 minutes for full flow
