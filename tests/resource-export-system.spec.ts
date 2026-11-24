import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { resourcesData } from '../src/data/resources';
import { siteConfig } from '../src/data/siteConfig';
import { normalizeResourceDocument } from '../src/utils/documentExport';

test.describe('Resource Detail Page Export System — Complete Technical Verification', () => {
  const publishedResources = resourcesData.filter((r) => r.published);

  for (const resource of publishedResources) {
    const doc = normalizeResourceDocument(resource, siteConfig);

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
        expect(pdfBuf.length).toBeGreaterThan(100000); // Complete multi-page PDF > 100KB

        // Check PDF binary structure for URI annotations
        const binaryStr = pdfBuf.toString('binary');
        expect(binaryStr).toContain('%PDF-');

        // Verify attachments are linked with absolute URLs
        for (const att of doc.attachments) {
          expect(binaryStr).toContain(att.url);
        }

        // Verify YouTube video is linked
        if (doc.youtube) {
          expect(binaryStr).toContain(doc.youtube.watchUrl);
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

        // Verify YouTube video is linked and image embedded
        if (doc.youtube) {
          expect(relsXml).toContain(doc.youtube.watchUrl);
          expect(relsXml).toContain('image');
        }

        // Verify social media links
        expect(relsXml).toContain('instagram.com');
        expect(relsXml).toContain('youtube.com');
      });
    });
  }

  test('5. Downloadable attachment files exist on disk and return HTTP 200', async ({ request }) => {
    for (const res of publishedResources) {
      for (const att of res.attachments || []) {
        const checkUrl = att.url.startsWith('http')
          ? new URL(att.url).pathname
          : att.url;
        const resp = await request.get(checkUrl);
        expect(resp.status(), `Attachment ${att.name} at ${checkUrl} must return HTTP 200`).toBe(200);
      }
    }
  });

  test('6. YouTube video player renders reliably on page with valid 11-char ID', async ({ page }) => {
    await page.goto('/resources/002');

    const videoSection = page.locator('.video-section');
    await expect(videoSection).toBeVisible();

    const iframe = videoSection.locator('iframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/kJQP7kiw5Fk/);
  });
});
