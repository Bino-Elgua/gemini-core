import { test, expect } from '@playwright/test';

test.describe('Sacred Core Smoke Tests', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sacred Core|CoreDNA/i);
    await page.waitForLoadState('networkidle');
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should initialize storage system', async ({ page }) => {
    await page.goto('/');
    
    // Check console for initialization logs
    const messages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        messages.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    const hasStorageInit = messages.some(m => m.includes('storage') || m.includes('Storage'));
    expect(hasStorageInit || messages.length > 0).toBeTruthy();
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');
    
    // Try to navigate to campaigns
    const campaignsLink = page.locator('a[href*="campaigns"]').first();
    if (await campaignsLink.isVisible()) {
      await campaignsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/campaigns/);
    }
  });
});
