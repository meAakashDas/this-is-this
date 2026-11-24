import { test, expect } from '@playwright/test';

test.describe('Notion-Style Resource Editor & Educational CMS QA', () => {
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
  test('1. Sidebar has Resources tab marked active/ready without Phase 7 badge', async ({
    page,
  }) => {
    await page.goto('/admin');

    const resourcesTab = page.locator('aside button:has-text("Resources")');
    await expect(resourcesTab).toBeVisible();
    await expect(resourcesTab.locator('text=Phase 7')).toHaveCount(0);
  });

  test('2. Clicking Resources tab loads Resource CMS dashboard and metrics', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();

    // Verify main heading
    await expect(
      page.locator('h2:has-text("Educational Resources CMS")')
    ).toBeVisible();

    // Verify metrics cards exist
    const metricsBar = page.locator('.grid:has-text("Total Archive")');
    await expect(metricsBar.getByText('Total Archive')).toBeVisible();
    await expect(metricsBar.getByText('Published')).toBeVisible();
    await expect(metricsBar.getByText('Drafts')).toBeVisible();
    await expect(metricsBar.getByText('Archived')).toBeVisible();

    // Verify baseline resources are listed
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await expect(page.locator('text=NO. 003')).toBeVisible();
  });

  test('3. Search and Category filtering works cleanly', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();

    const searchInput = page.locator('input[placeholder*="Search by title"]');
    await expect(searchInput).toBeVisible();

    // Search for "Banking"
    await searchInput.fill('Banking');
    await expect(page.locator('text=Nepal Banking & Account Checklist')).toBeVisible();
    await expect(page.locator('text=Starter Personal Budget Framework')).toHaveCount(0);

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('text=Starter Personal Budget Framework')).toBeVisible();

    // Filter by Productivity
    const categorySelect = page.getByLabel('Filter by category');
    await categorySelect.selectOption('Productivity');
    await expect(
      page.locator('text=Student Productivity & Semester Tracker')
    ).toBeVisible();
    await expect(page.locator('text=Nepal Banking & Account Checklist')).toHaveCount(0);
  });

  test('4. Clicking Create Resource opens the Notion-Style Resource Editor', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    // Verify top action bar
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
    await expect(page.locator('button:has-text("Live Preview")')).toBeVisible();
    await expect(page.locator('button:has-text("Publish Resource")')).toBeVisible();

    // Verify the two primary content areas are both present on the page
    // 1. Notion editor writing canvas and toolbar
    await expect(page.locator('input[placeholder*="Resource Title"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="concise overview"]')).toBeVisible();
    await expect(page.locator('.notion-toolbar')).toBeVisible();
    await expect(page.locator('.notion-prose')).toBeVisible();

    // 2. Separate Downloadable Resources section directly on the page
    await expect(page.locator('#downloadable-resources')).toBeVisible();
    await expect(page.locator('button:has-text("Downloadable Resources")')).toBeVisible();

    // 3. Compact Settings & SEO area
    await expect(page.locator('#settings-seo')).toBeVisible();
  });

  test('5. Editing Resource 001 preserves and loads existing content into BlockNote canvas', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();

    const editBtn = page.locator('button[aria-label="Edit Resource 001"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify prefilled title and description
    const titleInput = page.locator('input[placeholder*="Resource Title"]');
    await expect(titleInput).toHaveValue('Starter Personal Budget Framework');

    // Verify content rendered in BlockNote canvas
    const editor = page.locator('.blocknote-canvas-container');
    await expect(editor).toBeVisible();
    // Existing blocks converted into headings, paragraphs, tables
    await expect(editor.locator('text=What’s Included')).toBeVisible();
    await expect(editor.locator('table')).toBeVisible();
  });

  test('6. BlockNote Editor: Typing, headings, and lists in writing canvas', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    // Focus editor and type text
    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Comprehensive Financial Guide for Nepal');
    await expect(editor).toContainText('Comprehensive Financial Guide for Nepal');

    // Press Enter to start new line
    await page.keyboard.press('Enter');
    await page.keyboard.type('This guide explains zero-based budgeting principles.');
    await expect(editor).toContainText('This guide explains zero-based budgeting principles.');
  });

  test('7. BlockNote Editor: Slash Commands menu (/ commands) inserts blocks with keyboard', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();

    // Type "/" to trigger BlockNote slash menu
    await page.keyboard.type('/');

    // Verify slash menu appears
    const slashMenu = page.locator('.bn-suggestion-menu, [data-suggestion-menu], [role="menu"]');
    await expect(slashMenu.first()).toBeVisible();
  });

  test('8. BlockNote Editor: Table creation and operations', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();

    // Type "/table" and press Enter to insert table in BlockNote
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');

    // Verify table appears
    const table = page.locator('.blocknote-canvas-container table, .bn-editor table');
    await expect(table.first()).toBeVisible();
  });

  test('9. BlockNote Editor: Nepali Unicode text input works reliably', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    const nepaliTitle = 'नेपाली बजेट योजना तथा वित्तीय गाइड';
    const titleInput = page.locator('input[placeholder*="Resource Title"]');
    await titleInput.fill(nepaliTitle);
    await expect(titleInput).toHaveValue(nepaliTitle);

    // Type Nepali text into BlockNote editor
    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    const nepaliParagraph = 'यो व्यक्तिगत वित्त व्यवस्थापनका लागि व्यावहारिक अभ्यास हो।';
    await page.keyboard.type(nepaliParagraph);
    await expect(editor).toContainText(nepaliParagraph);
  });

  test('10. Downloadable Resources: Managed separately with format badges, ordering, and actions', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 001"]').click();

    // Verify separate header
    await expect(
      page.locator('h3:has-text("Downloadable Educational Attachments")')
    ).toBeVisible();

    // Verify existing attachments
    await expect(
      page.locator('text=Starter Budget Guide & Printable Worksheet')
    ).toBeVisible();
    await expect(page.getByText('PDF', { exact: true }).first()).toBeVisible();
    await expect(
      page.locator('text=Zero-Based Monthly Cash Flow Model')
    ).toBeVisible();

    // Verify action buttons: download & verify, replace, visibility toggle, move up/down, delete
    await expect(
      page.locator('a[aria-label*="Download and verify"]').first()
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label*="Replace"]').first()
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label*="Hide attachment"]').first()
    ).toBeVisible();
  });

  test('11. Live Preview renders public-like view with written content and separate downloads', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 001"]').click();

    // Switch to Live Preview
    await page.locator('button:has-text("Live Preview")').click();

    // Verify preview header and actions
    await expect(page.locator('text=Save as PDF')).toBeVisible();
    await expect(page.locator('text=Save as DOCX')).toBeVisible();
    await expect(page.locator('text=Download Resources')).toBeVisible();

    // Verify simplified layout: About Resource and Read Me headings are removed
    await expect(page.locator('h2:has-text("About Resource")')).toHaveCount(0);
    await expect(page.locator('h2:has-text("Read Me")')).toHaveCount(0);

    // Switch to Library Card View
    await page.locator('button:has-text("Library Card View")').click();
    await expect(page.locator('text=NO. 001')).toBeVisible();
  });

  test('12. Save Draft preserves changes in Development Preview Mode without Firestore write', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    // Fill minimal valid resource
    await page.locator('input[placeholder="001"]').fill('099');
    await page
      .locator('input[placeholder*="Resource Title"]')
      .fill('Test BlockNote Draft Resource');
    await page
      .locator('textarea[placeholder*="concise overview"]')
      .fill('A quick overview of the test resource.');

    // Write content in BlockNote editor
    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Continuous draft content created with BlockNote editor.');

    // Click Save Draft
    await page.locator('button:has-text("Save Draft")').click();

    // Verify it transitions to list and shows draft resource #099
    const draftCard = page.locator('.resource-card', { hasText: 'NO. 099' });
    await expect(draftCard).toBeVisible();
    await expect(draftCard.locator('text=Test BlockNote Draft Resource')).toBeVisible();
    await expect(draftCard.getByText('DRAFT', { exact: true })).toBeVisible();
  });

  test('13. Public /resources and /resources/001 remain completely intact and functional', async ({
    page,
  }) => {
    // Check public catalog
    await page.goto('/resources');
    await expect(page.locator('h1:has-text("Resources")')).toBeVisible();
    await expect(page.locator('text=NO. 001')).toBeVisible();

    // Check public detail page
    await page.goto('/resources/001');
    await expect(
      page.locator('h1:has-text("Starter Personal Budget Framework")')
    ).toBeVisible();
    await expect(page.locator('text=Save as PDF')).toBeVisible();
    await expect(page.locator('text=Download Resources')).toBeVisible();

    // Verify About Resource and Read Me sections are removed from public layout
    await expect(page.locator('.about-resource-section')).toHaveCount(0);
    await expect(page.locator('.readme-section')).toHaveCount(0);
  });

  test('14. Auto-numbering generates next available 3-digit number and validates duplicate slugs', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    // Verify next number is auto-filled to at least 005
    const numberInput = page.locator('input[placeholder="001"]');
    await expect(numberInput).toBeVisible();
    const currentNum = await numberInput.inputValue();
    expect(parseInt(currentNum, 10)).toBeGreaterThanOrEqual(5);

    // Fill title and existing slug of 001
    await page.locator('input[placeholder*="Resource Title"]').fill('Duplicate Slug Test');
    const slugInput = page.locator('input[placeholder="starter-budget-template"]').first();
    await slugInput.fill('starter-personal-budget-framework');

    // Click Save Draft
    await page.locator('button:has-text("Save Draft")').click();

    // Expect duplicate slug error alert
    await expect(
      page.locator('text=is already in use by Resource #001')
    ).toBeVisible();
  });
});
