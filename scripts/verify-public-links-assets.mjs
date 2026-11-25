import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/resources',
  '/resources/001',
  '/resources/002',
  '/resources/003',
  '/journal',
  '/journal/why-i-believe-in-learning-in-public',
  '/journal/building-something-that-matters',
  '/journal/where-finance-meets-technology',
  '/journal/the-value-of-being-a-beginner',
];

const NOT_FOUND_ROUTES = [
  '/404',
  '/resources/004',
  '/resources/999',
  '/journal/non-existent-article',
  '/random-missing-page',
];

async function verifyPublicLinksAndAssets() {
  console.log('=================================================================');
  console.log('   VERIFYING PUBLIC PAGES, ASSETS, AND NAVIGATION LINKS');
  console.log('=================================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    // Ignore expected 404 browser logs when testing 404 routes
    if (text.includes('the server responded with a status of 404') || text.includes('404')) return;
    if (msg.type() === 'error') {
      errors.push(`[Console Error on ${page.url()}]: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`[Page Crash on ${page.url()}]: ${err.message}`);
  });

  try {
    // 1. Verify standard public routes
    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      const status = response ? response.status() : 0;
      if (status !== 200 && status !== 304) {
        errors.push(`Route ${route} returned status ${status} (expected 200)`);
      }

      // Check title
      const title = await page.title();
      if (!title || !title.includes('Aakash Das')) {
        errors.push(`Route ${route} has unexpected title: "${title}"`);
      }

      // Check canonical link
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      if (!canonical || !canonical.startsWith('https://aakashdas.live')) {
        errors.push(`Route ${route} has invalid canonical: "${canonical}"`);
      }

      // Check all images
      const images = await page.locator('img').all();
      for (const img of images) {
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');
        if (!src) {
          errors.push(`Image on ${route} missing src attribute`);
        }
        if (alt === null) {
          warnings.push(`Image ${src} on ${route} missing alt attribute`);
        }
      }

      // Check all internal anchor tags
      const links = await page.locator('a[href]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (!href) continue;
        if (href.startsWith('javascript:')) {
          errors.push(`Dangerous javascript: link found on ${route}: ${href}`);
        }
      }

      console.log(`  ✓ Route ${route.padEnd(45)} -> HTTP ${status} | Title: "${title.slice(0, 30)}..." | Canonical: OK`);
    }

    // 2. Verify 404 handling on draft / non-existent routes
    console.log('\n--- Verifying Draft Isolation & 404 Handlers ---');
    for (const route of NOT_FOUND_ROUTES) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      const status = response ? response.status() : 0;
      const text = await page.content();
      const has404 = status === 404 || text.includes('404') || text.includes('Not Found') || text.includes('Not Available');
      if (!has404) {
        errors.push(`Route ${route} did not return 404 (status: ${status})`);
      } else {
        console.log(`  ✓ Route ${route.padEnd(45)} -> Correctly rendered 404 / Not Found`);
      }
    }

    // 3. Verify Downloadable Resources on /resources/001, 002, 003
    console.log('\n--- Verifying Download Links & Attachments on Public Resource Pages ---');
    for (const num of ['001', '002', '003']) {
      await page.goto(`${BASE_URL}/resources/${num}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Find all download buttons/links
      const downloadLinks = await page.locator('a[download], a[href*="/downloads/"]').all();
      console.log(`  ✓ Resource ${num} has ${downloadLinks.length} download links`);

      for (const dl of downloadLinks) {
        const href = await dl.getAttribute('href');
        if (href) {
          const cleanPath = href.split('?')[0].replace(/^\//, '');
          const localFilePath = path.join(process.cwd(), 'public', cleanPath);
          const exists = fs.existsSync(localFilePath);
          if (!exists) {
            errors.push(`Download link on resource ${num} points to missing file: ${href} (checked ${localFilePath})`);
          } else {
            const stats = fs.statSync(localFilePath);
            if (stats.size === 0) {
              errors.push(`Download file ${localFilePath} is 0 bytes!`);
            }
          }
        }
      }
    }

    console.log('\n=================================================================');
    console.log('   AUDIT SUMMARY');
    console.log('=================================================================');
    console.log(`Errors found: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((e) => console.error('  ERROR:', e));
    }
    console.log(`Warnings found: ${warnings.length}`);
    if (warnings.length > 0) {
      warnings.forEach((w) => console.warn('  WARN:', w));
    }

    if (errors.length === 0) {
      console.log('✓ All public routes, canonical URLs, images, and download assets verified successfully!');
    } else {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

verifyPublicLinksAndAssets().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
