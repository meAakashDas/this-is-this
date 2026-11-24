import type { CmsDocumentMeta, SeoMetadata, ReorderableItem } from './common.ts';
import type { ContentBlock, YouTubeEmbedData } from '../index.ts';

export type ResourceStatus = 'draft' | 'published' | 'archived';

export interface CmsAttachment extends ReorderableItem {
  name: string;
  fileName: string;
  format: string; // e.g. "PDF Document", "Excel Spreadsheet", "CSV Data", "ZIP Archive", "Presentation"
  fileSize: string; // e.g. "142 KB"
  url: string; // Public URL
  storagePath?: string; // Firebase Storage uploads/resources/{resourceNumber}/ path
  fileExtension: string; // e.g. "pdf", "docx", "xlsx", "csv", "zip", "pptx"
  mimeType?: string;
  description?: string;
  downloadLabel?: string; // e.g. "Download", "Get Worksheet"
  isPreviewable: boolean;
  uploadedAt?: string;
}

export interface ResourceDocument extends CmsDocumentMeta {
  // Identification
  resourceNumber: string; // Immutable 3-digit ID: "001", "002"
  title: string;
  slug: string;
  category: string;
  subcategory?: string;
  resourceType?: string; // e.g. "Template", "Guide", "Checklist", "Calculator", "Framework"
  description: string;
  fullDescription?: string;
  tags: string[];
  coverImage?: string;
  thumbnailAlt?: string;
  author: string;
  language?: string; // e.g. "English", "Nepali"
  estimatedTime?: string; // e.g. "15 min"

  // Publishing State
  published: boolean;
  status?: ResourceStatus;
  featured: boolean;
  order: number;
  publishedAt: string; // "YYYY-MM-DD"
  updatedAtDate?: string;

  // Primary Downloads & Direct Exports
  downloadFormat?: string;
  fileSize?: string;
  downloadUrl?: string;
  pdfPreviewUrl?: string;
  docxUrl?: string;
  cardActionLabel?: string; // e.g. "Open"
  detailActionLabel?: string; // e.g. "Download Resources"

  // Multiple Attachments
  attachments: CmsAttachment[];

  // Educational Content & Media (Notion-style continuous writing)
  contentHtml?: string;
  contentJson?: any;
  blocknoteJson?: any;
  blocknoteHtml?: string;
  youtubeEmbed?: YouTubeEmbedData;
  summaryPoints?: string[];
  targetAudience?: string;
  contentBlocks?: ContentBlock[];

  // Relationships
  prevResourceNumber?: string;
  nextResourceNumber?: string;
  relatedResourceNumbers?: string[];

  seo?: SeoMetadata;
}
