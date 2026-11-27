import { test, expect } from '@playwright/test';
import type { SiteConfig } from '../src/types/index';
import { getPublicResources, getPublicSiteConfig } from '../src/lib/cms/contentLoader';
import { siteConfig as defaultSiteConfig } from '../src/data/siteConfig';
import { normalizeResourceDocument } from '../src/utils/documentExport';
import { extractYouTubeVideosFromBlocks } from '../src/utils/youtube';

const siteConfig = { ...defaultSiteConfig, ...getPublicSiteConfig() } as SiteConfig;
const publishedResources = getPublicResources();
const firstResource = publishedResources[0];
const firstDoc = normalizeResourceDocument(firstResource, siteConfig);

function getExpectedVideoIds(resource: any): string[] {
  const inline = [
    ...extractYouTubeVideosFromBlocks(Array.isArray(resource.blocknoteJson) ? resource.blocknoteJson : []),
    ...extractYouTubeVideosFromBlocks(Array.isArray(resource.contentBlocks) ? resource.contentBlocks : []),
  ].map((v) => v.videoId);
  const seen = new Set(inline);
  if (resource.youtubeEmbed?.videoId && !seen.has(resource.youtubeEmbed.videoId)) {
    seen.add(resource.youtubeEmbed.videoId);
  }
  return Array.from(seen);
}

test.describe('AakashDas.live — Resource Detail Page Redesign QA', () => {
  test('1. Valid primary resource loads with clean header and no unnecessary top metadata', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('astro:dev-toolbar') &&
        !msg.text().includes('Outdated Optimize Dep') &&
        !msg.text().includes('compute-pressure') &&
        !msg.text().includes('Permissions policy violation')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`/resources/${firstResource.resourceNumber}`);

    // Title and SEO metadata (Browser title strictly "Aakash Das")
    await expect(page).toHaveTitle('Aakash Das');
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect((metaDesc || '').trim().length).toBeGreaterThan(10);

    // Breadcrumb
    const breadcrumb = page.locator('.resource-nav-crumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText(`Resource #${firstResource.resourceNumber}`);

    // Header elements: Resource number, Title, Published date
    const header = page.locator('header.resource-detail-header');
    await expect(header).toBeVisible();
    await expect(header.locator('.resource-num-badge')).toHaveText(
      `NO. ${firstResource.resourceNumber}`
    );
    await expect(header.locator('h1.resource-title')).toHaveText(firstResource.title);
    if (firstResource.publishedAt) {
      await expect(header.locator('.resource-date')).toContainText(
        `Published ${firstResource.publishedAt}`
      );
    }

    // Verify category badges, open access badges, updated date, formats, and file sizes are removed from top
    const headerText = (await header.textContent()) || '';
    expect(headerText).not.toContain('Open Access');
    expect(headerText).not.toContain('Updated');
    expect(headerText).not.toContain('Spreadsheet (.xlsx)');
    expect(headerText).not.toContain('142 KB');

    expect(consoleErrors).toEqual([]);
  });

  test('2. Download Resources section (when attachments exist) precedes written content cleanly', async ({
    page,
    request,
  }) => {
    await page.goto(`/resources/${firstResource.resourceNumber}`);

    // Verify About Resource and Read Me sections are removed from page chrome
    await expect(page.locator('.about-resource-section')).toHaveCount(0);
    await expect(page.locator('.readme-section')).toHaveCount(0);

    const expectedAttachments = firstResource.attachments || [];
    const attachmentsSection = page.locator('.attachments-section');

    if (expectedAttachments.length > 0) {
      await expect(attachmentsSection).toBeVisible();
      const heading = attachmentsSection.locator('#attachments-section-heading');
      await expect(heading).toHaveText('Download Resources');
      await expect(attachmentsSection.locator('.section-subtext')).toHaveCount(0);

      // Verify DOM order: Header comes before attachments, attachments come before written content
      const isAttachmentsOrderValid = await page.evaluate(() => {
        const header = document.querySelector('header.resource-detail-header');
        const attachments = document.querySelector('.attachments-section');
        const written = document.querySelector('.written-content-section');
        if (!header || !attachments || !written) return false;
        return (
          header.compareDocumentPosition(attachments) ===
            Node.DOCUMENT_POSITION_FOLLOWING &&
          attachments.compareDocumentPosition(written) ===
            Node.DOCUMENT_POSITION_FOLLOWING
        );
      });
      expect(isAttachmentsOrderValid).toBe(true);

      const cards = attachmentsSection.locator('.attachment-item-card');
      await expect(cards).toHaveCount(expectedAttachments.length);

      for (let i = 0; i < expectedAttachments.length; i++) {
        const att = expectedAttachments[i];
        const card = cards.nth(i);
        await expect(card).toContainText(att.name);
        const link = card.locator('a.attachment-download-link');
        await expect(link).toContainText('Download');
        await expect(link).toHaveAttribute('href', att.url);

        if (att.url.startsWith('/')) {
          const assetRes = await request.get(att.url);
          expect(assetRes.status()).toBe(200);
        }
      }

      const attachmentsText = (await attachmentsSection.textContent()) || '';
      expect(attachmentsText).not.toContain('142 KB');
      expect(attachmentsText).not.toContain('12 KB');
    } else {
      await expect(attachmentsSection).toHaveCount(0);
      const isOrderValid = await page.evaluate(() => {
        const header = document.querySelector('header.resource-detail-header');
        const written = document.querySelector('.written-content-section');
        const preview = document.querySelector('.pdf-preview-section');
        if (!header || !written || !preview) return false;
        return (
          header.compareDocumentPosition(written) === Node.DOCUMENT_POSITION_FOLLOWING &&
          written.compareDocumentPosition(preview) === Node.DOCUMENT_POSITION_FOLLOWING
        );
      });
      expect(isOrderValid).toBe(true);
    }
  });

  test('3. Action buttons below date and View as PDF section provide functional exports and preview', async ({
    page,
    request,
  }) => {
    await page.goto(`/resources/${firstResource.resourceNumber}`);

    // 1. Verify Top Action Buttons below Date
    const topActions = page.locator('.resource-top-actions');
    await expect(topActions).toBeVisible();

    const savePdfTop = topActions.locator('a.btn-save-pdf');
    await expect(savePdfTop).toBeVisible();
    await expect(savePdfTop).toContainText('Save as PDF');
    await expect(savePdfTop).toHaveAttribute('download', firstDoc.pdfFilename);

    const saveDocxTop = topActions.locator('a.btn-save-docx');
    await expect(saveDocxTop).toBeVisible();
    await expect(saveDocxTop).toContainText('Save as DOCX');
    await expect(saveDocxTop).toHaveAttribute('download', firstDoc.docxFilename);

    const viewPdfTop = topActions.locator('a.btn-view-pdf');
    await expect(viewPdfTop).toBeVisible();
    await expect(viewPdfTop).toContainText('View as PDF');
    await expect(viewPdfTop).toHaveAttribute('href', '#view-as-pdf');

    const shareBtn = topActions.locator('button.btn-share-resource');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toContainText('Share');

    // 2. Verify View as PDF Section
    const previewSection = page.locator('.pdf-preview-section');
    await expect(previewSection).toBeVisible();

    const heading = previewSection.locator('#pdf-preview-heading');
    await expect(heading).toHaveText('View as PDF');

    const downloadPdfBtn = previewSection.locator('a.btn-download-pdf');
    await expect(downloadPdfBtn).toBeVisible();
    await expect(downloadPdfBtn).toContainText('Download PDF');
    await expect(downloadPdfBtn).toHaveAttribute('download', firstDoc.pdfFilename);
    const pdfHref = (await downloadPdfBtn.getAttribute('href')) || '';
    expect(pdfHref.length).toBeGreaterThan(5);

    if (pdfHref.startsWith('/')) {
      const pdfRes = await request.get(pdfHref);
      expect(pdfRes.status()).toBe(200);
      const pdfBuf = await pdfRes.body();
      expect(pdfBuf.length).toBeGreaterThan(1000);
    }

    const saveDocxBtn = previewSection.locator('a.btn-save-docx');
    await expect(saveDocxBtn).toBeVisible();
    await expect(saveDocxBtn).toContainText('Save as DOCX');
    await expect(saveDocxBtn).toHaveAttribute('download', firstDoc.docxFilename);
    const docxHref = (await saveDocxBtn.getAttribute('href')) || '';
    expect(docxHref.length).toBeGreaterThan(5);

    if (docxHref.startsWith('/')) {
      const docxRes = await request.get(docxHref);
      expect(docxRes.status()).toBe(200);
      const docxBuffer = await docxRes.body();
      expect(docxBuffer.length).toBeGreaterThan(1000);
    }

    // Removed complicated buttons: Open in New Tab, Hide Preview, Preview Download
    const previewText = (await previewSection.textContent()) || '';
    expect(previewText).not.toContain('Open in New Tab');
    expect(previewText).not.toContain('Hide Preview');
    expect(previewText).not.toContain('Show Preview');

    const pdfObject = previewSection.locator('.preview-viewer-container object');
    await expect(pdfObject).toBeVisible();
    await expect(pdfObject).toHaveAttribute('data', pdfHref);
  });

  test('4. Redundant bottom sections are completely eliminated', async ({
    page,
  }) => {
    await page.goto(`/resources/${firstResource.resourceNumber}`);

    const pageContent = (await page.content()) || '';

    expect(pageContent).not.toContain('Direct Access & Download');
    expect(pageContent).not.toContain('Permanent Resource URL');
    expect(pageContent).not.toContain('Copy Permanent Link');
    expect(pageContent).not.toContain('Browse Catalog');
    expect(pageContent).not.toContain('Permanent, open access. No paywalls or subscriptions.');

    await expect(page.locator('.attachments-section')).toHaveCount(
      (firstResource.attachments || []).length > 0 ? 1 : 0
    );
  });

  test('5. Rich educational content renders cleanly without broken markup', async ({
    page,
  }) => {
    await page.goto(`/resources/${firstResource.resourceNumber}`);

    const mainContent = page.locator('.main-educational-content');
    await expect(mainContent).toBeVisible();
    const textContent = (await mainContent.textContent()) || '';
    expect(textContent.trim().length).toBeGreaterThan(20);
    expect(textContent).not.toContain('[object Object]');

    if (firstResource.title === 'Starter Personal Budget Framework') {
      await expect(
        mainContent.locator('h2', {
          hasText: 'Framework Principles & Cash Flow Mechanics',
        })
      ).toBeVisible();
      const quote = mainContent.locator('.editorial-blockquote').first();
      await expect(quote).toBeVisible();
      await expect(quote).toContainText(
        'A budget tells your money where to go instead of wondering where it went.'
      );
      await expect(mainContent.locator('.editorial-bullet-list li')).toHaveCount(3);
      const tableContainer = mainContent.locator('.table-scroll-container');
      await expect(tableContainer).toBeVisible();
      await expect(tableContainer.locator('table.editorial-table')).toBeVisible();
      await expect(tableContainer).toContainText('Kathmandu Baseline (NPR 30,000)');
      await expect(mainContent.locator('.callout-box.info')).toBeVisible();
    } else {
      const headingCount = await mainContent.locator('h1, h2, h3, p, ul, ol, table').count();
      expect(headingCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('6. Privacy-conscious YouTube video walkthroughs render cleanly when present', async ({
    page,
  }) => {
    const resourcesWithVideo = publishedResources.filter(
      (r) => getExpectedVideoIds(r).length > 0
    );
    expect(resourcesWithVideo.length).toBeGreaterThanOrEqual(1);

    for (const res of resourcesWithVideo) {
      const expectedIds = getExpectedVideoIds(res);
      await page.goto(`/resources/${res.resourceNumber}`);

      const iframes = page.locator(
        '.written-content-section iframe[src*="youtube-nocookie.com/embed/"], .video-section iframe[src*="youtube-nocookie.com/embed/"]'
      );
      await expect(iframes.first()).toBeVisible();
      expect(await iframes.count()).toBeGreaterThanOrEqual(expectedIds.length);

      const renderedSrcs = await iframes.evaluateAll((els) =>
        els.map((el) => el.getAttribute('src') || '')
      );
      for (const vidId of expectedIds) {
        expect(
          renderedSrcs.some((src) => src.includes(`youtube-nocookie.com/embed/${vidId}`)),
          `Expected YouTube embed ${vidId} on /resources/${res.resourceNumber}`
        ).toBe(true);
      }
    }
  });

  test('7. Next / Previous resource navigation is minimal and hides boundary links', async ({
    page,
  }) => {
    await page.goto(`/resources/${firstResource.resourceNumber}`);
    const navFirst = page.locator('.resource-adjacent-nav');
    await expect(navFirst.locator('.adjacent-prev')).toHaveCount(0);

    if (publishedResources.length === 1) {
      await expect(navFirst.locator('.adjacent-next')).toHaveCount(0);
      return;
    }

    for (let i = 0; i < publishedResources.length - 1; i++) {
      const current = publishedResources[i];
      const nextRes = publishedResources[i + 1];
      const navCurrent = page.locator('.resource-adjacent-nav');
      const nextLink = navCurrent.locator('.adjacent-next');
      await expect(nextLink).toBeVisible();
      await expect(nextLink).toContainText('Next Resource');
      await expect(nextLink).toContainText(nextRes.title);

      await nextLink.click();
      await page.waitForURL(
        new RegExp(`/resources/(?:${nextRes.resourceNumber}|${nextRes.id || nextRes.resourceNumber})`)
      );

      const navNext = page.locator('.resource-adjacent-nav');
      const prevLink = navNext.locator('.adjacent-prev');
      await expect(prevLink).toBeVisible();
      await expect(prevLink).toContainText('Previous Resource');
      await expect(prevLink).toContainText(current.title);
    }

    const navLast = page.locator('.resource-adjacent-nav');
    await expect(navLast.locator('.adjacent-next')).toHaveCount(0);
  });

  test('8. Unknown or unpublished resource 998 does NOT expose content or attachments', async ({
    page,
  }) => {
    await page.goto('/resources/998');

    await expect(page.locator('body')).toContainText(
      /Page or Resource Not Found|Not Available/i
    );

    // Content, attachments, and adjacent nav must NOT exist
    await expect(page.locator('.attachments-section')).toHaveCount(0);
    await expect(page.locator('.pdf-preview-section')).toHaveCount(0);
    await expect(page.locator('.resource-adjacent-nav')).toHaveCount(0);
  });

  test('9. Mobile responsiveness: No horizontal page overflow on narrow screens (375px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const res of publishedResources) {
      await page.goto(`/resources/${res.resourceNumber}`);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });
});
