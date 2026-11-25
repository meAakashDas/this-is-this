import { test, expect } from '@playwright/test';

test.describe('Simplified Homepage & About Page CMS QA', () => {
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

  test('1. Clicking Homepage tab opens simplified Homepage editor without Live Preview or counters', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Homepage")').click();
    await expect(page.locator('h1:has-text("Homepage")')).toBeVisible();

    const pane = page.locator('section[aria-label="Admin Content Pane"]');
    for (const tab of ['Hero', 'Featured Resources', 'Journal', 'Sections']) {
      await expect(pane.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
    await expect(pane.locator('button:has-text("Live Preview")')).toHaveCount(0);

    await expect(page.locator('input[value="I\'m Aakash Das."]')).toBeVisible();
    await expect(page.locator('input[value="RisePaisa"]')).toBeVisible();
    await expect(page.locator('input[value="Explore free resources"]')).toBeVisible();
  });

  test('2. Homepage sub-sections support editing Featured Resources, Journal, and Section Visibility', async ({
    page,
  }) => {
    const pane = page.locator('section[aria-label="Admin Content Pane"]');
    await page.locator('aside button:has-text("Homepage")').click();

    await pane.getByRole('button', { name: 'Featured Resources', exact: true }).click();
    await expect(page.locator('input[value="Free Resources"]')).toBeVisible();
    await expect(page.locator('text=NO. 001')).toBeVisible();

    await pane.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(page.locator('input[value="Journal"]')).toBeVisible();
    await expect(page.locator('input[value="Read articles"]')).toBeVisible();

    await pane.getByRole('button', { name: 'Sections', exact: true }).click();
    await expect(page.locator('h3:has-text("Section Visibility")')).toBeVisible();
    await expect(page.locator('button[aria-label^="Toggle visibility"]')).toHaveCount(5);

    await page.locator('button:has-text("Save Draft")').click();
    await expect(page.locator('text=Homepage draft saved to local preview state.')).toBeVisible();
  });

  test('3. Clicking About tab opens simplified About editor with Intro, Work, Media, Education, and Experience', async ({
    page,
  }) => {
    const pane = page.locator('section[aria-label="Admin Content Pane"]');
    await page.locator('aside button:has-text("About")').click();
    await expect(page.locator('h1:has-text("About")')).toBeVisible();

    for (const tab of ['Intro', 'Work', 'Media', 'Education', 'Experience']) {
      await expect(pane.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
    await expect(pane.locator('button:has-text("Live Preview")')).toHaveCount(0);

    await expect(page.locator('#about-heading-input')).toHaveValue('About Aakash Das');
    await expect(page.locator('text=Paragraph 01')).toBeVisible();
    await page.locator('button:has-text("Add Paragraph")').click();
    await expect(page.locator('text=Paragraph 04')).toBeVisible();

    await pane.getByRole('button', { name: 'Work', exact: true }).click();
    await expect(page.locator('input[value="RisePaisa"]')).toBeVisible();

    await pane.getByRole('button', { name: 'Media', exact: true }).click();
    await expect(page.locator('input[value="The Amit Show"]')).toBeVisible();

    await pane.getByRole('button', { name: 'Education', exact: true }).click();
    await expect(page.locator('input[value="Information Technology"]')).toBeVisible();

    await pane.getByRole('button', { name: 'Experience', exact: true }).click();
    await expect(page.locator('input[value="Founder & Lead Educator"]')).toBeVisible();

    await pane.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.locator('text=About page published to local preview state.')).toBeVisible();
  });
});
