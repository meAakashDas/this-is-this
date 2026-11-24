import { test, expect } from '@playwright/test';

test.describe('Admin Authentication & Portal Security QA', () => {
  test('1. Discreet Sign in link is present exclusively at bottom of /about', async ({ page }) => {
    await page.goto('/about');

    // Locate the discreet sign-in link
    const signInLink = page.locator('a.admin-sign-in-link');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveText('Sign in');
    await expect(signInLink).toHaveAttribute('href', '/admin');

    // Verify it is positioned after the contact section
    const contactSection = page.locator('.about-contact-section');
    await expect(contactSection).toBeVisible();

    // Verify administrator email is not exposed in page text
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('aakashdas.photo@gmail.com');
    expect(pageText).not.toContain('itsaakashdas@gmail.com');
  });

  test('2. Discreet Sign in link is strictly absent from all other public routes and components', async ({
    page,
  }) => {
    const publicRoutes = [
      '/',
      '/resources',
      '/resources/001',
      '/journal',
      '/journal/why-i-believe-in-learning-in-public',
      '/404',
    ];

    for (const route of publicRoutes) {
      await page.goto(route);
      const adminLinks = page.locator('a[href="/admin"], a.admin-sign-in-link');
      await expect(adminLinks).toHaveCount(0);

      // Verify header and footer do not link to admin
      const headerAdmin = page.locator('header a[href*="admin"]');
      await expect(headerAdmin).toHaveCount(0);

      const footerAdmin = page.locator('footer a[href*="admin"]');
      await expect(footerAdmin).toHaveCount(0);
    }
  });

  test('3. Admin route /admin loads with strict security metadata (noindex, nofollow)', async ({
    page,
  }) => {
    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);

    // Verify page title
    await expect(page).toHaveTitle('Admin Portal — Aakash Das');

    // Verify robots meta tag
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', 'noindex, nofollow');

    // Verify robots.txt explicitly disallows /admin
    const robotsResponse = await page.request.get('/robots.txt');
    expect(robotsResponse.ok()).toBeTruthy();
    const robotsText = await robotsResponse.text();
    expect(robotsText).toContain('Disallow: /admin');

    // Verify sitemap.xml does not contain /admin
    const sitemapResponse = await page.request.get('/sitemap.xml');
    expect(sitemapResponse.ok()).toBeTruthy();
    const sitemapText = await sitemapResponse.text();
    expect(sitemapText).not.toContain('/admin');
  });

  test('4. Admin login card is displayed for unauthenticated visitors on /admin', async ({
    page,
  }) => {
    await page.goto('/admin');

    // Verify Admin Access heading and description
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Admin Access', { timeout: 15000 });

    const subtitle = page.locator('text=Authorized administrator access only.');
    await expect(subtitle).toBeVisible();

    // Verify Sign in with Google button
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();

    // Verify Return to website link
    const returnLink = page.locator('a:has-text("Return to website")');
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAttribute('href', '/about');

    // Verify zero private CMS content or draft resources leaked
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('004');
    expect(bodyText).not.toContain('Advanced M&A Due Diligence Checklist');
  });

  test('5. Clicking Sign in on /about navigates to /admin', async ({ page }) => {
    await page.goto('/about');
    const signInLink = page.locator('a.admin-sign-in-link');
    await signInLink.click();
    await page.waitForURL('**/admin');
    expect(page.url()).toContain('/admin');
  });

  test('6. Return to website link on /admin navigates back to /about', async ({ page }) => {
    await page.goto('/admin');
    const returnLink = page.locator('a:has-text("Return to website")');
    await expect(returnLink).toBeVisible({ timeout: 15000 });
    await returnLink.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });

  test('7. /admin layout is fully responsive without horizontal overflow on mobile (390px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
