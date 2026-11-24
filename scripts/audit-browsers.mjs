import { chromium, webkit, firefox } from 'playwright';

async function testEngine(name, launcher, launchOpts = {}) {
  console.log(`\n--- Testing ${name} ---`);
  let browser;
  try {
    browser = await launcher.launch(launchOpts);
  } catch (e) {
    console.error(`Failed to launch ${name}:`, e.message);
    return { name, passed: false, error: e.message };
  }

  const results = [];
  try {
    // 1. Desktop Light Context
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: 'light',
    });
    const page = await context.newPage();

    // Check console errors
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // A. Homepage & Header
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    const homeTitle = await page.title();
    const hasHeader = await page.locator('.site-header').isVisible();
    const bgToken = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    results.push({
      test: 'Homepage loads with valid title & header',
      ok: homeTitle.includes('Aakash Das') && hasHeader,
    });

    // B. Navigation
    await page.click('nav.desktop-nav a[href="/about"]');
    await page.waitForURL('**/about');
    const aboutTitle = await page.locator('main h1').textContent();
    results.push({
      test: 'Navigation to /about works smoothly',
      ok: aboutTitle.includes('Aakash Das'),
    });

    // C. Resource Finder interaction
    await page.goto('http://localhost:4321/resources', {
      waitUntil: 'networkidle',
    });
    const finderInput = page.locator('#library-input');
    await finderInput.fill('1');
    await page.click('#library-submit-btn');
    await page.waitForURL('**/resources/001');
    const resourceNum = await page.locator('.resource-num-badge').textContent();
    results.push({
      test: 'Resource finder auto-pads single digit and navigates to /resources/001',
      ok: resourceNum.includes('001'),
    });

    // D. PDF Preview Toggle
    const toggleBtn = page.locator('#toggle-pdf-preview-btn');
    const viewer = page.locator('#pdf-viewer-frame');
    if ((await toggleBtn.count()) > 0) {
      await toggleBtn.click();
      const isHidden = await viewer.evaluate(
        (el) => window.getComputedStyle(el).display === 'none'
      );
      await toggleBtn.click();
      const isVisible = await viewer.evaluate(
        (el) => window.getComputedStyle(el).display !== 'none'
      );
      results.push({
        test: 'PDF preview collapses and expands cleanly',
        ok: isHidden && isVisible,
      });
    }

    // E. Dark mode CSS application
    await context.close();
    const darkContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: 'dark',
    });
    const darkPage = await darkContext.newPage();
    await darkPage.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    const darkBg = await darkPage.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    const isLightNeutral =
      darkBg.includes('245, 245, 242') ||
      darkBg.includes('F5F5F2') ||
      darkBg.startsWith('rgb(245');
    results.push({
      test: 'Cohesive warm neutral light palette applied consistently',
      ok: isLightNeutral,
    });
    await darkContext.close();

    results.push({
      test: 'Zero unhandled console or page errors',
      ok: consoleErrors.length === 0,
    });
  } catch (err) {
    results.push({
      test: 'Browser test suite execution',
      ok: false,
      error: err.message,
    });
  } finally {
    await browser.close();
  }

  const allPassed = results.every((r) => r.ok);
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.test} ${r.error ? `(${r.error})` : ''}`);
  }
  return { name, passed: allPassed, results };
}

async function runBrowserAudit() {
  console.log('=== MULTI-BROWSER COMPATIBILITY AUDIT ===');
  const chromeRes = await testEngine('Google Chrome', chromium, {
    channel: 'chrome',
  });
  const safariRes = await testEngine('Safari (WebKit)', webkit);
  const firefoxRes = await testEngine('Mozilla Firefox', firefox);

  console.log('\n=== SUMMARY ===');
  console.log(`Google Chrome:   ${chromeRes.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Safari (WebKit): ${safariRes.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Mozilla Firefox: ${firefoxRes.passed ? 'PASSED' : 'FAILED'}`);
}

runBrowserAudit();
