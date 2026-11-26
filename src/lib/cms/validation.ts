import { z } from 'zod';
import { CmsValidationError } from './errors.ts';
import type {
  SiteSettingsDocument,
  HomePageDocument,
  AboutPageDocument,
  ResourceDocument,
  JournalDocument,
  CmsAttachment,
} from '../../types/cms/index.ts';

// =============================================================================
// Primitive & Helper Validators
// =============================================================================

export const nonBlobStringSchema = z
  .string()
  .refine((val) => !val.trim().toLowerCase().startsWith('blob:'), {
    message: 'Temporary blob: URLs cannot be stored permanently in the database.',
  });

export const urlOrPathSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return false;
      const trimmed = val.trim();
      if (trimmed.toLowerCase().startsWith('blob:')) return false;
      if (trimmed.toLowerCase().startsWith('javascript:')) return false;
      if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
      try {
        const u = new URL(trimmed);
        return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:' || u.protocol === 'tel:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid URL, mailto/tel link, or relative root path (e.g. /resources)' }
  );

export const resourceNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{1,6}$/, 'Resource number must be a positive integer (1 to 6 digits)')
  .refine((val) => parseInt(val, 10) > 0, {
    message: 'Resource number must be a positive integer (1 or greater)',
  })
  .transform((val) => (val.length < 3 ? val.padStart(3, '0') : val));

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must not exceed 120 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with single hyphens (e.g. my-article-title)');

export const seoMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  noIndex: z.boolean().optional(),
});

// =============================================================================
// Site Settings Validation Schema
// =============================================================================

export const socialLinkSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(1, 'Platform name is required'),
  label: z.string().min(1),
  handle: z.string(),
  url: urlOrPathSchema,
  icon: z.enum([
    'instagram',
    'youtube',
    'tiktok',
    'linkedin',
    'twitter',
    'facebook',
    'mail',
    'phone',
    'whatsapp',
    'link',
  ]),
  featured: z.boolean().default(true),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const navItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'Navigation label is required'),
  href: z.string().min(1, 'Navigation href is required'),
  badge: z.string().optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const footerConfigSchema = z.object({
  showNav: z.boolean().default(true),
  showSocial: z.boolean().default(true),
  showContact: z.boolean().default(true),
  showDirectActions: z.boolean().default(true),
  customNote: z.string().optional(),
  copyrightText: z.string().optional(),
});

export const siteSettingsSchema = z.object({
  id: z.string().default('general'),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  fullName: z.string().min(1, 'Full name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  websiteTitle: z.string().min(1, 'Website title is required'),
  tagline: z.string(),
  positioning: z.string(),
  shortDescription: z.string(),
  profileImage: nonBlobStringSchema,
  email: z.string().email('Invalid primary email address'),
  phone: z.string(),
  whatsappNumber: z.string(),
  location: z.string(),
  identity: z.string(),
  socialLinks: z.array(socialLinkSchema),
  navItems: z.array(navItemSchema),
  footer: footerConfigSchema,
  seo: seoMetadataSchema,
  favicon: z.string(),
});

// =============================================================================
// Homepage Validation Schema
// =============================================================================

export const homePageSchema = z.object({
  id: z.string().default('home'),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  heroHeadline: z.string().min(1, 'Hero headline is required'),
  heroRolePrefix: z.string(),
  heroRoleBrand: z.string(),
  heroRoleUrl: urlOrPathSchema,
  heroTagline: z.string(),
  heroPhotoUrl: nonBlobStringSchema,
  heroPhotoAlt: z.string(),
  primaryCta: z.object({
    text: z.string().min(1),
    url: urlOrPathSchema,
    visible: z.boolean().default(true),
    isExternal: z.boolean().optional(),
  }),
  secondaryCta: z.object({
    text: z.string().min(1),
    url: urlOrPathSchema,
    visible: z.boolean().default(true),
    isExternal: z.boolean().optional(),
  }),
  sections: z.object({
    hero: z
      .object({
        visible: z.boolean().default(true),
        order: z.number().int().nonnegative().optional(),
      })
      .optional(),
    finder: z.object({
      visible: z.boolean().default(true),
      heading: z.string(),
      placeholder: z.string(),
      buttonLabel: z.string(),
      order: z.number().int().nonnegative().optional(),
    }),
    featuredResources: z.object({
      visible: z.boolean().default(true),
      heading: z.string(),
      count: z.number().int().positive().default(3),
      customResourceIds: z.array(z.string()).optional(),
      order: z.number().int().nonnegative().optional(),
    }),
    journal: z.object({
      visible: z.boolean().default(true),
      heading: z.string(),
      description: z.string(),
      ctaText: z.string(),
      ctaUrl: urlOrPathSchema,
      order: z.number().int().nonnegative().optional(),
    }),
    contact: z.object({
      visible: z.boolean().default(true),
      heading: z.string(),
      description: z.string(),
      showEmail: z.boolean().default(true),
      showSocial: z.boolean().default(true),
      order: z.number().int().nonnegative().optional(),
    }),
  }),
  sectionOrder: z.array(z.string()).optional(),
  seo: seoMetadataSchema,
});

// =============================================================================
// About Page Validation Schema
// =============================================================================

export const aboutWorkEntrySchema = z.object({
  id: z.string().min(1),
  index: z.string(),
  name: z.string().min(1),
  desc: z.string().min(1),
  link: z
    .object({
      text: z.string(),
      url: urlOrPathSchema,
      isExternal: z.boolean().default(false),
    })
    .optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const aboutMediaEntrySchema = z.object({
  id: z.string().min(1),
  show: z.string().min(1),
  role: z.string().min(1),
  format: z.string().min(1),
  desc: z.string().min(1),
  url: urlOrPathSchema.optional(),
  coverImage: z.string().optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const aboutEducationEntrySchema = z.object({
  id: z.string().min(1),
  index: z.string(),
  title: z.string().min(1),
  degree: z.string().optional(),
  institution: z.string().optional(),
  period: z.string().optional(),
  status: z.string().optional(),
  desc: z.string().optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const aboutExperienceEntrySchema = z.object({
  id: z.string().min(1),
  organization: z.string().min(1),
  position: z.string().min(1),
  period: z.string().optional(),
  desc: z.string().optional(),
  status: z.string().optional(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const aboutStoryMilestoneSchema = z.object({
  id: z.string().min(1),
  number: z.string(),
  title: z.string(),
  paragraph: z.string(),
  order: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
});

export const aboutPageSchema = z.object({
  id: z.string().default('about'),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  title: z.string().min(1, 'About page title is required'),
  introParagraphs: z.array(z.string().min(1)).min(1, 'At least one bio paragraph is required'),
  workEntries: z.array(aboutWorkEntrySchema),
  mediaEntries: z.array(aboutMediaEntrySchema),
  educationEntries: z.array(aboutEducationEntrySchema),
  experienceEntries: z.array(aboutExperienceEntrySchema),
  storyMilestones: z.array(aboutStoryMilestoneSchema).optional(),
  contact: z.object({
    visible: z.boolean().default(true),
    showEmail: z.boolean().default(true),
    showSocial: z.boolean().default(true),
  }),
  sectionOrder: z.array(z.string()).optional(),
  sectionVisibility: z.record(z.string(), z.boolean()).optional(),
  seo: seoMetadataSchema,
});

// =============================================================================
// Resource Validation Schema
// =============================================================================

export const attachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Attachment name is required'),
  fileName: z.string().min(1),
  format: z.string().min(1),
  fileSize: z.string().min(1),
  url: nonBlobStringSchema.min(1),
  storagePath: z.string().optional(),
  fileExtension: z.string().min(1),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  downloadLabel: z.string().optional(),
  isPreviewable: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
  visible: z.boolean().default(true),
  uploadedAt: z.string().optional(),
});

export const externalLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'Link label is required'),
  url: urlOrPathSchema,
  description: z.string().optional(),
});

export const youtubeEmbedSchema = z.object({
  videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/, 'Invalid 11-character YouTube video ID'),
  title: z.string(),
  caption: z.string().optional(),
});

export const generatedDocumentMetaSchema = z.object({
  url: nonBlobStringSchema.min(1),
  fileName: z.string().min(1),
  fileSize: z.string().min(1),
  byteSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().min(1),
  storagePath: z.string().optional(),
  generatedAt: z.string().min(1),
  contentVersion: z.string().min(1),
});

export const resourceStatusSchema = z.enum(['draft', 'published', 'archived']);

export const resourceSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  resourceNumber: resourceNumberSchema,
  title: z.string().min(1, 'Resource title is required'),
  shortDescription: z.string().optional(),
  slug: slugSchema,
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  resourceType: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  fullDescription: z.string().optional(),
  tags: z.array(z.string()),
  coverImage: nonBlobStringSchema.optional(),
  thumbnailAlt: z.string().optional(),
  author: z.string().default('Aakash Das'),
  language: z.string().default('English'),
  estimatedTime: z.string().optional(),
  published: z.boolean().default(true),
  status: resourceStatusSchema.optional(),
  featured: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
  publishedAt: z.string(),
  updatedAtDate: z.string().optional(),
  downloadFormat: z.string().optional(),
  fileSize: z.string().optional(),
  downloadUrl: nonBlobStringSchema.optional(),
  pdfPreviewUrl: nonBlobStringSchema.optional(),
  docxUrl: nonBlobStringSchema.optional(),
  contentVersion: z.string().optional(),
  generatedPdf: generatedDocumentMetaSchema.optional(),
  generatedDocx: generatedDocumentMetaSchema.optional(),
  lastGeneratedAt: z.string().optional(),
  lastGenerationError: z.string().optional(),
  cardActionLabel: z.string().default('Open'),
  detailActionLabel: z.string().default('Download Resources'),
  attachments: z.array(attachmentSchema).default([]),
  externalLinks: z.array(externalLinkSchema).optional(),
  contentHtml: z.string().optional(),
  contentJson: z.any().optional(),
  blocknoteJson: z.any().optional(),
  blocknoteHtml: z.string().optional(),
  youtubeEmbed: youtubeEmbedSchema.optional(),
  summaryPoints: z.array(z.string()).default([]),
  targetAudience: z.string().default(''),
  contentBlocks: z.array(z.any()).default([]),
  prevResourceNumber: z.string().optional(),
  nextResourceNumber: z.string().optional(),
  relatedResourceNumbers: z.array(z.string()).optional(),
  seo: seoMetadataSchema.optional(),
});

// =============================================================================
// Journal Validation Schema
// =============================================================================

export const journalStatusSchema = z.enum(['draft', 'published', 'archived']);

export const journalBlockTypeSchema = z.enum([
  'paragraph',
  'heading2',
  'heading3',
  'heading4',
  'bulletList',
  'numberedList',
  'blockquote',
  'callout',
  'image',
  'table',
  'divider',
  'link',
]);

export const journalContentBlockSchema = z.object({
  id: z.string(),
  type: journalBlockTypeSchema,
  text: z.string().optional(),
  items: z.array(z.string()).optional(),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  variant: z.enum(['info', 'tip', 'warning', 'quote']).optional(),
  title: z.string().optional(),
  url: urlOrPathSchema.optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
  tableData: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .optional(),
});

export const journalSectionSchema = z.object({
  heading: z.string().optional(),
  paragraphs: z.array(z.string()),
  quote: z.string().optional(),
});

export const journalSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  legacyId: z.string().optional(),
  slug: slugSchema,
  title: z.string().min(1, 'Article title is required'),
  subtitle: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  excerpt: z.string().min(1, 'Excerpt is required'),
  author: z.string().default('Aakash Das'),
  language: z.string().default('English'),
  coverImage: nonBlobStringSchema.optional(),
  thumbnailAlt: z.string().optional(),
  coverImageCaption: z.string().optional(),
  published: z.boolean().default(true),
  status: journalStatusSchema.optional(),
  featured: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
  publishedAt: z.string(),
  updatedAtDate: z.string().optional(),
  readTime: z.string().default('4 min read'),
  wordCount: z.number().int().nonnegative().optional(),
  isSample: z.boolean().optional(),
  archivedAt: z.string().optional(),
  content: z.object({
    lead: z.string(),
    sections: z.array(journalSectionSchema),
  }),
  contentBlocks: z.array(journalContentBlockSchema).optional(),
  contentHtml: z.string().optional(),
  blocknoteJson: z.any().optional(),
  blocknoteHtml: z.string().optional(),
  tiptapJson: z.record(z.string(), z.any()).optional(),
  prevSlug: z.string().optional(),
  nextSlug: z.string().optional(),
  relatedSlugs: z.array(z.string()).optional(),
  seo: seoMetadataSchema.default({}),
});

// =============================================================================
// Safe Validation Execution Helpers
// =============================================================================

function formatZodIssues(issues: z.ZodIssue[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.join('.') || 'root';
    if (!map[path]) map[path] = [];
    map[path].push(issue.message);
  }
  return map;
}

export function validateResourceNumber(raw: string): { valid: boolean; value?: string; error?: string } {
  const result = resourceNumberSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, error: result.error.issues[0]?.message };
  }
  return { valid: true, value: result.data };
}

export function validateSlug(raw: string): { valid: boolean; value?: string; error?: string } {
  const result = slugSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, error: result.error.issues[0]?.message };
  }
  return { valid: true, value: result.data };
}

export function validateSiteSettings(data: unknown): SiteSettingsDocument {
  const result = siteSettingsSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('Site settings validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as SiteSettingsDocument;
}

export function validateHomePage(data: unknown): HomePageDocument {
  const result = homePageSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('Homepage content validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as HomePageDocument;
}

export function validateAboutPage(data: unknown): AboutPageDocument {
  const result = aboutPageSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('About page content validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as AboutPageDocument;
}

export function validateResource(data: unknown): ResourceDocument {
  const result = resourceSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('Resource validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as ResourceDocument;
}

export function validateJournal(data: unknown): JournalDocument {
  const result = journalSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('Journal article validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as JournalDocument;
}

export function validateAttachment(data: unknown): CmsAttachment {
  const result = attachmentSchema.safeParse(data);
  if (!result.success) {
    throw new CmsValidationError('Attachment validation failed', formatZodIssues(result.error.issues));
  }
  return result.data as CmsAttachment;
}
