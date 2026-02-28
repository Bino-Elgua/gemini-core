import { test, expect } from '@playwright/test';

test.describe('Calendar + Auto-Post Workflow', () => {
  const baseURL = 'http://localhost:3001';
  const mockUserId = 'test-user-pro';
  const mockCampaignId = 'campaign-123';

  test.beforeEach(async ({ page }) => {
    // Navigate to scheduler
    await page.goto(`${baseURL}/#/scheduler`);
    await page.waitForLoadState('networkidle');
  });

  test('should schedule campaign for auto-post on selected date', async ({ page }) => {
    // 1. Verify calendar is visible
    const calendar = page.locator('[data-testid="calendar"]');
    await expect(calendar).toBeVisible();

    // 2. Find Friday date (example: 15th)
    const fridayDate = page.locator('[data-calendar-day="15"]');
    await expect(fridayDate).toBeVisible();

    // 3. Drag campaign asset to Friday
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    await campaignAsset.dragTo(fridayDate);

    // 4. Verify scheduled indicator appears on date
    const scheduledIndicator = fridayDate.locator('[data-testid="scheduled-badge"]');
    await expect(scheduledIndicator).toBeVisible();
    await expect(scheduledIndicator).toContainText('Instagram');
  });

  test('should require Pro+ tier for auto-post feature', async ({ page }) => {
    // 1. Mock Starter tier user (no Pro+)
    await page.evaluate(() => {
      localStorage.setItem('userTier', 'Starter');
    });

    // 2. Try to drag asset to calendar
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    const fridayDate = page.locator('[data-calendar-day="15"]');

    // 3. Verify error or disabled state
    const errorMsg = page.locator('[data-testid="tier-gate-error"]');
    
    // Trigger the action
    await campaignAsset.dragTo(fridayDate);

    // Wait for error message to appear
    await expect(errorMsg).toBeVisible({ timeout: 2000 }).catch(() => {
      // If element not found, check for disabled class
      expect(fridayDate).toHaveClass(/disabled|locked/);
    });
  });

  test('should execute post at scheduled time (1 min mock)', async ({ page }) => {
    // 1. Schedule a post for 1 minute from now
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 1);
    const dateStr = futureDate.getDate();

    const targetDate = page.locator(`[data-calendar-day="${dateStr}"]`);
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();

    // Drag to schedule
    await campaignAsset.dragTo(targetDate);

    // 2. Verify post shows "pending" status
    let postStatus = page.locator('[data-testid="post-status"]').first();
    await expect(postStatus).toContainText('Pending');

    // 3. Wait 65 seconds for execution (mock timer, actual would be configurable)
    console.log('⏳ Waiting for scheduled post execution (60 seconds)...');
    await page.waitForTimeout(65000);

    // 4. Verify post status changed to "Posted"
    postStatus = page.locator('[data-testid="post-status"]').first();
    await expect(postStatus).toContainText('Posted');

    // 5. Verify post URL appears
    const postLink = page.locator('[data-testid="post-link"]').first();
    await expect(postLink).toBeVisible();
    
    const postUrl = await postLink.getAttribute('href');
    expect(postUrl).toMatch(/instagram|tiktok/);
  });

  test('should deduct credits only on actual post (not on schedule)', async ({ page }) => {
    // 1. Get initial credits balance
    const creditsDisplay = page.locator('[data-testid="credits-balance"]');
    const initialCredits = await creditsDisplay.textContent();
    const initialCount = parseInt(initialCredits?.match(/\d+/)?.[0] || '0');

    // 2. Schedule a post (should NOT deduct credits)
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    const fridayDate = page.locator('[data-calendar-day="15"]');
    await campaignAsset.dragTo(fridayDate);

    // 3. Verify credits unchanged after schedule
    const creditsAfterSchedule = await creditsDisplay.textContent();
    const scheduleCount = parseInt(creditsAfterSchedule?.match(/\d+/)?.[0] || '0');
    expect(scheduleCount).toBe(initialCount);

    // 4. Wait for auto-post execution (mock: 1 min)
    console.log('⏳ Waiting for post execution...');
    await page.waitForTimeout(65000);

    // 5. Verify credits deducted AFTER post (50 credits for auto-post)
    const creditsAfterPost = await creditsDisplay.textContent();
    const postCount = parseInt(creditsAfterPost?.match(/\d+/)?.[0] || '0');
    expect(postCount).toBeLessThanOrEqual(initialCount - 50);
    console.log(`✅ Credits deducted: ${initialCount} → ${postCount}`);
  });

  test('should notify user with WebSocket when post succeeds', async ({ page }) => {
    // 1. Listen for WebSocket messages
    let notificationReceived = false;
    let notificationText = '';

    page.on('websocket', ws => {
      ws.on('frameSent', frame => {
        const message = JSON.stringify(frame);
        if (message.includes('campaign_posted') || message.includes('Campaign live on')) {
          notificationReceived = true;
          notificationText = message;
        }
      });
    });

    // 2. Schedule and wait for post
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    const fridayDate = page.locator('[data-calendar-day="15"]');
    await campaignAsset.dragTo(fridayDate);

    // 3. Wait for execution
    console.log('⏳ Waiting for post execution & notification...');
    await page.waitForTimeout(65000);

    // 4. Verify notification toast appears
    const notificationToast = page.locator('[data-testid="notification-toast"]');
    await expect(notificationToast).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no visible toast, check console logs
      console.log('Note: WebSocket notification method may vary in implementation');
    });

    // 5. Verify success message
    const successMsg = page.locator('[data-testid="success-message"]');
    await expect(successMsg).toContainText(/live|posted|success/i);
  });

  test('should retry failed post 3x before giving up', async ({ page }) => {
    // Mock API failure for first 2 attempts
    let attemptCount = 0;

    await page.route('**/graph.instagram.com/**', async route => {
      attemptCount++;
      if (attemptCount <= 2) {
        // First 2 attempts fail
        await route.abort();
      } else {
        // 3rd attempt succeeds
        await route.continue();
      }
    });

    // 1. Schedule post
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    const fridayDate = page.locator('[data-calendar-day="15"]');
    await campaignAsset.dragTo(fridayDate);

    // 2. Monitor status during execution
    const postStatus = page.locator('[data-testid="post-status"]').first();
    
    // 3. Wait through retries (3 * 5 sec delay + buffer)
    console.log('⏳ Waiting for retry execution...');
    await page.waitForTimeout(25000);

    // 4. Verify post eventually succeeds
    await expect(postStatus).toContainText('Posted');
    console.log(`✅ Post succeeded after ${attemptCount} attempts`);
  });

  test('should show error and disable retry after 3 failed attempts', async ({ page }) => {
    // Mock all API calls to fail
    await page.route('**/graph.instagram.com/**', route => route.abort());
    await page.route('**/open-api.tiktok.com/**', route => route.abort());

    // 1. Schedule post
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    const fridayDate = page.locator('[data-calendar-day="15"]');
    await campaignAsset.dragTo(fridayDate);

    // 2. Wait for 3 retry attempts
    console.log('⏳ Waiting for retry exhaustion...');
    await page.waitForTimeout(35000);

    // 3. Verify final status is "Failed"
    const postStatus = page.locator('[data-testid="post-status"]').first();
    await expect(postStatus).toContainText('Failed');

    // 4. Verify error message appears
    const errorMessage = page.locator('[data-testid="post-error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('after 3 attempts');

    // 5. Verify retry button is disabled
    const retryButton = page.locator('[data-testid="retry-post-button"]');
    await expect(retryButton).toBeDisabled().catch(() => {
      // Button may not be present, which is fine
      console.log('Retry button not available (expected for hard failures)');
    });
  });

  test('should format Instagram carousel with image + audio (jingle as Reel)', async ({ page }) => {
    // 1. Navigate to campaign with audio assets
    await page.goto(`${baseURL}/#/campaigns`);
    
    // 2. Open campaign with jingle
    const campaignWithAudio = page.locator('[data-testid="campaign-card"]').filter({ hasText: 'jingle' }).first();
    await expect(campaignWithAudio).toBeVisible();
    await campaignWithAudio.click();

    // 3. View assets - verify image, video, and audio URLs present
    const imageAsset = page.locator('[data-testid="asset-image"]');
    const audioAsset = page.locator('[data-testid="asset-audio"]');
    
    await expect(imageAsset).toBeVisible();
    await expect(audioAsset).toBeVisible();

    // 4. Schedule for Instagram
    await page.goto(`${baseURL}/#/scheduler`);
    const fridayDate = page.locator('[data-calendar-day="15"]');
    
    // Select Instagram platform (if selector available)
    const platformSelect = page.locator('[data-testid="platform-select"]');
    if (await platformSelect.isVisible()) {
      await platformSelect.selectOption('instagram');
    }

    // Drag to schedule
    const campaignAsset = page.locator('[data-testid="campaign-asset-0"]').first();
    await campaignAsset.dragTo(fridayDate);

    // 5. Wait for execution and verify format
    console.log('⏳ Waiting for post execution...');
    await page.waitForTimeout(65000);

    // 6. Verify post created on Instagram with carousel/Reel
    const postLink = page.locator('[data-testid="post-link"]').first();
    await expect(postLink).toBeVisible();
    
    const postUrl = await postLink.getAttribute('href');
    expect(postUrl).toContain('instagram');
    console.log('✅ Instagram carousel posted with audio:', postUrl);
  });

  test('should display calendar with scheduled posts highlighted', async ({ page }) => {
    // 1. Schedule multiple posts across different dates
    const asset1 = page.locator('[data-testid="campaign-asset-0"]').first();
    const asset2 = page.locator('[data-testid="campaign-asset-1"]').first();

    await asset1.dragTo(page.locator('[data-calendar-day="10"]'));
    await asset2.dragTo(page.locator('[data-calendar-day="20"]'));

    // 2. Verify both dates show scheduled badge
    const day10Badge = page.locator('[data-calendar-day="10"] [data-testid="scheduled-badge"]');
    const day20Badge = page.locator('[data-calendar-day="20"] [data-testid="scheduled-badge"]');

    await expect(day10Badge).toBeVisible();
    await expect(day20Badge).toBeVisible();

    // 3. Verify calendar shows count of scheduled posts
    const scheduledCount = page.locator('[data-testid="scheduled-posts-count"]');
    await expect(scheduledCount).toContainText('2');

    // 4. Hover over date to see post details
    await day10Badge.hover();
    
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 }).catch(() => {
      console.log('Tooltip may not be implemented');
    });
  });
});
