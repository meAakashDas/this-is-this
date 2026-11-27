import { test, expect } from '@playwright/test';
import { getPublicResources } from '../src/lib/cms/contentLoader';

const publishedResources = getPublicResources();
const primaryResource = publishedResources[0];
const lookupTarget = publishedResources[Math.min(1, publishedResources.length - 1)] || primaryResource;
const lastResource = publishedResources[publishedResources.length - 1] || primaryResource;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resourceUrlRegex(res: { resourceNumber: string; id?: string }): RegExp {
  const num = escapeRegex(res.resourceNumber);
  const id = escapeRegex(res.id || res.resourceNumber);
  return new RegExp(`/resources/(?:${num}|${id})`);
}

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

    // Fill valid published resource number and submit
    await input.fill(lookupTarget.resourceNumber);
    await submitBtn.click();
    const targetRegex = resourceUrlRegex(lookupTarget);
    await page.waitForURL(targetRegex, { timeout: 10000 });
    await expect(page).toHaveURL(targetRegex);
    await expect(page.locator('h1.resource-detail-title')).toContainText(lookupTarget.title);
  });

  test('3. Single digit input auto-pads to 3 digits (e.g. 1 -> 001)', async ({
    page,
  }) => {
    await page.goto('/resources');

    const searchSection = page.locator('.resources-search-wrap');
    const input = searchSection.locator('input[data-finder-input]');
    const submitBtn = searchSection.locator('button[type="submit"]');

    const numericInput = String(parseInt(primaryResource.resourceNumber, 10));
    await input.fill(numericInput);
    await submitBtn.click();

    const primaryRegex = resourceUrlRegex(primaryResource);
    await page.waitForURL(primaryRegex, { timeout: 8000 });
    await expect(page).toHaveURL(primaryRegex);
    await expect(page.locator('.resource-num-badge')).toContainText(primaryResource.resourceNumber);
  });

  test('4. All Resources section displays heading and clean resource cards with Open link and no unnecessary metadata', async ({
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

    // Verify catalog renders published resources cleanly
    const cards = catalogSection.locator('.resource-row-card');
    const cardCount = await cards.count();
    expect(cardCount).toBe(publishedResources.length);

    for (let i = 0; i < publishedResources.length; i++) {
      await expect(cards.nth(i)).toContainText(`NO. ${publishedResources[i].resourceNumber}`);
      await expect(cards.nth(i)).toContainText(publishedResources[i].title);
      await expect(cards.nth(i)).toContainText('Open');
    }

    // Removed unnecessary metadata: formats, file sizes, old "Access"
    const catalogText = (await catalogSection.textContent()) || '';
    expect(catalogText).not.toContain('PDF Guide');
    expect(catalogText).not.toContain('Notion Template & Printable PDF');
    expect(catalogText).not.toContain('142 KB');
    expect(catalogText).not.toContain('210 KB');
    expect(catalogText).not.toContain('185 KB');
    expect(catalogText).not.toContain('Access');
  });

  test('5. Primary resource route renders direct downloads and clean document preview without login', async ({
    page,
  }) => {
    await page.goto(`/resources/${primaryResource.resourceNumber}`);

    // Breadcrumb
    const breadcrumb = page.locator('.resource-nav-crumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText(`Resource #${primaryResource.resourceNumber}`);

    // Title and permanent number
    await expect(page.locator('h1.resource-detail-title')).toHaveText(primaryResource.title);
    await expect(page.locator('.resource-num-badge')).toContainText(
      `NO. ${primaryResource.resourceNumber}`
    );

    // Direct download attachments when present on the resource
    if (primaryResource.attachments && primaryResource.attachments.length > 0) {
      const attachmentsSection = page.locator('.attachments-section');
      await expect(attachmentsSection).toBeVisible();
      const downloadLinks = attachmentsSection.locator('a.attachment-download-link');
      await expect(downloadLinks).toHaveCount(primaryResource.attachments.length);
      for (let i = 0; i < primaryResource.attachments.length; i++) {
        await expect(downloadLinks.nth(i)).toHaveAttribute(
          'href',
          primaryResource.attachments[i].url
        );
      }
    }

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

  test('9. No horizontal scrolling on mobile for /resources and primary resource detail page', async ({
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

    await page.goto(`/resources/${primaryResource.resourceNumber}`);
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

    await input.fill(lastResource.resourceNumber);
    await expect(input).toHaveValue(lastResource.resourceNumber);

    const lastRegex = resourceUrlRegex(lastResource);
    await submitBtn.click();
    await page.waitForURL(lastRegex, { timeout: 8000 });
    await expect(page).toHaveURL(lastRegex);
    await expect(page.locator('h1.resource-detail-title')).toContainText(lastResource.title);
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

  test('12. Find Resources normalizes leading zeros and shows clear not-found feedback for 999', async ({
    page,
  }) => {
    await page.goto('/resources');

    const searchWrap = page.locator('.resources-search-wrap');
    const input = searchWrap.locator('input[data-finder-input]');
    const submitBtn = searchWrap.locator('button[type="submit"]');
    const statusBox = searchWrap.locator('[data-finder-status]');

    // Nonexistent 999 stays on /resources with explicit status message
    await input.fill('999');
    await submitBtn.click();
    await expect(statusBox).toBeVisible();
    await expect(statusBox).toContainText(/No published resource found for NO\. 999/i);
    await expect(page).toHaveURL(/\/resources\/?$/);

    // Leading-zero normalization (unpadded digits -> padded NO. XXX)
    const numericLookup = String(parseInt(lookupTarget.resourceNumber, 10));
    await input.fill(numericLookup);
    await submitBtn.click();
    await page.waitForURL(resourceUrlRegex(lookupTarget), { timeout: 8000 });
    await expect(page.locator('.resource-num-badge')).toContainText(
      `NO. ${lookupTarget.resourceNumber}`
    );
  });
});
