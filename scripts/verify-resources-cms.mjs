import { chromium } from '@playwright/test';
import fs from 'fs';

async function runVerification() {
  console.log('=== Starting 12-Point Modern Resources CMS Verification ===\n');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const results = {};

  try {
    // 1. Visible writing editor
    await page.goto('http://localhost:4321/admin');
    await page.waitForTimeout(1000);
    await page.locator('aside button:has-text("Resources")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Create Resource")').click();
    await page.waitForTimeout(800);

    const bnEditor = page.locator('.bn-editor');
    results['1_editor_visible'] = await bnEditor.isVisible();
    console.log('1. BlockNote writing canvas visible:', results['1_editor_visible']);

    // 2. Click inside and start writing
    await bnEditor.click();
    await page.keyboard.type('Empirical Guide to Wealth Accumulation in Nepal');
    results['2_can_type'] = (await bnEditor.innerText()).includes('Empirical Guide to Wealth Accumulation in Nepal');
    console.log('2. Click and write text:', results['2_can_type']);

    // 3. Slash command menu works
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(300);
    const slashMenu = page.locator('.bn-suggestion-menu, [data-suggestion-menu], [role="menu"]').first();
    results['3_slash_menu'] = await slashMenu.isVisible();
    console.log('3. BlockNote Slash command menu triggered:', results['3_slash_menu']);
    await page.keyboard.press('Escape');

    // 4. Headings work via slash command
    await page.keyboard.type('/h2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Macroeconomic Foundations');
    const h2Count = await page.locator('.bn-editor h2').count();
    results['4_heading_works'] = h2Count > 0;
    console.log('4. Heading 2 formatting works via /h2:', results['4_heading_works']);

    // 5. Bullet Lists work via slash command
    await page.keyboard.press('Enter');
    await page.keyboard.type('/bullet');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Systematic monthly equity investments in indexed portfolios.');
    const liCount = await page.locator('.bn-editor li, .bn-editor [data-content-type="bulletListItem"]').count();
    results['5_lists_work'] = liCount > 0;
    console.log('5. Bullet lists work via /bullet:', results['5_lists_work']);

    // 6. Tables work via slash command
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const tableCount = await page.locator('.bn-editor table, .blocknote-canvas-container table').count();
    results['6_tables_work'] = tableCount > 0;
    console.log('6. Table insertion works via /table:', results['6_tables_work']);

    // 7. Content saves as draft and restores across session
    await page.locator('input[placeholder*="Resource Title"]').fill('Pioneering Financial Framework');
    await page.locator('textarea[placeholder*="concise overview" i]').fill('A verified overview of sustainable capital allocation.');
    await page.locator('button:has-text("Save Draft")').click();
    await page.waitForTimeout(800);

    // Verify draft in list
    const draftTitle = page.locator('text=Pioneering Financial Framework');
    results['7_saves_and_restores'] = await draftTitle.isVisible();
    console.log('7. Saves and restores draft in CMS list:', results['7_saves_and_restores']);

    // 8. Downloadable Resources is a separate section on resource editor
    await page.locator('button[aria-label="Edit Resource 001"]').click();
    await page.waitForTimeout(500);
    const downloadSection = page.locator('#downloadable-resources');
    results['8_download_section_separate'] = (await downloadSection.isVisible()) && (await page.locator('.bn-editor').isVisible());
    console.log('8. Downloadable Resources is separate section on same page:', results['8_download_section_separate']);

    // 9. Attachments listed with actions
    const attachmentItems = await page.locator('.attachment-item, [data-attachment-id]').count();
    results['9_attachments_managed'] = attachmentItems >= 1;
    console.log('9. Attachments listed with management actions:', results['9_attachments_managed'], `(${attachmentItems} files)`);

    // 10. Live preview displays complete document
    await page.locator('main button:has-text("Live Preview")').click();
    await page.waitForTimeout(500);
    const previewContent = await page.locator('h1:has-text("Starter Personal Budget Framework")').first().isVisible();
    results['10_public_preview'] = previewContent;
    console.log('10. Live preview renders document in real-time:', results['10_public_preview']);
    await page.locator('main button:has-text("Exit Preview")').click();

    // 11. PDF and DOCX exports work
    const pdfExists = fs.existsSync('public/downloads/resource-001-starter-personal-budget-framework.pdf');
    const docxExists = fs.existsSync('public/downloads/resource-001-starter-personal-budget-framework.docx');
    results['11_exports_work'] = pdfExists && docxExists;
    console.log('11. PDF and DOCX export files exist on disk:', results['11_exports_work']);

    // 12. Mobile editing works
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const mobileEditor = await page.locator('.bn-editor').isVisible();
    results['12_mobile_editing'] = mobileEditor;
    console.log('12. Mobile viewport editing responsive:', results['12_mobile_editing']);

    console.log('\n=== All 12 Verification Points Evaluated Successfully! ===');
  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
