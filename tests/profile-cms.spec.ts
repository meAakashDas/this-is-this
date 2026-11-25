import { test, expect } from '@playwright/test';

test.describe('Simplified Profile & Navigation QA', () => {
  test.beforeEach(async ({ page }) => {
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

  test('1. Admin opens directly to Profile with Overview removed and only 7 nav items', async ({
    page,
  }) => {
    const nav = page.locator('nav[aria-label="Admin Navigation"]');
    await expect(nav).toBeVisible();

    const expectedTabs = [
      'Profile',
      'Homepage',
      'About',
      'Resources',
      'Journal',
      'Publishing',
      'Website Settings',
    ];
    for (const label of expectedTabs) {
      await expect(nav.locator(`button:has-text("${label}")`)).toBeVisible();
    }
    await expect(nav.locator('button')).toHaveCount(7);
    await expect(nav.locator('button:has-text("Overview")')).toHaveCount(0);

    // Opens directly into Profile section rather than Overview dashboard
    await expect(page.locator('h1:has-text("Profile")')).toBeVisible();
    await expect(page.locator('button:has-text("Save Profile")')).toBeVisible();
  });

  test('2. Profile editor displays clean Identity, Biography, and Contact sections without Preview clutter', async ({
    page,
  }) => {
    await expect(page.locator('h2:has-text("Identity & Photograph")')).toBeVisible();
    await expect(page.locator('h2:has-text("Biography")')).toBeVisible();
    await expect(page.locator('h2:has-text("Contact")')).toBeVisible();

    await expect(page.locator('#profile-full-name')).toHaveValue('Aakash Das');
    await expect(page.locator('#profile-headline')).toBeVisible();
    await expect(page.locator('text=Paragraph #1')).toBeVisible();
    await expect(page.locator('#profile-contact-email')).toHaveValue('contact@aakashdas.live');
    await expect(page.locator('#profile-contact-phone')).toBeVisible();
    await expect(page.locator('#profile-contact-whatsapp')).toBeVisible();

    await expect(page.locator('button:has-text("Live Preview")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Overview")')).toHaveCount(0);
  });

  test('3. Editing Profile fields marks Unsaved changes and persists after Save and reload', async ({
    page,
  }) => {
    await page.locator('#profile-headline').fill('Founder & Technology Educator in Nepal');
    await expect(page.locator('text=Unsaved changes')).toBeVisible();

    await page.locator('button:has-text("Save Profile")').click();
    await expect(page.locator('text=Profile saved to local preview state.')).toBeVisible();

    await page.reload();
    await expect(page.locator('#profile-headline')).toHaveValue(
      'Founder & Technology Educator in Nepal',
      { timeout: 8000 }
    );
  });

  test('4. Profile view is responsive on mobile (390px) without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await expect(page.locator('button:has-text("Save Profile")')).toBeVisible();
  });
});
