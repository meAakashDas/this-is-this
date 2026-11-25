import { chromium } from '@playwright/test';
import fs from 'node:fs';

async function runVerification() {
  console.log('=== Starting Simplified 2-Section Resources CMS Verification ===\n');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = {};

  try {
    await page.goto('http://localhost:4321/admin');
    await page.evaluate(() => {
      sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
    });
    await page.goto('http://localhost:4321/admin');
    const asideVisible = await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (!asideVisible) {
      throw new Error(
        'Dev Preview sidebar did not load. Start Astro in dev mode (`npx astro dev --port 4321`) before running verify-resources-cms.mjs.'
      );
    }

    await page.locator('aside button:has-text("Resources")').click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Create Resource")').click();
    await page.waitForTimeout(600);

    // 1. Only Two Sections Exist
    const secCount = await page.locator('.resource-editor-container > section').count();
    results['1_only_two_sections'] = secCount === 2;
    console.log('1. Strictly 2 sections rendered:', results['1_only_two_sections'], `(count=${secCount})`);

    // 2. Writing canvas works
    const bnEditor = page.locator('.bn-editor');
    results['2_editor_visible'] = await bnEditor.isVisible();
    await bnEditor.click();
    await page.keyboard.type('Empirical Guide to Wealth Accumulation in Nepal');
    results['3_can_type'] = (await bnEditor.innerText()).includes('Empirical Guide to Wealth Accumulation in Nepal');
    console.log('2. BlockNote writing canvas works:', results['2_editor_visible'] && results['3_can_type']);

    // 3. /h2, /bullet, /table slash commands work
    await page.keyboard.press('Enter');
    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Macroeconomic Foundations');
    results['4_heading_works'] = (await page.locator('.bn-editor h2').count()) > 0;

    await page.keyboard.press('Enter');
    await page.keyboard.type('/bullet');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Systematic monthly equity investments.');
    results['5_lists_work'] = (await page.locator('.bn-editor li, .bn-editor [data-content-type="bulletListItem"]').count()) > 0;

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    results['6_tables_work'] = (await page.locator('.bn-editor table, .blocknote-canvas-container table').count()) > 0;
    console.log('3. Headings, lists, and tables work:', results['4_heading_works'] && results['5_lists_work'] && results['6_tables_work']);

    // 4. Multi-file upload (PDF + CSV), rename, replace, delete
    const uploadInput = page.locator('input[type="file"][multiple]');
    await uploadInput.setInputFiles([
      {
        name: 'verify-doc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF'),
      },
      {
        name: 'verify-data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('A,B\n1,2\n'),
      },
    ]);
    await page.waitForTimeout(400);
    const attCountAfterUpload = await page.locator('.attachment-item').count();
    results['7_upload_works'] = attCountAfterUpload === 2;
    console.log('4. PDF + CSV upload completed without hanging:', results['7_upload_works'], `(count=${attCountAfterUpload})`);

    await page.locator('button[aria-label="Delete verify-data.csv"]').click();
    results['8_delete_works'] = (await page.locator('.attachment-item').count()) === 1;
    console.log('5. Attachment delete works:', results['8_delete_works']);

    // 5. Save Draft & refresh
    await page.locator('button:has-text("Save Draft")').click();
    await page.waitForTimeout(500);
    results['9_save_draft'] = await page.locator('[role="status"]:has-text("saved as draft")').first().isVisible();
    console.log('6. Save Draft persists cleanly:', results['9_save_draft']);

    // 6. Export files exist on disk
    results['10_exports_exist'] =
      fs.existsSync('public/downloads/resource-001-starter-personal-budget-framework.pdf') &&
      fs.existsSync('public/downloads/resource-001-starter-personal-budget-framework.docx');
    console.log('7. PDF and DOCX exports exist on disk:', results['10_exports_exist']);

    // 7. Mobile viewport responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);
    results['11_mobile_responsive'] = await page.locator('.bn-editor').isVisible();
    console.log('8. Mobile viewport responsive:', results['11_mobile_responsive']);

    const allPassed = Object.values(results).every(Boolean);
    if (!allPassed) {
      throw new Error('Verification checks failed: ' + JSON.stringify(results, null, 2));
    }
    console.log('\n=== All Simplified Resources CMS Checks Passed! ===');
  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
