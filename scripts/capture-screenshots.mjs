import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function capture() {
  const outputDir = path.resolve('public/screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const routes = [
    { name: 'home', path: '/' },
    { name: 'about', path: '/about' },
    { name: 'resources', path: '/resources' },
    { name: 'resource-detail', path: '/resources/001' },
    { name: 'journal', path: '/journal' },
    { name: 'not-found', path: '/404' },
  ];

  for (const r of routes) {
    // Desktop Light
    const dLight = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const p1 = await dLight.newPage();
    await p1.goto(`http://localhost:4321${r.path}`, {
      waitUntil: 'networkidle',
    });
    await p1.screenshot({
      path: path.join(outputDir, `${r.name}-desktop-light.png`),
      fullPage: true,
    });
    await dLight.close();

    // Desktop Dark
    const dDark = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: 'dark',
      deviceScaleFactor: 2,
    });
    const p2 = await dDark.newPage();
    await p2.goto(`http://localhost:4321${r.path}`, {
      waitUntil: 'networkidle',
    });
    await p2.screenshot({
      path: path.join(outputDir, `${r.name}-desktop-dark.png`),
      fullPage: true,
    });
    await dDark.close();

    // Mobile Light
    const mLight = await browser.newContext({
      viewport: { width: 375, height: 812 },
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    const p3 = await mLight.newPage();
    await p3.goto(`http://localhost:4321${r.path}`, {
      waitUntil: 'networkidle',
    });
    await p3.screenshot({
      path: path.join(outputDir, `${r.name}-mobile-light.png`),
      fullPage: true,
    });
    await mLight.close();

    // Mobile Dark
    const mDark = await browser.newContext({
      viewport: { width: 375, height: 812 },
      colorScheme: 'dark',
      deviceScaleFactor: 2,
    });
    const p4 = await mDark.newPage();
    await p4.goto(`http://localhost:4321${r.path}`, {
      waitUntil: 'networkidle',
    });
    await p4.screenshot({
      path: path.join(outputDir, `${r.name}-mobile-dark.png`),
      fullPage: true,
    });
    await mDark.close();

    console.log(`Captured all viewports for ${r.name}`);
  }

  // Also maintain the root desktop-light/dark aliases for compatibility
  fs.copyFileSync(
    path.join(outputDir, 'home-desktop-light.png'),
    path.join(outputDir, 'desktop-light.png')
  );
  fs.copyFileSync(
    path.join(outputDir, 'home-desktop-dark.png'),
    path.join(outputDir, 'desktop-dark.png')
  );
  fs.copyFileSync(
    path.join(outputDir, 'home-mobile-light.png'),
    path.join(outputDir, 'mobile-light.png')
  );
  fs.copyFileSync(
    path.join(outputDir, 'home-mobile-dark.png'),
    path.join(outputDir, 'mobile-dark.png')
  );

  await browser.close();
  console.log('All internal pages captured successfully.');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
