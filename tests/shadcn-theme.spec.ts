import { test, expect } from '@playwright/test';

test.describe('Official shadcn/ui Theme & Dark Mode Verification', () => {
  const routes = ['/', '/about', '/resources', '/resources/001', '/journal', '/journal/why-i-believe-in-learning-in-public', '/404'];

  test('Theme toggle button is present on desktop and toggles dark mode', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[aria-label*="Switch to"], button[aria-label="Toggle theme"]').first();
    await expect(themeToggle).toBeVisible();

    // Initially light mode
    const isDarkInitially = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkInitially).toBe(false);

    // Click toggle to activate Dark Mode
    await themeToggle.click();

    const isDarkAfterClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfterClick).toBe(true);

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe('dark');

    // Check dark mode styles
    const darkStyles = await page.evaluate(() => {
      const body = window.getComputedStyle(document.body);
      const h1 = window.getComputedStyle(document.querySelector('h1')!);
      return {
        bodyBg: body.backgroundColor,
        textPrimary: h1.color,
      };
    });

    // Dark background #09090b (rgb(9, 9, 11))
    expect(darkStyles.bodyBg).toBe('rgb(9, 9, 11)');
    // Foreground #fafafa (rgb(250, 250, 250))
    expect(darkStyles.textPrimary).toBe('rgb(250, 250, 250)');

    // Click toggle again to switch back to Light Mode
    await themeToggle.click();

    const isLightAfterSecondClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isLightAfterSecondClick).toBe(false);

    const storedThemeLight = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedThemeLight).toBe('light');

    const lightStyles = await page.evaluate(() => {
      const body = window.getComputedStyle(document.body);
      const h1 = window.getComputedStyle(document.querySelector('h1')!);
      return {
        bodyBg: body.backgroundColor,
        textPrimary: h1.color,
      };
    });

    expect(lightStyles.bodyBg).toBe('rgb(255, 255, 255)');
    expect(lightStyles.textPrimary).toBe('rgb(23, 23, 23)');
  });

  test('Dark mode persists across all routes', async ({ page }) => {
    await page.goto('/');

    // Set theme to dark
    const themeToggle = page.locator('button[aria-label*="Switch to"], button[aria-label="Toggle theme"]').first();
    await themeToggle.click();

    for (const route of routes) {
      await page.goto(route);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark).toBe(true);

      const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe('rgb(9, 9, 11)');
    }
  });

  test('Geist font is loaded and applied across all routes', async ({ page }) => {
    for (const route of routes) {
      await page.goto(route);
      const fontFamily = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? window.getComputedStyle(h1).fontFamily : '';
      });
      expect(fontFamily.toLowerCase()).toContain('geist');
    }
  });
});
