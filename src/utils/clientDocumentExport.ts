import { jsPDF } from 'jspdf';
import { Packer } from 'docx';
import type { SiteConfig } from '../types/index.ts';
import type { ResourceDocument, GeneratedDocumentMeta } from '../types/cms/resource.ts';
import { siteConfig as defaultSiteConfig } from '../data/siteConfig.ts';
import {
  normalizeResourceDocument,
  getResourceExportFilename,
  isMeaningfulDescription,
  type NormalizedResourceDocument,
} from './documentExport.ts';
import { generateResourceDocx, type DocxImageAsset } from './docxExport.ts';
import {
  uploadBinaryPermanently,
  formatFileSizeBytes,
} from '../lib/cms/storageUpload.ts';
import {
  extractVideoBlockInfo,
  extractYouTubeVideosFromBlocks,
  type ParsedVideoBlock,
} from './youtube.ts';

export interface ClientThumbnailAsset {
  dataUrl: string;
  bytes: Uint8Array;
  type: 'JPEG';
}

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableSerialize((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

/**
 * Computes a deterministic content hash over educational content and metadata
 * so PDF & DOCX regeneration only runs when content actually changes.
 */
export async function computeResourceContentVersion(
  resource: Partial<ResourceDocument>
): Promise<string> {
  const canonical = stableSerialize({
    exportSchemaVersion: 3,
    resourceNumber: resource.resourceNumber || '',
    title: resource.title || '',
    shortDescription: resource.shortDescription || '',
    description: resource.description || '',
    blocknoteJson: resource.blocknoteJson || [],
    contentBlocks: resource.contentBlocks || [],
    attachments: (resource.attachments || []).map((a) => ({
      name: a.name,
      url: a.url,
      format: a.format,
      fileSize: a.fileSize,
    })),
    youtubeEmbed: resource.youtubeEmbed || null,
  });

  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 16);
  }

  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `v${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeWinAnsi(str: string): string {
  return str
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u2713/g, '[x]')
    .replace(/\u25CB/g, '[ ]')
    .replace(/\u2192/g, '->')
    .replace(/\u25B6/g, '>');
}

function hasNonLatinUnicode(str: string): boolean {
  return /[^\u0000-\u00FF]/.test(str);
}

function extractInlineText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const arr = Array.isArray(content)
    ? content
    : typeof content === 'object' && Array.isArray(content.content)
      ? content.content
      : [];
  return arr
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      if (item.type === 'link') {
        return Array.isArray(item.content) ? extractInlineText(item.content) : item.text || item.href || '';
      }
      if (Array.isArray(item.content)) return extractInlineText(item.content);
      return item.text || '';
    })
    .join('');
}

function renderUnicodeLineToDataUrl(
  text: string,
  fontSizePt: number,
  bold: boolean,
  maxWidthMm: number
): { dataUrl: string; widthMm: number; heightMm: number } | null {
  if (typeof document === 'undefined') return null;
  try {
    const pxPerMm = 3.7795275591;
    const scale = 2;
    const widthPx = Math.max(80, Math.round(maxWidthMm * pxPerMm));
    const fontPx = Math.round(fontSizePt * 1.3333);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const fontSpec = `${bold ? 'bold ' : ''}${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Devanagari", sans-serif`;
    ctx.font = fontSpec;

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > widthPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const lineHeightPx = Math.round(fontPx * 1.45);
    const totalHeightPx = Math.max(lineHeightPx, lines.length * lineHeightPx + 4);
    canvas.width = widthPx * scale;
    canvas.height = totalHeightPx * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, totalHeightPx);
    ctx.fillStyle = '#18181B';
    ctx.font = fontSpec;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, i * lineHeightPx + 2);
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthMm: maxWidthMm,
      heightMm: totalHeightPx / pxPerMm,
    };
  } catch {
    return null;
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function compressThumbnailForExport(rawBytes: Uint8Array): Promise<ClientThumbnailAsset> {
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const copy = new Uint8Array(rawBytes.byteLength);
      copy.set(rawBytes);
      const blob = new Blob([copy.buffer], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Image decode failed'));
          el.src = blobUrl;
        });
        const targetW = 320;
        const targetH = 180;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#09090B';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          const b64Part = dataUrl.split(',')[1] || '';
          if (b64Part) {
            return {
              dataUrl,
              bytes: base64ToUint8Array(b64Part),
              type: 'JPEG',
            };
          }
        }
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      // Fall back to original JPEG bytes cleanly
    }
  }

  return {
    dataUrl: `data:image/jpeg;base64,${uint8ArrayToBase64(rawBytes)}`,
    bytes: rawBytes,
    type: 'JPEG',
  };
}

/**
 * Fetches YouTube video thumbnails (`hqdefault.jpg`) for all unique inline/legacy video IDs.
 * Fails softly per video if offline or blocked so PDF/DOCX export always succeeds.
 */
export async function fetchYouTubeThumbnailsForClient(
  doc: NormalizedResourceDocument
): Promise<Record<string, ClientThumbnailAsset>> {
  const inlineVideos = extractYouTubeVideosFromBlocks(
    Array.isArray(doc.blocknoteJson) && doc.blocknoteJson.length > 0
      ? doc.blocknoteJson
      : doc.contentBlocks
  );
  const videoIds = new Set<string>(inlineVideos.map((v) => v.videoId));
  if (doc.youtube?.videoId) {
    videoIds.add(doc.youtube.videoId);
  }

  const map: Record<string, ClientThumbnailAsset> = {};
  if (videoIds.size === 0 || typeof fetch !== 'function') {
    return map;
  }

  await Promise.allSettled(
    Array.from(videoIds).map(async (videoId) => {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
        try {
          const res = await fetch(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, {
            signal: controller?.signal,
          });
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          if (!buf || buf.byteLength < 100) return;
          map[videoId] = await compressThumbnailForExport(new Uint8Array(buf));
        } finally {
          if (timer) clearTimeout(timer);
        }
      } catch {
        // Missing/unreachable thumbnail must never abort document generation
      }
    })
  );

  return map;
}

/**
 * Generates an actual A4 vector PDF file in browser/Node with full typography,
 * wrapped tables, lists, checklists, blockquotes, links, page numbers, videos, and images.
 */
export async function generateClientPdfBytes(
  doc: NormalizedResourceDocument,
  videoThumbnails: Record<string, ClientThumbnailAsset> = {}
): Promise<Uint8Array> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 18;
  const topY = 22;
  const bottomLimit = pageHeight - 22;
  const contentWidth = pageWidth - marginX * 2;
  let y = topY;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      pdf.addPage();
      y = topY;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(16);
    y += 1.5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(9, 9, 11);
    pdf.text(normalizeWinAnsi(title), marginX, y + 4.2);
    y += 6.2;
    pdf.setDrawColor(244, 244, 245);
    pdf.setLineWidth(0.35);
    pdf.line(marginX, y, pageWidth - marginX, y);
    pdf.setLineWidth(0.2);
    y += 4;
  };

  interface InlineSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
    mono?: boolean;
    linkUrl?: string;
    color?: [number, number, number];
  }

  const collectInlineSpans = (
    content: any,
    defaults: { bold?: boolean; italic?: boolean; mono?: boolean; color?: [number, number, number] } = {}
  ): InlineSpan[] => {
    if (!content) return [];
    if (typeof content === 'string') {
      return content ? [{ text: content, ...defaults }] : [];
    }
    const items = Array.isArray(content)
      ? content
      : typeof content === 'object' && Array.isArray(content.content)
        ? content.content
        : [];
    const spans: InlineSpan[] = [];
    for (const item of items) {
      if (typeof item === 'string') {
        if (item) spans.push({ text: item, ...defaults });
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      if (item.type === 'link') {
        const href = typeof item.href === 'string' && /^https?:\/\//i.test(item.href.trim()) ? item.href.trim() : undefined;
        const label = Array.isArray(item.content) ? extractInlineText(item.content) : item.text || href || '';
        if (label) {
          spans.push({
            text: label,
            bold: defaults.bold,
            italic: defaults.italic,
            linkUrl: href,
            color: href ? [9, 105, 218] : defaults.color,
          });
        }
        continue;
      }
      const st = item.styles || {};
      const txt = item.text || '';
      if (txt) {
        spans.push({
          text: txt,
          bold: Boolean(defaults.bold || st.bold),
          italic: Boolean(defaults.italic || st.italic),
          mono: Boolean(defaults.mono || st.code),
          color: defaults.color,
        });
      }
    }
    return spans;
  };

  const drawTextBlock = (
    rawText: string,
    opts: {
      fontSize?: number;
      bold?: boolean;
      italic?: boolean;
      mono?: boolean;
      color?: [number, number, number];
      indentMm?: number;
      lineGap?: number;
      spaceAfter?: number;
      linkUrl?: string;
    } = {}
  ) => {
    const text = normalizeWinAnsi(rawText || '');
    if (!text.trim()) return;
    const fontSize = opts.fontSize ?? 10.5;
    const indent = opts.indentMm ?? 0;
    const maxW = Math.max(30, contentWidth - indent);
    const lineHeight = fontSize * 0.352778 * (opts.lineGap ?? 1.45);

    if (hasNonLatinUnicode(text)) {
      const rendered = renderUnicodeLineToDataUrl(text, fontSize, Boolean(opts.bold), maxW);
      if (rendered) {
        ensureSpace(rendered.heightMm + 2);
        pdf.addImage(rendered.dataUrl, 'PNG', marginX + indent, y, rendered.widthMm, rendered.heightMm);
        y += rendered.heightMm + (opts.spaceAfter ?? 2);
        return;
      }
    }

    const family = opts.mono ? 'courier' : 'helvetica';
    const style =
      opts.bold && opts.italic
        ? 'bolditalic'
        : opts.bold
          ? 'bold'
          : opts.italic
            ? 'italic'
            : 'normal';

    pdf.setFont(family, style);
    pdf.setFontSize(fontSize);
    const [r, g, b] = opts.color ?? [24, 24, 27];
    pdf.setTextColor(r, g, b);

    const safeAscii = hasNonLatinUnicode(text) ? text.replace(/[^\u0020-\u00FF\n]/g, '?') : text;
    const lines = pdf.splitTextToSize(safeAscii, maxW) as string[];
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(lineHeight + 1);
      if (opts.linkUrl && i === 0) {
        pdf.textWithLink(lines[i], marginX + indent, y + fontSize * 0.3, { url: opts.linkUrl });
      } else {
        pdf.text(lines[i], marginX + indent, y + fontSize * 0.3);
      }
      y += lineHeight;
    }
    y += opts.spaceAfter ?? 2.5;
  };

  const drawRichParagraph = (
    spans: InlineSpan[],
    opts: {
      prefix?: string;
      prefixBold?: boolean;
      prefixColor?: [number, number, number];
      fontSize?: number;
      indentMm?: number;
      lineGap?: number;
      spaceAfter?: number;
      defaultColor?: [number, number, number];
    } = {}
  ) => {
    const plain = `${opts.prefix || ''}${spans.map((s) => s.text).join('')}`;
    if (!plain.trim()) return;

    if (hasNonLatinUnicode(plain)) {
      drawTextBlock(plain, {
        fontSize: opts.fontSize ?? 10.5,
        bold: spans.length > 0 && spans.every((s) => s.bold),
        indentMm: opts.indentMm ?? 0,
        lineGap: opts.lineGap ?? 1.45,
        spaceAfter: opts.spaceAfter ?? 2.5,
        color: opts.defaultColor ?? [39, 39, 42],
      });
      return;
    }

    const fontSize = opts.fontSize ?? 10.5;
    const indent = opts.indentMm ?? 0;
    const maxX = marginX + contentWidth;
    const lineHeight = fontSize * 0.352778 * (opts.lineGap ?? 1.45);
    const allSpans: InlineSpan[] = opts.prefix
      ? [
          {
            text: opts.prefix,
            bold: opts.prefixBold,
            color: opts.prefixColor ?? opts.defaultColor,
          },
          ...spans,
        ]
      : spans;

    // Tokenize into words/whitespace preserving style per token
    const tokens: Array<InlineSpan & { word: string }> = [];
    for (const sp of allSpans) {
      const clean = normalizeWinAnsi(sp.text);
      const parts = clean.split(/(\s+)/).filter((p) => p.length > 0);
      for (const word of parts) {
        tokens.push({ ...sp, word });
      }
    }

    let curX = marginX + indent;
    ensureSpace(lineHeight + 1);
    const baselineOffset = fontSize * 0.3;

    for (const tok of tokens) {
      const family = tok.mono ? 'courier' : 'helvetica';
      const style =
        tok.bold && tok.italic ? 'bolditalic' : tok.bold ? 'bold' : tok.italic ? 'italic' : 'normal';
      pdf.setFont(family, style);
      pdf.setFontSize(fontSize);

      const tokWidth = pdf.getTextWidth(tok.word);
      const isSpace = /^\s+$/.test(tok.word);

      if (!isSpace && curX > marginX + indent && curX + tokWidth > maxX) {
        y += lineHeight;
        ensureSpace(lineHeight + 1);
        curX = marginX + indent;
      }
      if (isSpace && curX === marginX + indent) {
        continue;
      }

      const [r, g, b] = tok.color ?? opts.defaultColor ?? [39, 39, 42];
      pdf.setTextColor(r, g, b);

      if (tok.linkUrl) {
        pdf.textWithLink(tok.word, curX, y + baselineOffset, { url: tok.linkUrl });
        pdf.setDrawColor(r, g, b);
        pdf.line(curX, y + baselineOffset + 0.6, curX + tokWidth, y + baselineOffset + 0.6);
      } else {
        pdf.text(tok.word, curX, y + baselineOffset);
      }
      curX += tokWidth;
    }

    y += lineHeight + (opts.spaceAfter ?? 2.5);
  };

  // =========================================================================
  // 1. Top Branding Banner (mirrors Resource #001 reference)
  // =========================================================================
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(17, 17, 17);
  pdf.text(normalizeWinAnsi(doc.author.name), marginX, y);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122);
  const rightIdText = `Resource #${doc.resourceNumber}`;
  pdf.text(rightIdText, pageWidth - marginX - pdf.getTextWidth(rightIdText), y);
  y += 3.5;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  // =========================================================================
  // 2. Resource Header Badge, Title & Canonical URL
  // =========================================================================
  const badgeText = `NO. ${doc.resourceNumber}`;
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(8.5);
  const badgeW = pdf.getTextWidth(badgeText) + 5;
  pdf.setFillColor(244, 244, 245);
  pdf.setDrawColor(228, 228, 231);
  pdf.roundedRect(marginX, y - 3.5, badgeW, 5.5, 1, 1, 'FD');
  pdf.setTextColor(82, 82, 91);
  pdf.text(badgeText, marginX + 2.5, y + 0.3);
  y += 5;

  drawTextBlock(doc.title, {
    fontSize: 20,
    bold: true,
    color: [9, 9, 11],
    lineGap: 1.25,
    spaceAfter: 2.5,
  });

  drawRichParagraph(
    [
      { text: `Published ${doc.publishedAt} • AakashDas.live Educational Archive • `, mono: true },
      { text: doc.canonicalUrl, mono: true, linkUrl: doc.canonicalUrl, color: [113, 113, 122] },
    ],
    { fontSize: 8, defaultColor: [113, 113, 122], spaceAfter: 5 }
  );

  // =========================================================================
  // 3. About Resource (meaningful description only)
  // =========================================================================
  if (isMeaningfulDescription(doc.description, doc.title)) {
    drawSectionTitle('About Resource');
    drawTextBlock(doc.description, { fontSize: 10.5, color: [39, 39, 42], spaceAfter: 5 });
  }

  // =========================================================================
  // 4. Downloadable Resources (cards + clickable permanent HTTPS links)
  // =========================================================================
  if (doc.attachments.length > 0) {
    drawSectionTitle('Downloadable Resources');
    drawTextBlock(
      'The following downloadable resources and working files accompany this publication. Click any link to download directly:',
      { fontSize: 9, color: [82, 82, 91], spaceAfter: 3 }
    );

    for (const att of doc.attachments) {
      const safeLinkUrl = /^https?:\/\//i.test(att.url) ? att.url : `${doc.canonicalUrl}#downloadable-resources`;
      const actionLabel = att.isInlineAsset
        ? `Download on Resource Page (${att.format}) ->`
        : `Download Resource (${att.format}) ->`;
      const cardHeight = 20;
      ensureSpace(cardHeight + 3);

      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(marginX, y, contentWidth, cardHeight, 1.8, 1.8, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(17, 17, 17);
      const safeName = normalizeWinAnsi(att.name || 'Attachment').slice(0, 62);
      pdf.text(safeName, marginX + 3.5, y + 5.5);

      const fmtBadge = normalizeWinAnsi(att.format || 'FILE');
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(7.5);
      const fmtW = pdf.getTextWidth(fmtBadge) + 4;
      pdf.setFillColor(228, 228, 231);
      pdf.roundedRect(pageWidth - marginX - fmtW - 3.5, y + 2.2, fmtW, 4.5, 1, 1, 'F');
      pdf.setTextColor(63, 63, 70);
      pdf.text(fmtBadge, pageWidth - marginX - fmtW - 1.5, y + 5.3);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.2);
      pdf.setTextColor(113, 113, 122);
      pdf.text(`File Size: ${normalizeWinAnsi(att.fileSize || 'Standard')}`, marginX + 3.5, y + 10);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(9, 105, 218);
      pdf.textWithLink(normalizeWinAnsi(actionLabel), marginX + 3.5, y + 14.5, { url: safeLinkUrl });

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(113, 113, 122);
      const clippedUrl = safeLinkUrl.length > 86 ? `${safeLinkUrl.slice(0, 83)}...` : safeLinkUrl;
      pdf.text(clippedUrl, marginX + 3.5, y + 18.2);

      y += cardHeight + 3;
    }
    y += 2;
  }

  // Render Table Helper (with Unicode cell rasterization when needed)
  const drawTable = (headers: string[], rows: string[][]) => {
    const colCount = Math.max(headers.length, rows[0]?.length || 1);
    const colWidth = contentWidth / colCount;
    const cellPadX = 2.2;
    const cellPadY = 2;

    const renderRow = (cells: string[], isHeader: boolean) => {
      pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(8.5);
      const cellImages: Array<{ dataUrl: string; widthMm: number; heightMm: number } | null> = [];
      const wrappedCells = cells.map((c, idx) => {
        const clean = normalizeWinAnsi(c || '');
        if (hasNonLatinUnicode(clean)) {
          const img = renderUnicodeLineToDataUrl(
            clean,
            8.5,
            isHeader || idx === 0,
            colWidth - cellPadX * 2
          );
          cellImages[idx] = img;
          return img ? [''] : ['?'];
        }
        cellImages[idx] = null;
        return pdf.splitTextToSize(clean || ' ', colWidth - cellPadX * 2) as string[];
      });
      const maxHeight = Math.max(
        8,
        ...wrappedCells.map((l, idx) => {
          const img = cellImages[idx];
          return img ? img.heightMm + cellPadY * 2 : l.length * 4 + cellPadY * 2;
        })
      );
      const rowHeight = maxHeight;

      if (y + rowHeight > bottomLimit) {
        pdf.addPage();
        y = topY;
        if (!isHeader && headers.length > 0) {
          renderRow(headers, true);
        }
      }

      cells.forEach((_, idx) => {
        const x = marginX + idx * colWidth;
        pdf.setFillColor(
          isHeader ? 244 : idx === 0 ? 250 : 255,
          isHeader ? 244 : idx === 0 ? 250 : 255,
          isHeader ? 245 : idx === 0 ? 250 : 255
        );
        pdf.setDrawColor(228, 228, 231);
        pdf.rect(x, y, colWidth, rowHeight, 'FD');
        const img = cellImages[idx];
        if (img) {
          pdf.addImage(img.dataUrl, 'PNG', x + cellPadX, y + cellPadY, img.widthMm, img.heightMm);
        } else {
          pdf.setFont('helvetica', isHeader || idx === 0 ? 'bold' : 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(24, 24, 27);
          const lines = wrappedCells[idx] || [''];
          lines.forEach((line, lIdx) => {
            pdf.text(line, x + cellPadX, y + cellPadY + 3 + lIdx * 4);
          });
        }
      });

      y += rowHeight;
    };

    if (headers.length > 0) renderRow(headers, true);
    for (const row of rows) renderRow(row, false);
    y += 4;
  };

  // Document Canvas Content
  drawSectionTitle('Read Me');

  if (doc.summaryPoints && doc.summaryPoints.length > 0) {
    drawTextBlock("What's Included", { fontSize: 11.5, bold: true, spaceAfter: 2 });
    for (const pt of doc.summaryPoints) {
      drawTextBlock(`[x] ${pt}`, { fontSize: 10, indentMm: 4, spaceAfter: 1.5 });
    }
  }
  if (doc.targetAudience) {
    drawTextBlock('Intended For', { fontSize: 11.5, bold: true, spaceAfter: 2 });
    drawTextBlock(doc.targetAudience, { fontSize: 10, spaceAfter: 3 });
  }

  const renderedVideoIds = new Set<string>();

  const drawVideoCard = (video: ParsedVideoBlock, indentMm: number = 0) => {
    const thumb = video.kind === 'youtube' ? videoThumbnails[video.videoId] : undefined;
    const hasThumb = Boolean(thumb?.dataUrl);
    const thumbW = 68;
    const thumbH = 38.25; // exact 16:9
    const titleLabel = video.title || (video.kind === 'youtube' ? 'YouTube Video' : 'Video Resource');
    const urlLines = pdf.splitTextToSize(
      normalizeWinAnsi(video.originalUrl),
      Math.max(40, contentWidth - indentMm - 8)
    ) as string[];
    const captionLines = video.caption
      ? (pdf.splitTextToSize(
          normalizeWinAnsi(video.caption),
          Math.max(40, contentWidth - indentMm - 8)
        ) as string[])
      : [];

    const estimatedHeight =
      10 +
      (captionLines.length > 0 ? captionLines.length * 4 + 2 : 0) +
      (hasThumb ? thumbH + 4 : 0) +
      6 +
      urlLines.length * 3.8 +
      5;

    ensureSpace(Math.min(estimatedHeight + 3, bottomLimit - topY));

    const cardX = marginX + indentMm;
    const cardW = Math.max(40, contentWidth - indentMm);
    const startY = y;

    // Pre-draw soft container background & border after measuring exact height below
    let innerY = startY + 5.5;

    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(228, 228, 231);
    pdf.roundedRect(cardX, startY, cardW, estimatedHeight, 1.8, 1.8, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(17, 17, 17);
    const safeTitle = normalizeWinAnsi(titleLabel).slice(0, 82);
    pdf.text(safeTitle, cardX + 4, innerY);
    innerY += 5;

    if (captionLines.length > 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8.5);
      pdf.setTextColor(113, 113, 122);
      for (const cLine of captionLines) {
        pdf.text(cLine, cardX + 4, innerY);
        innerY += 4;
      }
      innerY += 1.5;
    }

    if (hasThumb && thumb) {
      try {
        pdf.addImage(thumb.dataUrl, thumb.type, cardX + 4, innerY, thumbW, thumbH);
        pdf.setDrawColor(212, 212, 216);
        pdf.rect(cardX + 4, innerY, thumbW, thumbH, 'S');
        pdf.link(cardX + 4, innerY, thumbW, thumbH, { url: video.originalUrl });
        innerY += thumbH + 4.5;
      } catch {
        // Ignore broken image gracefully without empty gap
      }
    }

    if (video.kind === 'youtube') {
      renderedVideoIds.add(video.videoId);
      const watchLabel = 'Watch on YouTube ->';
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(9, 105, 218);
      pdf.textWithLink(watchLabel, cardX + 4, innerY, { url: video.originalUrl });
      const linkW = pdf.getTextWidth(watchLabel);
      pdf.setDrawColor(9, 105, 218);
      pdf.line(cardX + 4, innerY + 0.6, cardX + 4 + linkW, innerY + 0.6);
      innerY += 5;
    }

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(82, 82, 91);
    for (let uIdx = 0; uIdx < urlLines.length; uIdx++) {
      if (uIdx === 0) {
        pdf.textWithLink(urlLines[uIdx], cardX + 4, innerY, { url: video.originalUrl });
      } else {
        pdf.text(urlLines[uIdx], cardX + 4, innerY);
      }
      innerY += 3.8;
    }

    y = startY + estimatedHeight + 4;
  };

  const renderBlockNoteListToPdf = (blocks: any[], depth: number = 0) => {
    let orderedIdx = 0;
    const indentBase = depth * 5;
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'numberedListItem') orderedIdx += 1;
      else orderedIdx = 0;

      const text = extractInlineText(block.content);
      const spans = collectInlineSpans(block.content);
      switch (block.type) {
        case 'heading': {
          const level = Number(block.props?.level) || 2;
          const fontSize = level === 1 ? 14 : level === 2 ? 12.5 : 11;
          ensureSpace(14);
          y += 2;
          drawTextBlock(text, { fontSize, bold: true, color: [17, 17, 17], spaceAfter: 2 });
          break;
        }
        case 'paragraph': {
          drawRichParagraph(spans, {
            fontSize: 10.5,
            indentMm: indentBase,
            spaceAfter: 2.5,
          });
          break;
        }
        case 'bulletListItem': {
          drawRichParagraph(spans, {
            prefix: '* ',
            fontSize: 10.5,
            indentMm: 4 + indentBase,
            spaceAfter: 1.5,
          });
          break;
        }
        case 'numberedListItem': {
          drawRichParagraph(spans, {
            prefix: `${orderedIdx}. `,
            prefixBold: true,
            fontSize: 10.5,
            indentMm: 4 + indentBase,
            spaceAfter: 1.5,
          });
          break;
        }
        case 'checkListItem': {
          const prefix = block.props?.checked ? '[x] ' : '[ ] ';
          drawRichParagraph(spans, {
            prefix,
            prefixBold: true,
            prefixColor: block.props?.checked ? [5, 150, 105] : [113, 113, 122],
            fontSize: 10.5,
            indentMm: 4 + indentBase,
            spaceAfter: 1.5,
          });
          break;
        }
        case 'quote': {
          ensureSpace(10);
          const startY = y;
          drawRichParagraph(
            spans.map((s) => ({ ...s, italic: true, color: [17, 17, 17] })),
            {
              fontSize: 10.5,
              indentMm: 6 + indentBase,
              spaceAfter: 3,
              defaultColor: [17, 17, 17],
            }
          );
          pdf.setDrawColor(24, 24, 27);
          pdf.setLineWidth(0.8);
          pdf.line(marginX + 2 + indentBase, startY, marginX + 2 + indentBase, Math.max(startY + 4, y - 2));
          pdf.setLineWidth(0.2);
          break;
        }
        case 'callout': {
          const title = block.props?.title ? `[${block.props.title}] ` : '[Note] ';
          drawRichParagraph(spans, {
            prefix: title,
            prefixBold: true,
            prefixColor: [24, 24, 27],
            fontSize: 10,
            indentMm: 4 + indentBase,
            defaultColor: [63, 63, 70],
            spaceAfter: 3,
          });
          break;
        }
        case 'codeBlock': {
          drawTextBlock(text, {
            fontSize: 9,
            mono: true,
            indentMm: 3 + indentBase,
            color: [24, 24, 27],
            spaceAfter: 3,
          });
          break;
        }
        case 'divider': {
          ensureSpace(6);
          y += 2;
          pdf.setDrawColor(228, 228, 231);
          pdf.line(marginX, y, pageWidth - marginX, y);
          y += 4;
          break;
        }
        case 'image': {
          const url = typeof block.props?.url === 'string' ? block.props.url.trim() : '';
          const caption = typeof block.props?.caption === 'string' ? block.props.caption.trim() : '';
          const m = /^data:image\/(png|jpeg|jpg);base64,/i.exec(url);
          if (m) {
            ensureSpace(58);
            const imgType = m[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG';
            try {
              pdf.addImage(url, imgType, marginX, y, Math.min(contentWidth, 120), 50);
              y += 52;
            } catch {
              // ignore invalid image
            }
          }
          if (caption) {
            drawTextBlock(caption, { fontSize: 8.5, italic: true, color: [113, 113, 122], spaceAfter: 3 });
          }
          break;
        }
        case 'table': {
          const rows = Array.isArray(block.content?.rows) ? block.content.rows : [];
          if (rows.length > 0) {
            const headers = (rows[0]?.cells || []).map((c: any) => extractInlineText(c));
            const dataRows = rows.slice(1).map((r: any) => (r?.cells || []).map((c: any) => extractInlineText(c)));
            drawTable(headers, dataRows);
          }
          break;
        }
        case 'video':
        case 'youtube':
        case 'youtubeEmbed':
        case 'embed': {
          const parsedVideo = extractVideoBlockInfo(block);
          if (parsedVideo) {
            drawVideoCard(parsedVideo, indentBase);
          }
          break;
        }
        default: {
          if (text) {
            drawTextBlock(text, { fontSize: 10.5, indentMm: indentBase, spaceAfter: 2 });
          }
          break;
        }
      }

      if (Array.isArray(block.children) && block.children.length > 0) {
        renderBlockNoteListToPdf(block.children, depth + 1);
      }
    }
  };

  if (doc.blocknoteJson && doc.blocknoteJson.length > 0) {
    renderBlockNoteListToPdf(doc.blocknoteJson);
  } else {
    for (const block of doc.contentBlocks) {
      if (block.type === 'heading') {
        drawTextBlock(block.text, {
          fontSize: block.level === 1 ? 14 : block.level === 2 ? 12.5 : 11,
          bold: true,
          spaceAfter: 2,
        });
      } else if (block.type === 'paragraph') {
        drawTextBlock(block.text, { fontSize: 10.5, spaceAfter: 2.5 });
      } else if (block.type === 'blockquote') {
        drawTextBlock(`"${block.text}"${block.caption ? ` - ${block.caption}` : ''}`, {
          fontSize: 10.5,
          italic: true,
          indentMm: 5,
          spaceAfter: 2.5,
        });
      } else if (block.type === 'bulletList') {
        for (const item of block.items || []) {
          drawTextBlock(`* ${item}`, { fontSize: 10.5, indentMm: 4, spaceAfter: 1.5 });
        }
      } else if (block.type === 'orderedList') {
        (block.items || []).forEach((item, idx) => {
          drawTextBlock(`${idx + 1}. ${item}`, { fontSize: 10.5, indentMm: 4, spaceAfter: 1.5 });
        });
      } else if (block.type === 'callout') {
        drawTextBlock(`[${block.title || 'Note'}] ${block.text}`, {
          fontSize: 10,
          indentMm: 4,
          spaceAfter: 2.5,
        });
      } else if (block.type === 'table') {
        drawTable(block.headers || [], block.rows || []);
      } else if (block.type === 'separator') {
        ensureSpace(6);
        pdf.setDrawColor(228, 228, 231);
        pdf.line(marginX, y, pageWidth - marginX, y);
        y += 4;
      } else if (block.type === 'video') {
        const parsedVideo = extractVideoBlockInfo(block);
        if (parsedVideo) {
          drawVideoCard(parsedVideo, 0);
        }
      }
    }
  }

  // Video Walkthrough section (legacy bottom embed, omitted if already rendered inline)
  if (doc.youtube && !renderedVideoIds.has(doc.youtube.videoId)) {
    drawSectionTitle('Video Walkthrough');
    drawVideoCard({
      kind: 'youtube',
      videoId: doc.youtube.videoId,
      title: doc.youtube.title,
      caption: doc.youtube.caption,
      originalUrl: doc.youtube.watchUrl,
      watchUrl: doc.youtube.watchUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${doc.youtube.videoId}?rel=0`,
      thumbnailUrl: doc.youtube.thumbnailUrl,
    });
  }

  // Personal Branding End Block (matches Resource #001 .doc-end-branding)
  ensureSpace(22);
  y += 4;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 5;
  drawTextBlock(`${doc.author.name} • Educational Resources Archive`, {
    fontSize: 9,
    bold: true,
    color: [24, 24, 27],
    spaceAfter: 1.5,
  });
  drawRichParagraph(
    [
      { text: 'Personal Website: ', color: [113, 113, 122] },
      { text: doc.author.website, linkUrl: doc.author.website, color: [9, 105, 218] },
    ],
    { fontSize: 8.5, spaceAfter: 1.5 }
  );
  if (doc.author.socialLinks.length > 0) {
    const socialSpans: InlineSpan[] = [{ text: 'Connect: ', color: [113, 113, 122] }];
    doc.author.socialLinks.forEach((s, i) => {
      if (i > 0) socialSpans.push({ text: ' • ', color: [161, 161, 170] });
      socialSpans.push({ text: s.platform, linkUrl: s.url, color: [9, 105, 218] });
    });
    drawRichParagraph(socialSpans, { fontSize: 8.5, spaceAfter: 2 });
  }

  // Footer with page numbers across all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(113, 113, 122);
    pdf.text(`${doc.author.name} • Resource #${doc.resourceNumber}`, marginX, 12);
    pdf.text(`${doc.author.name} • ${doc.author.website}`, marginX, pageHeight - 10);
    pdf.text(`Page ${p} of ${totalPages}`, pageWidth - marginX - 18, pageHeight - 10);
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Generates an actual Word (.docx) binary file cleanly in browser or Node.
 */
export async function generateClientDocxBytes(
  doc: NormalizedResourceDocument,
  videoThumbnails: Record<string, ClientThumbnailAsset> = {}
): Promise<Uint8Array> {
  const inlineImages: Record<string, DocxImageAsset> = {};
  const thumbBytesMap: Record<string, Uint8Array> = {};
  for (const [vid, asset] of Object.entries(videoThumbnails)) {
    if (asset?.bytes?.byteLength) {
      thumbBytesMap[vid] = asset.bytes;
    }
  }
  const legacyThumbBytes = doc.youtube?.videoId ? thumbBytesMap[doc.youtube.videoId] : undefined;
  const docx = generateResourceDocx(doc, legacyThumbBytes, inlineImages, thumbBytesMap);
  const arrayBuf = await Packer.toArrayBuffer(docx);
  return new Uint8Array(arrayBuf);
}

export interface GeneratedExportsBundleResult {
  contentVersion: string;
  lastGeneratedAt: string;
  generatedPdf: GeneratedDocumentMeta;
  generatedDocx: GeneratedDocumentMeta;
  pdfPreviewUrl: string;
  docxUrl: string;
}

/**
 * Generates PDF and DOCX documents from the saved resource content and stores them
 * permanently using the verified storage tier (Firebase Storage -> GitHub -> compact Firestore Data URI).
 */
export async function generateAndStoreResourceExports(
  resource: ResourceDocument,
  options: {
    siteConfig?: SiteConfig;
    isDevPreview?: boolean;
    existingDocOverheadBytes?: number;
    onStage?: (stage: string) => void;
  } = {}
): Promise<GeneratedExportsBundleResult> {
  const {
    siteConfig = defaultSiteConfig,
    isDevPreview = false,
    existingDocOverheadBytes = 0,
    onStage,
  } = options;

  const contentVersion =
    resource.contentVersion || (await computeResourceContentVersion(resource));
  const normalized = normalizeResourceDocument(
    {
      ...resource,
      updatedAt: resource.updatedAtDate || resource.updatedAt,
    } as any,
    siteConfig
  );

  const pdfFilename = getResourceExportFilename(
    resource.resourceNumber,
    resource.title,
    'pdf'
  );
  const docxFilename = getResourceExportFilename(
    resource.resourceNumber,
    resource.title,
    'docx'
  );

  onStage?.('Loading video thumbnails for exports...');
  const videoThumbnails = await fetchYouTubeThumbnailsForClient(normalized);

  onStage?.('Generating PDF from Resource Content...');
  const pdfBytes = await generateClientPdfBytes(normalized, videoThumbnails);

  onStage?.('Generating DOCX from Resource Content...');
  const docxBytes = await generateClientDocxBytes(normalized, videoThumbnails);

  const docId = resource.id || resource.resourceNumber;
  const pdfStoragePath = `uploads/resources/${docId}/generated/${pdfFilename}`;
  const docxStoragePath = `uploads/resources/${docId}/generated/${docxFilename}`;

  onStage?.('Storing generated PDF permanently...');
  const pdfUpload = await uploadBinaryPermanently({
    fileName: pdfFilename,
    repoFileName: pdfFilename,
    storagePath: pdfStoragePath,
    mimeType: PDF_MIME,
    byteSize: pdfBytes.byteLength,
    bytes: pdfBytes,
    existingInlineBytes: existingDocOverheadBytes,
    isDevPreview,
    commitMessage: `chore(resources): update generated PDF for resource #${resource.resourceNumber}`,
  });

  const updatedOverhead =
    existingDocOverheadBytes + (pdfUpload.url.startsWith('data:') ? pdfUpload.url.length : 0);

  onStage?.('Storing generated DOCX permanently...');
  const docxUpload = await uploadBinaryPermanently({
    fileName: docxFilename,
    repoFileName: docxFilename,
    storagePath: docxStoragePath,
    mimeType: DOCX_MIME,
    byteSize: docxBytes.byteLength,
    bytes: docxBytes,
    existingInlineBytes: updatedOverhead,
    isDevPreview,
    commitMessage: `chore(resources): update generated DOCX for resource #${resource.resourceNumber}`,
  });

  const lastGeneratedAt = new Date().toISOString();

  return {
    contentVersion,
    lastGeneratedAt,
    pdfPreviewUrl: pdfUpload.url,
    docxUrl: docxUpload.url,
    generatedPdf: {
      url: pdfUpload.url,
      fileName: pdfFilename,
      fileSize: formatFileSizeBytes(pdfBytes.byteLength),
      byteSize: pdfBytes.byteLength,
      mimeType: PDF_MIME,
      storagePath: pdfUpload.storagePath,
      generatedAt: lastGeneratedAt,
      contentVersion,
    },
    generatedDocx: {
      url: docxUpload.url,
      fileName: docxFilename,
      fileSize: formatFileSizeBytes(docxBytes.byteLength),
      byteSize: docxBytes.byteLength,
      mimeType: DOCX_MIME,
      storagePath: docxUpload.storagePath,
      generatedAt: lastGeneratedAt,
      contentVersion,
    },
  };
}
