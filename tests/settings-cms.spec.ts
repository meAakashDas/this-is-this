import { test, expect } from '@playwright/test';

test.describe('Simplified Website Settings CMS QA', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Firebase')) {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    await page.goto('/admin');
    await page.evaluate(() => {
      sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
    });
    await page.goto('/admin');
    const hasSidebar = await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasSidebar,
      'Dev Preview CMS UI tests require astro dev (IS_DEV=true); production preview enforces Google OAuth'
    );
  });

  test('1. Admin Sidebar displays Website Settings tab marked ready', async ({ page }) => {
    const settingsTab = page.locator(
      'nav[aria-label="Admin Navigation"] button:has-text("Website Settings")'
    );
    await expect(settingsTab).toBeVisible();
    await expect(settingsTab.locator('text=Phase 10')).toHaveCount(0);
  });

  test('2. Website Settings displays only Website Identity and Contact & Social Links sections', async ({
    page,
  }) => {
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    await expect(page.locator('h1:has-text("Website Settings")')).toBeVisible();
    await expect(page.locator('h2:has-text("Website Identity")')).toBeVisible();
    await expect(page.locator('h2:has-text("Contact & Social Links")')).toBeVisible();

    // Essential Website Identity fields
    await expect(page.locator('#settings-website-title')).toBeVisible();
    await expect(page.locator('#settings-full-name')).toBeVisible();
    await expect(page.locator('#settings-display-name')).toBeVisible();
    await expect(page.locator('#settings-tagline')).toBeVisible();
    await expect(page.locator('#settings-description')).toBeVisible();
    await expect(page.locator('#settings-profile-image')).toBeVisible();
    await expect(page.locator('#settings-favicon')).toBeVisible();

    // Essential Contact & Social Links fields
    await expect(page.locator('#settings-email')).toBeVisible();
    await expect(page.locator('input[aria-label="Instagram URL"]')).toBeVisible();
    await expect(page.locator('input[aria-label="YouTube URL"]')).toBeVisible();

    // Removed sections and fields must be completely absent
    await expect(page.locator('text=Positioning Statement')).toHaveCount(0);
    await expect(page.locator('text=Online Identity Handle')).toHaveCount(0);
    await expect(page.locator('text=Canonical Production Domain')).toHaveCount(0);
    await expect(page.locator('button:has-text("Navigation & Footer")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Global SEO")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Live Preview")')).toHaveCount(0);
  });

  test('3. Saving settings preserves hidden metadata and persists across page refresh', async ({
    page,
  }) => {
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    const taglineInput = page.locator('#settings-tagline');
    await taglineInput.fill('Builder, Researcher & Finance Educator');

    await expect(page.locator('span:has-text("Unsaved changes")')).toBeVisible();
    await page.locator('button:has-text("Save Settings")').click();

    await expect(
      page.locator('div[role="alert"]:has-text("Website settings saved")')
    ).toBeVisible();

    // Reload directly on settings tab and verify saved value persisted and hidden fields intact
    await page.goto('/admin?tab=settings');
    await expect(page.locator('#settings-tagline')).toHaveValue(
      'Builder, Researcher & Finance Educator',
      { timeout: 8000 }
    );

    const savedJson = await page.evaluate(() =>
      sessionStorage.getItem('aakashdas_cms_settings_preview')
    );
    expect(savedJson).toBeTruthy();
    const parsed = JSON.parse(savedJson!);
    expect(parsed.positioning).toBeTruthy();
    expect(parsed.seo?.canonicalUrl).toBe('https://aakashdas.live');
    expect(parsed.navItems?.length).toBeGreaterThanOrEqual(4);
    expect(parsed.footer?.showNav).toBe(true);
  });

  test('4. Website Settings page is fully responsive on mobile (390px) without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    await expect(page.locator('h1:has-text("Website Settings")')).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390);
  });
});
