/**
 * Common CMS Types & Shared Metadata
 * Provides standard document interfaces, publication states, and SEO metadata.
 */

export type PublishingStatus = 'draft' | 'published' | 'archived';

export interface CmsDocumentMeta {
  id: string;
  createdAt: string; // ISO 8601 string for client & build portability
  updatedAt: string; // ISO 8601 string
  updatedBy?: string; // Admin email or UID
}

export interface SeoMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: string[];
  noIndex?: boolean;
}

export interface ReorderableItem {
  id: string;
  order: number;
  visible?: boolean;
}
