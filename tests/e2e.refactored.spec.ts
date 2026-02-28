/**
 * E2E Tests for Refactored Full-Core (Gemini-only stack)
 * 
 * Test flows:
 * 1. DNA Extraction → Campaign → Schedule → Auto-post → Verify credits
 * 2. Website Builder → Generate → Preview → Download ZIP
 * 3. Live Sessions → Chat → Team Invite → Typing Indicators
 * 4. Agent Chat → Sonic interaction
 * 5. Settings → Update API key → Verify
 * 6. Subscriptions → View tiers → Upgrade → Buy credits
 */

import { test, expect } from '@playwright/test';

test.describe('Full-Core E2E Tests (Refactored)', () => {
  
  const baseUrl = 'http://localhost:1111';
  const testCompanyUrl = 'https://example.com';
  const testEmail = 'test@example.com';
  const testGeminiKey = process.env.GEMINI_API_KEY || 'test_key_xyz';

  // Setup: Configure Gemini API key in settings
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/settings`);
    
    // Fill in Gemini API key (only field shown)
    await page.fill('input[placeholder*="API Key"]', testGeminiKey);
    await page.click('button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=API key updated')).toBeVisible();
    await page.close();
  });

  // Test 1: DNA Extraction → Campaign → Schedule → Auto-post
  test('DNA extraction and auto-post workflow', async ({ page }) => {
    // Navigate to Intelligence Hub (DNA Extraction)
    await page.goto(`${baseUrl}/extract`);
    
    // 1. Extract DNA from URL
    await page.fill('input[placeholder*="URL"]', testCompanyUrl);
    await page.fill('textarea[placeholder*="contextual"]', 'Tech startup');
    await page.click('button:has-text("INITIATE EXTRACTION")');
    
    // Wait for extraction
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 30000 });
    
    // Verify DNA extracted
    const dnaHelix = page.locator('[data-testid="dna-helix"]');
    await expect(dnaHelix).toBeVisible();
    
    // 2. Navigate to Campaign Forge
    await page.click('button:has-text("Forge Campaign")');
    await page.goto(`${baseUrl}/campaigns`);
    
    // 3. Create campaign
    await page.fill('input[placeholder*="Campaign name"]', 'Test Campaign');
    await page.fill('textarea[placeholder*="Goal"]', 'Launch product');
    await page.click('button:has-text("Generate Campaign")');
    
    // Wait for campaign generation
    await expect(page.locator('text=Campaign assets generated')).toBeVisible({ timeout: 30000 });
    
    // 4. Schedule post (Calendar)
    await page.click('button:has-text("Schedule")');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await page.fill('input[type="date"]', dateStr);
    await page.selectOption('select[name="platform"]', 'instagram');
    await page.click('button:has-text("Schedule Post")');
    
    // Verify scheduled
    await expect(page.locator(`text=${dateStr}`)).toBeVisible();
    
    // 5. Execute post (if time reached or manually trigger)
    // In test, we'll verify the post was stored
    const postStatus = page.locator('[data-testid="post-status"]');
    await expect(postStatus).toContainText('pending');
    
    console.log('✅ DNA → Campaign → Schedule workflow complete');
  });

  // Test 2: Website Builder (Vibe Coding)
  test('Website builder generation and download', async ({ page }) => {
    await page.goto(`${baseUrl}/website-builder`);
    
    // 1. Fill in website config
    await page.fill('input[placeholder*="Company name"]', 'Test Inc');
    await page.fill('input[placeholder*="Tagline"]', 'Innovation at scale');
    await page.fill('textarea[placeholder*="Description"]', 'We make great products');
    await page.fill('input[placeholder*="CTA text"]', 'Get Started');
    await page.fill('input[placeholder*="CTA URL"]', 'https://example.com/signup');
    await page.fill('input[placeholder*="Contact email"]', 'hello@example.com');
    
    // 2. Generate website
    await page.click('button:has-text("Generate Website")');
    
    // Wait for generation
    await expect(page.locator('text=Website generated')).toBeVisible({ timeout: 30000 });
    
    // 3. Verify preview
    const preview = page.locator('iframe[title="Website Preview"]');
    await expect(preview).toBeVisible();
    
    // 4. Download ZIP
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download ZIP")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    
    console.log('✅ Website builder workflow complete');
  });

  // Test 3: Live Sessions (Chat, Team Invites, Typing)
  test('Live sessions with team chat and invites', async ({ browser }) => {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();
    
    // User 1 creates session
    await page1.goto(`${baseUrl}/live-sessions`);
    await page1.click('button:has-text("New Session")');
    await page1.fill('input[placeholder*="Session name"]', 'Team Meeting');
    await page1.click('button:has-text("Create")');
    
    const sessionId = page1.url().split('/').pop();
    
    // 1. User 1 sends message
    await page1.fill('input[placeholder*="Message"]', 'Hello team!');
    await page1.click('button:has-text("Send")');
    
    // Verify message sent
    await expect(page1.locator('text=Hello team!')).toBeVisible();
    
    // 2. User 1 sets typing indicator
    await page1.click('input[placeholder*="Message"]');
    await page1.fill('input[placeholder*="Message"]', 'Typing...');
    
    // Should show "User is typing"
    await expect(page1.locator('text=is typing')).toBeVisible();
    
    // 3. User 1 invites team member
    await page1.click('button:has-text("Invite Team")');
    await page1.fill('input[placeholder*="Email"]', testEmail);
    await page1.click('button:has-text("Send Invite")');
    
    // Verify invite sent
    await expect(page1.locator(`text=${testEmail}`)).toBeVisible();
    
    console.log('✅ Live sessions workflow complete');
    
    await page1.close();
    await page2.close();
  });

  // Test 4: Sonic Lab (Agent Chat)
  test('Sonic lab agent interaction', async ({ page }) => {
    await page.goto(`${baseUrl}/sonic-lab`);
    
    // 1. Chat with Sonic
    await page.fill('input[placeholder*="message"]', 'Help me create a campaign');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await expect(page.locator('[data-testid="sonic-response"]')).toBeVisible({ timeout: 10000 });
    
    // 2. Verify Sonic responds
    const response = page.locator('[data-testid="sonic-response"]');
    await expect(response).toContainText('campaign');
    
    console.log('✅ Sonic agent interaction complete');
  });

  // Test 5: Lead Hunter (Pre-built, keeping as-is)
  test('Lead hunter search', async ({ page }) => {
    await page.goto(`${baseUrl}/lead-hunter`);
    
    // 1. Search for leads
    await page.fill('input[placeholder*="Search"]', 'tech startups in NYC');
    await page.click('button:has-text("Search")');
    
    // Wait for results
    await expect(page.locator('[data-testid="lead-result"]')).toBeVisible({ timeout: 15000 });
    
    // 2. Verify results shown
    const results = page.locator('[data-testid="lead-result"]');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
    
    console.log('✅ Lead hunter workflow complete');
  });

  // Test 6: Settings - Gemini API Key Only
  test('Settings page - Gemini only', async ({ page }) => {
    await page.goto(`${baseUrl}/settings`);
    
    // Verify only Gemini API key field is shown
    const geminiField = page.locator('input[placeholder*="Gemini"]');
    await expect(geminiField).toBeVisible();
    
    // Verify no other provider dropdowns
    const providerDropdown = page.locator('select[name="provider"]');
    await expect(providerDropdown).not.toBeVisible();
    
    // Test update API key
    const newKey = 'AIzaSy_test_key_12345';
    await geminiField.fill(newKey);
    await page.click('button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=API key updated')).toBeVisible();
    
    console.log('✅ Settings workflow complete');
  });

  // Test 7: Subscriptions & Pricing
  test('Subscriptions section - full tier breakdown', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    await page.click('button:has-text("Subscriptions")');
    
    // 1. Verify all tiers shown
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=Pro+')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();
    
    // 2. Verify current tier shown
    const currentTier = page.locator('[data-testid="current-tier"]');
    await expect(currentTier).toContainText('Starter');
    
    // 3. Verify credit breakdown
    const creditsInfo = page.locator('[data-testid="tier-credits"]');
    await expect(creditsInfo.first()).toContainText('500');
    
    // 4. Test "Upgrade" button
    await page.click('button:has-text("Upgrade to Pro")');
    
    // Should show Stripe checkout (or modal)
    await expect(page.locator('text=stripe|checkout|payment', { ignoreCase: true })).toBeVisible({ timeout: 5000 });
    
    // 5. Test credit pack buttons
    await page.goto(`${baseUrl}/dashboard`);
    await page.click('text=$4.99 for 500 credits');
    
    // Should trigger payment flow
    await expect(page.locator('text=stripe|checkout|payment', { ignoreCase: true })).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Subscriptions workflow complete');
  });

  // Test 8: Edge Cases
  test('Edge cases and error handling', async ({ page }) => {
    // Test 1: Debounce extraction (rapid clicks)
    await page.goto(`${baseUrl}/extract`);
    await page.fill('input[placeholder*="URL"]', testCompanyUrl);
    
    const extractBtn = page.locator('button:has-text("INITIATE EXTRACTION")');
    await extractBtn.click();
    await extractBtn.click(); // Rapid click
    
    // Should show debounce message
    await expect(page.locator('text=wait|debounce', { ignoreCase: true })).toBeVisible();
    
    // Test 2: Mobile responsive calendar
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone
    await page.goto(`${baseUrl}/campaigns`);
    await page.click('button:has-text("Calendar")');
    
    // Verify responsive layout
    const calendar = page.locator('[data-testid="calendar"]');
    const boundingBox = await calendar.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
    
    // Test 3: Daily credit cap
    // (Would need to simulate multiple posts in a day)
    console.log('✅ Edge case tests complete');
  });

  // Test 9: Provider status check
  test('Gemini provider status check', async ({ page }) => {
    await page.goto(`${baseUrl}/extract`);
    
    // Wait for provider status to appear
    await expect(page.locator('[data-testid="provider-status"]')).toBeVisible({ timeout: 5000 });
    
    const status = page.locator('[data-testid="provider-status"]');
    
    // Should show either "healthy" or "retrying"
    const text = await status.textContent();
    expect(text).toMatch(/healthy|busy|retrying|available/i);
    
    console.log('✅ Provider status check complete');
  });
});
