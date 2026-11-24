import { chromium } from 'playwright';

const viewports = [
  { name: 'Small mobile', width: 320, height: 568 },
  { name: 'Standard mobile', width: 375, height: 812 },
  { name: 'Large mobile', width: 430, height: 932 },
  { name: 'Small tablet', width: 768, height: 1024 },
  { name: 'Large tablet', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Large desktop', width: 1920, height: 1080 }
];

const routes = [
  '/',
  '/about',
  '/resources',
  '/resources/001',
  '/resources/004',
  '/journal',
  '/404'
];

async function runAudit() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const issues = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    for (const r of routes) {
      try {
        await page.goto(`http://localhost:4321${r}`, { waitUntil: 'networkidle' });

        const check = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const bodyWidth = document.body.scrollWidth;
          const hasOverflow = docWidth > winWidth || bodyWidth > winWidth;
          
          // Check for elements overflowing viewport
          let overflowingElements = [];
          if (hasOverflow) {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 1) {
                overflowingElements.push({
                  tag: el.tagName,
                  className: el.className,
                  id: el.id,
                  right: rect.right,
                  winWidth
                });
                if (overflowingElements.length >= 5) break;
              }
            }
          }

          // Check interactive touch target sizes (< 36px on mobile viewports)
          let smallTouchTargets = [];
          if (winWidth <= 430) {
            const interactives = Array.from(document.querySelectorAll('button, a, input'));
            for (const el of interactives) {
              const rect = el.getBoundingClientRect();
              // Ignore hidden or 0-size elements
              if (rect.width > 0 && rect.height > 0) {
                if (rect.height < 32 || rect.width < 32) {
                  // Only report if it's visible in flow
                  const style = window.getComputedStyle(el);
                  if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    smallTouchTargets.push({
                      tag: el.tagName,
                      text: (el.textContent || '').trim().slice(0, 20),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                      className: el.className
                    });
                  }
                }
              }
            }
          }

          return {
            docWidth,
            winWidth,
            hasOverflow,
            overflowingElements,
            smallTouchTargets
          };
        });

        if (check.hasOverflow) {
          issues.push({
            type: 'HORIZONTAL_OVERFLOW',
            viewport: vp.name,
            dimensions: `${vp.width}x${vp.height}`,
            route: r,
            details: check
          });
        }
      } catch (err) {
        issues.push({
          type: 'LOAD_ERROR',
          viewport: vp.name,
          route: r,
          error: err.message
        });
      }
    }
    await context.close();
  }

  await browser.close();

  console.log(`\n=== RESPONSIVE AUDIT RESULTS ===`);
  console.log(`Audited ${viewports.length} viewports across ${routes.length} routes (${viewports.length * routes.length} total states)`);
  if (issues.length === 0) {
    console.log('✅ ZERO horizontal overflow issues detected across all viewports and routes!');
  } else {
    console.log(`⚠️ Detected ${issues.length} issues:`);
    console.log(JSON.stringify(issues, null, 2));
  }
}

runAudit();
