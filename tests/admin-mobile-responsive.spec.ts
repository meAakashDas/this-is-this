import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'small-phone-320', width: 320, height: 640 },
  { name: 'phone-375', width: 375, height: 812 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'large-phone-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

const ADMIN_TABS = [
  'Profile',
  'Homepage',
  'About',
  'Resources',
  'Journal',
  'Publishing',
  'Website Settings',
] as const;

async function enableDevPreviewIfAvailable(page: Page): Promise<boolean> {
  await page.goto('/admin');
  await page.evaluate(() => {
    sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
  });
  await page.goto('/admin');

  const headerPortalLink = page.locator('header a[href="/admin"]');
  return headerPortalLink
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
}

async function assertNoHorizontalOverflow(page: Page, contextLabel: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `${contextLabel}: expected scrollWidth (${metrics.scrollWidth}) <= innerWidth (${metrics.innerWidth})`
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

async function assertHeaderFitsViewport(page: Page, viewportWidth: number, label: string) {
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box, `${label}: header bounding box missing`).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(viewportWidth + 1);

  const visibleButtons = header.locator('button:visible, a:visible');
  const count = await visibleButtons.count();
  for (let i = 0; i < count; i++) {
    const itemBox = await visibleButtons.nth(i).boundingBox();
    if (!itemBox) continue;
    expect(itemBox.x, `${label}: header item #${i} starts off-screen left`).toBeGreaterThanOrEqual(-1);
    expect(
      itemBox.x + itemBox.width,
      `${label}: header item #${i} overflows right edge (${itemBox.x + itemBox.width} > ${viewportWidth})`
    ).toBeLessThanOrEqual(viewportWidth + 1);
  }
}

async function navigateToAdminSection(page: Page, tabLabel: string, viewportWidth: number) {
  if (viewportWidth < 1024) {
    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    const drawer = page.locator('#admin-mobile-drawer');
    await expect(drawer).toBeVisible();
    const tabBtn = drawer.locator('button', { hasText: tabLabel });
    await expect(tabBtn).toBeVisible();
    await tabBtn.click();
    await expect(drawer).toBeHidden();
  } else {
    const sidebarBtn = page.locator('aside button', { hasText: tabLabel });
    await expect(sidebarBtn).toBeVisible();
    await sidebarBtn.click();
  }
}

test.describe('Admin Portal Mobile & Responsive Layout QA', () => {
  test('1. Unauthenticated /admin login card renders cleanly across 320px-1440px', async ({ page }) => {
    await page.goto('/admin');

    const heading = page.locator('h1', { hasText: 'Admin Access' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await assertNoHorizontalOverflow(page, `login-${vp.name}`);

      const signInBtn = page.locator('button:has-text("Sign in with Google")');
      await expect(signInBtn).toBeVisible();
      const btnBox = await signInBtn.boundingBox();
      expect(btnBox).not.toBeNull();
      expect(btnBox!.height).toBeGreaterThanOrEqual(44);
      expect(btnBox!.x).toBeGreaterThanOrEqual(0);
      expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(vp.width);
    }
  });

  test('2. Mobile navigation drawer works cleanly (<1024px) while desktop sidebar stays intact (>=1024px)', async ({
    page,
  }) => {
    const inDevPreview = await enableDevPreviewIfAvailable(page);
    test.skip(
      !inDevPreview,
      'Dev Preview CMS UI tests require astro dev (IS_DEV=true); production build enforces Google OAuth'
    );

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await assertNoHorizontalOverflow(page, `nav-${vp.name}`);
      await assertHeaderFitsViewport(page, vp.width, `nav-${vp.name}`);

      const desktopSidebar = page.locator('aside');
      const mobileMenuBtn = page.locator('button[aria-label="Open navigation menu"]');

      if (vp.width < 1024) {
        await expect(desktopSidebar).toBeHidden();
        await expect(mobileMenuBtn).toBeVisible();
      } else {
        await expect(desktopSidebar).toBeVisible();
        await expect(mobileMenuBtn).toBeHidden();
      }
    }

    // Verify drawer interaction, touch target size, and Escape key close on 320px phone
    await page.setViewportSize({ width: 320, height: 640 });
    await page.locator('button[aria-label="Open navigation menu"]').click();
    const drawer = page.locator('#admin-mobile-drawer');
    await expect(drawer).toBeVisible();

    for (const label of ADMIN_TABS) {
      const navButton = drawer.locator('button', { hasText: label });
      await expect(navButton).toBeVisible();
      const box = await navButton.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height, `Drawer button "${label}" should be >= 44px tall`).toBeGreaterThanOrEqual(44);
    }

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('3. All 7 Admin sections + Resources/Journal editors have zero overflow from 320px to 1440px', async ({
    page,
  }) => {
    const inDevPreview = await enableDevPreviewIfAvailable(page);
    test.skip(
      !inDevPreview,
      'Dev Preview CMS UI tests require astro dev (IS_DEV=true); production build enforces Google OAuth'
    );

    const checkWidths = [320, 375, 768, 1440];

    for (const width of checkWidths) {
      await page.setViewportSize({ width, height: 844 });

      for (const tabLabel of ADMIN_TABS) {
        await navigateToAdminSection(page, tabLabel, width);
        await page.waitForTimeout(150);
        await assertNoHorizontalOverflow(page, `${tabLabel}-${width}px`);
        await assertHeaderFitsViewport(page, width, `${tabLabel}-${width}px`);
      }

      // Open Homepage sub-tabs at mobile/desktop widths to verify zero overflow
      await navigateToAdminSection(page, 'Homepage', width);
      for (const subTab of ['Hero', 'Featured Resources', 'Journal', 'Sections']) {
        const subTabBtn = page.locator('section[aria-label="Admin Content Pane"] button', {
          hasText: subTab,
        }).first();
        if (await subTabBtn.isVisible()) {
          await subTabBtn.click();
          await page.waitForTimeout(100);
          await assertNoHorizontalOverflow(page, `Homepage-${subTab}-${width}px`);
        }
      }

      // Open Resources -> Edit Resource #001 on each key breakpoint
      await navigateToAdminSection(page, 'Resources', width);
      const firstEditBtn = page.locator('.resource-card button[aria-label^="Edit Resource"]').first();
      if ((await firstEditBtn.count()) > 0) {
        await firstEditBtn.click();
        await expect(page.locator('.resource-editor-container')).toBeVisible();
        await expect(page.locator('.resource-editor-container > section')).toHaveCount(2);
        await page.waitForTimeout(200);
        await assertNoHorizontalOverflow(page, `ResourceEditor-${width}px`);

        const backBtn = page.locator('button[aria-label="Back to Resources"]');
        await backBtn.click();
        await expect(page.locator('.resource-card').first()).toBeVisible();
      }

      // Open Journal -> Create Article + Live Preview on each key breakpoint
      await navigateToAdminSection(page, 'Journal', width);
      const createArticleBtn = page.locator('button:has-text("Create Article")');
      await expect(createArticleBtn).toBeVisible();
      await createArticleBtn.click();
      await expect(page.locator('.journal-editor-container')).toBeVisible();
      await page.waitForTimeout(150);
      await assertNoHorizontalOverflow(page, `JournalEditor-${width}px`);

      const previewBtn = page.locator('button:has-text("Live Preview")');
      await previewBtn.click();
      await page.waitForTimeout(150);
      await assertNoHorizontalOverflow(page, `JournalPreview-${width}px`);

      const backToJournalBtn = page.locator('button[aria-label="Back to Journal list"]');
      await backToJournalBtn.click();
      await expect(createArticleBtn).toBeVisible();
    }
  });
});
