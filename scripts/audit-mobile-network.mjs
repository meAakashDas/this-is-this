import { chromium } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Small Mobile', width: 360, height: 740 },
  { name: 'iPhone SE/Mini', width: 375, height: 667 },
  { name: 'Standard Mobile', width: 390, height: 844 },
  { name: 'Large Mobile', width: 430, height: 932 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'Tablet/Laptop 1024', width: 1024, height: 768 },
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Large Desktop 1440', width: 1440, height: 900 },
];

const TEST_ROUTES = [
  '/',
  '/about',
  '/resources',
  '/resources/001',
  '/journal',
  '/journal/why-i-believe-in-learning-in-public',
];

async function runMobileAudit() {
  console.log('=== MULTI-VIEWPORT & SLOW NETWORK AUDIT (Simulated Slow 4G/3G) ===\n');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Slow 4G throttle profile: 1.6 Mbps down, 750 kbps up, 150ms latency
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 768,
      hasTouch: vp.width < 768,
    });

    const page = await context.newPage();

    // Use CDP session to apply network emulation
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150, // 150ms RTT
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps
    });

    console.log(`Viewport: ${vp.name} (${vp.width}x${vp.height}) [Slow 4G: 150ms RTT, 1.6Mbps]`);

    for (const route of TEST_ROUTES) {
      const startTime = performance.now();
      const res = await page.goto(`http://localhost:4321${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      const loadTime = Math.round(performance.now() - startTime);

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      const overflow = metrics.scrollWidth > metrics.clientWidth + 1;
      console.log(
        `  ✓ ${route.padEnd(45)} | DOM: ${loadTime}ms | FCP: ${Math.round(metrics.fcp)}ms | Overflow: ${overflow ? 'FAIL' : 'NONE'}`
      );
    }

    await page.close();
    await context.close();
  }

  await browser.close();
  console.log('\n✓ Multi-viewport & slow network audit complete.');
}

runMobileAudit().catch(console.error);
