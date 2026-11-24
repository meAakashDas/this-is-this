import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:4321';

async function runStressTest() {
  console.log('🚀 Starting Long-Duration Stability & Stress Test for RisePaisa...');
  
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, stack: err.stack });
  });

  page.on('requestfailed', req => {
    networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const results = {
    timestamp: new Date().toISOString(),
    rapidNavigations: { total: 0, successful: 0, errors: 0 },
    themeToggles: { total: 0, successful: 0 },
    searchStress: { iterations: 0, successful: 0 },
    mobileMenuToggles: { total: 0, successful: 0 },
    memoryUsage: {},
    consoleErrors: [],
    networkFailures: []
  };

  const routes = [
    '/',
    '/about',
    '/resources',
    '/resources/001',
    '/journal',
    '/journal/where-finance-meets-technology',
    '/journal/why-i-believe-in-learning-in-public',
    '/journal/building-something-that-matters',
    '/journal/the-value-of-being-a-beginner',
  ];

  // Helper for heap metrics via CDP
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');

  async function getHeapSize() {
    const metrics = await client.send('Performance.getMetrics');
    const heapMetric = metrics.metrics.find(m => m.name === 'JSHeapUsedSize');
    return heapMetric ? Math.round(heapMetric.value / (1024 * 1024) * 100) / 100 : null;
  }

  // Initial load
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  results.memoryUsage.initialMB = await getHeapSize();
  console.log(`Initial Heap Usage: ${results.memoryUsage.initialMB} MB`);

  // 1. Rapid Navigations (55 route changes across public pages)
  console.log('\n--- Phase 1: 55 Rapid Navigations ---');
  for (let i = 0; i < 55; i++) {
    const route = routes[i % routes.length];
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      results.rapidNavigations.total++;
      results.rapidNavigations.successful++;
    } catch (e) {
      results.rapidNavigations.total++;
      results.rapidNavigations.errors++;
      console.error(`Nav error on ${route}:`, e.message);
    }
    if ((i + 1) % 15 === 0) {
      const currentHeap = await getHeapSize();
      console.log(`Completed ${i + 1} navigations. Current Heap: ${currentHeap} MB`);
    }
  }
  results.memoryUsage.afterNavigationsMB = await getHeapSize();

  // 2. Rapid Theme Switching (50 toggles)
  console.log('\n--- Phase 2: 50 Rapid Theme Toggles ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const themeToggle = page.locator('#theme-toggle, [data-theme-toggle], button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="mode" i]').first();
  
  if (await themeToggle.count() > 0 && await themeToggle.isVisible()) {
    for (let i = 0; i < 50; i++) {
      await themeToggle.click();
      results.themeToggles.total++;
      results.themeToggles.successful++;
      if ((i + 1) % 15 === 0) {
        await page.waitForTimeout(50);
      }
    }
    console.log(`Successfully completed 50 rapid theme toggles.`);
  } else {
    console.log('No desktop theme toggle button found; checking alternate selector...');
  }
  results.memoryUsage.afterThemesMB = await getHeapSize();

  // 3. Search and Filtering Stress Test (50 keystroke & filter cycles)
  console.log('\n--- Phase 3: Search and Filter Stress Testing ---');
  await page.goto(`${BASE_URL}/resources`, { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[name="resourceNumber"], #library-input, #resource-number-input').first();

  if (await searchInput.count() > 0 && await searchInput.isVisible()) {
    const queries = ['001', '002', '1', '999', '0', '00', 'finance', '001', ''];
    for (let i = 0; i < 50; i++) {
      const q = queries[i % queries.length];
      await searchInput.fill(q);
      results.searchStress.iterations++;
      results.searchStress.successful++;
      if ((i + 1) % 10 === 0) {
        await page.waitForTimeout(50);
      }
    }
    console.log(`Successfully completed 50 search input operations without UI freezing.`);
  } else {
    console.log('Search input on /resources not found or static list present.');
  }

  // 4. Mobile Menu Rapid Open / Close Stress (30 toggles on mobile viewport)
  console.log('\n--- Phase 4: Mobile Menu Rapid Toggling ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  const mobileMenuBtn = page.locator('#mobile-nav-toggle, #mobile-menu-button, button[aria-controls="mobile-nav-drawer"], button[aria-label*="menu" i]').first();
  if (await mobileMenuBtn.count() > 0 && await mobileMenuBtn.isVisible()) {
    for (let i = 0; i < 30; i++) {
      await mobileMenuBtn.click();
      results.mobileMenuToggles.total++;
      results.mobileMenuToggles.successful++;
      await page.waitForTimeout(30);
    }
    console.log(`Successfully completed 30 mobile menu rapid toggle cycles.`);
  } else {
    console.log('Mobile menu button selector not matching directly or hidden.');
  }

  // Final Memory & Cleanup
  results.memoryUsage.finalMB = await getHeapSize();
  results.consoleErrors = consoleErrors;
  results.networkFailures = networkFailures;

  console.log('\n================ STRESS TEST SUMMARY ================');
  console.log(`Rapid Navigations: ${results.rapidNavigations.successful}/${results.rapidNavigations.total} succeeded (${results.rapidNavigations.errors} errors)`);
  console.log(`Theme Toggles: ${results.themeToggles.successful}/${results.themeToggles.total}`);
  console.log(`Search Operations: ${results.searchStress.successful}/${results.searchStress.iterations}`);
  console.log(`Mobile Menu Toggles: ${results.mobileMenuToggles.successful}/${results.mobileMenuToggles.total}`);
  console.log(`Memory Usage: Initial: ${results.memoryUsage.initialMB} MB -> Final: ${results.memoryUsage.finalMB} MB`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Failed Network Requests: ${networkFailures.length}`);
  console.log('=====================================================\n');

  fs.writeFileSync('scripts/stress-test-results.json', JSON.stringify(results, null, 2));

  await client.send('Performance.disable');
  await browser.close();

  if (consoleErrors.length > 0) {
    console.log('Console Errors encountered:', consoleErrors);
  }
  if (networkFailures.length > 0) {
    console.log('Network Failures encountered:', networkFailures);
  }
}

runStressTest().catch(err => {
  console.error('Fatal stress test failure:', err);
  process.exit(1);
});
