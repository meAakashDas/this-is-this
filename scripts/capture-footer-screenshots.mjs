import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  
  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

    // Scroll to footer
    const footer = page.locator('footer.site-footer');
    await footer.scrollIntoViewIfNeeded();

    // Capture Light Mode
    await footer.screenshot({ path: `public/screenshots/refinement/footer-${vp.name}-light.png` });

    // Switch to Dark Mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(100);

    // Capture Dark Mode
    await footer.screenshot({ path: `public/screenshots/refinement/footer-${vp.name}-dark.png` });

    await page.close();
  }

  await browser.close();
  console.log('Footer screenshots captured successfully!');
}

capture().catch(console.error);
