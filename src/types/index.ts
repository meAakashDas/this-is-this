export interface SocialLink {
  platform: string;
  label: string;
  handle: string;
  url: string;
  icon:
    | 'instagram'
    | 'youtube'
    | 'tiktok'
    | 'linkedin'
    | 'twitter'
    | 'facebook'
    | 'mail'
    | 'link';
  featured?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  role: string;
  period: string;
  description: string;
  tags: string[];
  url?: string;
  isExternal?: boolean;
  status: 'active' | 'in-progress' | 'archived';
}

/* ==========================================================================
   Resource Data Architecture (Permanent Number System)
   ========================================================================== */

export interface Attachment {
  id: string;
  name: string;
  fileName?: string;
  format: string; // e.g. "PDF Document", "Excel Spreadsheet", "CSV Data"
  fileSize: string; // e.g. "142 KB"
  fileExtension?: string;
  description?: string;
  url: string; // Direct public URL under /downloads/, external URL, or inline Data URI
  isPreviewable?: boolean; // Can be previewed in-browser (PDFs)
  visible?: boolean;
}

export interface ExternalResourceLink {
  id: string;
  label: string;
  url: string;
  description?: string;
}

export interface TableContent {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export type ContentBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | {
      type: 'paragraph';
      text: string;
      marks?: Array<{
        type: 'bold' | 'italic' | 'underline' | 'link';
        text: string;
        href?: string;
      }>;
    }
  | { type: 'blockquote'; text: string; caption?: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'orderedList'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | {
      type: 'callout';
      title?: string;
      text: string;
      variant?: 'info' | 'tip' | 'warning';
    }
  | { type: 'separator' }
  | { type: 'image'; src: string; alt: string; caption?: string };

export interface YouTubeEmbedData {
  videoId: string;
  title: string;
  caption?: string;
}

export interface GeneratedResourceDocumentInfo {
  url: string;
  fileName: string;
  fileSize: string;
  byteSize?: number;
  mimeType: string;
  storagePath?: string;
  generatedAt: string;
  contentVersion: string;
}

export interface Resource {
  /** Immutable canonical document identifier in Firestore (preserved across display number edits). */
  id?: string;
  /**
   * Formatted display resource number (e.g. "001", "015", "100").
   * Preserves leading zeroes.
   */
  resourceNumber: string;
  slug?: string;
  title: string;
  description: string;
  fullDescription?: string;
  category: string;
  subcategory?: string;
  coverImage?: string;
  thumbnailAlt?: string;
  publishedAt: string; // ISO date format "YYYY-MM-DD"
  updatedAt?: string;
  published: boolean; // Visibility flag: only published resources are public
  featured?: boolean; // Highlighted on free resources section
  order?: number;
  downloadFormat?: string; // e.g. "Spreadsheet (.xlsx)", "PDF Guide", "Notion Template"
  fileSize?: string; // e.g. "180 KB"
  downloadUrl?: string; // Direct public URL (no auth, no paywall)
  pdfPreviewUrl?: string; // Direct URL to primary PDF for in-page preview
  docxUrl?: string; // Direct URL to Microsoft Word document (.docx)
  contentVersion?: string; // Content hash tracking generated PDF/DOCX synchronization
  generatedPdf?: GeneratedResourceDocumentInfo;
  generatedDocx?: GeneratedResourceDocumentInfo;
  lastGeneratedAt?: string;
  attachments?: Attachment[]; // Multiple downloadable attachments
  externalLinks?: ExternalResourceLink[]; // External reference links
  youtubeEmbed?: YouTubeEmbedData; // Privacy-conscious YouTube video embed
  contentHtml?: string; // Rich Notion-style document content HTML
  contentJson?: any; // ProseMirror/Tiptap document JSON AST
  blocknoteJson?: any; // BlockNote document JSON blocks AST
  blocknoteHtml?: string; // Serialized semantic HTML from BlockNote
  contentBlocks?: ContentBlock[]; // Safe structured editorial content (fallback/compatibility)
  tags: string[];
  summaryPoints?: string[]; // Bulleted overview of what is included
  targetAudience?: string; // e.g. "Students and beginners starting personal budgeting in Nepal"
}

export interface JournalEntryPlaceholder {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  readTime: string;
}

export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  url: string;
  identity: string;
  location: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  tagline: string;
  positioning: string;
  navItems: NavItem[];
  socialLinks: SocialLink[];
  projects: ProjectItem[];
}

export interface AboutStoryMilestone {
  number: string;
  title: string;
  paragraph: string;
}

export interface AboutActivityItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  linkText?: string;
  isExternal?: boolean;
}

export interface AboutData {
  title: string;
  lead: string;
  introParagraphs: string[];
  story: AboutStoryMilestone[];
  activities: AboutActivityItem[];
}
