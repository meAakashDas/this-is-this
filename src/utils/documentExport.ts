import type { Resource, ContentBlock, SiteConfig } from '../types';
import { htmlToContentBlocks } from './contentConverter.ts';
import { blockNoteToContentBlocks, blockNoteToHtml } from './blockNoteMigration.ts';

export interface NormalizedAttachment {
  id: string;
  name: string;
  format: string;
  fileSize: string;
  url: string; // Absolute URL for external document usage
  relativeUrl: string; // Relative URL for same-origin downloads
}

export interface NormalizedYouTube {
  videoId: string;
  title: string;
  caption?: string;
  watchUrl: string;
  thumbnailUrl: string;
}

export interface NormalizedSocialLink {
  platform: string;
  url: string;
}

export interface NormalizedAuthor {
  name: string;
  website: string;
  socialLinks: NormalizedSocialLink[];
}

export interface NormalizedResourceDocument {
  resourceNumber: string;
  title: string;
  publishedAt: string;
  updatedAt?: string;
  description: string;
  category: string;
  targetAudience?: string;
  summaryPoints?: string[];
  contentHtml?: string;
  blocknoteJson?: any[];
  contentBlocks: ContentBlock[];
  attachments: NormalizedAttachment[];
  youtube?: NormalizedYouTube;
  author: NormalizedAuthor;
  canonicalUrl: string;
  slug: string;
  pdfFilename: string;
  docxFilename: string;
  legacyPdfFilename?: string;
  legacyDocxFilename?: string;
}

/**
 * Creates a URL-safe, lowercase kebab slug from a title string.
 */
export function getResourceSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Standardized dynamic export filename generator:
 * e.g. "resource-002-nepal-banking-account-checklist.pdf"
 */
export function getResourceExportFilename(
  resourceNumber: string,
  title: string,
  ext: 'pdf' | 'docx'
): string {
  const slug = getResourceSlug(title);
  return `resource-${resourceNumber}-${slug}.${ext}`;
}

/**
 * Normalizes any Resource into a consistent, validated document structure.
 */
export function normalizeResourceDocument(
  resource: Resource,
  siteConfig: SiteConfig
): NormalizedResourceDocument {
  const baseUrl = siteConfig.url.replace(/\/+$/, '');
  const slug = getResourceSlug(resource.title);
  const pdfFilename = getResourceExportFilename(resource.resourceNumber, resource.title, 'pdf');
  const docxFilename = getResourceExportFilename(resource.resourceNumber, resource.title, 'docx');

  // Derive legacy filenames for backwards compatibility
  const legacyPdfMap: Record<string, string> = {
    '001': 'starter-budget-template-001.pdf',
    '002': 'nepal-banking-checklist-002.pdf',
    '003': 'student-productivity-tracker-003.pdf',
  };
  const legacyDocxMap: Record<string, string> = {
    '001': 'starter-budget-template-001.docx',
    '002': 'nepal-banking-checklist-002.docx',
    '003': 'student-productivity-tracker-003.docx',
  };

  // Normalize attachments with absolute URLs
  const attachments: NormalizedAttachment[] = (resource.attachments || []).map((att) => {
    const rawUrl = att.url || '';
    const isAbsolute = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
    const absoluteUrl = isAbsolute
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    const relativeUrl = isAbsolute
      ? rawUrl.replace(/^https?:\/\/[^/]+/, '')
      : rawUrl.startsWith('/')
        ? rawUrl
        : `/${rawUrl}`;

    return {
      id: att.id,
      name: att.name,
      format: att.format || 'Downloadable File',
      fileSize: att.fileSize || 'Standard',
      url: absoluteUrl,
      relativeUrl,
    };
  });

  // Normalize YouTube video data
  let youtube: NormalizedYouTube | undefined;
  if (resource.youtubeEmbed && resource.youtubeEmbed.videoId) {
    const vId = resource.youtubeEmbed.videoId;
    youtube = {
      videoId: vId,
      title: resource.youtubeEmbed.title || 'Video Walkthrough',
      caption: resource.youtubeEmbed.caption,
      watchUrl: `https://www.youtube.com/watch?v=${vId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
    };
  }

  // Normalize verified social links from siteConfig
  const socialLinks: NormalizedSocialLink[] = (siteConfig.socialLinks || []).map((s) => ({
    platform: s.platform,
    url: s.url,
  }));

  const hasCanvasJson = Array.isArray(resource.blocknoteJson) && resource.blocknoteJson.length > 0;
  let contentBlocks = resource.contentBlocks || [];
  if (hasCanvasJson) {
    contentBlocks = blockNoteToContentBlocks(resource.blocknoteJson);
  } else if (contentBlocks.length === 0 && resource.contentHtml) {
    contentBlocks = htmlToContentBlocks(resource.contentHtml);
  }

  const effectiveHtml =
    resource.blocknoteHtml ||
    resource.contentHtml ||
    (hasCanvasJson ? blockNoteToHtml(resource.blocknoteJson) : undefined);

  // Avoid duplicating legacy summaryPoints / targetAudience when rich Document Canvas
  // content already serves as the single source of truth.
  const hasRichCanvas = hasCanvasJson || Boolean(effectiveHtml && effectiveHtml.trim());

  return {
    resourceNumber: resource.resourceNumber,
    title: resource.title,
    publishedAt: resource.publishedAt,
    updatedAt: resource.updatedAt,
    description: resource.description,
    category: resource.category,
    targetAudience: hasRichCanvas ? undefined : resource.targetAudience,
    summaryPoints: hasRichCanvas ? [] : (resource.summaryPoints || []),
    contentHtml: effectiveHtml,
    blocknoteJson: hasCanvasJson ? resource.blocknoteJson : undefined,
    contentBlocks,
    attachments,
    youtube,
    author: {
      name: siteConfig.name,
      website: baseUrl,
      socialLinks,
    },
    canonicalUrl: `${baseUrl}/resources/${resource.resourceNumber}`,
    slug,
    pdfFilename,
    docxFilename,
    legacyPdfFilename: legacyPdfMap[resource.resourceNumber],
    legacyDocxFilename: legacyDocxMap[resource.resourceNumber],
  };
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates an Apple Editorial Minimal HTML document specifically tuned for A4 PDF rendering.
 */
export function generateResourcePdfHtml(
  doc: NormalizedResourceDocument,
  thumbnailBase64?: string
): string {
  // Content blocks rendering or continuous HTML
  let contentHtml = '';

  if (doc.contentHtml && doc.contentHtml.trim()) {
    contentHtml = `<div class="notion-document-content">${doc.contentHtml}</div>`;
  } else {
    for (const block of doc.contentBlocks) {
      if (block.type === 'heading') {
        const tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
        contentHtml += `<${tag} class="content-heading level-${block.level}">${escapeHtml(block.text)}</${tag}>`;
      } else if (block.type === 'paragraph') {
        contentHtml += `<p class="content-p">${escapeHtml(block.text)}</p>`;
      } else if (block.type === 'blockquote') {
        contentHtml += `
          <blockquote class="content-quote">
            <p class="quote-text">"${escapeHtml(block.text)}"</p>
            ${block.caption ? `<cite class="quote-caption">— ${escapeHtml(block.caption)}</cite>` : ''}
          </blockquote>
        `;
      } else if (block.type === 'bulletList') {
        contentHtml += `
          <ul class="content-list bullet-list">
            ${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        `;
      } else if (block.type === 'orderedList') {
        contentHtml += `
          <ol class="content-list ordered-list">
            ${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ol>
        `;
      } else if (block.type === 'callout') {
        const variantClass = block.variant ? `callout-${block.variant}` : 'callout-info';
        contentHtml += `
          <div class="content-callout ${variantClass}">
            <div class="callout-title">${escapeHtml(block.title || 'Important Note')}</div>
            <div class="callout-body">${escapeHtml(block.text)}</div>
          </div>
        `;
      } else if (block.type === 'table') {
        contentHtml += `
          <div class="table-container">
            ${block.caption ? `<div class="table-caption">${escapeHtml(block.caption)}</div>` : ''}
            <table class="content-table">
              <thead>
                <tr>
                  ${(block.headers || []).map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(block.rows || [])
                  .map(
                    (row) => `
                  <tr>
                    ${row
                      .map((cell, idx) =>
                        idx === 0
                          ? `<th scope="row" class="row-header">${escapeHtml(cell)}</th>`
                          : `<td>${escapeHtml(cell)}</td>`
                      )
                      .join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  }

  // Attachments section HTML
  let attachmentsHtml = '';
  if (doc.attachments.length > 0) {
    attachmentsHtml = `
      <section class="doc-section attachments-section">
        <h2 class="section-title">Downloadable Resources</h2>
        <p class="section-lead">The following downloadable resources and working files accompany this publication. Click any link to download directly:</p>
        <div class="attachments-grid">
          ${doc.attachments
            .map(
              (att) => `
            <div class="attachment-card">
              <div class="attachment-header">
                <span class="attachment-title">${escapeHtml(att.name)}</span>
                <span class="attachment-badge">${escapeHtml(att.format)}</span>
              </div>
              <div class="attachment-meta">
                <span>File Size: ${escapeHtml(att.fileSize)}</span>
              </div>
              <div class="attachment-actions">
                <a href="${escapeHtml(att.url)}" class="attachment-link" target="_blank" rel="noopener">
                  Download Resource (${escapeHtml(att.format)}) &rarr;
                </a>
                <span class="attachment-url">${escapeHtml(att.url)}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // YouTube section HTML
  let youtubeHtml = '';
  if (doc.youtube) {
    const thumbSrc = thumbnailBase64 || doc.youtube.thumbnailUrl;
    youtubeHtml = `
      <section class="doc-section video-section">
        <h2 class="section-title">Video Walkthrough</h2>
        <div class="video-card">
          <div class="video-info">
            <h3 class="video-title">${escapeHtml(doc.youtube.title)}</h3>
            ${doc.youtube.caption ? `<p class="video-caption">${escapeHtml(doc.youtube.caption)}</p>` : ''}
          </div>
          <div class="video-thumbnail-wrap">
            <a href="${escapeHtml(doc.youtube.watchUrl)}" target="_blank" rel="noopener" class="video-link" aria-label="Watch video on YouTube">
              <img src="${thumbSrc}" alt="${escapeHtml(doc.youtube.title)}" class="video-thumbnail" />
              <div class="video-play-overlay">
                <span class="play-badge">&#9658; Watch on YouTube</span>
              </div>
            </a>
          </div>
          <div class="video-link-bar">
            <strong>Direct Streaming Link:</strong>
            <a href="${escapeHtml(doc.youtube.watchUrl)}" target="_blank" rel="noopener" class="direct-youtube-link">
              ${escapeHtml(doc.youtube.watchUrl)}
            </a>
          </div>
        </div>
      </section>
    `;
  }

  // Social Links HTML
  const socialLinksHtml = doc.author.socialLinks
    .map(
      (s) =>
        `<a href="${escapeHtml(s.url)}" class="footer-social-link" target="_blank" rel="noopener">${escapeHtml(s.platform)}</a>`
    )
    .join(' <span class="footer-sep">&bull;</span> ');

  const hasMeaningfulDesc =
    Boolean(doc.description?.trim()) &&
    doc.description.trim().toLowerCase() !== doc.title.trim().toLowerCase() &&
    !/^resource #\d+$/i.test(doc.description.trim());

  const aboutSectionHtml = hasMeaningfulDesc
    ? `
  <!-- About Resource -->
  <section class="doc-section">
    <h2 class="section-title">About Resource</h2>
    <p class="overview-text">${escapeHtml(doc.description)}</p>
  </section>
  `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(doc.title)} — Aakash Das</title>
  <style>
    @page {
      size: A4;
      margin: 22mm 18mm 24mm 18mm;
      @bottom-left {
        content: "Aakash Das • ${escapeHtml(doc.author.website)}";
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 8.5pt;
        color: #71717A;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 8.5pt;
        color: #71717A;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #18181B;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
    }

    /* Minimal Top Branding Banner */
    .doc-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 24px;
      border-bottom: 1px solid #E4E4E7;
      font-size: 9.5pt;
    }
    .doc-top-brand {
      font-weight: 600;
      color: #111111;
      letter-spacing: -0.01em;
    }
    .doc-top-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #71717A;
      font-weight: 500;
    }

    /* Title Block */
    .doc-header {
      margin-bottom: 28px;
    }
    .badge-row {
      margin-bottom: 8px;
    }
    .resource-badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      font-weight: 600;
      color: #52525B;
      background: #F4F4F5;
      border: 1px solid #E4E4E7;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .doc-title {
      font-size: 22pt;
      font-weight: 700;
      color: #09090B;
      line-height: 1.25;
      letter-spacing: -0.025em;
      margin: 0 0 10px 0;
    }
    .doc-meta {
      font-size: 9pt;
      color: #71717A;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Sections */
    .doc-section {
      margin-top: 24px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 13.5pt;
      font-weight: 700;
      color: #09090B;
      letter-spacing: -0.015em;
      margin: 0 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #F4F4F5;
      page-break-after: avoid;
    }
    .section-lead {
      font-size: 9.5pt;
      color: #52525B;
      margin: 0 0 14px 0;
    }

    .overview-text {
      font-size: 11pt;
      line-height: 1.65;
      color: #27272A;
      margin: 0;
    }

    /* Downloadable Resources Cards */
    .attachments-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      page-break-inside: avoid;
    }
    .attachment-card {
      border: 1px solid #E4E4E7;
      border-radius: 8px;
      padding: 14px 16px;
      background: #FAFAFA;
      page-break-inside: avoid;
    }
    .attachment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .attachment-title {
      font-size: 10.5pt;
      font-weight: 600;
      color: #111111;
    }
    .attachment-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8pt;
      font-weight: 600;
      background: #E4E4E7;
      color: #3F3F46;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .attachment-meta {
      font-size: 8.5pt;
      color: #71717A;
      margin-bottom: 8px;
    }
    .attachment-actions {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .attachment-link {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0969DA;
      text-decoration: underline;
    }
    .attachment-url {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8pt;
      color: #71717A;
      word-break: break-all;
    }

    /* Content Typography */
    .content-heading {
      color: #111111;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    .content-heading.level-1 { font-size: 14pt; font-weight: 700; }
    .content-heading.level-2 { font-size: 12pt; font-weight: 700; }
    .content-heading.level-3 { font-size: 11pt; font-weight: 600; }
    .content-p {
      margin: 0 0 12px 0;
      color: #27272A;
    }
    .content-list {
      margin: 8px 0 14px 22px;
      padding: 0;
      color: #27272A;
    }
    .content-list li {
      margin-bottom: 6px;
    }
    .content-quote {
      margin: 16px 0;
      padding: 10px 16px;
      border-left: 3px solid #18181B;
      background: #F9FAFB;
      page-break-inside: avoid;
    }
    .quote-text {
      margin: 0;
      font-style: italic;
      color: #111111;
    }
    .quote-caption {
      display: block;
      margin-top: 4px;
      font-size: 8.5pt;
      font-style: normal;
      color: #71717A;
    }
    .content-callout {
      margin: 16px 0;
      padding: 12px 16px;
      border: 1px solid #E4E4E7;
      border-radius: 6px;
      background: #F4F4F5;
      page-break-inside: avoid;
    }
    .callout-title {
      font-weight: 600;
      font-size: 9.5pt;
      margin-bottom: 4px;
      color: #18181B;
    }
    .callout-body {
      font-size: 9.5pt;
      color: #3F3F46;
      line-height: 1.5;
    }

    /* Tables */
    .table-container {
      margin: 18px 0;
      page-break-inside: avoid;
    }
    .table-caption {
      font-size: 9pt;
      font-style: italic;
      color: #71717A;
      margin-bottom: 6px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      text-align: left;
    }
    .content-table th, .content-table td {
      padding: 8px 10px;
      border: 1px solid #E4E4E7;
      vertical-align: top;
    }
    .content-table thead th {
      background: #F4F4F5;
      font-weight: 600;
      color: #18181B;
      border-bottom: 2px solid #D4D4D8;
    }
    .content-table tbody .row-header {
      font-weight: 600;
      background: #FAFAFA;
      color: #18181B;
    }

    /* Continuous Notion Document Rendering */
    .notion-document-content h1 { font-size: 15pt; font-weight: 700; color: #111111; margin: 22px 0 10px 0; page-break-after: avoid; }
    .notion-document-content h2 { font-size: 13.5pt; font-weight: 700; color: #111111; margin: 20px 0 8px 0; page-break-after: avoid; }
    .notion-document-content h3 { font-size: 12pt; font-weight: 600; color: #111111; margin: 16px 0 6px 0; page-break-after: avoid; }
    .notion-document-content h4 { font-size: 11pt; font-weight: 600; color: #27272A; margin: 14px 0 4px 0; page-break-after: avoid; }
    .notion-document-content p { margin: 0 0 12px 0; color: #27272A; line-height: 1.65; }
    .notion-document-content ul, .notion-document-content ol { margin: 8px 0 14px 22px; padding: 0; color: #27272A; }
    .notion-document-content li { margin-bottom: 6px; }
    .notion-document-content blockquote { margin: 16px 0; padding: 10px 16px; border-left: 3px solid #18181B; background: #F9FAFB; font-style: italic; page-break-inside: avoid; }
    .notion-document-content aside.callout-box, .notion-document-content .callout-box { margin: 16px 0; padding: 12px 16px; border: 1px solid #E4E4E7; border-radius: 6px; background: #F4F4F5; page-break-inside: avoid; }
    .notion-document-content .callout-box.warning { border-color: #FCD34D; background: #FFFBEB; }
    .notion-document-content .callout-box.tip { border-color: #A7F3D0; background: #ECFDF5; }
    .notion-document-content table { width: 100%; border-collapse: collapse; font-size: 9pt; text-align: left; margin: 18px 0; page-break-inside: avoid; }
    .notion-document-content th, .notion-document-content td { padding: 8px 10px; border: 1px solid #E4E4E7; vertical-align: top; }
    .notion-document-content th { background: #F4F4F5; font-weight: 600; color: #18181B; border-bottom: 2px solid #D4D4D8; }
    .notion-document-content hr { border: 0; height: 1px; background: #E4E4E7; margin: 24px 0; }
    .notion-document-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 16px auto; display: block; }
    .notion-document-content pre { background: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 6px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8.5pt; white-space: pre-wrap; margin: 14px 0; page-break-inside: avoid; }
    .notion-document-content code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9pt; background: #F4F4F5; padding: 1px 4px; border-radius: 3px; }
    .notion-document-content pre code { background: transparent; padding: 0; }
    .notion-document-content .editorial-checklist-list { list-style: none; margin-left: 4px; padding-left: 0; }
    .notion-document-content .checklist-box { display: inline-block; margin-right: 6px; font-weight: 700; color: #059669; }

    /* Video Section */
    .video-card {
      border: 1px solid #E4E4E7;
      border-radius: 8px;
      padding: 16px;
      background: #FAFAFA;
      page-break-inside: avoid;
    }
    .video-title {
      font-size: 11pt;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: #111111;
    }
    .video-caption {
      font-size: 9pt;
      color: #71717A;
      margin: 0 0 12px 0;
    }
    .video-thumbnail-wrap {
      margin-bottom: 12px;
      position: relative;
      display: inline-block;
      max-width: 440px;
    }
    .video-link {
      display: block;
      text-decoration: none;
      position: relative;
    }
    .video-thumbnail {
      width: 100%;
      max-width: 440px;
      height: auto;
      border-radius: 6px;
      border: 1px solid #D4D4D8;
      display: block;
    }
    .video-play-overlay {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(0,0,0,0.8);
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    .video-link-bar {
      font-size: 9pt;
      color: #3F3F46;
      margin-top: 8px;
    }
    .direct-youtube-link {
      color: #0969DA;
      text-decoration: underline;
      margin-left: 6px;
    }

    /* Document End Branding Strip */
    .doc-end-branding {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #E4E4E7;
      font-size: 8.5pt;
      color: #71717A;
      page-break-inside: avoid;
    }
    .footer-author {
      font-weight: 600;
      color: #18181B;
      margin-bottom: 4px;
    }
    .footer-social-row {
      margin-top: 6px;
      color: #71717A;
    }
    .footer-social-link {
      color: #0969DA;
      text-decoration: none;
    }
    .footer-social-link:hover {
      text-decoration: underline;
    }
    .footer-sep {
      color: #D4D4D8;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <!-- Minimal Top Header -->
  <div class="doc-top-bar">
    <span class="doc-top-brand">${escapeHtml(doc.author.name)}</span>
    <span class="doc-top-id">Resource #${escapeHtml(doc.resourceNumber)}</span>
  </div>

  <!-- Resource Title Block -->
  <header class="doc-header">
    <div class="badge-row">
      <span class="resource-badge">NO. ${escapeHtml(doc.resourceNumber)}</span>
    </div>
    <h1 class="doc-title">${escapeHtml(doc.title)}</h1>
    <div class="doc-meta">
      Published ${escapeHtml(doc.publishedAt)} &bull; AakashDas.live Educational Archive &bull; <a href="${escapeHtml(doc.canonicalUrl)}" style="color:inherit;text-decoration:none;">${escapeHtml(doc.canonicalUrl)}</a>
    </div>
  </header>

  ${aboutSectionHtml}

  <!-- Downloadable Resources -->
  ${attachmentsHtml}

  <!-- Read Me Section -->
  <section class="doc-section">
    <h2 class="section-title">Read Me</h2>

    ${
      doc.summaryPoints && doc.summaryPoints.length > 0
        ? `
      <div style="margin-bottom: 18px;">
        <h3 class="content-heading level-2">What’s Included</h3>
        <ul class="content-list bullet-list">
          ${doc.summaryPoints.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }

    ${
      doc.targetAudience
        ? `
      <div style="margin-bottom: 18px;">
        <h3 class="content-heading level-2">Intended For</h3>
        <p class="content-p">${escapeHtml(doc.targetAudience)}</p>
      </div>
    `
        : ''
    }

    ${contentHtml}
  </section>

  <!-- Video Walkthrough -->
  ${youtubeHtml}

  <!-- Minimal Personal Branding Footer Block -->
  <div class="doc-end-branding">
    <div class="footer-author">${escapeHtml(doc.author.name)} &bull; Educational Resources Archive</div>
    <div>Personal Website: <a href="${escapeHtml(doc.author.website)}" style="color:#0969DA;text-decoration:underline;">${escapeHtml(doc.author.website)}</a></div>
    <div class="footer-social-row">
      Connect: ${socialLinksHtml}
    </div>
  </div>
</body>
</html>`;
}
