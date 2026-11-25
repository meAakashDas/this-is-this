import { jsPDF } from 'jspdf';
import { Packer } from 'docx';
import type { SiteConfig } from '../types/index.ts';
import type { ResourceDocument, GeneratedDocumentMeta } from '../types/cms/resource.ts';
import { siteConfig as defaultSiteConfig } from '../data/siteConfig.ts';
import { normalizeResourceDocument, getResourceExportFilename, type NormalizedResourceDocument } from './documentExport.ts';
import { generateResourceDocx, type DocxImageAsset } from './docxExport.ts';
import {
  uploadBinaryPermanently,
  formatFileSizeBytes,
} from '../lib/cms/storageUpload.ts';

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
    resourceNumber: resource.resourceNumber || '',
    title: resource.title || '',
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

/**
 * Generates an actual A4 vector PDF file in browser/Node with full typography,
 * wrapped tables, lists, checklists, blockquotes, links, page numbers, and images.
 */
export async function generateClientPdfBytes(doc: NormalizedResourceDocument): Promise<Uint8Array> {
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

  // Header Badge & Title
  drawTextBlock(`NO. ${doc.resourceNumber}`, {
    fontSize: 9,
    bold: true,
    mono: true,
    color: [82, 82, 91],
    spaceAfter: 2,
  });
  drawTextBlock(doc.title, {
    fontSize: 20,
    bold: true,
    color: [9, 9, 11],
    lineGap: 1.25,
    spaceAfter: 2.5,
  });
  drawTextBlock(`Published ${doc.publishedAt} | ${doc.canonicalUrl}`, {
    fontSize: 8.5,
    mono: true,
    color: [113, 113, 122],
    spaceAfter: 4,
    linkUrl: doc.canonicalUrl,
  });

  pdf.setDrawColor(228, 228, 231);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // About Resource (when description is distinct and meaningful)
  const hasMeaningfulDesc =
    Boolean(doc.description?.trim()) &&
    doc.description.trim().toLowerCase() !== doc.title.trim().toLowerCase() &&
    !/^resource #\d+$/i.test(doc.description.trim());

  if (hasMeaningfulDesc) {
    ensureSpace(14);
    drawTextBlock('About Resource', { fontSize: 13, bold: true, color: [9, 9, 11], spaceAfter: 2 });
    drawTextBlock(doc.description, { fontSize: 10.5, color: [39, 39, 42], spaceAfter: 4 });
  }

  // Attachments overview (never replaces educational content)
  if (doc.attachments.length > 0) {
    ensureSpace(16);
    drawTextBlock('Downloadable Resources', { fontSize: 13, bold: true, color: [9, 9, 11], spaceAfter: 2.5 });
    for (const att of doc.attachments) {
      drawTextBlock(`${att.name} [${att.format} | ${att.fileSize}]`, {
        fontSize: 10,
        bold: true,
        indentMm: 3,
        spaceAfter: 1,
      });
      if (/^https?:\/\//i.test(att.url)) {
        drawTextBlock(att.url, {
          fontSize: 8.5,
          mono: true,
          color: [9, 105, 218],
          indentMm: 3,
          spaceAfter: 2.5,
          linkUrl: att.url,
        });
      }
    }
    y += 2;
  }

  // Render Table Helper
  const drawTable = (headers: string[], rows: string[][]) => {
    const colCount = Math.max(headers.length, rows[0]?.length || 1);
    const colWidth = contentWidth / colCount;
    const cellPadX = 2.2;
    const cellPadY = 2;

    const renderRow = (cells: string[], isHeader: boolean) => {
      pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(8.5);
      const wrappedCells = cells.map((c) => {
        const clean = normalizeWinAnsi(c || '');
        const ascii = hasNonLatinUnicode(clean) ? clean.replace(/[^\u0020-\u00FF]/g, '?') : clean;
        return pdf.splitTextToSize(ascii || ' ', colWidth - cellPadX * 2) as string[];
      });
      const maxLines = Math.max(1, ...wrappedCells.map((l) => l.length));
      const rowHeight = maxLines * 4 + cellPadY * 2;

      if (y + rowHeight > bottomLimit) {
        pdf.addPage();
        y = topY;
        if (!isHeader && headers.length > 0) {
          renderRow(headers, true);
        }
      }

      cells.forEach((_, idx) => {
        const x = marginX + idx * colWidth;
        pdf.setFillColor(isHeader ? 244 : idx === 0 ? 250 : 255, isHeader ? 244 : idx === 0 ? 250 : 255, isHeader ? 245 : idx === 0 ? 250 : 255);
        pdf.setDrawColor(228, 228, 231);
        pdf.rect(x, y, colWidth, rowHeight, 'FD');
        pdf.setFont('helvetica', isHeader || idx === 0 ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(24, 24, 27);
        const lines = wrappedCells[idx] || [''];
        lines.forEach((line, lIdx) => {
          pdf.text(line, x + cellPadX, y + cellPadY + 3 + lIdx * 4);
        });
      });

      y += rowHeight;
    };

    if (headers.length > 0) renderRow(headers, true);
    for (const row of rows) renderRow(row, false);
    y += 4;
  };

  // Document Canvas Content
  ensureSpace(14);
  drawTextBlock('Read Me', { fontSize: 13, bold: true, color: [9, 9, 11], spaceAfter: 3 });

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

  const renderBlockNoteListToPdf = (blocks: any[], depth: number = 0) => {
    let orderedIdx = 0;
    const indentBase = depth * 5;
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'numberedListItem') orderedIdx += 1;
      else orderedIdx = 0;

      const text = extractInlineText(block.content);
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
          const runs = Array.isArray(block.content) ? block.content : [];
          const hasBoldOnly =
            runs.length > 0 && runs.every((r: any) => Boolean(r?.styles?.bold));
          const hasItalicOnly =
            runs.length > 0 && runs.every((r: any) => Boolean(r?.styles?.italic));
          const firstLink = runs.find((r: any) => r?.type === 'link' && r?.href);
          drawTextBlock(text, {
            fontSize: 10.5,
            bold: hasBoldOnly,
            italic: hasItalicOnly,
            indentMm: indentBase,
            linkUrl: firstLink?.href,
            spaceAfter: 2.5,
          });
          break;
        }
        case 'bulletListItem': {
          drawTextBlock(`* ${text}`, { fontSize: 10.5, indentMm: 4 + indentBase, spaceAfter: 1.5 });
          break;
        }
        case 'numberedListItem': {
          drawTextBlock(`${orderedIdx}. ${text}`, { fontSize: 10.5, indentMm: 4 + indentBase, spaceAfter: 1.5 });
          break;
        }
        case 'checkListItem': {
          const prefix = block.props?.checked ? '[x]' : '[ ]';
          drawTextBlock(`${prefix} ${text}`, { fontSize: 10.5, indentMm: 4 + indentBase, spaceAfter: 1.5 });
          break;
        }
        case 'quote': {
          ensureSpace(10);
          const startY = y;
          drawTextBlock(text, {
            fontSize: 10.5,
            italic: true,
            color: [39, 39, 42],
            indentMm: 6 + indentBase,
            spaceAfter: 3,
          });
          pdf.setDrawColor(24, 24, 27);
          pdf.setLineWidth(0.8);
          pdf.line(marginX + 2 + indentBase, startY, marginX + 2 + indentBase, Math.max(startY + 4, y - 2));
          pdf.setLineWidth(0.2);
          break;
        }
        case 'callout': {
          const title = block.props?.title ? `[${block.props.title}] ` : '[Note] ';
          drawTextBlock(`${title}${text}`, {
            fontSize: 10,
            bold: false,
            indentMm: 4 + indentBase,
            color: [63, 63, 70],
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
      }
    }
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
export async function generateClientDocxBytes(doc: NormalizedResourceDocument): Promise<Uint8Array> {
  const inlineImages: Record<string, DocxImageAsset> = {};
  const docx = generateResourceDocx(doc, undefined, inlineImages);
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

  onStage?.('Generating PDF from Resource Content...');
  const pdfBytes = await generateClientPdfBytes(normalized);

  onStage?.('Generating DOCX from Resource Content...');
  const docxBytes = await generateClientDocxBytes(normalized);

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
