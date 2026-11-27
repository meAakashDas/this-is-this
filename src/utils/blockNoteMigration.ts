import type { ContentBlock } from '../types/index.ts';
import {
  extractVideoBlockInfo,
  renderVideoBlockToHtml,
} from './youtube.ts';

export interface BlockNoteInlineItem {
  type: 'text' | 'link';
  text?: string;
  href?: string;
  content?: BlockNoteInlineItem[];
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    textColor?: string;
    backgroundColor?: string;
  };
}

export interface BlockNoteBlock {
  id: string;
  type: string;
  props?: Record<string, any>;
  content?: any;
  children?: BlockNoteBlock[];
}

/**
 * Generate a random UUID-like string for BlockNote block IDs
 */
export function generateBlockId(): string {
  return 'b-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

/**
 * Unwraps BlockNote inline content arrays cleanly, including v0.57+ `tableCell` objects.
 */
function unwrapInlineArray(content: any): any[] | null {
  if (!content) return null;
  if (Array.isArray(content)) return content;
  if (typeof content === 'object' && Array.isArray(content.content)) {
    return content.content;
  }
  return null;
}

/**
 * Extract plain text string from BlockNote inline content (or tableCell object)
 */
export function blockNoteInlineToPlainText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const items = unwrapInlineArray(content);
  if (!items) return '';

  return items
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      if (item.type === 'text') return item.text || '';
      if (item.type === 'link') {
        if (Array.isArray(item.content)) {
          return blockNoteInlineToPlainText(item.content);
        }
        return item.text || item.href || '';
      }
      if (Array.isArray(item.content)) {
        return blockNoteInlineToPlainText(item.content);
      }
      return item.text || '';
    })
    .join('');
}

/**
 * Render BlockNote inline content (or tableCell object) to HTML with styles and links
 */
export function renderInlineContentToHtml(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return escapeHtml(content);
  const items = unwrapInlineArray(content);
  if (!items) return '';

  return items
    .map((item: any) => {
      if (typeof item === 'string') return escapeHtml(item);
      if (!item || typeof item !== 'object') return '';

      if (item.type === 'link') {
        const linkText = Array.isArray(item.content)
          ? renderInlineContentToHtml(item.content)
          : escapeHtml(item.text || item.href || '');
        const rawHref = typeof item.href === 'string' ? item.href.trim() : '';
        const safeHref =
          rawHref && !/^(javascript|vbscript|data:text\/html|blob:):?/i.test(rawHref)
            ? rawHref
            : '#';
        const href = escapeHtml(safeHref);
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        return `<a href="${href}" class="text-primary underline font-medium hover:text-primary/80 transition-colors"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${linkText}</a>`;
      }

      let text = escapeHtml(item.text || '');
      const styles = item.styles || {};

      if (styles.code) {
        text = `<code class="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.875em] text-foreground">${text}</code>`;
      }
      if (styles.bold) {
        text = `<strong class="font-semibold text-foreground">${text}</strong>`;
      }
      if (styles.italic) {
        text = `<em>${text}</em>`;
      }
      if (styles.underline) {
        text = `<u>${text}</u>`;
      }
      if (styles.strike) {
        text = `<s class="line-through text-muted-foreground">${text}</s>`;
      }

      return text;
    })
    .join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts legacy ContentBlock[] into native BlockNote block JSON structure
 */
export function legacyBlocksToBlockNote(
  blocks: ContentBlock[] = [],
  summaryPoints: string[] = [],
  targetAudience?: string
): BlockNoteBlock[] {
  const result: BlockNoteBlock[] = [];

  // If there are summary points, add an introductory What's Included section
  if (summaryPoints && summaryPoints.length > 0) {
    result.push({
      id: generateBlockId(),
      type: 'heading',
      props: { level: 2, textAlignment: 'left' },
      content: [{ type: 'text', text: "What’s Included", styles: { bold: true } }],
      children: [],
    });
    for (const point of summaryPoints) {
      result.push({
        id: generateBlockId(),
        type: 'checkListItem',
        props: { checked: true, textAlignment: 'left' },
        content: [{ type: 'text', text: point, styles: {} }],
        children: [],
      });
    }
  }

  // If there is a target audience, add Intended For section
  if (targetAudience && targetAudience.trim()) {
    result.push({
      id: generateBlockId(),
      type: 'heading',
      props: { level: 2, textAlignment: 'left' },
      content: [{ type: 'text', text: 'Intended For', styles: { bold: true } }],
      children: [],
    });
    result.push({
      id: generateBlockId(),
      type: 'paragraph',
      props: { textAlignment: 'left' },
      content: [{ type: 'text', text: targetAudience.trim(), styles: {} }],
      children: [],
    });
  }

  // Convert each ContentBlock
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        result.push({
          id: generateBlockId(),
          type: 'heading',
          props: { level: block.level || 2, textAlignment: 'left' },
          content: [{ type: 'text', text: block.text || '', styles: {} }],
          children: [],
        });
        break;
      }
      case 'paragraph': {
        const content: BlockNoteInlineItem[] = [];
        if (block.marks && block.marks.length > 0) {
          for (const m of block.marks) {
            if (m.type === 'link') {
              content.push({
                type: 'link',
                href: m.href || '#',
                content: [{ type: 'text', text: m.text, styles: {} }],
              });
            } else {
              content.push({
                type: 'text',
                text: m.text,
                styles: {
                  bold: m.type === 'bold',
                  italic: m.type === 'italic',
                  underline: m.type === 'underline',
                },
              });
            }
          }
        } else {
          content.push({ type: 'text', text: block.text || '', styles: {} });
        }
        result.push({
          id: generateBlockId(),
          type: 'paragraph',
          props: { textAlignment: 'left' },
          content,
          children: [],
        });
        break;
      }
      case 'blockquote': {
        const text = block.caption ? `${block.text}\n— ${block.caption}` : block.text;
        result.push({
          id: generateBlockId(),
          type: 'quote',
          props: { textAlignment: 'left' },
          content: [{ type: 'text', text: text || '', styles: {} }],
          children: [],
        });
        break;
      }
      case 'bulletList': {
        for (const item of block.items || []) {
          result.push({
            id: generateBlockId(),
            type: 'bulletListItem',
            props: { textAlignment: 'left' },
            content: [{ type: 'text', text: item, styles: {} }],
            children: [],
          });
        }
        break;
      }
      case 'orderedList': {
        for (const item of block.items || []) {
          result.push({
            id: generateBlockId(),
            type: 'numberedListItem',
            props: { textAlignment: 'left' },
            content: [{ type: 'text', text: item, styles: {} }],
            children: [],
          });
        }
        break;
      }
      case 'table': {
        const rows = [
          {
            cells: (block.headers || []).map((h) => [
              { type: 'text', text: h, styles: { bold: true } },
            ]),
          },
          ...(block.rows || []).map((row) => ({
            cells: row.map((cell) => [{ type: 'text', text: cell, styles: {} }]),
          })),
        ];
        result.push({
          id: generateBlockId(),
          type: 'table',
          props: {},
          content: {
            type: 'tableContent',
            rows,
          },
          children: [],
        });
        break;
      }
      case 'callout': {
        result.push({
          id: generateBlockId(),
          type: 'callout',
          props: {
            title: block.title || '',
            variant: block.variant || 'info',
            textAlignment: 'left',
          },
          content: [{ type: 'text', text: block.text || '', styles: {} }],
          children: [],
        });
        break;
      }
      case 'separator': {
        result.push({
          id: generateBlockId(),
          type: 'divider',
          props: {},
          content: [],
          children: [],
        });
        break;
      }
      case 'image': {
        result.push({
          id: generateBlockId(),
          type: 'image',
          props: {
            url: block.src || '',
            caption: block.caption || block.alt || '',
          },
          content: [],
          children: [],
        });
        break;
      }
      case 'video': {
        result.push({
          id: generateBlockId(),
          type: 'video',
          props: {
            url: block.url || (block.videoId ? `https://www.youtube.com/watch?v=${block.videoId}` : ''),
            caption: block.caption || '',
            name: block.title || '',
            showPreview: true,
          },
          content: [],
          children: [],
        });
        break;
      }
      default:
        break;
    }
  }

  // Ensure there's at least one paragraph block if empty
  if (result.length === 0) {
    result.push({
      id: generateBlockId(),
      type: 'paragraph',
      props: { textAlignment: 'left' },
      content: [],
      children: [],
    });
  }

  return result;
}

export interface BlockNoteToHtmlOptions {
  pdfMode?: boolean;
  videoThumbnails?: Record<string, string>;
}

/**
 * Pure Node & Browser safe HTML renderer for BlockNote blocks
 * Generates semantic HTML styled with Apple Editorial Minimal design.
 */
export function blockNoteToHtml(
  blocks: any[] = [],
  options?: BlockNoteToHtmlOptions
): string {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  const htmlChunks: string[] = [];
  let currentListType: 'bulletListItem' | 'numberedListItem' | 'checkListItem' | null = null;
  let listItems: string[] = [];

  function flushList() {
    if (!currentListType || listItems.length === 0) return;
    if (currentListType === 'bulletListItem') {
      htmlChunks.push(
        `<ul class="editorial-bullet-list my-4 ml-6 list-disc space-y-2 text-muted-foreground">\n${listItems.join('\n')}\n</ul>`
      );
    } else if (currentListType === 'numberedListItem') {
      htmlChunks.push(
        `<ol class="editorial-ordered-list my-4 ml-6 list-decimal space-y-2 text-muted-foreground">\n${listItems.join('\n')}\n</ol>`
      );
    } else if (currentListType === 'checkListItem') {
      htmlChunks.push(
        `<ul class="editorial-checklist-list my-4 space-y-2 list-none p-0">\n${listItems.join('\n')}\n</ul>`
      );
    }
    currentListType = null;
    listItems = [];
  }

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    // Check if we are continuing a list
    if (
      block.type === 'bulletListItem' ||
      block.type === 'numberedListItem' ||
      block.type === 'checkListItem'
    ) {
      if (currentListType && currentListType !== block.type) {
        flushList();
      }
      currentListType = block.type;

      const innerHtml = renderInlineContentToHtml(block.content);
      const nestedHtml =
        Array.isArray(block.children) && block.children.length > 0
          ? `\n<div class="mt-2 ml-4">${blockNoteToHtml(block.children, options)}</div>`
          : '';

      if (block.type === 'checkListItem') {
        const isChecked = Boolean(block.props?.checked);
        listItems.push(
          `  <li class="editorial-checklist-item flex items-start gap-2.5 text-base leading-relaxed text-muted-foreground"><span class="checklist-box font-mono font-bold text-xs ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'}">${isChecked ? '✓' : '○'}</span><span class="text-foreground/90">${innerHtml}${nestedHtml}</span></li>`
        );
      } else {
        listItems.push(
          `  <li class="editorial-list-item text-base leading-relaxed text-muted-foreground"><span class="text-foreground/90">${innerHtml}${nestedHtml}</span></li>`
        );
      }
      continue;
    } else {
      flushList();
    }

    switch (block.type) {
      case 'heading': {
        const level = Number(block.props?.level) || 2;
        const text = renderInlineContentToHtml(block.content);
        if (level === 1) {
          htmlChunks.push(
            `<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-10 mb-4 pt-2">${text}</h2>`
          );
        } else if (level === 2) {
          htmlChunks.push(
            `<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-8 mb-3 pt-2">${text}</h2>`
          );
        } else {
          htmlChunks.push(
            `<h3 class="text-lg sm:text-xl font-semibold tracking-tight text-foreground mt-6 mb-2">${text}</h3>`
          );
        }
        break;
      }

      case 'paragraph': {
        const text = renderInlineContentToHtml(block.content);
        if (!text.trim()) {
          // Empty line / spacer
          htmlChunks.push(`<div class="h-4" aria-hidden="true"></div>`);
        } else {
          htmlChunks.push(`<p class="text-base text-muted-foreground leading-relaxed my-3.5 m-0">${text}</p>`);
        }
        break;
      }

      case 'quote': {
        const text = renderInlineContentToHtml(block.content);
        htmlChunks.push(
          `<blockquote class="editorial-blockquote border-l-2 border-primary/30 bg-muted/20 pl-5 py-3.5 my-6 rounded-r-md italic text-muted-foreground"><p class="text-base text-foreground/90 m-0 leading-relaxed">${text}</p></blockquote>`
        );
        break;
      }

      case 'callout': {
        const title = block.props?.title || '';
        const variant = block.props?.variant || 'info';
        const text = renderInlineContentToHtml(block.content);
        htmlChunks.push(
          `<aside class="callout-box ${variant} relative w-full rounded-lg border p-4 sm:p-5 my-6 shadow-xs flex flex-col gap-1.5 ${
            variant === 'warning'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
              : variant === 'tip'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
              : 'border-border bg-muted/40 text-foreground'
          }">${title ? `<div class="callout-title flex items-center gap-2 text-sm font-semibold text-foreground"><span>${escapeHtml(title)}</span></div>` : ''}<p class="callout-text text-sm text-muted-foreground leading-relaxed m-0">${text}</p></aside>`
        );
        break;
      }

      case 'codeBlock': {
        const codeText = blockNoteInlineToPlainText(block.content);
        const language = block.props?.language || '';
        htmlChunks.push(
          `<div class="code-block-wrapper my-6 rounded-lg overflow-hidden border border-border bg-muted/40"><pre class="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-foreground m-0"><code data-language="${escapeHtml(language)}">${escapeHtml(codeText)}</code></pre></div>`
        );
        break;
      }

      case 'divider': {
        htmlChunks.push(`<hr class="section-divider my-8 border-0 h-px bg-border/60 w-full" />`);
        break;
      }

      case 'image': {
        const url = typeof block.props?.url === 'string' ? block.props.url.trim() : '';
        const caption = block.props?.caption || '';
        if (url && !/^(javascript|vbscript|data:text\/html|blob:):?/i.test(url)) {
          htmlChunks.push(
            `<figure class="editorial-figure my-8 text-center"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption || 'Resource illustration')}" loading="lazy" decoding="async" class="max-w-full h-auto rounded-lg border border-border mx-auto shadow-xs block" />${caption ? `<figcaption class="text-xs text-muted-foreground mt-2 font-mono">${escapeHtml(caption)}</figcaption>` : ''}</figure>`
          );
        }
        break;
      }

      case 'video':
      case 'youtube':
      case 'youtubeEmbed':
      case 'embed': {
        const parsedVideo = extractVideoBlockInfo(block);
        if (parsedVideo) {
          htmlChunks.push(renderVideoBlockToHtml(parsedVideo, options));
        }
        break;
      }

      case 'table': {
        const tableContent = block.content?.rows || [];
        if (Array.isArray(tableContent) && tableContent.length > 0) {
          const headerRow = tableContent[0];
          const bodyRows = tableContent.slice(1);

          let tableHtml = `<div class="table-scroll-container w-full overflow-x-auto my-6 rounded-lg border border-border bg-card shadow-xs">\n`;
          tableHtml += `<table class="editorial-table w-full text-left text-sm border-collapse">\n`;

          if (headerRow && Array.isArray(headerRow.cells)) {
            tableHtml += `<thead>\n<tr class="border-b border-border bg-muted/40">\n`;
            for (const cell of headerRow.cells) {
              const cellHtml = renderInlineContentToHtml(cell);
              tableHtml += `<th scope="col" class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">${cellHtml}</th>\n`;
            }
            tableHtml += `</tr>\n</thead>\n`;
          }

          if (bodyRows.length > 0) {
            tableHtml += `<tbody class="divide-y divide-border/60">\n`;
            for (const row of bodyRows) {
              tableHtml += `<tr class="hover:bg-muted/20 transition-colors">\n`;
              if (Array.isArray(row.cells)) {
                row.cells.forEach((cell: any, idx: number) => {
                  const cellHtml = renderInlineContentToHtml(cell);
                  if (idx === 0) {
                    tableHtml += `<th scope="row" class="px-4 py-3 font-medium text-foreground whitespace-nowrap">${cellHtml}</th>\n`;
                  } else {
                    tableHtml += `<td class="px-4 py-3 text-muted-foreground">${cellHtml}</td>\n`;
                  }
                });
              }
              tableHtml += `</tr>\n`;
            }
            tableHtml += `</tbody>\n`;
          }

          tableHtml += `</table>\n</div>`;
          htmlChunks.push(tableHtml);
        }
        break;
      }

      default:
        // Handle any generic or custom block
        if (block.content) {
          const text = renderInlineContentToHtml(block.content);
          if (text) {
            htmlChunks.push(`<p class="text-base text-muted-foreground leading-relaxed my-3 m-0">${text}</p>`);
          }
        }
        break;
    }
  }

  flushList();
  return htmlChunks.join('\n');
}

/**
 * Converts BlockNote blocks to ContentBlock[] for backward compatibility with PDF and DOCX generators
 */
export function blockNoteToContentBlocks(blocks: any[] = []): ContentBlock[] {
  if (!blocks || !Array.isArray(blocks)) return [];

  const result: ContentBlock[] = [];
  let currentBulletItems: string[] = [];
  let currentOrderedItems: string[] = [];

  function flushLists() {
    if (currentBulletItems.length > 0) {
      result.push({
        type: 'bulletList',
        items: [...currentBulletItems],
      });
      currentBulletItems = [];
    }
    if (currentOrderedItems.length > 0) {
      result.push({
        type: 'orderedList',
        items: [...currentOrderedItems],
      });
      currentOrderedItems = [];
    }
  }

  const collectChildTextItems = (children: any[] = []): string[] => {
    const items: string[] = [];
    for (const child of children) {
      if (!child || typeof child !== 'object') continue;
      const t = blockNoteInlineToPlainText(child.content);
      if (t) items.push(t);
      if (Array.isArray(child.children) && child.children.length > 0) {
        items.push(...collectChildTextItems(child.children));
      }
    }
    return items;
  };

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'bulletListItem' || block.type === 'checkListItem') {
      if (currentOrderedItems.length > 0) flushLists();
      const text = blockNoteInlineToPlainText(block.content);
      if (text) currentBulletItems.push(text);
      if (Array.isArray(block.children) && block.children.length > 0) {
        currentBulletItems.push(...collectChildTextItems(block.children));
      }
      continue;
    } else if (block.type === 'numberedListItem') {
      if (currentBulletItems.length > 0) flushLists();
      const text = blockNoteInlineToPlainText(block.content);
      if (text) currentOrderedItems.push(text);
      if (Array.isArray(block.children) && block.children.length > 0) {
        currentOrderedItems.push(...collectChildTextItems(block.children));
      }
      continue;
    } else {
      flushLists();
    }

    switch (block.type) {
      case 'heading': {
        const level = Number(block.props?.level) || 2;
        const validLevel = (level === 1 || level === 2 || level === 3 ? level : 2) as 1 | 2 | 3;
        const text = blockNoteInlineToPlainText(block.content);
        result.push({
          type: 'heading',
          level: validLevel,
          text,
        });
        break;
      }
      case 'paragraph': {
        const text = blockNoteInlineToPlainText(block.content);
        if (text.trim()) {
          result.push({
            type: 'paragraph',
            text,
          });
        }
        break;
      }
      case 'quote': {
        const text = blockNoteInlineToPlainText(block.content);
        result.push({
          type: 'blockquote',
          text,
        });
        break;
      }
      case 'callout': {
        const text = blockNoteInlineToPlainText(block.content);
        result.push({
          type: 'callout',
          title: block.props?.title,
          text,
          variant: block.props?.variant || 'info',
        });
        break;
      }
      case 'table': {
        const rows = block.content?.rows || [];
        if (Array.isArray(rows) && rows.length > 0) {
          const headers = (rows[0]?.cells || []).map((c: any) => blockNoteInlineToPlainText(c));
          const dataRows = rows.slice(1).map((r: any) =>
            (r?.cells || []).map((c: any) => blockNoteInlineToPlainText(c))
          );
          result.push({
            type: 'table',
            headers,
            rows: dataRows,
          });
        }
        break;
      }
      case 'divider': {
        result.push({ type: 'separator' });
        break;
      }
      case 'image': {
        const url = block.props?.url || '';
        const caption = block.props?.caption || '';
        if (url) {
          const imgBlock: any = {
            type: 'image',
            src: url,
            alt: caption || 'Resource Image',
          };
          if (caption) imgBlock.caption = caption;
          result.push(imgBlock);
        }
        break;
      }
      case 'video':
      case 'youtube':
      case 'youtubeEmbed':
      case 'embed': {
        const parsedVideo = extractVideoBlockInfo(block);
        if (parsedVideo) {
          const vidBlock: any = {
            type: 'video',
            url: parsedVideo.originalUrl,
          };
          if (parsedVideo.kind === 'youtube') vidBlock.videoId = parsedVideo.videoId;
          if (parsedVideo.title) vidBlock.title = parsedVideo.title;
          if (parsedVideo.caption) vidBlock.caption = parsedVideo.caption;
          result.push(vidBlock);
        }
        break;
      }
      default:
        break;
    }
  }

  flushLists();
  return result;
}

/**
 * Converts JournalContentStructure (lead, sections with heading, paragraphs, quote)
 * into native BlockNote block JSON structure
 */
export function journalContentToBlockNote(content?: {
  lead?: string;
  sections?: {
    heading?: string;
    paragraphs?: string[];
    quote?: string;
  }[];
}): BlockNoteBlock[] {
  if (!content) return [];
  const result: BlockNoteBlock[] = [];

  if (content.lead && content.lead.trim()) {
    result.push({
      id: generateBlockId(),
      type: 'paragraph',
      props: { textAlignment: 'left' },
      content: [{ type: 'text', text: content.lead.trim(), styles: {} }],
      children: [],
    });
  }

  if (content.sections && Array.isArray(content.sections)) {
    for (const section of content.sections) {
      if (section.heading && section.heading.trim()) {
        result.push({
          id: generateBlockId(),
          type: 'heading',
          props: { level: 2, textAlignment: 'left' },
          content: [{ type: 'text', text: section.heading.trim(), styles: { bold: true } }],
          children: [],
        });
      }
      if (section.paragraphs && Array.isArray(section.paragraphs)) {
        for (const para of section.paragraphs) {
          if (para && para.trim()) {
            result.push({
              id: generateBlockId(),
              type: 'paragraph',
              props: { textAlignment: 'left' },
              content: [{ type: 'text', text: para.trim(), styles: {} }],
              children: [],
            });
          }
        }
      }
      if (section.quote && section.quote.trim()) {
        result.push({
          id: generateBlockId(),
          type: 'quote',
          props: { textAlignment: 'left' },
          content: [{ type: 'text', text: section.quote.trim(), styles: {} }],
          children: [],
        });
      }
    }
  }

  if (result.length === 0) {
    result.push({
      id: generateBlockId(),
      type: 'paragraph',
      props: { textAlignment: 'left' },
      content: [],
      children: [],
    });
  }

  return result;
}

/**
 * Converts BlockNote blocks into JournalContentStructure for backward compatibility
 */
export function blockNoteToJournalStructure(blocks: any[] = []): {
  lead: string;
  sections: { heading?: string; paragraphs: string[]; quote?: string }[];
} {
  let lead = '';
  const sections: { heading?: string; paragraphs: string[]; quote?: string }[] = [];
  let currentSection: { heading?: string; paragraphs: string[]; quote?: string } = {
    paragraphs: [],
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'heading') {
      if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.quote) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: blockNoteInlineToPlainText(block.content),
        paragraphs: [],
      };
    } else if (block.type === 'quote') {
      currentSection.quote = blockNoteInlineToPlainText(block.content);
    } else if (block.type === 'paragraph') {
      const text = blockNoteInlineToPlainText(block.content);
      if (text.trim()) {
        if (!lead && sections.length === 0 && !currentSection.heading) {
          lead = text;
        } else {
          currentSection.paragraphs.push(text);
        }
      }
    } else {
      const text = blockNoteInlineToPlainText(block.content);
      if (text.trim()) {
        currentSection.paragraphs.push(text);
      }
    }
  }

  if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.quote) {
    sections.push(currentSection);
  }

  return { lead, sections };
}
