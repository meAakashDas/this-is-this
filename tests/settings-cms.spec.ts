import { test, expect } from '@playwright/test';

test.describe('Website Settings CMS QA (Phase 10)', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Firebase')) {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    await page.goto('/admin');
    const previewBtn = page.locator('button:has-text("Enter Development Preview")');
    try {
      await previewBtn.waitFor({ state: 'visible', timeout: 5000 });
      await previewBtn.click();
      await page.waitForSelector('aside', { timeout: 10000 });
    } catch {
      // Already in preview
    }
  });

  test('1. Admin Sidebar displays Website Settings tab marked ready', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const settingsTab = page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")');
    await expect(settingsTab).toBeVisible();

    // Verify it does not display a pending Phase badge
    await expect(settingsTab.locator('text=Phase 10')).toHaveCount(0);
  });

  test('2. Navigating to Website Settings renders the complete editor and sub-tabs', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Website Settings tab
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Header title
    await expect(page.locator('h1:has-text("Website Settings CMS")')).toBeVisible();

    // Sub-tabs
    const subTabs = ['Identity & Domain', 'Contact Channels', 'Social Media', 'Navigation & Footer', 'Global SEO', 'Live Preview'];
    for (const tab of subTabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('3. Identity & Domain sub-tab manages website title, author, and canonical domain', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Verify Identity sub-tab is active by default
    await expect(page.locator('h3:has-text("Website Identity & Canonical Domain")')).toBeVisible();

    // Check fields
    const websiteTitleInput = page.locator('input[value="Aakash Das"]').first();
    await expect(websiteTitleInput).toBeVisible();

    const canonicalInput = page.locator('input[value="https://aakashdas.live"]');
    await expect(canonicalInput).toBeVisible();

    // Verify no legacy domain
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('aakashdas.me');
  });

  test('4. Contact Channels sub-tab manages email, WhatsApp, and phone', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Switch to Contact Channels sub-tab
    await page.locator('button:has-text("Contact Channels")').click();
    await expect(page.locator('h3:has-text("Direct Contact Channels")')).toBeVisible();

    // Check email
    const emailInput = page.locator('input[value="contact@aakashdas.live"]');
    await expect(emailInput).toBeVisible();

    // Check WhatsApp
    const whatsappInput = page.locator('input[value="977XXXXXXXXXX"]');
    await expect(whatsappInput).toBeVisible();

    // Check Phone
    const phoneInput = page.locator('input[value="+977-XXXXXXXXXX"]');
    await expect(phoneInput).toBeVisible();
  });

  test('5. Social Media sub-tab manages profiles and supports adding and reordering', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Switch to Social Media
    await page.locator('button:has-text("Social Media")').click();
    await expect(page.locator('h3:has-text("Social Media Profiles & Channels")')).toBeVisible();

    // Check existing platforms
    await expect(page.locator('text=Instagram').first()).toBeVisible();
    await expect(page.locator('text=YouTube').first()).toBeVisible();
    await expect(page.locator('text=TikTok').first()).toBeVisible();
    await expect(page.locator('text=LinkedIn').first()).toBeVisible();

    // Verify Add Social Channel section is visible
    await expect(page.locator('label:has-text("Add Social Channel")')).toBeVisible();
  });

  test('6. Navigation & Footer sub-tab manages nav items and footer visibility toggles', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Switch to Navigation & Footer
    await page.locator('button:has-text("Navigation & Footer")').click();
    await expect(page.locator('h3:has-text("Header Navigation Items")')).toBeVisible();
    await expect(page.locator('h3:has-text("Footer Configuration")')).toBeVisible();

    // Check navigation items (Home, About, Resources, Journal)
    await expect(page.locator('input[value="Home"]')).toBeVisible();
    await expect(page.locator('input[value="About"]')).toBeVisible();
    await expect(page.locator('input[value="Resources"]')).toBeVisible();
    await expect(page.locator('input[value="Journal"]')).toBeVisible();

    // Check footer toggles
    await expect(page.locator('text=Show Footer Navigation')).toBeVisible();
    await expect(page.locator('text=Show Social Links')).toBeVisible();
    await expect(page.locator('text=Show Email Channel')).toBeVisible();
    await expect(page.locator('text=Show Direct Actions')).toBeVisible();
  });

  test('7. Global SEO sub-tab manages titles, meta descriptions, and indexing flags', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Switch to Global SEO
    await page.locator('button:has-text("Global SEO")').click();
    await expect(page.locator('h3:has-text("Global SEO & Social Graph Metadata")')).toBeVisible();

    // Check default title
    const seoTitleInput = page.locator('input[placeholder="Aakash Das"]').first();
    await expect(seoTitleInput).toBeVisible();

    // Check block search engines toggle
    await expect(page.locator('text=Block Search Engines (noindex)')).toBeVisible();
  });

  test('8. Live Preview sub-tab renders Header, Google Snippet, and Footer mockups', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Switch to Live Preview
    await page.locator('button:has-text("Live Preview")').click();
    await expect(page.locator('h3:has-text("Real-Time Website Configuration Preview")')).toBeVisible();

    // Header mockup
    await expect(page.locator('text=Header Bar Preview')).toBeVisible();

    // Google Snippet
    await expect(page.locator('text=Google Search Result Snippet Preview')).toBeVisible();
    await expect(page.locator('text=https://aakashdas.live')).toBeVisible();

    // Footer mockup
    await expect(page.locator('text=Footer Mockup Preview')).toBeVisible();
  });

  test('9. Unsaved changes tracking and Save Settings interaction', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    // Modify a field to trigger dirty state
    const titleInput = page.locator('input[value="Aakash Das"]').first();
    await titleInput.fill('Aakash Das — Personal Website');

    // Unsaved changes badge appears
    await expect(page.locator('span:has-text("Unsaved changes")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();

    // Click Save Settings
    await page.locator('button:has-text("Save Settings")').click();

    // Verify success banner appears
    await expect(page.locator('div[role="alert"]:has-text("Website settings saved")')).toBeVisible();
  });

  test('10. Website Settings CMS is fully responsive on mobile (390px) without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Website Settings")').click();

    await expect(page.locator('h1:has-text("Website Settings CMS")')).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390);
  });
});
