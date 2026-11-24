import type { CmsDocumentMeta, SeoMetadata } from './common.ts';

export type JournalStatus = 'draft' | 'published' | 'archived';

export type JournalBlockType =
  | 'paragraph'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bulletList'
  | 'numberedList'
  | 'blockquote'
  | 'callout'
  | 'image'
  | 'table'
  | 'divider'
  | 'link';

export interface JournalContentBlock {
  id: string;
  type: JournalBlockType;
  text?: string;
  items?: string[];
  level?: 2 | 3 | 4;
  variant?: 'info' | 'tip' | 'warning' | 'quote';
  title?: string;
  url?: string;
  caption?: string;
  alt?: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export interface JournalSection {
  heading?: string;
  paragraphs: string[];
  quote?: string;
}

export interface JournalContentStructure {
  lead: string;
  sections: JournalSection[];
}

export interface JournalDocument extends CmsDocumentMeta {
  // Identification
  legacyId?: string; // e.g. "01", "02"
  slug: string; // Document ID and URL slug: "why-i-believe-in-learning-in-public"
  title: string;
  subtitle?: string;
  category: string;
  tags: string[];
  excerpt: string;
  author: string;
  language?: string; // English | Nepali | Mixed
  coverImage?: string;
  thumbnailAlt?: string;
  coverImageCaption?: string;

  // Publishing State
  published: boolean;
  status?: JournalStatus;
  featured: boolean;
  order: number;
  publishedAt: string; // e.g. "November 2024" or ISO string
  updatedAtDate?: string;
  readTime: string; // e.g. "4 min read"
  wordCount?: number;
  isSample?: boolean;
  archivedAt?: string;

  // Canonical Content & Structured Blocks
  content: JournalContentStructure;
  contentBlocks?: JournalContentBlock[];
  contentHtml?: string; // Rich continuous document HTML
  blocknoteJson?: any[]; // Serialized BlockNote JSON blocks
  blocknoteHtml?: string; // Semantic HTML generated from BlockNote
  tiptapJson?: Record<string, any>; // Serialized Tiptap JSON document (legacy)

  // Editorial Relationships
  prevSlug?: string;
  nextSlug?: string;
  relatedSlugs?: string[];

  seo: SeoMetadata;
}
