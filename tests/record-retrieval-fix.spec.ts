import { test, expect } from '@playwright/test';

test.describe('Admin Resources & Journal - Record Retrieval & Editor Bug Fix Verification', () => {
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

  test('A. Direct URL navigation to Resource #001 loads record without "not found" or false unsaved changes', async ({
    page,
  }) => {
    await page.goto('/admin?tab=resources&id=001');

    // Wait for the editor to load
    await expect(page.locator('input[placeholder*="Resource Title"]')).toBeVisible({ timeout: 10000 });

    // Verify Title and Number
    const titleInput = page.locator('input[placeholder*="Resource Title"]');
    await expect(titleInput).toHaveValue('Starter Personal Budget Framework');

    // Verify Number input value is 001
    const numberInput = page.locator('input[value="001"]');
    await expect(numberInput).toBeVisible();

    // Verify Downloadable Resources button shows 2 files
    await expect(page.locator('button:has-text("Downloadable Resources")')).toContainText('2');

    // CRITICAL: Ensure NO false "Resource with identifier was not found" error appears
    const notFoundError = page.locator('text=Resource with identifier "001" was not found');
    await expect(notFoundError).toHaveCount(0);
    const genericNotFound = page.locator('.border-destructive\\/40, .bg-destructive\\/10');
    await expect(genericNotFound).toHaveCount(0);

    // CRITICAL: Ensure NO false "Unsaved changes" badge appears on initial load
    const unsavedBadge = page.locator('span:has-text("Unsaved changes")');
    await expect(unsavedBadge).toHaveCount(0);

    // Verify PUBLISHED badge is visible
    await expect(page.locator('span:has-text("PUBLISHED")')).toBeVisible();

    // Test Update Resource & Unpublish to Draft distinct actions on already-published #001
    await expect(page.locator('button:has-text("Unpublish to Draft")')).toBeVisible();
    const updateBtn = page.locator('button:has-text("Update Resource")');
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    // Ensure save succeeds without any not-found or Firestore errors
    await expect(notFoundError).toHaveCount(0);
    await expect(genericNotFound).toHaveCount(0);
  });

  test('B. Direct URL navigation to Journal article loads record without "not found" or false unsaved changes', async ({
    page,
  }) => {
    await page.goto('/admin?tab=journal&id=where-finance-meets-technology');

    // Wait for the journal editor to load
    await expect(page.locator('input[placeholder*="Article Title"]')).toBeVisible({ timeout: 10000 });

    // Verify Title
    const titleInput = page.locator('input[placeholder*="Article Title"]');
    await expect(titleInput).toHaveValue('Where Finance Meets Technology');

    // Verify Category select value is Finance & Tech
    const categorySelect = page.locator('select').first();
    await expect(categorySelect).toHaveValue('Finance & Tech');

    // CRITICAL: Ensure NO false "Journal with identifier was not found" error appears
    const notFoundError = page.locator('text=Journal with identifier "where-finance-meets-technology" was not found');
    await expect(notFoundError).toHaveCount(0);
    const genericNotFound = page.locator('.border-destructive\\/40, .bg-destructive\\/10');
    await expect(genericNotFound).toHaveCount(0);

    // CRITICAL: Ensure NO false "Unsaved changes" badge appears on initial load
    const unsavedBadge = page.locator('span:has-text("Unsaved changes")');
    await expect(unsavedBadge).toHaveCount(0);

    // Verify PUBLISHED badge is visible
    await expect(page.locator('span:has-text("PUBLISHED")')).toBeVisible();

    // Test Save Draft button
    const saveDraftBtn = page.locator('button:has-text("Save Draft")');
    await expect(saveDraftBtn).toBeVisible();
    await saveDraftBtn.click();

    // Ensure save succeeds without any errors
    await expect(notFoundError).toHaveCount(0);
    await expect(genericNotFound).toHaveCount(0);
  });

  test('C. Non-existent Resource displays explicit verified Not Found UI state', async ({
    page,
  }) => {
    await page.goto('/admin?tab=resources&id=998');

    // Should display verified Resource Not Found UI
    await expect(page.locator('h3:has-text("Resource Not Found")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Resource with identifier "998" was not found in the educational archive.')).toBeVisible();

    // Clicking "Back to Resources" returns to listing
    await page.locator('button:has-text("Back to Resources")').click();
    await expect(page.locator('h2:has-text("Educational Resources CMS")')).toBeVisible();
  });

  test('D. Non-existent Journal displays explicit verified Not Found UI state', async ({
    page,
  }) => {
    await page.goto('/admin?tab=journal&id=non-existent-article-xyz');

    // Should display verified Journal Article Not Found UI
    await expect(page.locator('h3:has-text("Journal Article Not Found")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Journal with identifier "non-existent-article-xyz" was not found in the archive.')).toBeVisible();

    // Clicking "Back to Journal" returns to listing
    await page.locator('button:has-text("Back to Journal")').click();
    await expect(page.locator('h2:has-text("Journal & Articles CMS")')).toBeVisible();
  });

  test('E. Edit buttons in listings synchronize URL parameters and preserve editing session on page refresh', async ({
    page,
  }) => {
    // 1. Go to resources list
    await page.goto('/admin?tab=resources');
    await expect(page.locator('h2:has-text("Educational Resources CMS")')).toBeVisible();

    // Find Resource 001 card and click Edit button
    const editBtn = page.locator('button[aria-label="Edit Resource 001"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify URL parameter updated to ?tab=resources&id=001
    await expect(page).toHaveURL(/.*tab=resources.*id=001/);

    // Refresh page
    await page.reload();

    // Ensure it re-opens Resource 001 editor directly without losing state
    await expect(page.locator('input[placeholder*="Resource Title"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder*="Resource Title"]')).toHaveValue('Starter Personal Budget Framework');
    await expect(page.locator('text=Resource with identifier "001" was not found')).toHaveCount(0);
  });
});
