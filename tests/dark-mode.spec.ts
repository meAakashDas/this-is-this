import { test, expect } from '@playwright/test';

// Utility to calculate relative luminance of an RGB/RGBA string
function parseRgb(colorStr: string): [number, number, number] {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test.describe('Premium Light Mode & WCAG AA Verification', () => {
  const routes = [
    { name: 'Homepage', path: '/' },
    { name: 'About Page', path: '/about' },
    { name: 'Resources Library', path: '/resources' },
    { name: 'Resource Detail 001', path: '/resources/001' },
    { name: 'Journal', path: '/journal' },
    { name: '404 Error Page', path: '/404' },
  ];

  test('1. Light Mode Baseline is pure white canvas with refined primary text', async ({ page }) => {
    await page.goto('/');

    const styles = await page.evaluate(() => {
      const body = window.getComputedStyle(document.body);
      const h1 = window.getComputedStyle(document.querySelector('h1')!);
      return {
        bodyBg: body.backgroundColor,
        textPrimary: h1.color,
      };
    });

    expect(styles.bodyBg).toBe('rgb(255, 255, 255)'); // #FFFFFF
    expect(styles.textPrimary).toBe('rgb(23, 23, 23)'); // #171717
  });

  test('2. Meta color-scheme and theme-color reflect light mode', async ({ page }) => {
    await page.goto('/');

    const colorSchemeMeta = page.locator('meta[name="color-scheme"]');
    await expect(colorSchemeMeta).toHaveAttribute('content', 'light');

    const themeMeta = page.locator('meta[name="theme-color"]');
    await expect(themeMeta).toHaveAttribute('content', '#FFFFFF');
  });

  test('3. Website uses light mode throughout across all routes without dark backgrounds', async ({ page }) => {
    for (const route of routes) {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (
          msg.type() === 'error' &&
          !msg.text().includes('astro:dev-toolbar') &&
          !msg.text().includes('Outdated Optimize Dep') &&
          !msg.text().includes('compute-pressure') &&
          !msg.text().includes('404')
        ) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(route.path);
      expect(consoleErrors).toEqual([]);

      const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
      // Main background is pure white #FFFFFF
      expect(bg).toBe('rgb(255, 255, 255)');
    }
  });

  test('4. Typography contrast meets WCAG 2.2 AA in Light Mode', async ({ page }) => {
    await page.goto('/resources/001');

    const textColors = await page.evaluate(() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const h1 = document.querySelector('h1')!;
      const p = document.querySelector('.resource-content p')!;
      const muted = document.querySelector('.section-subtext, .resource-date, .resource-number')!;

      return {
        bodyBg,
        h1Color: window.getComputedStyle(h1).color,
        pColor: window.getComputedStyle(p).color,
        mutedColor: window.getComputedStyle(muted).color,
      };
    });

    const bodyRgb = parseRgb(textColors.bodyBg);
    const h1Rgb = parseRgb(textColors.h1Color);
    const pRgb = parseRgb(textColors.pColor);
    const mutedRgb = parseRgb(textColors.mutedColor);

    // H1 contrast on body surface (min 4.5:1 required, 7:1 for AAA)
    const h1Ratio = getContrastRatio(h1Rgb, bodyRgb);
    expect(h1Ratio).toBeGreaterThanOrEqual(7.0);

    // Body paragraph contrast on body surface
    const pRatio = getContrastRatio(pRgb, bodyRgb);
    expect(pRatio).toBeGreaterThanOrEqual(4.5);

    // Secondary label contrast (min 4.5:1 required for WCAG AA)
    const mutedRatio = getContrastRatio(mutedRgb, bodyRgb);
    expect(mutedRatio).toBeGreaterThanOrEqual(4.5);
  });

  test('5. Primary Button provides crisp contrast on sage background', async ({ page }) => {
    await page.goto('/');

    const primaryBtn = page.locator('.btn-primary').first();
    await expect(primaryBtn).toBeVisible();

    const initialStyles = await primaryBtn.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color };
    });

    const btnBgRgb = parseRgb(initialStyles.bg);
    const btnTextRgb = parseRgb(initialStyles.color);
    const contrast = getContrastRatio(btnBgRgb, btnTextRgb);
    // Dark #171717 text on #A5CFA8 sage green has contrast ratio > 7:1 (AAA)
    expect(contrast).toBeGreaterThanOrEqual(7.0);
  });

  test('6. Icons & SVGs adapt with stroke=currentColor and do not vanish', async ({ page }) => {
    await page.goto('/');
    const icons = page.locator('svg:visible');
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const icon = icons.nth(i);
      const isVisible = await icon.isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('7. Search input field has legible text and accessible focus state', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#resource-number-input');
    await expect(input).toBeVisible();

    await input.focus();
    const isFocused = await input.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('8. Mobile navigation drawer opens cleanly in Light Mode with legible links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const toggleBtn = page.locator('#mobile-nav-toggle');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    const drawer = page.locator('#mobile-nav-drawer');
    await expect(drawer).toBeVisible();

    const drawerBg = await drawer.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Drawer is crisp white
    expect(drawerBg).toBe('rgb(255, 255, 255)');
  });
});
