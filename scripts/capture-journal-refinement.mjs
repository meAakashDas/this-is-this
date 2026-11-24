import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const targets = [
    { name: 'journal-desktop', url: 'http://localhost:4321/journal', width: 1280, height: 900 },
    { name: 'journal-mobile', url: 'http://localhost:4321/journal', width: 390, height: 844 },
    { name: 'journal-article-desktop', url: 'http://localhost:4321/journal/why-i-believe-in-learning-in-public', width: 1280, height: 900 },
    { name: 'journal-article-mobile', url: 'http://localhost:4321/journal/why-i-believe-in-learning-in-public', width: 390, height: 844 },
  ];

  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.width, height: t.height } });
    await page.goto(t.url, { waitUntil: 'networkidle' });

    // Light mode screenshot
    await page.screenshot({ path: `public/screenshots/refinement/${t.name}-light.png`, fullPage: false });

    // Dark mode screenshot
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `public/screenshots/refinement/${t.name}-dark.png`, fullPage: false });

    await page.close();
  }

  await browser.close();
  console.log('Journal screenshots captured successfully!');
}

capture().catch(console.error);
