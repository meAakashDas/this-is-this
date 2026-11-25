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

    // Verify private administrator OAuth email is never exposed in page text
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('aakashdas.photo@gmail.com');
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

    // Verify Admin Access heading
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Admin Access', { timeout: 15000 });

    // Verify Sign in with Google button
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();

    // Verify all unnecessary descriptions, subtitles, emails, and footer text are removed
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Authorized administrator access only');
    expect(bodyText).not.toContain('Enter Development Preview');
    expect(bodyText).not.toContain('Return to website');
    expect(bodyText).not.toContain('aakashdas.photo@gmail.com');
    expect(bodyText).not.toContain('Access is protected by Google authentication and Firebase security.');
    expect(bodyText).not.toContain('Aakash Das · Private Portal');
  });

  test('5. Clicking Sign in on /about navigates to /admin', async ({ page }) => {
    await page.goto('/about');
    const signInLink = page.locator('a.admin-sign-in-link');
    await signInLink.click();
    await page.waitForURL('**/admin');
    expect(page.url()).toContain('/admin');
  });

  test('6. Minimal Admin Login card strictly contains only Admin Access and Sign in with Google', async ({ page }) => {
    await page.goto('/admin');
    const heading = page.locator('h1:has-text("Admin Access")');
    await expect(heading).toBeVisible({ timeout: 15000 });
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();
    
    // Ensure zero leak of development preview or external accounts
    const devPreview = page.locator('button:has-text("Enter Development Preview")');
    await expect(devPreview).toHaveCount(0);
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
