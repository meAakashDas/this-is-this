import { test, expect } from '@playwright/test';

test.describe('Public Website CMS Integration & Publishing Pipeline QA', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Firebase')) {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
  });

  // 1. Public Homepage Integration
  test('1. Public Homepage loads content from CMS loader and renders in proper sequence', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Title strictly "Aakash Das"
    await expect(page).toHaveTitle('Aakash Das');

    // Hero headline and brand
    await expect(page.locator('#hero-title')).toContainText("I'm Aakash Das.");
    await expect(page.locator('.hero-brand-link')).toContainText('RisePaisa');

    // Verify sections sequence: Hero -> Finder -> Featured Resources -> Journal -> Contact
    await expect(page.locator('.hero-zone')).toBeVisible();
    await expect(page.locator('.lookup-zone')).toBeVisible();
    await expect(page.locator('.library-zone')).toBeVisible();
    await expect(page.locator('.journal-zone')).toBeVisible();
    await expect(page.locator('.contact-zone')).toBeVisible();
  });

  // 2. Public About Page Integration
  test('2. Public About page loads biography, work, media, education, and contact from CMS', async ({
    page,
  }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    // Title strictly "Aakash Das"
    await expect(page).toHaveTitle('Aakash Das');

    // Bio content
    await expect(page.locator('#about-intro-title')).toContainText('About Aakash Das');
    await expect(page.locator('.about-lead')).toContainText('RisePaisa');

    // Work initiatives
    const workCards = page.locator('.work-card');
    await expect(workCards).toHaveCount(3);
    await expect(workCards.first()).toContainText('RisePaisa');

    // Media feature
    await expect(page.locator('.media-show-title')).toContainText('The Amit Show');
    await expect(page.locator('.media-role-badge')).toContainText('Podcast Guest');

    // Education entries
    const eduCards = page.locator('.education-card');
    await expect(eduCards).toHaveCount(2);

    // Discreet sign-in link
    await expect(page.locator('.admin-sign-in-link')).toBeVisible();
  });

  // 3. Public Resources Catalog & Draft Security
  test('3. Public /resources displays 3 published resources and strictly hides draft 004', async ({
    page,
  }) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('.resource-row-card');
    await expect(cards).toHaveCount(3);

    // Verify 001, 002, 003 are present
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await expect(page.locator('text=NO. 003')).toBeVisible();

    // Verify 004 is NOT present
    await expect(page.locator('text=NO. 004')).toHaveCount(0);
  });

  // 4. Resource Detail View & Draft Protection
  test('4. Resource 001 renders attachments and downloads, while 004 renders not-available state', async ({
    page,
  }) => {
    // 001: Published
    await page.goto('/resources/001');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Starter Personal Budget Framework');
    await expect(page.locator('a:has-text("Download PDF")')).toBeVisible();

    // 004: Draft
    await page.goto('/resources/004');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Resource #004 Not Available');
    await expect(page.locator('a:has-text("Download PDF")')).toHaveCount(0);
  });

  // 5. Public Journal Integration
  test('5. Public Journal lists 4 articles and loads detail article page cleanly', async ({
    page,
  }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    const entries = page.locator('.journal-entry-item');
    await expect(entries).toHaveCount(4);
    await expect(entries.first()).toContainText('Why I Believe in Learning in Public');

    // Click first article
    await entries.first().locator('a').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/journal\/why-i-believe-in-learning-in-public/);
    await expect(page.locator('h1')).toContainText('Why I Believe in Learning in Public');
  });

  async function openAdmin(page: any) {
    await page.goto('/admin');
    const previewBtn = page.locator('button:has-text("Enter Development Preview")');
    try {
      await previewBtn.waitFor({ state: 'visible', timeout: 4000 });
      await previewBtn.click();
      await page.waitForSelector('nav[aria-label="Admin Navigation"]', { timeout: 10000 });
    } catch {
      // Already in preview
    }
  }

  // 6. Admin Publishing Dashboard
  test('6. Admin Sidebar has Publishing tab and clicking it opens Publishing Dashboard', async ({
    page,
  }) => {
    await openAdmin(page);
    await page.waitForLoadState('networkidle');

    // Sidebar has Publishing tab
    const publishingTab = page.locator('nav[aria-label="Admin Navigation"] button:has-text("Publishing")');
    await expect(publishingTab).toBeVisible();

    // Click Publishing tab
    await publishingTab.click();

    // Verify Publishing Dashboard renders
    await expect(page.locator('h1:has-text("Publishing & Static Site Pipeline")')).toBeVisible();
    await expect(page.locator('text=Production Live & Synchronized')).toBeVisible();
    await expect(page.locator('text=aakashdas.live')).toBeVisible();
    await expect(page.locator('text=3 Published')).toBeVisible();
    await expect(page.locator('text=4 Published')).toBeVisible();
  });

  // 7. Trigger Build Confirmation Modal & Execution Simulation
  test('7. Trigger Build button opens confirmation modal and simulates deployment pipeline', async ({
    page,
  }) => {
    await openAdmin(page);
    await page.waitForLoadState('networkidle');

    // Navigate to Publishing tab
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Publishing")').click();

    // Click Trigger Build & Deploy
    const triggerBtn = page.locator('button:has-text("Trigger Build & Deploy")');
    await expect(triggerBtn).toBeVisible();
    await triggerBtn.click();

    // Verify confirmation modal
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText('Trigger Production Static Build?');
    await expect(modal.locator('text=3 Published Educational Resources included')).toBeVisible();
    await expect(modal.locator('text=Drafts (e.g. Resource #004) securely excluded')).toBeVisible();

    // Click Confirm & Build Website
    await modal.locator('button:has-text("Confirm & Build Website")').click();

    // Verify pipeline execution panel appears
    await expect(page.locator('h3:has-text("Executing Publishing Pipeline")')).toBeVisible();

    // Wait for completion (simulated ~3 seconds)
    await expect(page.locator('text=Publishing pipeline complete!').first()).toBeVisible({ timeout: 10000 });
  });

  // 8. Mobile Responsiveness of Publishing Dashboard
  test('8. Publishing Dashboard is fully responsive on mobile (390px) without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAdmin(page);
    await page.waitForLoadState('networkidle');

    // Navigate to Publishing tab
    await page.locator('nav[aria-label="Admin Navigation"] button:has-text("Publishing")').click();

    await expect(page.locator('h1:has-text("Publishing & Static Site Pipeline")')).toBeVisible();

    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390);
  });
});
