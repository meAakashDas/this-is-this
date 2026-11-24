import { test, expect } from '@playwright/test';

test.describe('Brand Identity — Favicon, Browser Title & URL Architecture', () => {
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/resources', name: 'Resources' },
    { path: '/resources/001', name: 'Resource Detail 001' },
    { path: '/resources/002', name: 'Resource Detail 002' },
    { path: '/resources/003', name: 'Resource Detail 003' },
    { path: '/resources/004', name: 'Resource Detail 004' },
    { path: '/journal', name: 'Journal' },
    { path: '/journal/why-i-believe-in-learning-in-public', name: 'Journal Article' },
    { path: '/404', name: '404 Page' },
  ];

  for (const route of routes) {
    test(`Route ${route.path} (${route.name}) has strictly "Aakash Das" document title`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveTitle('Aakash Das');
    });

    test(`Route ${route.path} has clean canonical URL and OpenGraph metadata`, async ({ page }) => {
      await page.goto(route.path);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const canonicalHref = await canonical.getAttribute('href');

      if (route.path === '/') {
        expect(canonicalHref).toBe('https://aakashdas.live/');
      } else {
        expect(canonicalHref).toBe(`https://aakashdas.live${route.path}`);
      }

      // Open Graph Tags
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute('content', canonicalHref || '');

      const ogSiteName = page.locator('meta[property="og:site_name"]');
      await expect(ogSiteName).toHaveAttribute('content', 'Aakash Das');

      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveAttribute('content', /https:\/\/aakashdas\.live\/images\/.+/);
    });
  }

  test('Favicon link tags are present in <head>', async ({ page }) => {
    await page.goto('/');

    const svgIcon = page.locator('link[rel="icon"][type="image/svg+xml"]');
    await expect(svgIcon).toHaveAttribute('href', /\/favicon\.svg/);

    const icon32 = page.locator('link[rel="icon"][sizes="32x32"]');
    await expect(icon32).toHaveAttribute('href', /\/favicon-32x32\.png/);

    const icon16 = page.locator('link[rel="icon"][sizes="16x16"]');
    await expect(icon16).toHaveAttribute('href', /\/favicon-16x16\.png/);

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', /\/apple-touch-icon\.png/);

    const shortcutIcon = page.locator('link[rel="shortcut icon"]');
    await expect(shortcutIcon).toHaveAttribute('href', /\/favicon\.ico/);
  });

  test('All favicon assets return HTTP 200', async ({ request }) => {
    const assets = [
      '/favicon.svg',
      '/favicon-32x32.png',
      '/favicon-16x16.png',
      '/apple-touch-icon.png',
      '/favicon.ico',
    ];

    for (const asset of assets) {
      const res = await request.get(asset);
      expect(res.status(), `Asset ${asset} should return HTTP 200`).toBe(200);
      const body = await res.body();
      expect(body.length).toBeGreaterThan(0);
    }
  });
});
