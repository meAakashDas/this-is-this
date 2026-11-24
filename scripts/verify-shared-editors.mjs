import { chromium } from '@playwright/test';

async function verifySharedEditors() {
  console.log('=== Starting Verification of Shared BlockNote Editors: Resources & Journal ===\n');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    // -------------------------------------------------------------
    // PART 1: RESOURCES CMS VERIFICATION
    // -------------------------------------------------------------
    console.log('--- 1. Testing Resources CMS Editor ---');
    await page.goto('http://localhost:4321/admin');
    await page.waitForTimeout(1000);
    await page.locator('aside button:has-text("Resources")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Create Resource")').click();
    await page.waitForTimeout(800);

    const resEditorVisible = await page.locator('.bn-editor').isVisible();
    const resDownloadsVisible = await page.locator('#downloadable-resources').isVisible();
    console.log('Resources: BlockNote canvas visible:', resEditorVisible);
    console.log('Resources: Separate Downloadable section visible:', resDownloadsVisible);

    await page.locator('.bn-editor').click();
    await page.keyboard.type('Resources Shared Editor Test');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(300);
    const resSlashVisible = await page.locator('.bn-suggestion-menu, [data-suggestion-menu], [role="menu"]').first().isVisible();
    console.log('Resources: Slash command menu triggered:', resSlashVisible);
    await page.keyboard.press('Escape');

    // -------------------------------------------------------------
    // PART 2: JOURNAL CMS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Journal CMS Editor ---');
    const resCancel = page.locator('button:has-text("Cancel")');
    if (await resCancel.isVisible()) {
      await resCancel.click();
      await page.waitForTimeout(500);
    }
    await page.locator('aside button:has-text("Journal")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Create Article")').click();
    await page.waitForTimeout(800);

    const journalEditorVisible = await page.locator('.bn-editor').isVisible();
    console.log('Journal: Shared BlockNote canvas visible:', journalEditorVisible);

    // Type and test formatting in Journal
    await page.locator('.bn-editor').click();
    await page.keyboard.type('Empirical Analysis of Macro Factors in Nepal');
    await page.keyboard.press('Enter');
    await page.keyboard.type('An inquiry into structural inflation and monetary policy.');

    // Test Slash command in Journal
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(300);
    const journalSlashVisible = await page.locator('.bn-suggestion-menu, [data-suggestion-menu], [role="menu"]').first().isVisible();
    console.log('Journal: Slash command menu triggered:', journalSlashVisible);
    await page.keyboard.press('Escape');

    // Test Table in Journal
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const tableVisible = await page.locator('.bn-editor table, .blocknote-canvas-container table').count() > 0;
    console.log('Journal: Table insertion verified:', tableVisible);

    // Test Nepali Unicode in Journal
    await page.keyboard.press('Enter');
    await page.keyboard.type('नेपालको अर्थतन्त्र र लगानी');
    const nepaliText = await page.locator('.bn-editor').innerText();
    const nepaliOk = nepaliText.includes('नेपालको अर्थतन्त्र');
    console.log('Journal: Nepali Unicode rendered cleanly:', nepaliOk);

    console.log('\n=== Shared BlockNote Editor Verification Complete across Resources & Journal ===');
  } finally {
    await browser.close();
  }
}

verifySharedEditors().catch((err) => {
  console.error('Shared editor verification failed:', err);
  process.exit(1);
});
