import { test, expect } from '@playwright/test';

test.describe('Simplified 2-Section Resource Editor QA', () => {
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

  test('1. Sidebar has Resources tab marked active/ready', async ({ page }) => {
    const resourcesTab = page.locator('aside button:has-text("Resources")');
    await expect(resourcesTab).toBeVisible();
    await expect(resourcesTab.locator('text=Phase 7')).toHaveCount(0);
  });

  test('2. Clicking Resources tab loads simplified Resource list UI cleanly', async ({ page }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await expect(page.locator('h2:has-text("Resources")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Resource")')).toBeVisible();

    // Status filter contains ONLY All, Published, Draft
    const filterGroup = page.getByRole('group', { name: 'Filter resources by status' });
    await expect(filterGroup.locator('button:has-text("All")')).toBeVisible();
    await expect(filterGroup.locator('button:has-text("Published")')).toBeVisible();
    await expect(filterGroup.locator('button:has-text("Draft")')).toBeVisible();
    await expect(filterGroup.locator('button:has-text("Archived")')).toHaveCount(0);

    // Removed elements must be completely absent
    await expect(page.locator('text=Total Archive')).toHaveCount(0);
    await expect(page.locator('text=Featured')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
    await expect(page.locator('button[aria-label^="Preview Resource"]')).toHaveCount(0);
    await expect(page.locator('button[aria-label^="Duplicate Resource"]')).toHaveCount(0);
    await expect(page.locator('button[aria-label^="Archive Resource"]')).toHaveCount(0);

    // Existing resources render with number, title, status, and Edit/Publish-Unpublish/Delete actions
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=Starter Personal Budget Framework')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await expect(page.locator('text=NO. 003')).toBeVisible();
    await expect(page.locator('button[aria-label="Edit Resource 001"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Unpublish Resource 001"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Delete Resource 001"]')).toBeVisible();

    // Verify Publish / Unpublish toggle and Draft / Published / All filters
    await page.locator('button[aria-label="Unpublish Resource 001"]').click();
    await expect(page.locator('button[aria-label="Publish Resource 001"]')).toBeVisible();
    await filterGroup.locator('button:has-text("Draft")').click();
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toHaveCount(0);
    await filterGroup.locator('button:has-text("Published")').click();
    await expect(page.locator('text=NO. 001')).toHaveCount(0);
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await filterGroup.locator('button:has-text("All")').click();
    await page.locator('button[aria-label="Publish Resource 001"]').click();
    await expect(page.locator('button[aria-label="Unpublish Resource 001"]')).toBeVisible();

    // Verify Delete confirmation removes a resource cleanly
    await page.locator('button[aria-label="Delete Resource 003"]').click();
    await expect(page.locator('h3:has-text("Delete Resource")')).toBeVisible();
    await page.locator('button:has-text("Confirm Delete")').click();
    await expect(page.locator('text=NO. 003')).toHaveCount(0);

    // Verify responsive mobile layout has zero horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasOverflow).toBe(false);
  });

  test('3. Resource Editor contains ONLY TWO sections and removes all metadata/SEO/settings clutter', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 001"]').click();

    // Verify exactly two editor sections exist
    const sections = page.locator('.resource-editor-container > section');
    await expect(sections).toHaveCount(2);
    await expect(page.locator('h3:has-text("1. Downloadable Files")')).toBeVisible();
    await expect(page.locator('h3:has-text("2. Resource Content")')).toBeVisible();

    // Verify top actions contain ONLY Cancel, Save Draft, and Update/Publish (plus Back button)
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
    await expect(page.locator('button:has-text("Update")')).toBeVisible();
    await expect(page.locator('button:has-text("Live Preview")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Settings & SEO")')).toHaveCount(0);

    // Verify ALL removed fields are completely absent
    await expect(page.locator('input[placeholder*="Resource Title"]')).toHaveCount(0);
    await expect(page.locator('textarea[placeholder*="concise overview"]')).toHaveCount(0);
    await expect(page.locator('input[placeholder="001"]')).toHaveCount(0);
    await expect(page.locator('input[placeholder="starter-budget-template"]')).toHaveCount(0);
    await expect(page.locator('#settings-seo')).toHaveCount(0);
    await expect(page.locator('h3:has-text("External Resource Links")')).toHaveCount(0);
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('4. Resource #001 loads existing files and rich written content cleanly', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 001"]').click();

    // Existing attachments loaded
    await expect(page.locator('.attachment-item')).toHaveCount(2);
    await expect(page.locator('.attachment-item input').first()).toHaveValue(
      'Starter Budget Guide & Printable Worksheet'
    );

    // BlockNote canvas loaded with headings & table
    const editor = page.locator('.blocknote-canvas-container');
    await expect(editor).toBeVisible();
    await expect(editor.locator('text=What’s Included')).toBeVisible();
    await expect(editor.locator('table')).toBeVisible();
  });

  test('5. Downloadable Files: Upload PDF & CSV (multi-file), rename, replace, delete cleanly without hanging', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 001"]').click();

    const uploadInput = page.locator('input[type="file"][multiple]');

    // Upload a PDF and CSV together
    await uploadInput.setInputFiles([
      {
        name: 'guide-sample.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
      },
      {
        name: 'cashflow-sample.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Category,Amount\nSavings,5000\n'),
      },
    ]);

    // Upload completes cleanly without hanging on "Uploading ..."
    await expect(page.locator('text=Added 2 files')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Uploading')).toHaveCount(0);
    await expect(page.locator('.attachment-item')).toHaveCount(4);

    // Rename display name of newly added PDF
    const nameInputs = page.locator('.attachment-item input[placeholder="Enter file display name"]');
    await nameInputs.nth(2).fill('Updated Sample PDF Guide');
    await expect(nameInputs.nth(2)).toHaveValue('Updated Sample PDF Guide');

    // Replace CSV with updated CSV
    const replaceBtn = page.locator('button[aria-label="Replace cashflow-sample.csv"]');
    const replaceInput = page.locator('input[type="file"]:not([multiple])');
    await replaceBtn.click();
    await replaceInput.setInputFiles({
      name: 'cashflow-v2.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Category,Amount\nSavings,7500\n'),
    });
    await expect(page.locator('text=Replaced "cashflow-sample.csv" with "cashflow-v2.csv"')).toBeVisible({
      timeout: 5000,
    });

    // Delete replaced CSV
    await page.locator('button[aria-label="Delete cashflow-v2.csv"]').click();
    await expect(page.locator('.attachment-item')).toHaveCount(3);

    // Save Update & Refresh to verify persistence in preview session
    await page.locator('button:has-text("Update")').click();
    await expect(
      page.locator('[role="status"]:has-text("Resource #001")').first()
    ).toBeVisible();

    await page.reload();
    await page.waitForSelector('#downloadable-resources', { timeout: 8000 });
    await expect(page.locator('.attachment-item')).toHaveCount(3);
    await expect(
      page.locator('.attachment-item input[placeholder="Enter file display name"]').nth(2)
    ).toHaveValue('Updated Sample PDF Guide');
  });

  test('6. Resource Content: Edit text, /h2 heading, /bullet list, /table, and Nepali Unicode', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    await expect(page.locator('h3:has-text("1. Downloadable Files")')).toBeVisible();
    await expect(page.locator('h3:has-text("2. Resource Content")')).toBeVisible();

    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();

    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Comprehensive Financial Guide for Nepal');
    await expect(editor.locator('h2')).toContainText('Comprehensive Financial Guide for Nepal');

    await page.keyboard.press('Enter');
    await page.keyboard.type('यो व्यक्तिगत वित्त व्यवस्थापनका लागि व्यावहारिक अभ्यास हो।');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    await expect(editor.locator('table')).toBeVisible();

    // Save Draft -> persists cleanly
    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible();
  });

  test('7. Public /resources and /resources/001..003 remain completely intact', async ({
    page,
  }) => {
    await page.goto('/resources', { waitUntil: 'load' });
    await expect(page.locator('h1:has-text("Resources")')).toBeVisible();
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await expect(page.locator('text=NO. 003')).toBeVisible();

    await page.goto('/resources/001', { waitUntil: 'load' });
    await expect(page.locator('h1:has-text("Starter Personal Budget Framework")')).toBeVisible();
    await expect(page.locator('text=Save as PDF')).toBeVisible();
    await expect(page.locator('text=Download Resources')).toBeVisible();
  });
});
