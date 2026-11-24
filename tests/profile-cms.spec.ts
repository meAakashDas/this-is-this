import { test, expect } from '@playwright/test';

test.describe('Profile CMS & Media Management QA', () => {
  test.beforeEach(async ({ page }) => {
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
  test('1. Opening /admin directly displays dashboard in Development Preview mode', async ({
    page,
  }) => {
    await page.goto('/admin');

    // Verify Dev Preview Mode notice banner
    const banner = page.locator('text=Development Preview Mode Active');
    await expect(banner).toBeVisible();

    // Verify Admin Header shows Dev Preview badge
    const previewBadge = page.locator('header').getByText('Dev Preview', { exact: true });
    await expect(previewBadge).toBeVisible();

    // Verify sidebar has Profile tab
    const profileTab = page.locator('aside button:has-text("Profile")');
    await expect(profileTab).toBeVisible();
  });

  test('2. Profile tab opens Personal Profile CMS editor', async ({ page }) => {
    await page.goto('/admin');

    // Click Profile tab in sidebar
    const profileTab = page.locator('aside button:has-text("Profile")');
    await profileTab.click();

    // Verify Profile CMS heading
    const heading = page.locator('h1:has-text("Personal Profile CMS")');
    await expect(heading).toBeVisible();

    // Verify Save Profile button
    const saveBtn = page.locator('button:has-text("Save Profile")');
    await expect(saveBtn).toBeVisible();
  });

  test('3. Profile editor sub-tabs switch smoothly', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();

    // Verify sub-tabs exist
    const tabs = [
      'Basic Identity',
      'Biography',
      'Social Media',
      'Contact Channels',
      'Live Preview',
    ];

    for (const tabName of tabs) {
      const tabBtn = page.locator(`button:has-text("${tabName}")`);
      await expect(tabBtn).toBeVisible();
      await tabBtn.click();
    }
  });

  test('4. Identity form inputs are pre-filled with real baseline data', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Basic Identity")').click();

    // Verify Full Name input
    const nameInput = page.locator('input[value="Aakash Das"]').first();
    await expect(nameInput).toBeVisible();

    // Verify profile image is rendered
    const profileImg = page.locator('img[alt="Aakash Das"]').first();
    await expect(profileImg).toBeVisible();
  });

  test('5. Biography Editor displays paragraphs and allows additions', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Biography")').click();

    // Verify paragraph items exist
    const paragraph1 = page.locator('text=Paragraph #1');
    await expect(paragraph1).toBeVisible();

    // Verify Add New Paragraph card
    const addCard = page.locator('text=Add New Paragraph');
    await expect(addCard).toBeVisible();
  });

  test('6. Social Links Editor lists verified profiles with visibility controls', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Social Media")').click();

    // Verify verified channels are listed
    await expect(page.locator('text=YouTube').first()).toBeVisible();
    await expect(page.locator('text=Instagram').first()).toBeVisible();
    await expect(page.locator('text=LinkedIn').first()).toBeVisible();
    await expect(page.locator('text=Add Social Channel')).toBeVisible();
  });

  test('7. Contact Editor displays verified email and WhatsApp fields', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Contact Channels")').click();

    // Verify email and WhatsApp inputs
    const emailInput = page.locator('input[value="contact@aakashdas.live"]');
    await expect(emailInput).toBeVisible();

    const whatsappHeading = page.locator('text=WhatsApp Number');
    await expect(whatsappHeading).toBeVisible();
  });

  test('8. Live Preview tab renders real-time public frontend preview', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Live Preview")').click();

    // Verify Live Preview container
    await expect(page.locator('text=Live Frontend Preview')).toBeVisible();
    await expect(page.locator('text=About Aakash').first()).toBeVisible();
    await expect(page.locator('text=contact@aakashdas.live').first()).toBeVisible();
  });

  test('9. Modifying an input triggers Unsaved changes badge and allows saving', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();
    await page.locator('button:has-text("Basic Identity")').click();

    // Modify Tagline input
    const taglineInput = page.locator('input[placeholder*="Founder"]').first();
    await taglineInput.fill('Founder & Technology Educator in Nepal');

    // Verify Unsaved changes badge appears
    const unsavedBadge = page.locator('text=Unsaved changes');
    await expect(unsavedBadge).toBeVisible();

    // Click Save Profile button
    const saveBtn = page.locator('button:has-text("Save Profile")');
    await saveBtn.click();

    // Verify notification appears
    const notification = page.locator('text=Profile saved to local preview state');
    await expect(notification).toBeVisible();
  });

  test('10. Profile CMS is fully responsive without horizontal overflow on mobile (390px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.locator('aside button:has-text("Profile")').click();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    const saveBtn = page.locator('button:has-text("Save Profile")');
    await expect(saveBtn).toBeVisible();
  });
});
