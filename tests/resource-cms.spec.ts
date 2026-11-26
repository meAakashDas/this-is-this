import { test, expect } from '@playwright/test';
import zlib from 'node:zlib';

function extractPdfStreamText(pdfBuf: Buffer): string {
  const chunks: string[] = [pdfBuf.toString('latin1')];
  let idx = 0;
  while (true) {
    const start = pdfBuf.indexOf('stream', idx, 'latin1');
    if (start === -1) break;
    const nl = pdfBuf[start + 6] === 13 && pdfBuf[start + 7] === 10 ? start + 8 : pdfBuf[start + 6] === 10 ? start + 7 : -1;
    if (nl === -1) break;
    const end = pdfBuf.indexOf('endstream', nl, 'latin1');
    if (end === -1) break;
    try {
      const inflated = zlib.inflateSync(pdfBuf.subarray(nl, end));
      chunks.push(inflated.toString('latin1'));
    } catch {
      // ignore non-flate streams
    }
    idx = end + 9;
  }
  const rawText = chunks.join('\n').replace(/\\([()\\])/g, '$1');
  const tjJoined = Array.from(rawText.matchAll(/\(([^()\\]*)\)\s*Tj/g))
    .map((m) => m[1])
    .join('');
  return `${rawText}\n${tjJoined}`;
}

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

  test('8. Supports auto sequential numbering, custom numbers, duplicate validation, and editing existing resource numbers with immutable IDs', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await expect(page.locator('button:has-text("Create Resource")')).toBeVisible();

    // 1. Create with blank Resource Number -> auto-assigns next sequential number (NO. 004 in Dev Preview)
    await page.locator('button:has-text("Create Resource")').click();
    const numInput = page.locator('#resource-number-field');
    await expect(numInput).toBeVisible();
    await expect(numInput).toHaveValue('');
    await expect(numInput).toHaveAttribute('placeholder', /Auto \(004\)/);
    await expect(page.locator('text=NO. 004').first()).toBeVisible();

    const editor = page.locator('.blocknote-canvas-container [contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Auto Numbered Resource');

    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible();

    // Verify URL uses immutable non-display doc ID (res-...), not ?id=004
    const autoCreatedUrl = new URL(page.url());
    const autoDocId = autoCreatedUrl.searchParams.get('id');
    expect(autoDocId).toBeTruthy();
    expect(autoDocId).toMatch(/^res-/);

    // Return to list, reload, and verify NO. 004 persists
    await page.locator('button[title="Back to Resources"]').click();
    await expect(page.locator('text=NO. 004')).toBeVisible();
    await page.reload({ waitUntil: 'load' });
    await page.locator('aside button:has-text("Resources")').click();
    await expect(page.locator('text=NO. 004')).toBeVisible();

    // 2. Duplicate & invalid number validation on Create
    await page.locator('button:has-text("Create Resource")').click();
    await numInput.fill('0');
    await page.locator('button:has-text("Save Draft")').click();
    await expect(page.locator('[role="alert"]')).toContainText(/positive integer/i);

    await numInput.fill('1');
    await page.locator('button:has-text("Save Draft")').click();
    await expect(page.locator('[role="alert"]')).toContainText(/already assigned/i);

    // 3. Create with custom number (15 -> formatted NO. 015)
    await numInput.fill('15');
    await expect(page.locator('text=NO. 015').first()).toBeVisible();
    await editor.click();
    await page.keyboard.type('Custom Fifteen Resource');

    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible();

    const customUrl = new URL(page.url());
    const customDocId = customUrl.searchParams.get('id');
    expect(customDocId).toBeTruthy();
    expect(customDocId).toMatch(/^res-/);
    expect(customDocId).not.toBe('015');

    // Return to list, reload, and verify NO. 015 persists
    await page.locator('button[title="Back to Resources"]').click();
    const customRow = page.locator(`[data-resource-id="${customDocId}"]`);
    await expect(customRow).toContainText('NO. 015');
    await page.reload({ waitUntil: 'load' });
    await page.locator('aside button:has-text("Resources")').click();
    await expect(page.locator(`[data-resource-id="${customDocId}"]`)).toContainText('NO. 015');

    // 4. Edit existing resource number (015 -> 20) while preserving immutable ID
    await page.locator(`[data-resource-id="${customDocId}"] button:has-text("Edit")`).click();
    await expect(numInput).toHaveValue('015');
    await numInput.fill('20');
    await expect(page.locator('text=NO. 020').first()).toBeVisible();
    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible();

    // Immutable doc ID stays identical across number edit
    expect(new URL(page.url()).searchParams.get('id')).toBe(customDocId);

    // Reload editor directly, confirm NO. 020 persists, then return to list and confirm ResourceList
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#resource-number-field')).toHaveValue('020');
    await page.locator('button[title="Back to Resources"]').click();
    await expect(page.locator(`[data-resource-id="${customDocId}"]`)).toContainText('NO. 020');
    await expect(page.locator('text=NO. 015')).toHaveCount(0);
  });

  test('9. Auto-generates real PDF and DOCX on save, updates contentVersion on Resource #003 edits, and preserves Resource #001 manual downloads alongside Download Resource Document', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button[aria-label="Edit Resource 003"]').click();
    await expect(page.locator('#resource-number-field')).toHaveValue('003');

    // Edit Document Canvas on Resource #003 (heading, paragraph, list, table)
    const editor = page.locator('.blocknote-canvas-container [contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Updated Section 003 Heading');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fresh generated content paragraph.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');

    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="alert"]')).toHaveCount(0);

    // Reload and verify edits + generatedPdf/generatedDocx metadata persisted cleanly
    await page.reload({ waitUntil: 'load' });
    const persisted = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '003') || null;
    });
    expect(persisted).toBeTruthy();
    expect(persisted.contentVersion).toBeTruthy();
    expect(persisted.generatedPdf?.url).toMatch(/^data:application\/pdf;base64,/);
    expect(persisted.generatedDocx?.url).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,/
    );
    expect(persisted.generatedPdf.contentVersion).toBe(persisted.contentVersion);
    expect(persisted.generatedDocx.contentVersion).toBe(persisted.contentVersion);
    const decodedPdfHeader = Buffer.from(
      persisted.generatedPdf.url.split(',')[1],
      'base64'
    )
      .subarray(0, 5)
      .toString('ascii');
    expect(decodedPdfHeader).toBe('%PDF-');

    // Verify public /resources/001 displays both Download Resources (manual) and Download Resource Document (generated)
    await page.goto('/resources/001', { waitUntil: 'load' });
    await expect(page.locator('h2:has-text("Download Resources")')).toBeVisible();
    await expect(page.locator('h2:has-text("Download Resource Document")')).toBeVisible();
    await expect(page.locator('.generated-pdf-download-link')).toContainText('Download as PDF');
    await expect(page.locator('.generated-docx-download-link')).toContainText('Download as DOCX');
  });

  test('10. Forensic guards: list Publish auto-generates exports, AttachmentManager rejects invalid extensions & disambiguates duplicate names, and double-click Save prevents duplicates', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();

    // 1. Seed a draft resource without generatedPdf/generatedDocx in Dev Preview storage and verify Publish auto-generates them
    await page.locator('button:has-text("Create Resource")').click();
    const numInput = page.locator('#resource-number-field');
    await numInput.fill('091');
    const editor = page.locator('.blocknote-canvas-container [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('Forensic Audit Guard Resource');

    // Rapid double-click on Save Draft should create exactly ONE resource 091 (never duplicates)
    const saveBtn = page.locator('button:has-text("Save Draft")');
    await Promise.all([saveBtn.click(), saveBtn.click({ force: true })]);
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible({ timeout: 15000 });

    const countAfterDoubleSave = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.filter((r: any) => r.resourceNumber === '091').length;
    });
    expect(countAfterDoubleSave).toBe(1);

    // 2. AttachmentManager rejects unsupported file extension (.exe) cleanly without partial attachments
    const fileInput = page.locator('input[type="file"][multiple]');
    await fileInput.setInputFiles([
      {
        name: 'valid-sheet.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('col1,col2\n1,2\n'),
      },
      {
        name: 'blocked-binary.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('MZ'),
      },
    ]);
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('.attachment-item')).toHaveCount(0);

    // 3. Upload two files sharing the exact same filename sequentially/batch and confirm both persist cleanly
    await fileInput.setInputFiles({
      name: 'guide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%first\n'),
    });
    await expect(page.locator('.attachment-item')).toHaveCount(1);
    await fileInput.setInputFiles({
      name: 'guide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%second\n'),
    });
    await expect(page.locator('.attachment-item')).toHaveCount(2);

    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible({ timeout: 15000 });

    // Strip generatedPdf/generatedDocx in Dev Preview storage to simulate an older/stale draft
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((r: any) => r.resourceNumber === '091');
      if (idx >= 0) {
        delete list[idx].generatedPdf;
        delete list[idx].generatedDocx;
        delete list[idx].contentVersion;
        sessionStorage.setItem('aakashdas_cms_resources_preview', JSON.stringify(list));
      }
    });

    await page.reload({ waitUntil: 'load' });
    await page.locator('button[title="Back to Resources"]').click();

    // Clicking Publish from ResourceList must auto-generate PDF & DOCX before publishing
    await page.locator('button[aria-label="Publish Resource 091"]').click();
    await expect(page.locator('button[aria-label="Unpublish Resource 091"]')).toBeVisible({
      timeout: 15000,
    });

    const publishedRecord = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '091') || null;
    });
    expect(publishedRecord).toBeTruthy();
    expect(publishedRecord.published).toBe(true);
    expect(publishedRecord.contentVersion).toBeTruthy();
    expect(publishedRecord.generatedPdf?.url).toMatch(/^data:application\/pdf;base64,/);
    expect(publishedRecord.generatedDocx?.url).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,/
    );
    expect(publishedRecord.generatedPdf.contentVersion).toBe(publishedRecord.contentVersion);
    expect(publishedRecord.generatedDocx.contentVersion).toBe(publishedRecord.contentVersion);

    // Unpublish toggles back to draft cleanly
    await page.locator('button[aria-label="Unpublish Resource 091"]').click();
    await expect(page.locator('button[aria-label="Publish Resource 091"]')).toBeVisible();
  });

  test('11. New Resource #006 lifecycle: rich canvas + inline JPEG attachment, branded PDF/DOCX generation, edit regeneration, and unpublish/republish', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    await page.locator('#resource-number-field').fill('006');
    const editor = page.locator('.blocknote-canvas-container [contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Compound Framework Overview');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Structured learning paragraph with real guidance.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/bullet');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Verify emergency fund target');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');

    // Upload inline image attachment matching Resource #005's attachment pattern
    const pngTiny = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: 'IMG-20260813-WA0011.png',
      mimeType: 'image/png',
      buffer: pngTiny,
    });
    await expect(page.locator('.attachment-item')).toHaveCount(1);

    // Publish directly -> pre-publish gate generates branded PDF & DOCX before publishing
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[role="alert"]')).toHaveCount(0);

    const created006 = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '006') || null;
    });
    expect(created006).toBeTruthy();
    expect(created006.published).toBe(true);
    expect(created006.downloadUrl).toMatch(/^data:application\/pdf;base64,/);
    expect(created006.generatedPdf?.url).toMatch(/^data:application\/pdf;base64,/);
    expect(created006.generatedDocx?.url).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,/
    );

    const pdfBuf = Buffer.from(created006.generatedPdf.url.split(',')[1], 'base64');
    const pdfLatin = extractPdfStreamText(pdfBuf);
    expect(pdfBuf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdfLatin).toContain('Aakash Das');
    expect(pdfLatin).toContain('Resource #006');
    expect(pdfLatin).toContain('Downloadable Resources');
    expect(pdfLatin).toMatch(/IMG[- ]20260813[- ]WA0011/i);
    expect(pdfLatin).toContain('https://aakashdas.live/resources/006#downloadable-resources');
    expect(pdfLatin).not.toContain('aakashdas.live/data:');

    const docxBuf = Buffer.from(created006.generatedDocx.url.split(',')[1], 'base64');
    expect(docxBuf.subarray(0, 2).toString('ascii')).toBe('PK');

    const firstVersion = created006.contentVersion;

    // Edit content & replace attachment -> Update -> confirm regeneration updates contentVersion
    const firstParagraph = page.locator('.blocknote-canvas-container p').first();
    await firstParagraph.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Edited Section 006 Regeneration Check');

    const replaceBtn = page.locator('button[aria-label^="Replace "]').first();
    await replaceBtn.click();
    await page.locator('input[type="file"]:not([multiple])').setInputFiles({
      name: 'budget-sheet-v2.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Category,Amount\nEmergency,10000\n'),
    });
    await expect(page.locator('text=budget-sheet-v2.csv')).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("Update")').click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 20000 });

    const edited006 = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '006') || null;
    });
    expect(edited006.contentVersion).not.toBe(firstVersion);
    expect(edited006.generatedPdf.contentVersion).toBe(edited006.contentVersion);
    expect(edited006.generatedDocx.contentVersion).toBe(edited006.contentVersion);
    const editedPdfLatin = extractPdfStreamText(
      Buffer.from(edited006.generatedPdf.url.split(',')[1], 'base64')
    );
    expect(editedPdfLatin).toContain('Edited Section 006 Regeneration Check');
    expect(editedPdfLatin).toMatch(/budget[- ]sheet[- ]v2/i);

    // Back to list: Unpublish & Republish
    await page.locator('button[title="Back to Resources"]').click();
    await page.locator('button[aria-label="Unpublish Resource 006"]').click();
    await expect(page.locator('button[aria-label="Publish Resource 006"]')).toBeVisible();
    await page.locator('button[aria-label="Publish Resource 006"]').click();
    await expect(page.locator('button[aria-label="Unpublish Resource 006"]')).toBeVisible({ timeout: 15000 });
  });

  test('12. Resource Heading & Short Description persistence, export metadata regeneration, and Find Resources number search across 1/001/007/015/999', async ({
    page,
  }) => {
    await page.locator('aside button:has-text("Resources")').click();
    await page.locator('button:has-text("Create Resource")').click();

    await page.locator('#resource-number-field').fill('007');
    const headingInput = page.locator('#resource-heading-field');
    const descInput = page.locator('#resource-description-field');
    await expect(headingInput).toBeVisible();
    await expect(descInput).toBeVisible();

    await headingInput.fill('Complete Guide to Personal Budgeting in Nepal');
    await descInput.fill(
      'A practical guide to managing monthly income, expenses, savings and emergency funds in Nepal.'
    );

    const editor = page.locator('.blocknote-canvas-container [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('Canvas Body Only Content');

    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 20000 });

    // Refresh admin editor and verify heading, description, and separate canvas persist
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#resource-heading-field')).toHaveValue(
      'Complete Guide to Personal Budgeting in Nepal'
    );
    await expect(page.locator('#resource-description-field')).toHaveValue(
      'A practical guide to managing monthly income, expenses, savings and emergency funds in Nepal.'
    );
    await expect(page.locator('.blocknote-canvas-container')).not.toContainText(
      'Complete Guide to Personal Budgeting in Nepal'
    );

    const created007 = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '007') || null;
    });
    expect(created007).toBeTruthy();
    expect(created007.id).toMatch(/^res-/);
    expect(created007.title).toBe('Complete Guide to Personal Budgeting in Nepal');
    expect(created007.shortDescription).toBe(
      'A practical guide to managing monthly income, expenses, savings and emergency funds in Nepal.'
    );

    const pdfV1 = extractPdfStreamText(Buffer.from(created007.generatedPdf.url.split(',')[1], 'base64'));
    expect(pdfV1).toContain('Complete Guide to Personal Budgeting in Nepal');
    expect(pdfV1).toContain('A practical guide to managing monthly income');
    expect(pdfV1).toContain('Canvas Body Only Content');
    const version1 = created007.contentVersion;

    // Edit Heading & Short Description -> Update -> confirm metadata & PDF regenerate cleanly
    await page.locator('#resource-heading-field').fill('Updated Nepal Budgeting Playbook');
    await page
      .locator('#resource-description-field')
      .fill('Updated concise summary for personal cash flow planning.');
    await page.locator('button:has-text("Update")').click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 20000 });

    const updated007 = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '007') || null;
    });
    expect(updated007.contentVersion).not.toBe(version1);
    expect(updated007.title).toBe('Updated Nepal Budgeting Playbook');
    expect(updated007.shortDescription).toBe('Updated concise summary for personal cash flow planning.');
    const pdfV2 = extractPdfStreamText(Buffer.from(updated007.generatedPdf.url.split(',')[1], 'base64'));
    expect(pdfV2).toContain('Updated Nepal Budgeting Playbook');
    expect(pdfV2).toContain('Updated concise summary for personal cash flow planning.');

    // Also add an unpublished draft #008 and custom-numbered #015 in preview session for search validation
    await page.locator('button[title="Back to Resources"]').click();
    await page.locator('button:has-text("Create Resource")').click();
    await page.locator('#resource-number-field').fill('15');
    await page.locator('#resource-heading-field').fill('Custom Fifteen Guide');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 20000 });

    const custom015 = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '015') || null;
    });
    expect(custom015?.id).toMatch(/^res-/);

    await page.locator('button[title="Back to Resources"]').click();
    await page.locator('button:has-text("Create Resource")').click();
    await page.locator('#resource-number-field').fill('8');
    await page.locator('#resource-heading-field').fill('Secret Draft Eight');
    await page.locator('button:has-text("Save Draft")').click();
    await expect(
      page.locator('[role="status"]:has-text("saved as draft")').first()
    ).toBeVisible({ timeout: 15000 });

    // Verify Find Resources resolves published 007 & 015 by immutable doc ID, rejects draft 008 & 999, and opens 1 -> /resources/001
    await page.goto('/resources', { waitUntil: 'load' });
    const searchInput = page.locator('.resources-search-wrap input[data-finder-input]');
    const findBtn = page.locator('.resources-search-wrap button[type="submit"]');
    const statusBox = page.locator('.resources-search-wrap [data-finder-status]');

    await searchInput.fill('999');
    await findBtn.click();
    await expect(statusBox).toContainText('No published resource found for NO. 999');

    await searchInput.fill('8');
    await findBtn.click();
    await expect(statusBox).toContainText('No published resource found for NO. 008');

    await searchInput.fill('7');
    await findBtn.click();
    await page.waitForURL(new RegExp(`/resources/${created007.id}`), { timeout: 6000 });

    await page.goto('/resources', { waitUntil: 'load' });
    await page.locator('.resources-search-wrap input[data-finder-input]').fill('015');
    await page.locator('.resources-search-wrap button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/resources/${custom015.id}`), { timeout: 6000 });

    await page.goto('/resources', { waitUntil: 'load' });
    await page.locator('.resources-search-wrap input[data-finder-input]').fill('1');
    await page.locator('.resources-search-wrap button[type="submit"]').click();
    await page.waitForURL(/\/resources\/001/, { timeout: 6000 });
  });
});
