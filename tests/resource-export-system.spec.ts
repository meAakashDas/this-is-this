import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { SiteConfig } from '../src/types/index';
import { getPublicResources, getPublicSiteConfig } from '../src/lib/cms/contentLoader';
import { siteConfig as defaultSiteConfig } from '../src/data/siteConfig';
import { normalizeResourceDocument } from '../src/utils/documentExport';
import { extractYouTubeVideosFromBlocks } from '../src/utils/youtube';

function collectExpectedYouTubeVideos(resource: any, doc: ReturnType<typeof normalizeResourceDocument>) {
  const fromBlocks = [
    ...extractYouTubeVideosFromBlocks(Array.isArray(resource.blocknoteJson) ? resource.blocknoteJson : []),
    ...extractYouTubeVideosFromBlocks(Array.isArray(doc.contentBlocks) ? doc.contentBlocks : []),
  ];
  const seen = new Set<string>();
  const unique: Array<{ videoId: string; watchUrl: string; originalUrl: string }> = [];
  for (const v of fromBlocks) {
    if (!seen.has(v.videoId)) {
      seen.add(v.videoId);
      unique.push({ videoId: v.videoId, watchUrl: v.watchUrl, originalUrl: v.originalUrl });
    }
  }
  if (doc.youtube && !seen.has(doc.youtube.videoId)) {
    unique.push({
      videoId: doc.youtube.videoId,
      watchUrl: doc.youtube.watchUrl,
      originalUrl: doc.youtube.watchUrl,
    });
  }
  return unique;
}

test.describe('Resource Detail Page Export System — Complete Technical Verification', () => {
  const siteConfig = { ...defaultSiteConfig, ...getPublicSiteConfig() } as SiteConfig;
  const publishedResources = getPublicResources();

  for (const resource of publishedResources) {
    const doc = normalizeResourceDocument(resource, siteConfig);
    const expectedVideos = collectExpectedYouTubeVideos(resource, doc);

    test.describe(`Resource #${doc.resourceNumber}: "${doc.title}"`, () => {
      test('1. Detail page renders action buttons with dynamic, standard filenames', async ({ page }) => {
        await page.goto(`/resources/${doc.resourceNumber}`);

        const topActions = page.locator('.resource-top-actions');
        await expect(topActions).toBeVisible();

        // Save as PDF button
        const savePdf = topActions.locator('a.btn-save-pdf');
        await expect(savePdf).toBeVisible();
        await expect(savePdf).toContainText('Save as PDF');
        await expect(savePdf).toHaveAttribute('download', doc.pdfFilename);

        // Save as DOCX button
        const saveDocx = topActions.locator('a.btn-save-docx');
        await expect(saveDocx).toBeVisible();
        await expect(saveDocx).toContainText('Save as DOCX');
        await expect(saveDocx).toHaveAttribute('download', doc.docxFilename);

        // View as PDF button
        const viewPdf = topActions.locator('a.btn-view-pdf');
        await expect(viewPdf).toBeVisible();
        await expect(viewPdf).toHaveAttribute('href', '#view-as-pdf');
      });

      test('2. View as PDF embedded viewer renders the complete document', async ({ page }) => {
        await page.goto(`/resources/${doc.resourceNumber}`);

        const previewSection = page.locator('#view-as-pdf');
        await expect(previewSection).toBeVisible();

        // Action buttons inside preview header
        const dlPdf = previewSection.locator('a.btn-download-pdf');
        await expect(dlPdf).toBeVisible();
        await expect(dlPdf).toHaveAttribute('download', doc.pdfFilename);

        const saveDocx = previewSection.locator('a.btn-save-docx');
        await expect(saveDocx).toBeVisible();
        await expect(saveDocx).toHaveAttribute('download', doc.docxFilename);

        // Object frame
        const pdfObject = previewSection.locator('object.pdf-object');
        await expect(pdfObject).toBeVisible();
      });

      test('3. Exported PDF exists, returns HTTP 200, and contains URI annotations & branding', async ({ request }) => {
        const primaryRes = await request.get(`/downloads/${doc.pdfFilename}`);
        expect(primaryRes.status()).toBe(200);
        const pdfBuf = await primaryRes.body();
        expect(pdfBuf.length).toBeGreaterThan(40000);

        // Check PDF binary structure for URI annotations
        const binaryStr = pdfBuf.toString('binary');
        expect(binaryStr).toContain('%PDF-');

        // Verify attachments are linked with absolute URLs
        for (const att of doc.attachments) {
          expect(binaryStr).toContain(att.url);
        }

        // Verify all inline and legacy YouTube videos are linked in PDF
        for (const yt of expectedVideos) {
          expect(binaryStr).toContain(yt.videoId);
        }
      });

      test('4. Exported DOCX exists, returns HTTP 200, and is a valid editable Office document', async ({ request }) => {
        const primaryRes = await request.get(`/downloads/${doc.docxFilename}`);
        expect(primaryRes.status()).toBe(200);
        const docxBuf = await primaryRes.body();
        expect(docxBuf.length).toBeGreaterThan(15000); // Complete DOCX > 15KB

        const localPath = path.resolve(`public/downloads/${doc.docxFilename}`);
        expect(fs.existsSync(localPath)).toBe(true);

        // Validate Office Open XML structure via unzip
        const docXml = execSync(`unzip -p "${localPath}" word/document.xml`).toString('utf-8');
        const relsXml = execSync(`unzip -p "${localPath}" word/_rels/document.xml.rels`).toString('utf-8');

        // Document contains title, headings, and branding (with XML-escaped entities)
        expect(docXml).toContain(doc.title.replace(/&/g, '&amp;'));
        expect(docXml).toContain('About Resource');
        expect(docXml).toContain('Read Me');
        expect(docXml).toContain('Aakash Das');

        // Verify attachments are linked in rels
        for (const att of doc.attachments) {
          expect(relsXml).toContain(att.url);
        }

        // Verify YouTube videos are linked and thumbnails embedded when present
        for (const yt of expectedVideos) {
          expect(relsXml).toContain(yt.videoId);
        }
        if (expectedVideos.length > 0) {
          expect(docXml).toContain('Watch on YouTube');
        }

        // Verify social media links
        expect(relsXml).toContain('instagram.com');
        expect(relsXml).toContain('youtube.com');
      });
    });
  }

  test('5. Downloadable attachment files exist on disk and return HTTP 200', async ({ request }) => {
    for (const res of publishedResources) {
      const doc = normalizeResourceDocument(res, siteConfig);
      const pdfResp = await request.get(`/downloads/${doc.pdfFilename}`);
      expect(pdfResp.status(), `Generated PDF /downloads/${doc.pdfFilename} must return HTTP 200`).toBe(200);
      const docxResp = await request.get(`/downloads/${doc.docxFilename}`);
      expect(docxResp.status(), `Generated DOCX /downloads/${doc.docxFilename} must return HTTP 200`).toBe(200);

      for (const att of res.attachments || []) {
        const checkUrl = att.url.startsWith('http')
          ? new URL(att.url).pathname
          : att.url;
        const resp = await request.get(checkUrl);
        expect(resp.status(), `Attachment ${att.name} at ${checkUrl} must return HTTP 200`).toBe(200);
      }
    }
  });

  test('6. YouTube video players render reliably on page with valid 11-char IDs', async ({ page }) => {
    const videoResources = publishedResources.filter(
      (res) => collectExpectedYouTubeVideos(res, normalizeResourceDocument(res, siteConfig)).length > 0
    );
    expect(videoResources.length).toBeGreaterThanOrEqual(1);

    for (const res of videoResources) {
      const doc = normalizeResourceDocument(res, siteConfig);
      const expectedVideos = collectExpectedYouTubeVideos(res, doc);
      await page.goto(`/resources/${res.resourceNumber}`);

      const iframes = page.locator(
        '.written-content-section iframe[src*="youtube-nocookie.com/embed/"], .video-section iframe[src*="youtube-nocookie.com/embed/"]'
      );
      await expect(iframes.first()).toBeVisible();
      expect(await iframes.count()).toBeGreaterThanOrEqual(expectedVideos.length);

      const renderedSrcs = await iframes.evaluateAll((els) =>
        els.map((el) => el.getAttribute('src') || '')
      );
      for (const yt of expectedVideos) {
        expect(
          renderedSrcs.some((src) => src.includes(`youtube-nocookie.com/embed/${yt.videoId}`)),
          `Missing YouTube embed ${yt.videoId} on /resources/${res.resourceNumber}`
        ).toBe(true);
      }
    }
  });
});
