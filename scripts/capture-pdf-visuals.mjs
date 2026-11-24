import { chromium } from 'playwright';

async function capturePdfVisuals() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });

  await page.goto('http://localhost:4321/downloads/resource-002-nepal-banking-account-checklist.pdf', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'public/screenshots/refinement/pdf-rendered-page-1.png' });
  await browser.close();
  console.log('PDF screenshot captured!');
}

capturePdfVisuals().catch(console.error);
