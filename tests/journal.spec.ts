import { test, expect } from '@playwright/test';

test.describe('AakashDas.live — Editorial Journal QA', () => {
  test('1. Journal page loads successfully with proper SEO metadata and zero console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('astro:dev-toolbar') &&
        !msg.text().includes('Outdated Optimize Dep') &&
        !msg.text().includes('compute-pressure')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/journal');

    // Document title (Strictly "Aakash Das" per brand identity directive)
    await expect(page).toHaveTitle('Aakash Das');

    // Meta description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /I write about what I'm learning|Journal/);

    // Canonical link
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.*\/journal/);

    // Open Graph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Journal — Aakash Das/);

    // Zero console errors
    expect(consoleErrors).toEqual([]);
  });

  test('2. Main content area displays Journal heading, intro, and 4 clean entries without metadata', async ({ page }) => {
    await page.goto('/journal');

    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();

    // Check heading
    const h1 = main.locator('h1.journal-title');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Journal');

    // Intro subtitle: exact required personal copy
    const subtitle = main.locator('.journal-subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toHaveText(
      "I write about what I'm learning, what I'm building, and the ideas that make me think."
    );

    // Sample journal entries rendered in editorial list
    const entries = main.locator('article.journal-entry-item');
    const entryCount = await entries.count();
    expect(entryCount).toBeGreaterThanOrEqual(4);

    await expect(main.locator('[data-journal-slug="why-i-believe-in-learning-in-public"]')).toBeVisible();
    await expect(main.locator('[data-journal-slug="building-something-that-matters"]')).toBeVisible();
    await expect(main.locator('[data-journal-slug="where-finance-meets-technology"]')).toBeVisible();
    await expect(main.locator('[data-journal-slug="the-value-of-being-a-beginner"]')).toBeVisible();

    // Verify each entry has title, excerpt, and Read entry, but NO metadata
    for (let i = 0; i < 4; i++) {
      const entry = entries.nth(i);
      await expect(entry.locator('.entry-title')).toBeVisible();
      await expect(entry.locator('.entry-excerpt')).toBeVisible();
      await expect(entry.locator('.entry-action')).toContainText('Read entry');

      // Verify complete absence of blogging metadata elements
      await expect(entry.locator('.entry-meta')).toHaveCount(0);
      const text = await entry.textContent();
      expect(text).not.toContain('Sample Entry');
      expect(text).not.toContain('min read');
      expect(text).not.toContain('November 2024');
    }
  });

  test('3. Individual journal entry page renders with full content and back navigation', async ({
    page,
  }) => {
    await page.goto('/journal/why-i-believe-in-learning-in-public');

    // Check title
    const title = page.locator('h1.article-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Why I Believe in Learning in Public');

    // Check back link
    const backLink = page.locator('a.journal-back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Back to Journal');

    // Check content lead and sections
    const lead = page.locator('.article-lead');
    await expect(lead).toBeVisible();
    await expect(lead).toContainText('documenting curiosity with rigor and humility');

    // Check quote
    const quote = page.locator('blockquote.article-quote');
    await expect(quote).toBeVisible();
    await expect(quote).toContainText('trail markers');

    // Check next entry link
    const nextLink = page.locator('.article-pagination a').last();
    await expect(nextLink).toBeVisible();
    await expect(nextLink).toContainText('Building Something That Matters');

    // Click back link and verify navigation to /journal
    await backLink.click();
    await expect(page).toHaveURL(/\/journal/);
  });

  test('4. Active navigation state is set to Journal', async ({ page }) => {
    await page.goto('/journal');

    const isMobile = page.viewportSize() && page.viewportSize()!.width <= 640;
    if (!isMobile) {
      const activeNavLink = page.locator('.desktop-nav .nav-link-active');
      await expect(activeNavLink).toBeVisible();
      await expect(activeNavLink).toHaveText('Journal');
    } else {
      const activeNavLink = page.locator('.mobile-drawer .mobile-nav-link-active');
      await expect(activeNavLink).toHaveAttribute('href', '/journal');
    }
  });

  test('5. Footer has minimal layout with navigation, social links, and email only', async ({
    page,
  }) => {
    await page.goto('/journal');

    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();

    // Navigation links in footer
    const navLinks = footer.locator('.footer-nav-link');
    await expect(navLinks).toHaveCount(4);
    await expect(navLinks.nth(0)).toHaveText('Home');
    await expect(navLinks.nth(1)).toHaveText('About');
    await expect(navLinks.nth(2)).toHaveText('Resources');
    await expect(navLinks.nth(3)).toHaveText('Journal');

    // Social links in footer (6 platforms including Facebook)
    const socialLinks = footer.locator('.footer-social-link');
    await expect(socialLinks).toHaveCount(6);
    await expect(footer.locator('.footer-social-links')).toContainText('Facebook');

    // Email link in footer
    const emailLink = footer.locator('.footer-email');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', /mailto:contact@aakashdas\.(live|me)/);

    // Direct contact action buttons
    const callBtn = footer.locator('a[aria-label="Call me"]');
    await expect(callBtn).toBeVisible();
    await expect(callBtn).toHaveAttribute('href', /^tel:/);

    const waBtn = footer.locator('a[aria-label="WhatsApp"]');
    await expect(waBtn).toBeVisible();
    await expect(waBtn).toHaveAttribute('href', /https:\/\/wa\.me\//);
  });

  test('6. Responsive behavior: No horizontal scrolling on mobile viewport (375px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/journal');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    const h1 = page.locator('h1.journal-title');
    await expect(h1).toBeVisible();

    // Check entry detail page responsiveness on mobile too
    await page.goto('/journal/why-i-believe-in-learning-in-public');
    const articleScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const articleClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(articleScrollWidth).toBeLessThanOrEqual(articleClientWidth + 1);
  });
});
