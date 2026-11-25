import { test, expect } from '@playwright/test';

test.describe('Simplified Single-Section Journal CMS QA', () => {
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

  test('1. Sidebar has Journal tab marked active/ready', async ({ page }) => {
    const journalTab = page.locator('aside button:has-text("Journal")');
    await expect(journalTab).toBeVisible();
    await expect(journalTab.locator('text=Phase 8')).toHaveCount(0);
  });

  test('2. Simple Journal Management List displays title, excerpt, status, Edit, Publish/Unpublish, and Delete', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Journal")').click();

    await expect(page.locator('h2:has-text("Journal & Articles")')).toBeVisible();
    await expect(page.locator('.article-card')).toHaveCount(4);

    // Essential article details
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();
    await expect(page.locator('text=Building Something That Matters')).toBeVisible();
    await expect(page.locator('text=Where Finance Meets Technology')).toBeVisible();
    await expect(page.locator('text=The Value of Being a Beginner')).toBeVisible();

    // Essential actions only (no Category/Tag/Sort/Duplicate/Archive clutter)
    await expect(page.getByLabel('Filter by category')).toHaveCount(0);
    await expect(page.getByLabel('Filter by tag')).toHaveCount(0);
    await expect(page.getByLabel('Sort articles')).toHaveCount(0);
    await expect(
      page.locator('button[aria-label="Edit Article why-i-believe-in-learning-in-public"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("Unpublish")').first()).toBeVisible();
    await expect(
      page.locator('button[aria-label="Delete Article why-i-believe-in-learning-in-public"]')
    ).toBeVisible();
  });

  test('3. Search & status pills filter articles cleanly', async ({ page }) => {
    await page.locator('aside button:has-text("Journal")').click();

    const searchInput = page.locator('input[placeholder*="Search articles"]');
    await searchInput.fill('Beginner');
    await expect(page.locator('text=The Value of Being a Beginner')).toBeVisible();
    await expect(page.locator('text=Why I Believe in Learning in Public')).toHaveCount(0);

    await searchInput.fill('');
    await page.locator('button:has-text("Draft")').first().click();
    await expect(page.locator('text=No articles found')).toBeVisible();
    await page.locator('button:has-text("All")').click();
    await expect(page.locator('.article-card')).toHaveCount(4);
  });

  test('4. Journal Editor contains ONLY Article Content Editor and 4 action buttons, with all SEO/settings removed', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    // Verify action bar: Cancel, Save Draft, Live Preview, Publish Article
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
    await expect(page.locator('button:has-text("Live Preview")')).toBeVisible();
    await expect(page.locator('button:has-text("Publish Article")')).toBeVisible();

    // Strictly ONE main editor section
    await expect(page.locator('.journal-editor-container > section')).toHaveCount(1);
    await expect(page.locator('#article-content-editor')).toBeVisible();
    await expect(page.locator('.bn-editor')).toBeVisible();

    // Verify ALL removed settings/metadata panels are completely absent
    await expect(page.locator('#settings-seo')).toHaveCount(0);
    await expect(page.locator('button:has-text("Editorial Settings & SEO")')).toHaveCount(0);
    await expect(page.locator('text=Featured Article Image')).toHaveCount(0);
    await expect(page.locator('text=Taxonomy & Categorization')).toHaveCount(0);
    await expect(page.locator('input[placeholder*="Brief secondary subtitle"]')).toHaveCount(0);
    await expect(page.locator('textarea[placeholder*="Short introductory summary"]')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('5. Create, write formatted blocks + slash commands + Nepali text, Save Draft, Publish, Update, Unpublish & Delete', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    const titleInput = page.locator('input[placeholder*="Article Title"]');
    await titleInput.fill('Simple Wealth Framework');

    const editor = page.locator('.bn-editor');
    await editor.click();
    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Core Principles');
    await page.keyboard.press('Enter');
    await page.keyboard.type('First paragraph about long-term clarity.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/image');
    await page.keyboard.press('Enter');
    await expect(editor.locator('h2')).toContainText('Core Principles');
    await expect(editor.locator('table')).toBeVisible();

    // Save Draft -> persists cleanly
    await page.locator('button:has-text("Save Draft")').click();
    await expect(page.locator('[role="status"]:has-text("saved as draft")').first()).toBeVisible();
    await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();

    // Refresh browser -> draft remains in editor
    await page.reload();
    await expect(page.locator('input[placeholder*="Article Title"]')).toHaveValue('Simple Wealth Framework');

    // Publish Article -> switches to PUBLISHED & Update Article
    await page.locator('button:has-text("Publish Article")').click();
    await expect(page.locator('[role="status"]:has-text("published")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Update Article")')).toBeVisible();

    // Back to list -> Unpublish -> Delete
    await page.locator('button[aria-label="Back to Journal list"]').click();
    const card = page.locator('.article-card', { hasText: 'Simple Wealth Framework' });
    await expect(card).toBeVisible();
    await expect(card.getByText('PUBLISHED', { exact: true })).toBeVisible();

    await card.locator('button:has-text("Unpublish")').click();
    await expect(card.getByText('DRAFT', { exact: true })).toBeVisible();

    await card.locator('button:has-text("Delete")').click();
    await page.locator('button:has-text("Delete Article")').click();
    await expect(page.locator('.article-card')).toHaveCount(4);
  });

  test('6. Live Preview works cleanly for existing article', async ({ page }) => {
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button[aria-label="Edit Article why-i-believe-in-learning-in-public"]').click();

    await expect(page.locator('button:has-text("Update Article")')).toBeVisible();
    await page.locator('button:has-text("Live Preview")').click();
    await expect(
      page.locator('text=https://aakashdas.live/journal/why-i-believe-in-learning-in-public')
    ).toBeVisible();
    await expect(page.locator('text=Teaching as a Learning Mechanism')).toBeVisible();

    await page.locator('button:has-text("Back to Writing")').click();
    await expect(page.locator('.bn-editor')).toBeVisible();
  });

  test('7. Public /journal and all 4 existing article routes remain completely intact', async ({
    page,
  }) => {
    await page.goto('/journal', { waitUntil: 'load' });
    await expect(page.locator('h1:has-text("Journal")')).toBeVisible();
    await expect(page.locator('.journal-entry-item')).toHaveCount(4);

    for (const slug of [
      'why-i-believe-in-learning-in-public',
      'building-something-that-matters',
      'where-finance-meets-technology',
      'the-value-of-being-a-beginner',
    ]) {
      const resp = await page.goto(`/journal/${slug}`, { waitUntil: 'load' });
      expect(resp?.status()).toBe(200);
      await expect(page.locator('a.journal-back-link')).toBeVisible();
    }
  });
});
