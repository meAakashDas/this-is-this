import { chromium } from '@playwright/test';

const ROUTES = [
  { name: 'Homepage', path: '/' },
  { name: 'About Page', path: '/about' },
  { name: 'Resources Catalog', path: '/resources' },
  { name: 'Resource #001 Detail', path: '/resources/001' },
  { name: 'Resource #002 Detail', path: '/resources/002' },
  { name: 'Resource #003 Detail', path: '/resources/003' },
  { name: 'Resource #004 (Draft/404)', path: '/resources/004' },
  { name: 'Journal Index', path: '/journal' },
  { name: 'Journal Article 1', path: '/journal/why-i-believe-in-learning-in-public' },
  { name: 'Journal Article 2', path: '/journal/building-something-that-matters' },
  { name: 'Journal Article 3', path: '/journal/where-finance-meets-technology' },
  { name: 'Journal Article 4', path: '/journal/the-value-of-being-a-beginner' },
  { name: '404 Page', path: '/404' },
];

const VIEWPORTS = [
  { name: 'Desktop (1280px)', width: 1280, height: 800, isMobile: false },
  { name: 'Mobile (390px)', width: 390, height: 844, isMobile: true },
];

async function runAudit() {
  console.log('=== RISEPAISA PERFORMANCE & INTERACTION AUDIT ===\n');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Viewport: ${vp.name} ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      let totalBytes = 0;
      let requestCount = 0;

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('requestfailed', (req) => {
        // Ignore expected 404 on draft 004 or 404 page
        if (!route.path.includes('004') && !route.path.includes('404')) {
          failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
        }
      });

      page.on('response', async (res) => {
        requestCount++;
        try {
          const buffer = await res.body();
          totalBytes += buffer.length;
        } catch (_) {}
      });

      // Inject performance observers before navigation
      await page.addInitScript(() => {
        window.__perfMetrics = {
          fcp: 0,
          lcp: 0,
          cls: 0,
        };

        try {
          const po = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                window.__perfMetrics.fcp = entry.startTime;
              }
            }
          });
          po.observe({ type: 'paint', buffered: true });

          const lpo = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
            }
          });
          lpo.observe({ type: 'largest-contentful-paint', buffered: true });

          let clsValue = 0;
          const cpo = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                window.__perfMetrics.cls = clsValue;
              }
            }
          });
          cpo.observe({ type: 'layout-shift', buffered: true });
        } catch (_) {}
      });

      const startTime = performance.now();
      const response = await page.goto(`http://localhost:4321${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });
      const navDuration = performance.now() - startTime;

      // Extract Navigation Timings & Web Vitals
      const perfData = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          ttfb: nav ? nav.responseStart - nav.requestStart : 0,
          domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
          loadEvent: nav ? nav.loadEventEnd - nav.startTime : 0,
          fcp: window.__perfMetrics?.fcp || 0,
          lcp: window.__perfMetrics?.lcp || 0,
          cls: window.__perfMetrics?.cls || 0,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      // Test real interactions
      let interactionStatus = 'OK';

      // 1. Theme toggle test
      try {
        const themeBtn = page.locator('#theme-toggle-btn');
        if (await themeBtn.isVisible()) {
          await themeBtn.click();
          await page.waitForTimeout(50);
          await themeBtn.click();
        }
      } catch (e) {
        interactionStatus = `Theme toggle error: ${e.message}`;
      }

      // 2. Search / Finder test (if on homepage or resources)
      if (route.path === '/' || route.path === '/resources') {
        try {
          const finderInput = page.locator('input[type="text"]').first();
          if (await finderInput.isVisible()) {
            await finderInput.fill('001');
            await page.waitForTimeout(50);
          }
        } catch (e) {
          interactionStatus = `Finder error: ${e.message}`;
        }
      }

      // 3. Mobile menu toggle (if mobile)
      if (vp.isMobile) {
        try {
          const menuBtn = page.locator('#mobile-nav-toggle');
          if (await menuBtn.isVisible()) {
            await menuBtn.click();
            await page.waitForTimeout(50);
            await menuBtn.click();
          }
        } catch (e) {
          interactionStatus = `Mobile menu error: ${e.message}`;
        }
      }

      // 4. Scroll test
      const hasHorizontalOverflow = perfData.scrollWidth > perfData.clientWidth + 1;

      const record = {
        viewport: vp.name,
        route: route.name,
        path: route.path,
        status: response?.status() || 0,
        ttfb: Math.round(perfData.ttfb),
        domContentLoaded: Math.round(perfData.domContentLoaded),
        loadDuration: Math.round(navDuration),
        fcp: Math.round(perfData.fcp),
        lcp: Math.round(perfData.lcp),
        cls: Number(perfData.cls.toFixed(4)),
        totalBytesKB: Number((totalBytes / 1024).toFixed(1)),
        requestCount,
        hasHorizontalOverflow,
        consoleErrorsCount: consoleErrors.length,
        consoleErrors,
        failedRequestsCount: failedRequests.length,
        failedRequests,
        interactionStatus,
      };

      results.push(record);

      const statusBadge = record.status === 200 || (record.status === 404 && (route.path.includes('004') || route.path.includes('404'))) ? '✓' : '✗';
      console.log(
        `  ${statusBadge} ${route.name.padEnd(25)} | HTTP ${record.status} | FCP: ${record.fcp}ms | LCP: ${record.lcp}ms | CLS: ${record.cls} | Size: ${record.totalBytesKB}KB | Req: ${record.requestCount} | Err: ${record.consoleErrorsCount}`
      );

      await page.close();
    }

    await context.close();
  }

  await browser.close();

  import('fs').then((fs) => {
    fs.writeFileSync('scripts/audit-results-optimized.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Optimized audit results saved to scripts/audit-results-optimized.json');
  });
}

runAudit().catch(console.error);
