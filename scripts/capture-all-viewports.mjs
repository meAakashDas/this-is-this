import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function capture() {
  const outputDir = path.resolve('public/screenshots/refinement');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const homeBreakpoints = [
    { name: '1440', width: 1440, height: 900 },
    { name: '1280', width: 1280, height: 800 },
    { name: '1024', width: 1024, height: 768 },
    { name: '768', width: 768, height: 1024 },
    { name: '390', width: 390, height: 844 },
    { name: '360', width: 360, height: 780 },
  ];

  for (const bp of homeBreakpoints) {
    // Light
    const ctxL = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const pageL = await ctxL.newPage();
    await pageL.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await pageL.screenshot({
      path: path.join(outputDir, `home-${bp.name}-light.png`),
      fullPage: true,
    });
    await ctxL.close();

    // Dark
    const ctxD = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      colorScheme: 'dark',
      deviceScaleFactor: 2,
    });
    const pageD = await ctxD.newPage();
    await pageD.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await pageD.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await pageD.screenshot({
      path: path.join(outputDir, `home-${bp.name}-dark.png`),
      fullPage: true,
    });
    await ctxD.close();
    console.log(`Captured Homepage at ${bp.name}px (Light & Dark)`);
  }

  // Other pages at 1280 and 390
  const otherPages = [
    { name: 'about', path: '/about' },
    { name: 'resources', path: '/resources' },
    { name: 'resource-detail', path: '/resources/001' },
    { name: 'journal', path: '/journal' },
    { name: 'journal-article', path: '/journal/why-i-believe-in-learning-in-public' },
    { name: 'not-found', path: '/404' },
  ];

  for (const p of otherPages) {
    for (const bp of [
      { name: '1280', width: 1280, height: 800 },
      { name: '390', width: 390, height: 844 },
    ]) {
      // Light
      const ctxL = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        colorScheme: 'light',
        deviceScaleFactor: 2,
      });
      const pageL = await ctxL.newPage();
      await pageL.goto(`http://localhost:4321${p.path}`, { waitUntil: 'networkidle' });
      await pageL.screenshot({
        path: path.join(outputDir, `${p.name}-${bp.name}-light.png`),
        fullPage: true,
      });
      await ctxL.close();

      // Dark
      const ctxD = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        colorScheme: 'dark',
        deviceScaleFactor: 2,
      });
      const pageD = await ctxD.newPage();
      await pageD.goto(`http://localhost:4321${p.path}`, { waitUntil: 'networkidle' });
      await pageD.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
      await pageD.screenshot({
        path: path.join(outputDir, `${p.name}-${bp.name}-dark.png`),
        fullPage: true,
      });
      await ctxD.close();
    }
    console.log(`Captured ${p.name} at 1280px & 390px (Light & Dark)`);
  }

  await browser.close();
  console.log('All viewports captured successfully in public/screenshots/refinement');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
