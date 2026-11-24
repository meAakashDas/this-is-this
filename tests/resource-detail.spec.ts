import { test, expect } from '@playwright/test';

test.describe('AakashDas.live — Resource Detail Page Redesign QA', () => {
  test('1. Valid resource /resources/001 loads with clean header and no unnecessary top metadata', async ({
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

    await page.goto('/resources/001');

    // Title and SEO metadata (Browser title strictly "Aakash Das")
    await expect(page).toHaveTitle('Aakash Das');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /clean, structured monthly budgeting template/
    );

    // Breadcrumb
    const breadcrumb = page.locator('.resource-nav-crumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toContainText('Resource #001');

    // Header elements: Resource number, Title, Published date
    const header = page.locator('header.resource-detail-header');
    await expect(header).toBeVisible();
    await expect(header.locator('.resource-num-badge')).toHaveText('NO. 001');
    await expect(header.locator('h1.resource-title')).toHaveText(
      'Starter Personal Budget Framework'
    );
    await expect(header.locator('.resource-date')).toContainText(
      'Published 2025-01-15'
    );

    // Verify category, open access badges, updated date, formats, and file sizes are removed from top
    const headerText = (await header.textContent()) || '';
    expect(headerText).not.toContain('Personal Finance');
    expect(headerText).not.toContain('Open Access');
    expect(headerText).not.toContain('Updated');
    expect(headerText).not.toContain('Spreadsheet (.xlsx)');
    expect(headerText).not.toContain('142 KB');

    expect(consoleErrors).toEqual([]);
  });

  test('2. Download Resources is positioned immediately below header and divider, and before written content', async ({
    page,
    request,
  }) => {
    await page.goto('/resources/001');

    // Section exists and has exact required heading
    const attachmentsSection = page.locator('.attachments-section');
    await expect(attachmentsSection).toBeVisible();

    const heading = attachmentsSection.locator('#attachments-section-heading');
    await expect(heading).toHaveText('Download Resources');
    // Supporting sentence was removed
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

    // Verify About Resource and Read Me sections are removed
    await expect(page.locator('.about-resource-section')).toHaveCount(0);
    await expect(page.locator('.readme-section')).toHaveCount(0);

    // Verify attachments for 001 (PDF guide + CSV model)
    const cards = attachmentsSection.locator('.attachment-item-card');
    await expect(cards).toHaveCount(2);

    // Card 1: PDF Guide
    const pdfCard = cards.nth(0);
    await expect(pdfCard).toContainText(
      'Starter Budget Guide & Printable Worksheet'
    );
    await expect(pdfCard.locator('.file-type-badge')).toHaveText('PDF');
    const pdfLink = pdfCard.locator('a.attachment-download-link');
    await expect(pdfLink).toContainText('Download');
    await expect(pdfLink).toHaveAttribute(
      'href',
      '/downloads/starter-budget-template-001.pdf'
    );

    // Card 2: CSV Model
    const csvCard = cards.nth(1);
    await expect(csvCard).toContainText('Zero-Based Monthly Cash Flow Model');
    await expect(csvCard.locator('.file-type-badge')).toHaveText('CSV');
    const csvLink = csvCard.locator('a.attachment-download-link');
    await expect(csvLink).toContainText('Download');
    await expect(csvLink).toHaveAttribute(
      'href',
      '/downloads/starter-budget-model-001.csv'
    );

    // Verify file sizes are NOT displayed in attachments list
    const attachmentsText = (await attachmentsSection.textContent()) || '';
    expect(attachmentsText).not.toContain('142 KB');
    expect(attachmentsText).not.toContain('12 KB');

    // Network HTTP 200 validation
    const pdfRes = await request.get(
      '/downloads/starter-budget-template-001.pdf'
    );
    expect(pdfRes.status()).toBe(200);

    const csvRes = await request.get(
      '/downloads/starter-budget-model-001.csv'
    );
    expect(csvRes.status()).toBe(200);
  });

  test('3. Action buttons below date and View as PDF section provide functional exports and preview', async ({
    page,
    request,
  }) => {
    await page.goto('/resources/001');

    // 1. Verify Top Action Buttons below Date
    const topActions = page.locator('.resource-top-actions');
    await expect(topActions).toBeVisible();

    const savePdfTop = topActions.locator('a.btn-save-pdf');
    await expect(savePdfTop).toBeVisible();
    await expect(savePdfTop).toContainText('Save as PDF');
    await expect(savePdfTop).toHaveAttribute('download', /resource-001-.*\.pdf/);

    const saveDocxTop = topActions.locator('a.btn-save-docx');
    await expect(saveDocxTop).toBeVisible();
    await expect(saveDocxTop).toContainText('Save as DOCX');
    await expect(saveDocxTop).toHaveAttribute('download', /resource-001-.*\.docx/);

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

    // Heading: View as PDF
    const heading = previewSection.locator('#pdf-preview-heading');
    await expect(heading).toHaveText('View as PDF');

    // Actions in preview header: Download PDF and Save as DOCX
    const downloadPdfBtn = previewSection.locator('a.btn-download-pdf');
    await expect(downloadPdfBtn).toBeVisible();
    await expect(downloadPdfBtn).toContainText('Download PDF');
    await expect(downloadPdfBtn).toHaveAttribute(
      'href',
      '/downloads/starter-budget-template-001.pdf'
    );
    await expect(downloadPdfBtn).toHaveAttribute('download', /resource-001-.*\.pdf/);

    const saveDocxBtn = previewSection.locator('a.btn-save-docx');
    await expect(saveDocxBtn).toBeVisible();
    await expect(saveDocxBtn).toContainText('Save as DOCX');
    await expect(saveDocxBtn).toHaveAttribute(
      'href',
      '/downloads/starter-budget-template-001.docx'
    );
    await expect(saveDocxBtn).toHaveAttribute('download', /resource-001-.*\.docx/);

    // Verify genuine DOCX file is served with HTTP 200
    const docxRes = await request.get(
      '/downloads/starter-budget-template-001.docx'
    );
    expect(docxRes.status()).toBe(200);
    const docxBuffer = await docxRes.body();
    expect(docxBuffer.length).toBeGreaterThan(1000);

    // Removed complicated buttons: Open in New Tab, Hide Preview, Preview Download
    const previewText = (await previewSection.textContent()) || '';
    expect(previewText).not.toContain('Open in New Tab');
    expect(previewText).not.toContain('Hide Preview');
    expect(previewText).not.toContain('Show Preview');

    // Object and iframe are present
    const pdfObject = previewSection.locator('.preview-viewer-container object');
    await expect(pdfObject).toBeVisible();
    await expect(pdfObject).toHaveAttribute(
      'data',
      '/downloads/starter-budget-template-001.pdf'
    );
  });

  test('4. Redundant bottom sections are completely eliminated', async ({
    page,
  }) => {
    await page.goto('/resources/001');

    const pageContent = (await page.content()) || '';

    // Direct Access & Download card removed
    expect(pageContent).not.toContain('Direct Access & Download');

    // Permanent Resource URL sharing block removed
    expect(pageContent).not.toContain('Permanent Resource URL');
    expect(pageContent).not.toContain('Copy Permanent Link');

    // Repeated Browse Catalog button removed
    expect(pageContent).not.toContain('Browse Catalog');

    // Guarantee banner removed
    expect(pageContent).not.toContain('Permanent, open access. No paywalls or subscriptions.');

    // Attachments section appears strictly once
    await expect(page.locator('.attachments-section')).toHaveCount(1);
  });

  test('5. Rich educational content is preserved with proper headings, lists, tables, and blockquotes', async ({
    page,
  }) => {
    await page.goto('/resources/001');

    const mainContent = page.locator('.main-educational-content');
    await expect(mainContent).toBeVisible();

    // Section headings
    await expect(
      mainContent.locator('h2', {
        hasText: 'Framework Principles & Cash Flow Mechanics',
      })
    ).toBeVisible();

    // Blockquote
    const quote = mainContent.locator('.editorial-blockquote').first();
    await expect(quote).toBeVisible();
    await expect(quote).toContainText(
      'A budget tells your money where to go instead of wondering where it went.'
    );

    // Lists
    await expect(mainContent.locator('.editorial-bullet-list li')).toHaveCount(3);

    // Table
    const tableContainer = mainContent.locator('.table-scroll-container');
    await expect(tableContainer).toBeVisible();
    await expect(tableContainer.locator('table.editorial-table')).toBeVisible();
    await expect(tableContainer).toContainText('Kathmandu Baseline (NPR 30,000)');

    // Callout
    const callout = mainContent.locator('.callout-box.info');
    await expect(callout).toBeVisible();
  });

  test('6. Privacy-conscious YouTube video walkthrough renders when present', async ({
    page,
  }) => {
    await page.goto('/resources/001');

    const videoSection = page.locator('.video-section');
    await expect(videoSection).toBeVisible();

    const iframe = videoSection.locator('iframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/
    );
  });

  test('7. Next / Previous resource navigation is minimal and hides boundary links', async ({
    page,
  }) => {
    // Resource 001 (First): No Previous, Next is 002
    await page.goto('/resources/001');
    const nav001 = page.locator('.resource-adjacent-nav');
    await expect(nav001.locator('.adjacent-prev')).toHaveCount(0);
    const next001 = nav001.locator('.adjacent-next');
    await expect(next001).toBeVisible();
    await expect(next001).toContainText('Next Resource');
    await expect(next001).toContainText('Nepal Banking & Account Checklist');

    // Click Next -> Navigates to 002
    await next001.click();
    await page.waitForURL(/\/resources\/002/);
    await expect(page).toHaveURL(/\/resources\/002/);

    // Resource 002 (Middle): Has Previous (001) and Next (003)
    const nav002 = page.locator('.resource-adjacent-nav');
    const prev002 = nav002.locator('.adjacent-prev');
    const next002 = nav002.locator('.adjacent-next');
    await expect(prev002).toBeVisible();
    await expect(prev002).toContainText('Previous Resource');
    await expect(prev002).toContainText('Starter Personal Budget Framework');
    await expect(next002).toBeVisible();
    await expect(next002).toContainText('Next Resource');
    await expect(next002).toContainText('Student Productivity & Semester Tracker');

    // Click Next -> Navigates to 003
    await next002.click();
    await page.waitForURL(/\/resources\/003/);
    await expect(page).toHaveURL(/\/resources\/003/);

    // Resource 003 (Last): Has Previous (002), No Next
    const nav003 = page.locator('.resource-adjacent-nav');
    const prev003 = nav003.locator('.adjacent-prev');
    await expect(prev003).toBeVisible();
    await expect(prev003).toContainText('Previous Resource');
    await expect(prev003).toContainText('Nepal Banking & Account Checklist');
    await expect(nav003.locator('.adjacent-next')).toHaveCount(0);
  });

  test('8. Draft / unpublished resource 004 does NOT expose content or attachments', async ({
    page,
  }) => {
    await page.goto('/resources/004');

    const notFoundCard = page.locator('.resource-not-found-card');
    await expect(notFoundCard).toBeVisible();
    await expect(notFoundCard).toContainText('Resource #004 Not Available');

    // Content, attachments, and adjacent nav must NOT exist
    await expect(page.locator('.attachments-section')).toHaveCount(0);
    await expect(page.locator('.pdf-preview-section')).toHaveCount(0);
    await expect(page.locator('.resource-adjacent-nav')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(
      'Emergency Reserve & Contingency Calculator'
    );
  });

  test('9. Mobile responsiveness: No horizontal page overflow on narrow screens (375px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const id of ['001', '002', '003']) {
      await page.goto(`/resources/${id}`);

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
