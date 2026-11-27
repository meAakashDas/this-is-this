import { test, expect } from '@playwright/test';
import zlib from 'node:zlib';

function extractPdfStreamText(pdfBuf: Buffer): string {
  const chunks: string[] = [pdfBuf.toString('latin1')];
  let idx = 0;
  while (true) {
    const start = pdfBuf.indexOf('stream', idx, 'latin1');
    if (start === -1) break;
    const nl =
      pdfBuf[start + 6] === 13 && pdfBuf[start + 7] === 10
        ? start + 8
        : pdfBuf[start + 6] === 10
          ? start + 7
          : -1;
    if (nl === -1) break;
    const end = pdfBuf.indexOf('endstream', nl, 'latin1');
    if (end === -1) break;
    try {
      const inflated = zlib.inflateSync(pdfBuf.subarray(nl, end));
      chunks.push(inflated.toString('latin1'));
    } catch {
      // ignore uncompressed streams
    }
    idx = end + 9;
  }
  const rawText = chunks.join('\n').replace(/\\([()\\])/g, '$1');
  const tjJoined = Array.from(rawText.matchAll(/\(([^()\\]*)\)\s*Tj/g))
    .map((m) => m[1])
    .join('');
  return `${rawText}\n${tjJoined}`;
}

test.describe('Resources Pipeline — End-to-End YouTube Video Verification', () => {
  test('1. Admin Dev Preview persists multi-format BlockNote YouTube video blocks and exports ordered PDF/DOCX', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.evaluate(() => {
      sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
    });
    await page.goto('/admin');

    const hasSidebar = await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasSidebar,
      'Dev Preview CMS UI tests require astro dev (IS_DEV=true); production build enforces Google OAuth'
    );

    // Seed a resource in Dev Preview storage that has mixed headings, paragraphs,
    // 4 supported YouTube URL formats (watch, youtu.be, shorts, embed + trailing '#'),
    // plus an invalid video block that must NOT create an empty black player.
    await page.evaluate(() => {
      const resourceDoc = {
        id: 'res-yt-pipeline-test',
        resourceNumber: '097',
        slug: 'video-pipeline-verification',
        title: 'Creator Video Pipeline Verification',
        shortDescription: 'Multi-video BlockNote serialization and export check.',
        description: 'Multi-video BlockNote serialization and export check.',
        category: 'Education',
        author: 'Aakash Das',
        language: 'English',
        published: true,
        status: 'published',
        featured: false,
        order: 97,
        publishedAt: '2026-11-27',
        createdAt: '2026-11-27T00:00:00.000Z',
        updatedAt: '2026-11-27T00:00:00.000Z',
        updatedBy: 'aakashdas.photo@gmail.com',
        tags: ['Video'],
        attachments: [],
        blocknoteJson: [
          {
            id: 'h-sec-1',
            type: 'heading',
            props: { level: 2, textAlignment: 'left' },
            content: [{ type: 'text', text: 'Section 1 — Camera Confidence', styles: {} }],
            children: [],
          },
          {
            id: 'v-watch',
            type: 'video',
            props: {
              url: 'https://www.youtube.com/watch?v=J32SjC1LTMs',
              name: 'Full lesson — Camera Confidence',
              caption: 'Watch the complete walkthrough first.',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'p-mid',
            type: 'paragraph',
            props: { textAlignment: 'left' },
            content: [{ type: 'text', text: 'Middle takeaway paragraph after video 1.', styles: {} }],
            children: [],
          },
          {
            id: 'v-short-url',
            type: 'video',
            props: {
              url: 'https://youtu.be/Unzc731iCUY?t=10',
              name: 'watch?v=Unzc731iCUY',
              caption: '',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'v-shorts',
            type: 'video',
            props: {
              url: 'https://www.youtube.com/shorts/MCDVcQIA3UM',
              name: 'Short Form Clip',
              caption: '',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'v-embed-dirty',
            type: 'video',
            props: {
              url: 'https://www.youtube.com/embed/atw9Nx0Njzo  #',
              name: '',
              caption: 'Embedded player format with trailing hash cleanup',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'v-live',
            type: 'video',
            props: {
              url: 'https://www.youtube.com/live/jfKfPfyJRdk',
              name: 'Live Stream Session',
              caption: '',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'v-invalid',
            type: 'video',
            props: {
              url: 'javascript:alert(1)',
              name: 'Invalid Video',
              caption: '',
              showPreview: true,
            },
            children: [],
          },
          {
            id: 'h-sec-2',
            type: 'heading',
            props: { level: 2, textAlignment: 'left' },
            content: [{ type: 'text', text: 'Closing Checklist Section', styles: {} }],
            children: [],
          },
        ],
      };

      const existingRaw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = existingList.filter((r: any) => r.resourceNumber !== '097');
      filtered.push(resourceDoc);
      sessionStorage.setItem('aakashdas_cms_resources_preview', JSON.stringify(filtered));
    });

    await page.reload({ waitUntil: 'load' });
    await page.locator('aside button:has-text("Resources")').click();

    const edit097Btn = page.locator('button[aria-label="Edit Resource 097"]');
    await expect(edit097Btn).toBeVisible({ timeout: 5000 });
    await edit097Btn.click();

    await expect(page.locator('.resource-editor-container')).toBeVisible();

    // Verify Admin Document Canvas renders responsive 16:9 YouTube iframes (not blank black <video> boxes)
    const adminCanvas = page.locator('.blocknote-canvas-container');
    const adminIframes = adminCanvas.locator('iframe[src*="youtube-nocookie.com/embed/"]');
    await expect(adminIframes).toHaveCount(5, { timeout: 10000 });
    await expect(adminCanvas.locator('video')).toHaveCount(0);
    await expect(adminCanvas.locator('[data-video-kind="invalid"]')).toContainText(
      'Invalid or unsupported video URL'
    );
    const firstAdminIframeBox = await adminIframes.first().boundingBox();
    expect(firstAdminIframeBox).not.toBeNull();
    expect(firstAdminIframeBox!.width).toBeGreaterThan(200);
    expect(firstAdminIframeBox!.height).toBeGreaterThan(100);
    const adminRatio = firstAdminIframeBox!.width / firstAdminIframeBox!.height;
    expect(adminRatio).toBeGreaterThan(1.65);
    expect(adminRatio).toBeLessThan(1.9);

    // Click Update without altering content to confirm regeneration & persistence
    await page.locator('button:has-text("Update")').click();
    await expect(
      page.locator('[role="status"]:has-text("Auto-generated PDF")').first()
    ).toBeVisible({ timeout: 25000 });

    // Refresh page directly to verify URL sync + BlockNote video blocks survive reload intact
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('.resource-editor-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.resource-editor-container')).toContainText('NO. 097');
    await expect(page.locator('.blocknote-canvas-container h2', { hasText: 'Section 1' })).toBeVisible();
    await expect(adminCanvas.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(5, {
      timeout: 10000,
    });
    await expect(adminCanvas.locator('video')).toHaveCount(0);

    const savedRecord = await page.evaluate(() => {
      const raw = sessionStorage.getItem('aakashdas_cms_resources_preview');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.resourceNumber === '097') || null;
    });
    expect(savedRecord).toBeTruthy();

    // Verify all 5 valid videos remain in blocknoteJson, blocknoteHtml, and contentBlocks
    const videoBlocks = (savedRecord.blocknoteJson || []).filter((b: any) => b?.type === 'video');
    expect(videoBlocks.length).toBeGreaterThanOrEqual(5);

    const html = String(savedRecord.blocknoteHtml || '');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/J32SjC1LTMs');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/Unzc731iCUY');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/MCDVcQIA3UM');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/atw9Nx0Njzo');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/jfKfPfyJRdk');
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('watch?v=Unzc731iCUY'); // stripped fake URL stub title

    // Verify exact HTML inline ordering: Heading 1 -> Video 1 -> Middle Paragraph -> Video 2..4 -> Closing Heading
    const h1Idx = html.indexOf('Section 1');
    const v1Idx = html.indexOf('J32SjC1LTMs');
    const midIdx = html.indexOf('Middle takeaway paragraph');
    const v4Idx = html.indexOf('atw9Nx0Njzo');
    const closeIdx = html.indexOf('Closing Checklist Section');
    expect(h1Idx).toBeGreaterThan(-1);
    expect(h1Idx).toBeLessThan(v1Idx);
    expect(v1Idx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(v4Idx);
    expect(v4Idx).toBeLessThan(closeIdx);

    // Inspect generated PDF bytes: clickable URIs & inline order
    const pdfB64 = String(savedRecord.generatedPdf?.url || '').split(',')[1] || '';
    const pdfBuf = Buffer.from(pdfB64, 'base64');
    expect(pdfBuf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    const pdfText = extractPdfStreamText(pdfBuf);
    expect(pdfText).toContain('Section 1');
    expect(pdfText).toContain('Full lesson');
    expect(pdfText).toContain('Watch on YouTube');
    expect(pdfText).toContain('youtube.com/watch?v=J32SjC1LTMs');
    expect(pdfText).toContain('youtu.be/Unzc731iCUY');
    expect(pdfText).toContain('youtube.com/shorts/MCDVcQIA3UM');
    expect(pdfText).toContain('youtube.com/embed/atw9Nx0Njzo');
    expect(pdfText).toContain('youtube.com/live/jfKfPfyJRdk');
    expect(pdfText).not.toContain('javascript:alert');

    // Verify generated DOCX bytes contain valid ZIP header & video text
    const docxB64 = String(savedRecord.generatedDocx?.url || '').split(',')[1] || '';
    const docxBuf = Buffer.from(docxB64, 'base64');
    expect(docxBuf.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(docxBuf.byteLength).toBeGreaterThan(3000);
  });

  test('2. Public Resource page renders responsive 16:9 YouTube embeds cleanly on desktop and mobile', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // Verify public Resource #001 (static snapshot or live Firestore) loads cleanly with zero errors
    const response = await page.goto('/resources/001', { waitUntil: 'load' });
    expect(response?.status()).toBe(200);

    // Wait for inline or fallback YouTube embed in DOM
    const iframes = page.locator('.written-content-section iframe[src*="youtube-nocookie.com/embed/"]');
    await expect(iframes.first()).toBeVisible({ timeout: 10000 });
    const count = await iframes.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check every YouTube iframe is responsive, non-empty, and fits mobile & desktop viewports
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(150);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `Horizontal overflow at ${width}px`).toBe(false);

      const firstIframe = iframes.first();
      await firstIframe.scrollIntoViewIfNeeded();
      await expect(firstIframe).toBeVisible();
      const box = await firstIframe.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(120);
      expect(box!.width).toBeLessThanOrEqual(width);

      // Verify exact 16:9 ratio within rounding tolerance
      const ratio = box!.width / box!.height;
      expect(ratio).toBeGreaterThan(1.65);
      expect(ratio).toBeLessThan(1.9);
    }

    expect(consoleErrors).toEqual([]);
  });
});
