import type { JournalContentBlock, JournalContentStructure } from '../types/cms/journal.ts';

/**
 * Central Journal Categories & Tag Definitions
 */
export interface JournalCategory {
  id: string;
  name: string;
  description: string;
  color?: string;
}

export const JOURNAL_CATEGORIES: JournalCategory[] = [
  { id: 'personal-finance', name: 'Personal Finance', description: 'Budgeting, personal capital allocation, and cash flow mechanics' },
  { id: 'banking', name: 'Banking', description: 'Commercial banking, digital payment networks, and account compliance' },
  { id: 'stock-market', name: 'Stock Market', description: 'Capital markets, fundamental analysis, and retail investing' },
  { id: 'nepse', name: 'NEPSE', description: 'Nepal Stock Exchange indicators, indices, and market trends' },
  { id: 'taxation', name: 'Taxation', description: 'Income tax slabs, TDS, VAT, and fiscal compliance in Nepal' },
  { id: 'fintech', name: 'Fintech', description: 'Digital payment infrastructure, wallets, QR ecosystems, and financial software' },
  { id: 'investment', name: 'Investment', description: 'Long-term compounding, mutual funds, and asset allocation' },
  { id: 'business', name: 'Business', description: 'Entrepreneurship, startup building, and execution in Nepal' },
  { id: 'technology', name: 'Technology', description: 'Software engineering, design systems, and web architecture' },
  { id: 'education', name: 'Education', description: 'Pedagogy, learning mechanics, and academic development' },
  { id: 'productivity', name: 'Productivity', description: 'Time architecture, habits, and sustainable output' },
  { id: 'financial-literacy', name: 'Financial Literacy', description: 'Core principles of money management for beginners' },
  { id: 'learning', name: 'Learning', description: 'Learning in public, mental models, and knowledge compounding' },
  { id: 'building', name: 'Building', description: 'Product development stories, engineering lessons, and startup journeys' },
  { id: 'personal-growth', name: 'Personal Growth', description: 'Mindset, intentional living, and beginner posture' },
  { id: 'other', name: 'Other', description: 'General thoughts, essays, and uncategorized reflections' },
];

export const DEFAULT_JOURNAL_TAGS: string[] = [
  'Personal Finance',
  'Banking',
  'Technology',
  'Startup',
  'Learning in Public',
  'Mindset',
  'Investing',
  'NEPSE',
  'Taxes',
  'Cash Flow',
  'Nepal',
  'Editorial',
  'Fintech',
];

/**
 * Calculates accurate word count for English and Devanagari text.
 */
export function calculateWordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates estimated reading time assuming standard 200 wpm.
 */
export function calculateReadingTime(wordCount: number): string {
  if (wordCount <= 0) return '1 min read';
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/**
 * Generates URL-safe lowercase kebab-case slug from title.
 */
export function generateSlugFromTitle(title: string): string {
  const clean = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');

  return clean || `article-${Date.now().toString(36)}`;
}

/**
 * Extracts plain text across all structured content blocks.
 */
export function extractTextFromBlocks(blocks: JournalContentBlock[]): string {
  const chunks: string[] = [];
  for (const b of blocks) {
    if (b.text) chunks.push(b.text);
    if (b.items && b.items.length > 0) chunks.push(b.items.join(' '));
    if (b.caption) chunks.push(b.caption);
    if (b.tableData) {
      chunks.push(b.tableData.headers.join(' '));
      for (const row of b.tableData.rows) {
        chunks.push(row.join(' '));
      }
    }
  }
  return chunks.join(' ');
}

/**
 * Converts structured content blocks into standard JournalContentStructure (lead + sections)
 * for backward compatibility with Astro public renderers.
 */
export function blocksToContentStructure(
  blocks: JournalContentBlock[],
  fallbackLead?: string
): JournalContentStructure {
  if (!blocks || blocks.length === 0) {
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

    // First paragraph can serve as lead if lead is empty
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
      currentSection.paragraphs.push(`[Note: ${block.title ? block.title + ' — ' : ''}${block.text}]`);
    } else if ((block.type === 'bulletList' || block.type === 'numberedList') && block.items) {
      for (let j = 0; j < block.items.length; j++) {
        const prefix = block.type === 'numberedList' ? `${j + 1}. ` : '• ';
        currentSection.paragraphs.push(`${prefix}${block.items[j]}`);
      }
    } else if (block.type === 'table' && block.tableData) {
      currentSection.paragraphs.push(
        `Table: ${block.tableData.headers.join(' | ')}`
      );
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { lead: lead || (fallbackLead || ''), sections };
}

/**
 * Converts standard JournalContentStructure into initial content blocks.
 */
export function contentStructureToBlocks(content: JournalContentStructure): JournalContentBlock[] {
  const blocks: JournalContentBlock[] = [];
  let idCounter = 1;

  if (content.lead) {
    blocks.push({
      id: `block-${idCounter++}`,
      type: 'paragraph',
      text: content.lead,
    });
  }

  if (content.sections) {
    for (const s of content.sections) {
      if (s.heading) {
        blocks.push({
          id: `block-${idCounter++}`,
          type: 'heading2',
          text: s.heading,
          level: 2,
        });
      }
      if (s.paragraphs) {
        for (const p of s.paragraphs) {
          blocks.push({
            id: `block-${idCounter++}`,
            type: 'paragraph',
            text: p,
          });
        }
      }
      if (s.quote) {
        blocks.push({
          id: `block-${idCounter++}`,
          type: 'blockquote',
          text: s.quote,
        });
      }
    }
  }

  return blocks;
}
