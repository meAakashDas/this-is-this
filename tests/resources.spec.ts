import { test, expect } from '@playwright/test';

test.describe('AakashDas.live — Simplified Resources Page QA', () => {
  test('1. /resources loads successfully with SEO metadata and zero console errors', async ({
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

    await page.goto('/resources');

    // Document title (Strictly "Aakash Das" per brand identity directive)
    await expect(page).toHaveTitle('Aakash Das');

    // Page title heading: Resources only
    const title = page.locator('header.resources-header h1.resources-title');
    await expect(title).toHaveText('Resources');

    // Verify open access banner and intro copy are removed
    await expect(page.locator('.open-access-banner')).toHaveCount(0);
    await expect(page.locator('.resources-lead')).toHaveCount(0);
    expect(await page.locator('header.resources-header').textContent()).not.toContain('OPEN LIBRARY');

    // No console errors
    expect(consoleErrors).toEqual([]);
  });

  test('2. Resource search has Find Resources heading, input, and Find button without samples', async ({
    page,
  }) => {
    await page.goto('/resources');

    const searchSection = page.locator('.resources-search-wrap');
    await expect(searchSection).toBeVisible();

    // Heading: Find Resources
    const heading = searchSection.locator('h2.search-title');
    await expect(heading).toHaveText('Find Resources');

    const input = searchSection.locator('input[data-finder-input]');
    const submitBtn = searchSection.locator('button[type="submit"]');
    const statusBox = searchSection.locator('[data-finder-status]');

    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter resource number');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Find');

    // Removed samples and extra labels
    await expect(searchSection.locator('.quick-pill')).toHaveCount(0);
    expect(await searchSection.textContent()).not.toContain('Lookup by Permanent Number');
    expect(await searchSection.textContent()).not.toContain('Enter a number or pick a sample');
    expect(await searchSection.textContent()).not.toContain('Quick samples');

    // Empty input validation
    await submitBtn.click();
    await expect(statusBox).toBeVisible();
    await expect(statusBox).toContainText(/Please enter a resource number/i);

    // Fill valid resource number '002' and submit
    await input.fill('002');
    await submitBtn.click();
    await page.waitForURL(/\/resources\/002/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/resources\/002/);
    await expect(page.locator('h1.resource-detail-title')).toContainText(
      'Nepal Banking & Account Checklist'
    );
  });

  test('3. Single digit input auto-pads to 3 digits (e.g. 1 -> 001)', async ({
    page,
  }) => {
    await page.goto('/resources');

    const searchSection = page.locator('.resources-search-wrap');
    const input = searchSection.locator('input[data-finder-input]');
    const submitBtn = searchSection.locator('button[type="submit"]');

    await input.fill('1');
    await submitBtn.click();

    await page.waitForURL(/\/resources\/001/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/resources\/001/);
    await expect(page.locator('.resource-num-badge')).toContainText('001');
  });

  test('4. All Resources section displays heading and three clean resource cards with Open link and no unnecessary metadata', async ({
    page,
  }) => {
    await page.goto('/resources');

    const catalogSection = page.locator('.catalog-section');
    await expect(catalogSection).toBeVisible();

    // Section title strictly: All Resources
    const heading = catalogSection.locator('h2#catalog-heading');
    await expect(heading).toHaveText('All Resources');

    // Removed count pill and subtitle descriptions
    await expect(catalogSection.locator('.catalog-count-pill')).toHaveCount(0);
    expect(await catalogSection.textContent()).not.toContain('Verified materials cataloged with permanent identifiers');
    expect(await catalogSection.textContent()).not.toContain('Published Resource');

    // Verify at least the 3 core published cards exist in catalog
    const cards = catalogSection.locator('.resource-row-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // Card 001: Starter Personal Budget Framework
    await expect(cards.nth(0)).toContainText('NO. 001');
    await expect(cards.nth(0)).toContainText('Starter Personal Budget Framework');
    await expect(cards.nth(0)).toContainText('Open');

    // Card 002: Nepal Banking & Account Checklist
    await expect(cards.nth(1)).toContainText('NO. 002');
    await expect(cards.nth(1)).toContainText('Nepal Banking & Account Checklist');
    await expect(cards.nth(1)).toContainText('Open');

    // Card 003: Student Productivity & Semester Tracker
    await expect(cards.nth(2)).toContainText('NO. 003');
    await expect(cards.nth(2)).toContainText('Student Productivity & Semester Tracker');
    await expect(cards.nth(2)).toContainText('Open');

    // Removed unnecessary metadata: categories, formats, file sizes, old "Access"
    const catalogText = (await catalogSection.textContent()) || '';
    expect(catalogText).not.toContain('Personal Finance');
    expect(catalogText).not.toContain('Financial Literacy');
    expect(catalogText).not.toContain('Productivity & Education');
    expect(catalogText).not.toContain('PDF Guide');
    expect(catalogText).not.toContain('Notion Template & Printable PDF');
    expect(catalogText).not.toContain('142 KB');
    expect(catalogText).not.toContain('210 KB');
    expect(catalogText).not.toContain('185 KB');
    expect(catalogText).not.toContain('Access');
  });

  test('5. Individual route /resources/001 renders direct downloads and clean document preview without login', async ({
    page,
  }) => {
    await page.goto('/resources/001');

    // Breadcrumb
    const breadcrumb = page.locator('.resource-nav-crumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Resource #001');

    // Title and permanent number
    await expect(page.locator('h1.resource-detail-title')).toHaveText(
      'Starter Personal Budget Framework'
    );
    await expect(page.locator('.resource-num-badge')).toContainText('NO. 001');

    // Direct download attachments at the top without login or paywall
    const attachmentsSection = page.locator('.attachments-section');
    await expect(attachmentsSection).toBeVisible();
    const downloadLinks = attachmentsSection.locator('a.attachment-download-link');
    await expect(downloadLinks).toHaveCount(2);
    await expect(downloadLinks.nth(0)).toHaveAttribute(
      'href',
      '/downloads/starter-budget-template-001.pdf'
    );
    await expect(downloadLinks.nth(1)).toHaveAttribute(
      'href',
      '/downloads/starter-budget-model-001.csv'
    );

    // Document preview actions: Download PDF and Save as DOCX
    const previewSection = page.locator('.pdf-preview-section');
    await expect(previewSection).toBeVisible();
    await expect(previewSection.locator('a.btn-download-pdf')).toBeVisible();
    await expect(previewSection.locator('a.btn-save-docx')).toBeVisible();
  });

  test('6. Unpublished / unknown resource renders secure not-found state without leaking draft content', async ({
    page,
  }) => {
    await page.goto('/resources/998');

    await expect(page.locator('body')).toContainText(
      /Page or Resource Not Found|Not Available/i
    );
    await expect(page.locator('.attachments-section')).toHaveCount(0);
  });

  test('7. Unknown route /resources/999 renders 404 page gracefully', async ({
    page,
  }) => {
    const response = await page.goto('/resources/999');
    expect([200, 404]).toContain(response?.status());
    await expect(page.locator('body')).toContainText(
      /Page or Resource Not Found|Not Available/i
    );
  });

  test('8. Navigation to /resources marks nav link as active', async ({
    page,
  }) => {
    await page.goto('/resources');

    const isMobile = page.viewportSize() && page.viewportSize()!.width <= 640;
    if (!isMobile) {
      const activeNavLink = page.locator('.desktop-nav .nav-link-active');
      await expect(activeNavLink).toHaveText('Resources');
    }
  });

  test('9. No horizontal scrolling on mobile for /resources and /resources/001', async ({
    page,
  }) => {
    await page.goto('/resources');
    let scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    let clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.goto('/resources/001');
    scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('10. Homepage resource finder works seamlessly with the shared validation', async ({
    page,
  }) => {
    await page.goto('/');

    const finderSection = page.locator('#resource-finder');
    const input = finderSection.locator('input[data-finder-input]');
    const submitBtn = finderSection.locator('button[type="submit"]');

    // Enter resource number 003
    await input.fill('003');
    await expect(input).toHaveValue('003');

    // Submit and navigate to /resources/003
    await submitBtn.click();
    await page.waitForURL(/\/resources\/003/, { timeout: 6000 });
    await expect(page).toHaveURL(/\/resources\/003/);
    await expect(page.locator('h1.resource-detail-title')).toContainText(
      'Student Productivity & Semester Tracker'
    );
  });

  test('11. /resources Find Resources component is centered with proportional max-width and empty search input', async ({
    page,
  }) => {
    await page.goto('/resources');

    const searchWrap = page.locator('.resources-search-wrap');
    await expect(searchWrap).toBeVisible();

    const input = searchWrap.locator('input[data-finder-input]');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');

    const heading = searchWrap.locator('h2#search-heading');
    await expect(heading).toHaveText('Find Resources');

    // Check heading text-align is centered
    const headingAlign = await heading.evaluate(
      (el) => window.getComputedStyle(el).textAlign
    );
    expect(headingAlign).toBe('center');

    // On desktop, check container is horizontally centered and max-width ~600-700px
    const isDesktop = page.viewportSize() && page.viewportSize()!.width >= 1024;
    if (isDesktop) {
      const wrapBox = (await searchWrap.boundingBox())!;
      const winWidth = page.viewportSize()!.width;
      const wrapCenter = wrapBox.x + wrapBox.width / 2;
      const pageCenter = winWidth / 2;

      // Centered within tolerance
      expect(Math.abs(wrapCenter - pageCenter)).toBeLessThan(15);
      // Width is proportional (~600-700px)
      expect(wrapBox.width).toBeGreaterThanOrEqual(580);
      expect(wrapBox.width).toBeLessThanOrEqual(720);
    }
  });
});
