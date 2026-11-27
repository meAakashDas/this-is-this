import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { Packer } from 'docx';
import { resourcesData } from '../src/data/resources.ts';
import { siteConfig } from '../src/data/siteConfig.ts';
import {
  normalizeResourceDocument,
  generateResourcePdfHtml,
} from '../src/utils/documentExport.ts';
import { generateResourceDocx } from '../src/utils/docxExport.ts';
import { extractYouTubeVideosFromBlocks } from '../src/utils/youtube.ts';

let resourcesToExport = resourcesData;
let activeSiteConfig = siteConfig;

const snapshotFile = path.resolve('src/data/cms-snapshot.json');
if (fs.existsSync(snapshotFile)) {
  try {
    const raw = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
    if (raw.resources && raw.resources.length > 0) {
      resourcesToExport = raw.resources.map((doc) => ({
        resourceNumber: doc.resourceNumber,
        title: doc.title,
        category: doc.category,
        publishedAt: doc.publishedAt,
        updatedAt: doc.updatedAtDate,
        published: doc.published,
        featured: doc.featured,
        downloadFormat: doc.downloadFormat,
        fileSize: doc.fileSize,
        downloadUrl: doc.downloadUrl,
        pdfPreviewUrl: doc.pdfPreviewUrl,
        docxUrl: doc.docxUrl,
        attachments: doc.attachments,
        youtubeEmbed: doc.youtubeEmbed,
        description: doc.description,
        tags: doc.tags || [],
        summaryPoints: doc.summaryPoints || [],
        targetAudience: doc.targetAudience,
        contentHtml: doc.contentHtml,
        contentJson: doc.contentJson,
        blocknoteJson: doc.blocknoteJson,
        blocknoteHtml: doc.blocknoteHtml,
        contentBlocks: doc.contentBlocks,
      }));
      console.log(`[Exports] Loaded ${resourcesToExport.length} resources from cms-snapshot.json.`);
    }
    if (raw.siteSettings) {
      activeSiteConfig = {
        ...siteConfig,
        name: raw.siteSettings.fullName || siteConfig.name,
        email: raw.siteSettings.email || siteConfig.email,
        url: raw.siteSettings.seo?.canonicalUrl || siteConfig.url,
      };
    }
  } catch (err) {
    console.warn('[Exports] Failed to parse cms-snapshot.json, using static fallback:', err.message);
  }
}

const outputDir = path.resolve('public/downloads');
const thumbsDir = path.resolve('public/images/thumbnails');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(thumbsDir)) {
  fs.mkdirSync(thumbsDir, { recursive: true });
}

async function ensureThumbnail(videoId) {
  if (!videoId) return null;
  const localPath = path.join(thumbsDir, `${videoId}.jpg`);

  if (!fs.existsSync(localPath)) {
    try {
      console.log(`Downloading YouTube thumbnail for ${videoId}...`);
      const res = await fetch(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(arrayBuf));
      }
    } catch (err) {
      console.warn(`Could not download thumbnail for ${videoId}:`, err.message);
    }
  }

  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  return null;
}

async function buildAllDocuments() {
  console.log('--- Starting Resource Document Export Generation ---');
  const published = resourcesToExport.filter((r) => r.published);
  console.log(`Found ${published.length} published resources to export.`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const res of published) {
    const doc = normalizeResourceDocument(res, activeSiteConfig);
    console.log(`\nProcessing Resource #${doc.resourceNumber}: "${doc.title}"...`);

    // 1. YouTube Thumbnail handling (for both inline BlockNote videos & legacy youtubeEmbed)
    let thumbnailBuffer = null;
    let thumbnailBase64 = undefined;
    const inlineThumbBase64Map = {};
    const inlineThumbBytesMap = {};

    const inlineVideos = extractYouTubeVideosFromBlocks(
      Array.isArray(doc.blocknoteJson) && doc.blocknoteJson.length > 0
        ? doc.blocknoteJson
        : doc.contentBlocks
    );
    const uniqueVideoIds = new Set(inlineVideos.map((v) => v.videoId));
    if (doc.youtube && doc.youtube.videoId) {
      uniqueVideoIds.add(doc.youtube.videoId);
    }

    for (const vId of uniqueVideoIds) {
      const buf = await ensureThumbnail(vId);
      if (buf) {
        inlineThumbBytesMap[vId] = buf;
        inlineThumbBase64Map[vId] = `data:image/jpeg;base64,${buf.toString('base64')}`;
      }
    }

    if (doc.youtube && doc.youtube.videoId && inlineThumbBytesMap[doc.youtube.videoId]) {
      thumbnailBuffer = inlineThumbBytesMap[doc.youtube.videoId];
      thumbnailBase64 = inlineThumbBase64Map[doc.youtube.videoId];
    }

    // 2. Generate PDF via Playwright
    const pdfHtml = generateResourcePdfHtml(doc, thumbnailBase64, inlineThumbBase64Map);
    const page = await browser.newPage();
    await page.setContent(pdfHtml, { waitUntil: 'load' });

    const primaryPdfPath = path.join(outputDir, doc.pdfFilename);
    await page.pdf({
      path: primaryPdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '22mm',
        left: '18mm',
        right: '18mm',
      },
    });

    const pdfStat = fs.statSync(primaryPdfPath);
    console.log(`  ✓ Generated PDF: ${doc.pdfFilename} (${(pdfStat.size / 1024).toFixed(1)} KB)`);

    // Copy to legacy filename if exists
    if (doc.legacyPdfFilename && doc.legacyPdfFilename !== doc.pdfFilename) {
      const legacyPath = path.join(outputDir, doc.legacyPdfFilename);
      fs.copyFileSync(primaryPdfPath, legacyPath);
      console.log(`    ↳ Alias: ${doc.legacyPdfFilename}`);
    }

    await page.close();

    // 3. Generate Genuine DOCX via docx library
    const docxDoc = generateResourceDocx(
      doc,
      thumbnailBuffer || undefined,
      undefined,
      inlineThumbBytesMap
    );
    const docxBuffer = await Packer.toBuffer(docxDoc);

    const primaryDocxPath = path.join(outputDir, doc.docxFilename);
    fs.writeFileSync(primaryDocxPath, docxBuffer);
    console.log(`  ✓ Generated DOCX: ${doc.docxFilename} (${(docxBuffer.length / 1024).toFixed(1)} KB)`);

    // Copy to legacy filename if exists
    if (doc.legacyDocxFilename && doc.legacyDocxFilename !== doc.docxFilename) {
      const legacyPath = path.join(outputDir, doc.legacyDocxFilename);
      fs.copyFileSync(primaryDocxPath, legacyPath);
      console.log(`    ↳ Alias: ${doc.legacyDocxFilename}`);
    }
  }

  await browser.close();
  console.log('\n--- Resource Document Export Generation Complete ---');
}

buildAllDocuments().catch(console.error);
