import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Large Desktop 1440', width: 1440, height: 900 },
  { name: 'Standard Desktop 1280', width: 1280, height: 800 },
  { name: 'Small Desktop 1024', width: 1024, height: 768 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'Mobile 390', width: 390, height: 844 },
  { name: 'Small Mobile 360', width: 360, height: 780 },
];

const routes = ['/', '/about', '/resources', '/resources/001', '/journal', '/journal/why-i-believe-in-learning-in-public', '/404'];

test.describe('Apple Editorial Minimal — Responsive Viewports & Dark Mode Audit', () => {
  test.setTimeout(30000);

  for (const vp of viewports) {
    test(`No horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        expect(
          hasHorizontalScroll,
          `Route ${route} has horizontal overflow at ${vp.name} (${vp.width}px)`
        ).toBe(false);
      }
    });
  }

  test('Dark Mode renders properly across all routes at 1280px & 390px', async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      // Explicitly set theme to dark in localStorage
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');

        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains('dark')
        );
        expect(isDark).toBe(true);

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      }
    }
  });
});
