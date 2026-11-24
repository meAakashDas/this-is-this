import { chromium } from 'playwright';
import { resourcesData } from '../src/data/resources.ts';
import { siteConfig } from '../src/data/siteConfig.ts';
import { normalizeResourceDocument, generateResourcePdfHtml } from '../src/utils/documentExport.ts';
import fs from 'node:fs';
import path from 'node:path';

async function previewAllPdfPages() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  const res2 = resourcesData.find(r => r.resourceNumber === '002');
  const doc = normalizeResourceDocument(res2, siteConfig);
  const thumbPath = path.resolve('public/images/thumbnails/kJQP7kiw5Fk.jpg');
  const thumbBuf = fs.readFileSync(thumbPath);
  const thumbBase64 = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`;

  const html = generateResourcePdfHtml(doc, thumbBase64);
  await page.setContent(html);

  await page.screenshot({ path: 'public/screenshots/refinement/pdf-html-full-preview.png', fullPage: true });
  await browser.close();
  console.log('Full PDF HTML preview saved to public/screenshots/refinement/pdf-html-full-preview.png');
}

previewAllPdfPages().catch(console.error);
