import { chromium } from 'playwright';

async function capturePdfPage3() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });

  await page.goto('http://localhost:4321/downloads/resource-002-nepal-banking-account-checklist.pdf', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1000);

  // Scroll to bottom of PDF viewer
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'public/screenshots/refinement/pdf-rendered-page-3.png' });
  await browser.close();
  console.log('PDF Page 3 captured!');
}

capturePdfPage3().catch(console.error);
