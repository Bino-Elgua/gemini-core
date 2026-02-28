# Migration Guide: Full-Core to Gemini-Only Stack

## What Changed

This document guides you through migrating from the old multi-provider stack to the new **Gemini-only** Google Stack.

## Old Architecture (Multi-Provider)
```
- LLMClient registry with OpenAI, Claude, Deepseek, Groq, Mistral
- Settings page with provider dropdown
- universalAiService with branch logic for each provider
- Mock Firebase (calendar)
- Mock chat (live sessions)
```

## New Architecture (Gemini-Only)
```
- Hard-coded Gemini everywhere
- Settings page (Gemini API Key ONLY)
- universalAiService (Gemini-only calls)
- Real Firebase Realtime DB (calendar + chat)
- Real-time typing indicators
- Debounce + retry logic
- Credit refunds on error
```

## Step-by-Step Migration

### 1. Update Environment Variables

**Old**:
```env
VITE_OPENAI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...
VITE_DEEPSEEK_API_KEY=...
VITE_GROQ_API_KEY=...
VITE_MISTRAL_API_KEY=...
VITE_GEMINI_API_KEY=...
```

**New**:
```env
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_DATABASE_URL=your_firebase_db_url
VITE_STRIPE_PUBLIC_KEY=your_stripe_key
```

### 2. Remove Old Provider Files

Delete these files (no longer needed):
```bash
# Old services
rm services/aiProviderService.ts
rm services/llmProviderService.ts

# Old settings
rm services/settingsService.ts

# Old mock services
rm services/realtimeCollaborationService.ts (use liveSessionsService.ts instead)
```

### 3. Update universalAiService.ts

**Old behavior**: Checked `activeLLM` provider and branched logic

**New behavior**: Always use Gemini (see updated service in repo)

The key change:
```typescript
// OLD
switch (activeLLM) {
  case 'openai': result = await this.generateOpenAI(...);
  case 'anthropic': result = await this.generateAnthropic(...);
  ...
}

// NEW
const geminiKey = keys.gemini || process.env.VITE_GEMINI_API_KEY || '';
result = await this.generateGemini(finalParams, geminiKey);
```

### 4. Update Settings Components

**Old**: `pages/SettingsPage.tsx` with provider dropdown

**New**: Only Gemini API key field

Changes:
- Remove provider selector dropdown
- Remove credential fields for other providers
- Show only: "Gemini API Key" input
- Add "Validate" button to test key

Example component:
```tsx
// New Settings Component (Gemini-only)
<div className="space-y-4">
  <label className="block text-sm font-bold">Gemini API Key</label>
  <input 
    type="password"
    placeholder="AIzaSy_..."
    value={apiKey}
    onChange={(e) => setApiKey(e.target.value)}
    className="w-full px-4 py-2 border rounded"
  />
  <button 
    onClick={validateKey}
    className="bg-blue-500 text-white px-4 py-2 rounded"
  >
    Validate Key
  </button>
</div>
```

### 5. Update Calendar Service

**Old**: Used Supabase only, no retry logic

**New**: 
- Real Firebase Realtime DB
- 3x retry + exponential backoff
- Debounce (prevent duplicate posts)
- Credit refunds on error
- Daily 500-credit cap for Starter

Replace old `calendarService.ts` with new version:
```bash
cp services/calendarService.ts services/calendarService.ts.backup
# Use new calendarService.ts from refactor
```

### 6. Update Live Sessions

**Old**: Mock data, no real chat

**New**: Real Firebase Realtime DB + typing indicators

Replace old service:
```bash
rm services/realtimeCollaborationService.ts
# Use new services/liveSessionsService.ts
```

Update components to use new service:
```typescript
import { liveSessionsService } from '../services/liveSessionsService';

// In component
await liveSessionsService.initializeSession(sessionId, userId);
await liveSessionsService.sendMessage(sessionId, userId, username, message);
const typingUsers = await liveSessionsService.getTypingUsers(sessionId);
```

### 7. Add New Services

These are completely new:

```bash
# Copy to services/
services/websiteBuilderService.ts      # Website generation
services/liveSessionsService.ts        # Real Firebase chat
services/settingsServiceGeminiOnly.ts  # Gemini-only settings
services/pricingServiceExpanded.ts     # Full tier breakdown
```

### 8. Update DNA Extraction

The service now includes:
- Provider status check
- Fallback for vague sectors
- Debounce protection

Key changes:
```typescript
// Check provider health first
const status = await this.checkProviderStatus();
if (!status.healthy) {
  throw new Error(status.message);
}

// Debounce extraction
if (this.extractionInProgress.has(cacheKey)) {
  return this.extractionInProgress.get(cacheKey)!;
}
```

### 9. Update Pricing / Subscriptions

**Old**: Only Starter tier

**New**: Starter / Pro / Pro+ / Enterprise with credit packs

Update dashboard/settings to show tiers:
```typescript
import { pricingServiceExpanded } from '../services/pricingServiceExpanded';

const tiers = pricingServiceExpanded.getTiers();
const packs = pricingServiceExpanded.getCreditPacks();
```

### 10. Update Stripe Integration

If using credit packs, ensure Stripe service is updated:
```typescript
// Subscribe to Pro tier
await pricingServiceExpanded.upgradeTier(userId, 'Pro');

// Buy credit pack
await pricingServiceExpanded.buyCreditPack(userId, 'medium');
```

### 11. Database Migrations

If using Supabase, create these tables (if not exists):

```sql
-- Scheduled posts (auto-posting)
CREATE TABLE scheduled_posts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  user_id TEXT,
  asset_id TEXT,
  scheduled_for TIMESTAMP,
  platform TEXT,
  status TEXT, -- pending, posting, posted, failed
  post_url TEXT,
  error_message TEXT,
  retry_count INT,
  meta_access_token TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Campaigns
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  status TEXT, -- draft, active, completed
  post_url TEXT,
  posted_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### 12. Firebase Realtime DB Structure

Set up these paths:

```
/sessions/{sessionId}/
  /messages/{messageId}/
    id, userId, username, message, timestamp, avatar
  /typing/{userId}/
    isTyping, typingSince, lastSeen
  /team/{userId}/
    username, joinedAt, role

/invites/{inviteId}/
  fromUserId, toEmail, status, createdAt, expiresAt

/notifications/{userId}/{notificationId}/
  type, message, timestamp, read
```

### 13. Update Tests

Old tests likely won't work with new architecture. Use new E2E tests:

```bash
cp tests/e2e.refactored.spec.ts tests/e2e.spec.ts
npm run test:e2e
```

### 14. Update Docker (if applicable)

Update `Dockerfile` to use correct build:

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Only Gemini key needed
ENV VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
ENV VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}

COPY . .
RUN npm run build
EXPOSE 1111

CMD ["npm", "run", "preview"]
```

## Testing Checklist

After migration, verify:

- [ ] Gemini API key works in Settings
- [ ] DNA extraction doesn't double-generate
- [ ] Campaign scheduling works with retry logic
- [ ] Website builder generates valid HTML
- [ ] Live sessions show real Firebase messages
- [ ] Typing indicators work in chat
- [ ] Team invites can be sent
- [ ] Subscriptions page shows all 4 tiers
- [ ] Daily 500-credit cap enforced
- [ ] Refunds applied on error
- [ ] Mobile responsive on calendar
- [ ] E2E tests pass: `npm run test:e2e`

## Rollback Plan

If something goes wrong:

1. **Git revert**:
   ```bash
   git revert HEAD
   npm install
   npm run dev
   ```

2. **Environment**: Restore old `.env.local` file

3. **Database**: If using migrations, keep backups:
   ```bash
   # Supabase backup
   pg_dump your_db > backup.sql
   ```

## Common Issues

### Issue: "Gemini API key missing"
**Solution**: 
- Check `.env.local` has `VITE_GEMINI_API_KEY=...`
- Verify key is valid (from console.cloud.google.com)
- Clear browser cache / localStorage

### Issue: "Firebase connection failed"
**Solution**:
- Verify Firebase project ID in `.env.local`
- Check Realtime DB is enabled in Firebase console
- Review security rules (should allow public read/write for testing)

### Issue: "Provider status check failed"
**Solution**:
- This is expected if API is down
- Auto-retry happens (shows "Retry in 30s" message)
- Check Gemini API status page

### Issue: "Debounce: already in progress"
**Solution**:
- This is intentional (prevents duplicate posts)
- Wait 2 seconds before retrying

## Support Resources

- 📖 Gemini API Docs: https://ai.google.dev
- 🔥 Firebase Docs: https://firebase.google.com/docs
- 💳 Stripe Docs: https://stripe.com/docs/api
- 📝 This Repo: See `REFACTOR_COMPLETE.md`

---

**Migration Status**: ✅ Complete  
**Timeline**: ~2-3 hours for full migration  
**Complexity**: Medium (requires Firebase setup)
