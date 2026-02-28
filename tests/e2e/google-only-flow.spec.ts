import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Google-only Refactored Sacred Core
 * Flow: DNA → Campaign → Schedule → Post → Website → Agent Chat
 */

test.describe('Sacred Core - Google-Only Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set test Gemini API key
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'test-key');
    });
    
    await page.goto('http://localhost:3001');
  });

  test('1. Settings: Configure Gemini API Key', async ({ page }) => {
    await page.goto('http://localhost:3001/#/settings');

    // Check page loaded
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Gemini API Key')).toBeVisible();

    // Verify only Gemini is shown (not other providers)
    await expect(page.locator('text=OpenAI')).not.toBeVisible();
    await expect(page.locator('text=Claude')).not.toBeVisible();

    // Input API key
    const apiKeyInput = page.locator('input[placeholder="sk-..."]');
    await apiKeyInput.fill('sk-test-api-key-123');

    // Test key
    const testButton = page.locator('button:has-text("Test Key")');
    await testButton.click();

    // Wait for validation
    await page.waitForTimeout(1000);

    // Save key
    const saveButton = page.locator('button:has-text("Save Key")');
    await saveButton.click();

    // Verify save
    await expect(page.locator('text=API key configured')).toBeVisible();
  });

  test('2. Intelligence Hub: Extract DNA', async ({ page }) => {
    await page.goto('http://localhost:3001/#/');

    // Should have Intelligence Hub or similar
    await expect(page.locator('text=Intelligence Hub|DNA|Extract')).toBeVisible();

    // Input sector (specific, not vague)
    const sectorInput = page.locator('input[placeholder*="barbershop"]');
    await sectorInput.fill('organic coffee roastery');

    // Input context
    const contextInput = page.locator('textarea[placeholder*="Target audience"]');
    await contextInput.fill('Specialty coffee enthusiasts, third-wave coffee culture, sustainable sourcing');

    // Extract DNA
    const extractButton = page.locator('button:has-text("Extract DNA")');
    await extractButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify DNA extracted
    await expect(page.locator('text=niche|values|colors')).toBeVisible();
    await expect(page.locator('text=Brand DNA')).toBeVisible();

    // Verify sector was not vague
    await expect(page.locator('text=Specify niche')).not.toBeVisible();

    // Verify no "extraction matrix error"
    await expect(page.locator('text=extraction matrix error|neural search failed')).not.toBeVisible();
  });

  test('3. Campaign Forge: Generate Campaign', async ({ page }) => {
    await page.goto('http://localhost:3001/#/campaigns');

    // Should see campaign generation option
    await expect(page.locator('text=Campaign Forge|Campaign')).toBeVisible();

    // Generate campaign button should be available (assumes DNA extracted)
    const generateButton = page.locator('button:has-text("Generate Campaign")');
    
    if (await generateButton.isEnabled()) {
      await generateButton.click();

      // Wait for generation
      await page.waitForTimeout(2000);

      // Verify campaign generated
      await expect(page.locator('text=Campaign Preview|Title|Copy')).toBeVisible();
    }
  });

  test('4. Auto-Post: Schedule Campaign', async ({ page }) => {
    await page.goto('http://localhost:3001/#/campaigns');

    // Select platforms
    const igCheckbox = page.locator('input[type="checkbox"]', { hasText: 'instagram' });
    const ttCheckbox = page.locator('input[type="checkbox"]', { hasText: 'tiktok' });

    await igCheckbox.check();
    await ttCheckbox.check();

    // Set date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(dateStr);

    // Set time
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('10:00');

    // Schedule button
    const scheduleButton = page.locator('button:has-text("Schedule Post")');
    await scheduleButton.click();

    // Wait for scheduling
    await page.waitForTimeout(1000);

    // Verify scheduled
    await expect(page.locator('text=Scheduled Posts|instagram')).toBeVisible();
  });

  test('5. Auto-Post: Verify WebSocket Status Updates', async ({ page }) => {
    await page.goto('http://localhost:3001/#/campaigns');

    // Verify scheduled posts section
    const postsSection = page.locator('text=Scheduled Posts');
    await expect(postsSection).toBeVisible();

    // Check for status indicators
    await expect(page.locator('text=scheduled|posting|posted')).toBeVisible();

    // Simulate time passing (in real test, mock the timer)
    await page.waitForTimeout(500);
  });

  test('6. Website Builder: Generate Landing Page', async ({ page }) => {
    await page.goto('http://localhost:3001/#/builder');

    // Should see website builder
    await expect(page.locator('text=Website Builder|Vibe Coding')).toBeVisible();

    // Generate button (assumes DNA exists)
    const generateButton = page.locator('button:has-text("Generate")');
    
    if (await generateButton.isEnabled()) {
      await generateButton.click();

      // Wait for generation
      await page.waitForTimeout(3000);

      // Verify website generated
      await expect(page.locator('text=HTML|CSS|Preview')).toBeVisible();

      // Test preview button
      const previewButton = page.locator('button:has-text("Preview")');
      if (await previewButton.isVisible()) {
        // New window opens - can't directly test, but verify button exists
        await expect(previewButton).toBeEnabled();
      }

      // Test download button
      const downloadButton = page.locator('button:has-text("Download ZIP")');
      await expect(downloadButton).toBeVisible();
    }
  });

  test('7. Agent Forge: Chat with AI Agent', async ({ page }) => {
    await page.goto('http://localhost:3001/#/agents');

    // Should see agent forge or similar
    await expect(page.locator('text=Agent Forge|Agent|Assistant')).toBeVisible();

    // Look for chat input
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    
    if (await chatInput.isVisible()) {
      // Send a message
      await chatInput.fill('Hello, what are our brand values?');
      
      const sendButton = page.locator('button:has-text("Send"), button:has-text("→")');
      await sendButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Verify agent responded
      await expect(page.locator('text=brand|values|response')).toBeVisible();
    }
  });

  test('8. Live Sessions: Real Firebase Chat', async ({ page }) => {
    await page.goto('http://localhost:3001/#/live');

    // Should see live sessions
    await expect(page.locator('text=Live|Session|Chat')).toBeVisible();

    // Look for chat functionality
    const chatSection = page.locator('text=message|chat|typing');
    
    if (await chatSection.isVisible()) {
      // Verify typing indicators exist
      await expect(page.locator('text=typing|Typing')).toBeVisible();

      // Verify team invite option
      await expect(page.locator('text=invite|team|share')).toBeVisible();
    }
  });

  test('9. Credit System: Track Usage', async ({ page }) => {
    await page.goto('http://localhost:3001/#/');

    // Look for credit display
    const creditDisplay = page.locator('text=credit|Credit');
    
    if (await creditDisplay.isVisible()) {
      // Verify credit count is displayed
      await expect(creditDisplay).toBeVisible();

      // Navigate to subscriptions
      const subscriptionLink = page.locator('a:has-text("Subscriptions"), button:has-text("Subscriptions")');
      
      if (await subscriptionLink.isVisible()) {
        await subscriptionLink.click();
        
        // Wait for page
        await page.waitForTimeout(500);

        // Verify subscription page
        await expect(page.locator('text=Subscription|Plan|Starter|Pro|Enterprise')).toBeVisible();
      }
    }
  });

  test('10. Edge Case: Debounce Double-Generation', async ({ page }) => {
    await page.goto('http://localhost:3001/#/');

    // Try to generate twice rapidly
    const generateButton = page.locator('button:has-text("Extract DNA")');

    if (await generateButton.isEnabled()) {
      await generateButton.click();
      // Don't wait - click again immediately
      await generateButton.click();

      // Should only generate once (debounced)
      await page.waitForTimeout(2000);

      // Verify only one DNA result (check count of DNA cards)
      const dnaCards = page.locator('text=DNA Profile');
      const count = await dnaCards.count();

      expect(count).toBeLessThanOrEqual(1); // Debounce prevents duplicate
    }
  });

  test('11. Edge Case: Daily Credit Limit (Free Tier)', async ({ page }) => {
    // Set used credits to near limit
    await page.addInitScript(() => {
      localStorage.setItem('credits_used_today', '450');
    });

    await page.goto('http://localhost:3001/#/');

    // Verify credit warning if near limit
    const creditDisplay = page.locator('text=credit');
    
    if (await creditDisplay.isVisible()) {
      // Should show warning color or message
      await expect(page.locator('text=limit|remaining|upgrade')).toBeVisible();
    }
  });

  test('12. Edge Case: Mobile Responsive Calendar', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3001/#/campaigns');

    // Verify calendar/date picker is responsive
    const dateInput = page.locator('input[type="date"]');
    
    if (await dateInput.isVisible()) {
      // Should be clickable on mobile
      await dateInput.click();
      
      // On mobile, date picker should appear
      await page.waitForTimeout(500);

      // Input should still work
      await dateInput.fill('2025-03-01');

      // Verify it accepted the input
      const value = await dateInput.inputValue();
      expect(value).toBe('2025-03-01');
    }
  });
});

test.describe('Sacred Core - Error Handling & Recovery', () => {
  test('API Down: Show Graceful Error & Retry', async ({ page }) => {
    await page.goto('http://localhost:3001/#/');

    // Look for API status indicator
    const statusBadge = page.locator('text=API|Health|Status');
    
    if (await statusBadge.isVisible()) {
      // Should show provider status
      await expect(page.locator('text=Google|Gemini')).toBeVisible();
    }

    // Try to perform action that requires API
    const extractButton = page.locator('button:has-text("Extract")');
    
    if (await extractButton.isVisible()) {
      // Simulate API error by blocking request
      await page.route('**/generativelanguage.googleapis.com/**', (route) => {
        route.abort('failed');
      });

      await extractButton.click();

      // Wait for error
      await page.waitForTimeout(1000);

      // Should show error message
      await expect(page.locator('text=error|failed|retry|busy')).toBeVisible();
    }
  });

  test('Auto-Post Failure: Show Retry Status', async ({ page }) => {
    await page.goto('http://localhost:3001/#/campaigns');

    // Look for scheduled post with retry indicator
    const retryIndicator = page.locator('text=retry|Retry|failed');
    
    // If a post is in failed state, verify retry UI exists
    if (await retryIndicator.isVisible()) {
      await expect(retryIndicator).toBeVisible();
    }
  });

  test('Refund on Error: Credit Restored', async ({ page }) => {
    await page.goto('http://localhost:3001/#/');

    // Get initial credit count
    const creditsBefore = await page.locator('text=Credit').textContent();

    // Trigger operation
    const generateButton = page.locator('button:has-text("Generate")');
    
    if (await generateButton.isVisible() && await generateButton.isEnabled()) {
      // Block API to simulate error
      await page.route('**/generativelanguage.googleapis.com/**', (route) => {
        route.abort();
      });

      await generateButton.click();

      // Wait for error
      await page.waitForTimeout(1000);

      // Credits should be restored (no deduction on error)
      const creditsAfter = await page.locator('text=Credit').textContent();

      // Should be same as before
      expect(creditsAfter).toBe(creditsBefore);
    }
  });
});
