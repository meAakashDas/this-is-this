import type { ContentBlock } from '../types/index.ts';
import type { JournalContentStructure, JournalContentBlock } from '../types/cms/journal.ts';
import { extractYouTubeVideoId } from './youtube.ts';

/**
 * Converts legacy ContentBlock[] into clean semantic HTML suitable for Tiptap/Notion editor.
 */
export function contentBlocksToHtml(
  blocks: ContentBlock[] = [],
  summaryPoints?: string[],
  targetAudience?: string
): string {
  const parts: string[] = [];

  // Optional summary points as intro checklist/bullet list
  if (summaryPoints && summaryPoints.length > 0) {
    parts.push('<h3>What’s Included</h3>');
    parts.push('<ul>');
    for (const pt of summaryPoints) {
      if (pt.trim()) {
        parts.push(`<li>${escapeHtml(pt.trim())}</li>`);
      }
    }
    parts.push('</ul>');
  }

  // Optional target audience
  if (targetAudience && targetAudience.trim()) {
    parts.push(
      `<aside class="callout-box info" data-type="callout" data-variant="info" data-title="Intended For"><strong>Intended For</strong><p>${escapeHtml(
        targetAudience.trim()
      )}</p></aside>`
    );
  }

  // Map each content block
  for (const block of blocks) {
    if (!block) continue;

    switch (block.type) {
      case 'heading': {
        const level = Math.min(Math.max(block.level || 2, 1), 4);
        parts.push(`<h${level}>${escapeHtml(block.text || '')}</h${level}>`);
        break;
      }

      case 'paragraph': {
        parts.push(`<p>${escapeHtml(block.text || '')}</p>`);
        break;
      }

      case 'blockquote': {
        const cite = block.caption ? `<cite>— ${escapeHtml(block.caption)}</cite>` : '';
        parts.push(
          `<blockquote><p>${escapeHtml(block.text || '')}</p>${cite}</blockquote>`
        );
        break;
      }

      case 'bulletList': {
        const items = block.items || [];
        if (items.length > 0) {
          parts.push('<ul>');
          for (const item of items) {
            parts.push(`<li>${escapeHtml(item)}</li>`);
          }
          parts.push('</ul>');
        }
        break;
      }

      case 'orderedList': {
        const items = block.items || [];
        if (items.length > 0) {
          parts.push('<ol>');
          for (const item of items) {
            parts.push(`<li>${escapeHtml(item)}</li>`);
          }
          parts.push('</ol>');
        }
        break;
      }

      case 'callout': {
        const variant = block.variant || 'info';
        const title = block.title || (variant === 'warning' ? 'Important Warning' : variant === 'tip' ? 'Helpful Tip' : 'Important Note');
        parts.push(
          `<aside class="callout-box ${variant}" data-type="callout" data-variant="${variant}" data-title="${escapeHtml(
            title
          )}"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(block.text || '')}</p></aside>`
        );
        break;
      }

      case 'table': {
        const headers = block.headers || [];
        const rows = block.rows || [];
        let tableHtml = '<table>';
        if (headers.length > 0) {
          tableHtml += '<thead><tr>';
          for (const h of headers) {
            tableHtml += `<th>${escapeHtml(h)}</th>`;
          }
          tableHtml += '</tr></thead>';
        }
        if (rows.length > 0) {
          tableHtml += '<tbody>';
          for (const row of rows) {
            tableHtml += '<tr>';
            for (const cell of row) {
              tableHtml += `<td>${escapeHtml(cell)}</td>`;
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody>';
        }
        tableHtml += '</table>';
        if (block.caption) {
          tableHtml += `<p><em>${escapeHtml(block.caption)}</em></p>`;
        }
        parts.push(tableHtml);
        break;
      }

      case 'separator': {
        parts.push('<hr />');
        break;
      }

      case 'image': {
        const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        parts.push(
          `<figure><img src="${escapeHtml(block.src || '')}" alt="${escapeHtml(block.alt || '')}" />${caption}</figure>`
        );
        break;
      }

      default:
        break;
    }
  }

  return parts.join('\n');
}

/**
 * Extracts structured ContentBlock[] from HTML for backward compatibility.
 * Works reliably in both browser (DOMParser) and node/server environments.
 */
export function htmlToContentBlocks(html: string): ContentBlock[] {
  if (!html || !html.trim()) return [];

  const blocks: ContentBlock[] = [];

  // Browser environment: use native DOMParser
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.children);

    for (const node of nodes) {
      const tagName = node.tagName.toLowerCase();

      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const rawLevel = parseInt(tagName.charAt(1), 10);
        const level = (rawLevel > 3 ? 3 : rawLevel) as 1 | 2 | 3;
        const text = node.textContent?.trim() || '';
        if (text) {
          blocks.push({ type: 'heading', level, text });
        }
      } else if (tagName === 'p') {
        const text = node.textContent?.trim() || '';
        // Check if paragraph contains an img
        const img = node.querySelector('img');
        if (img) {
          blocks.push({
            type: 'image',
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: node.querySelector('figcaption')?.textContent?.trim() || '',
          });
        } else if (text) {
          blocks.push({ type: 'paragraph', text });
        }
      } else if (tagName === 'blockquote') {
        const p = node.querySelector('p');
        const cite = node.querySelector('cite');
        const text = (p ? p.textContent : node.textContent)?.trim() || '';
        const caption = cite ? cite.textContent?.replace(/^—\s*/, '').trim() : undefined;
        if (text) {
          blocks.push({ type: 'blockquote', text, caption });
        }
      } else if (tagName === 'ul') {
        const items = Array.from(node.querySelectorAll('li'))
          .map((li) => li.textContent?.trim() || '')
          .filter(Boolean);
        if (items.length > 0) {
          blocks.push({ type: 'bulletList', items });
        }
      } else if (tagName === 'ol') {
        const items = Array.from(node.querySelectorAll('li'))
          .map((li) => li.textContent?.trim() || '')
          .filter(Boolean);
        if (items.length > 0) {
          blocks.push({ type: 'orderedList', items });
        }
      } else if (tagName === 'aside' || node.getAttribute('data-type') === 'callout') {
        const variantAttr = node.getAttribute('data-variant') || 'info';
        const variant = (['info', 'warning', 'tip'].includes(variantAttr) ? variantAttr : 'info') as
          | 'info'
          | 'warning'
          | 'tip';
        const strong = node.querySelector('strong');
        const title = strong ? strong.textContent?.trim() : node.getAttribute('data-title') || 'Note';
        // Remove strong element when getting body text if present
        const p = node.querySelector('p');
        const text = (p ? p.textContent : node.textContent?.replace(strong?.textContent || '', ''))?.trim() || '';
        blocks.push({ type: 'callout', variant, title, text });
      } else if (tagName === 'table') {
        const headers = Array.from(node.querySelectorAll('thead th, tr:first-child th')).map(
          (th) => th.textContent?.trim() || ''
        );
        const rows: string[][] = [];
        const bodyRows = node.querySelectorAll('tbody tr');
        const rowElements = bodyRows.length > 0 ? Array.from(bodyRows) : Array.from(node.querySelectorAll('tr')).slice(headers.length > 0 ? 1 : 0);

        for (const tr of rowElements) {
          const cells = Array.from(tr.querySelectorAll('td, th')).map((td) => td.textContent?.trim() || '');
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
        blocks.push({
          type: 'table',
          headers: headers.length > 0 ? headers : rows[0] || [],
          rows: headers.length > 0 ? rows : rows.slice(1),
        });
      } else if (tagName === 'figure') {
        const img = node.querySelector('img');
        const iframe = node.querySelector('iframe');
        const figcaption = node.querySelector('figcaption');
        if (img) {
          blocks.push({
            type: 'image',
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: figcaption?.textContent?.trim() || '',
          });
        } else if (iframe) {
          const src = iframe.getAttribute('src') || '';
          const videoId = extractYouTubeVideoId(src);
          if (src) {
            blocks.push({
              type: 'video',
              url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : src,
              ...(videoId ? { videoId } : {}),
              title: iframe.getAttribute('title') || undefined,
              caption: figcaption?.textContent?.trim() || undefined,
            });
          }
        }
      } else if (tagName === 'hr') {
        blocks.push({ type: 'separator' });
      }
    }

    return blocks;
  }

  // Node environment: robust regex-based extraction
  const cleanHtml = html.replace(/\r\n/g, '\n');

  // Headings
  const headingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  // Paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  // Blockquotes
  const quoteRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi;
  // Lists
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  // Callouts
  const calloutRegex = /<aside[^>]*class=["'][^"']*callout-box(?:\s+([a-z]+))?[^"']*["'][^>]*>([\s\S]*?)<\/aside>/gi;
  // Tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  // HR
  const hrRegex = /<hr\s*\/?>/gi;

  // Simple sequential block segmenter using tags
  const blockTagRegex = /<(h[1-4]|p|blockquote|ul|ol|aside|table|hr)[^>]*>[\s\S]*?<\/\1>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockTagRegex.exec(cleanHtml)) !== null) {
    const rawTag = match[0];
    const tagName = (match[1] || 'hr').toLowerCase();

    if (tagName.startsWith('h')) {
      const rawLevel = parseInt(tagName.charAt(1), 10);
      const level = (rawLevel > 3 ? 3 : rawLevel) as 1 | 2 | 3;
      const text = stripTags(rawTag);
      if (text) blocks.push({ type: 'heading', level, text });
    } else if (tagName === 'p') {
      const text = stripTags(rawTag);
      if (text) blocks.push({ type: 'paragraph', text });
    } else if (tagName === 'blockquote') {
      const text = stripTags(rawTag);
      if (text) blocks.push({ type: 'blockquote', text });
    } else if (tagName === 'ul' || tagName === 'ol') {
      const items: string[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(rawTag)) !== null) {
        const itemText = stripTags(liMatch[1]);
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) {
        blocks.push({
          type: tagName === 'ul' ? 'bulletList' : 'orderedList',
          items,
        });
      }
    } else if (tagName === 'aside') {
      const isWarn = rawTag.includes('warning');
      const isTip = rawTag.includes('tip');
      const variant = isWarn ? 'warning' : isTip ? 'tip' : 'info';
      const text = stripTags(rawTag);
      blocks.push({
        type: 'callout',
        variant,
        title: isWarn ? 'Warning' : isTip ? 'Tip' : 'Note',
        text,
      });
    } else if (tagName === 'table') {
      const headers: string[] = [];
      const rows: string[][] = [];

      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch: RegExpExecArray | null;
      while ((thMatch = thRegex.exec(rawTag)) !== null) {
        headers.push(stripTags(thMatch[1]));
      }

      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = trRegex.exec(rawTag)) !== null) {
        const rowCells: string[] = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch: RegExpExecArray | null;
        while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
          rowCells.push(stripTags(tdMatch[1]));
        }
        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      }

      blocks.push({
        type: 'table',
        headers: headers.length > 0 ? headers : rows[0] || [],
        rows: headers.length > 0 ? rows : rows.slice(1),
      });
    } else if (tagName === 'hr') {
      blocks.push({ type: 'separator' });
    }
  }

  return blocks;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Converts JournalContentStructure (lead + sections) into clean semantic HTML
 * for the BlockNote / HTML editor.
 */
export function journalStructureToHtml(content?: JournalContentStructure): string {
  if (!content) return '';
  const parts: string[] = [];

  if (content.lead && content.lead.trim()) {
    parts.push(`<p class="article-lead">${escapeHtml(content.lead.trim())}</p>`);
  }

  if (content.sections && Array.isArray(content.sections)) {
    for (const section of content.sections) {
      if (section.heading && section.heading.trim()) {
        parts.push(`<h2>${escapeHtml(section.heading.trim())}</h2>`);
      }
      if (section.paragraphs && Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) {
          if (p.trim()) {
            parts.push(`<p>${escapeHtml(p.trim())}</p>`);
          }
        }
      }
      if (section.quote && section.quote.trim()) {
        parts.push(`<blockquote><p>${escapeHtml(section.quote.trim())}</p></blockquote>`);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Converts JournalContentBlock[] into clean semantic HTML for the BlockNote / HTML editor.
 */
export function journalBlocksToHtml(blocks: JournalContentBlock[] = []): string {
  if (!blocks || blocks.length === 0) return '';
  const parts: string[] = [];

  for (const block of blocks) {
    if (!block) continue;
    switch (block.type) {
      case 'heading2':
        parts.push(`<h2>${escapeHtml(block.text || '')}</h2>`);
        break;
      case 'heading3':
        parts.push(`<h3>${escapeHtml(block.text || '')}</h3>`);
        break;
      case 'heading4':
        parts.push(`<h4>${escapeHtml(block.text || '')}</h4>`);
        break;
      case 'paragraph':
        parts.push(`<p>${escapeHtml(block.text || '')}</p>`);
        break;
      case 'blockquote':
        parts.push(`<blockquote><p>${escapeHtml(block.text || '')}</p></blockquote>`);
        break;
      case 'callout': {
        const variant = block.variant || 'info';
        const title = block.title || 'Note';
        parts.push(
          `<aside class="callout-box ${variant}" data-type="callout" data-variant="${variant}" data-title="${escapeHtml(title)}"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(block.text || '')}</p></aside>`
        );
        break;
      }
      case 'bulletList': {
        const items = block.items || [];
        if (items.length > 0) {
          parts.push('<ul>' + items.map((it) => `<li>${escapeHtml(it)}</li>`).join('') + '</ul>');
        }
        break;
      }
      case 'numberedList': {
        const items = block.items || [];
        if (items.length > 0) {
          parts.push('<ol>' + items.map((it) => `<li>${escapeHtml(it)}</li>`).join('') + '</ol>');
        }
        break;
      }
      case 'image': {
        const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        parts.push(`<figure><img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.alt || '')}" />${caption}</figure>`);
        break;
      }
      case 'divider':
        parts.push('<hr />');
        break;
      case 'table': {
        if (block.tableData) {
          let tbl = '<table>';
          if (block.tableData.headers?.length) {
            tbl += '<thead><tr>' + block.tableData.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
          }
          if (block.tableData.rows?.length) {
            tbl += '<tbody>' + block.tableData.rows.map((r) => '<tr>' + r.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
          }
          tbl += '</table>';
          parts.push(tbl);
        }
        break;
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Converts document HTML into JournalContentBlock[] for backward compatibility.
 */
export function htmlToJournalBlocks(html: string): JournalContentBlock[] {
  if (!html || !html.trim()) return [];

  const legacy = htmlToContentBlocks(html);
  const result: JournalContentBlock[] = [];

  legacy.forEach((b, idx) => {
    const id = `jb-${idx + 1}-${Date.now()}`;
    switch (b.type) {
      case 'heading': {
        const lvl = b.level || 2;
        const level: 2 | 3 | 4 = lvl === 3 ? 3 : 2;
        result.push({
          id,
          type: level === 3 ? 'heading3' : 'heading2',
          text: b.text,
          level,
        });
        break;
      }
      case 'paragraph': {
        result.push({
          id,
          type: 'paragraph',
          text: b.text,
        });
        break;
      }
      case 'blockquote': {
        result.push({
          id,
          type: 'blockquote',
          text: b.text,
          caption: b.caption,
        });
        break;
      }
      case 'bulletList': {
        result.push({
          id,
          type: 'bulletList',
          items: b.items,
        });
        break;
      }
      case 'orderedList': {
        result.push({
          id,
          type: 'numberedList',
          items: b.items,
        });
        break;
      }
      case 'callout': {
        result.push({
          id,
          type: 'callout',
          variant: b.variant,
          title: b.title,
          text: b.text,
        });
        break;
      }
      case 'table': {
        result.push({
          id,
          type: 'table',
          tableData: {
            headers: b.headers || [],
            rows: b.rows || [],
          },
        });
        break;
      }
      case 'image': {
        result.push({
          id,
          type: 'image',
          url: b.src,
          alt: b.alt,
          caption: b.caption,
        });
        break;
      }
      case 'separator': {
        result.push({
          id,
          type: 'divider',
        });
        break;
      }
      default: {
        if ('text' in b && typeof (b as any).text === 'string') {
          result.push({
            id,
            type: 'paragraph',
            text: (b as any).text,
          });
        }
      }
    }
  });

  return result;
}

/**
 * Converts document HTML into JournalContentStructure (lead + sections)
 * for backward compatibility with existing Astro renderers.
 */
export function htmlToJournalStructure(html: string, fallbackLead?: string): JournalContentStructure {
  const blocks = htmlToJournalBlocks(html);
  if (blocks.length === 0) {
    return {
      lead: fallbackLead || '',
      sections: [],
    };
  }

  let lead = fallbackLead || '';
  const sections: { heading?: string; paragraphs: string[]; quote?: string }[] = [];
  let currentSection: { heading?: string; paragraphs: string[]; quote?: string } | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (i === 0 && block.type === 'paragraph' && !lead) {
      lead = block.text || '';
      continue;
    }

    if (block.type === 'heading2' || block.type === 'heading3' || block.type === 'heading4') {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: block.text || '',
        paragraphs: [],
      };
      continue;
    }

    if (!currentSection) {
      currentSection = {
        paragraphs: [],
      };
    }

    if (block.type === 'paragraph' && block.text) {
      currentSection.paragraphs.push(block.text);
    } else if (block.type === 'blockquote' && block.text) {
      currentSection.quote = block.text;
    } else if (block.type === 'callout' && block.text) {
      currentSection.paragraphs.push(`[${block.title ? block.title + ': ' : ''}${block.text}]`);
    } else if ((block.type === 'bulletList' || block.type === 'numberedList') && block.items) {
      for (let j = 0; j < block.items.length; j++) {
        const prefix = block.type === 'numberedList' ? `${j + 1}. ` : '• ';
        currentSection.paragraphs.push(`${prefix}${block.items[j]}`);
      }
    } else if (block.type === 'table' && block.tableData) {
      currentSection.paragraphs.push(`Table: ${block.tableData.headers.join(' | ')}`);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    lead,
    sections,
  };
}
