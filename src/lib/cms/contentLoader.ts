/**
 * Unified Build-Time Content Loader for Astro SSG
 *
 * Consumes the validated build snapshot from `src/data/cms-snapshot.json`
 * with resilient fallback to local source files.
 * Provides typed, clean getters for all public Astro pages.
 */

import snapshotData from '../../data/cms-snapshot.json' with { type: 'json' };
import { siteConfig as defaultSiteConfig } from '../../data/siteConfig.ts';
import { aboutData as defaultAboutData } from '../../data/aboutData.ts';
import {
  resourcesData as defaultResourcesData,
  getAllPublishedResources as defaultGetAllPublishedResources,
  getPublishedResourceByNumber as defaultGetPublishedResourceByNumber,
  getAllPublishedResourceNumbers as defaultGetAllPublishedResourceNumbers,
  getAdjacentPublishedResources as defaultGetAdjacentPublishedResources,
} from '../../data/resources.ts';
import {
  sampleJournalEntries as defaultSampleJournalEntries,
  getAllJournalArticles as defaultGetAllJournalArticles,
  getJournalArticleBySlug as defaultGetJournalArticleBySlug,
  getAllJournalSlugs as defaultGetAllJournalSlugs,
  getAdjacentJournalArticles as defaultGetAdjacentJournalArticles,
  type JournalEntry,
} from '../../data/journal.ts';
import type { Resource } from '../../types/index.ts';
import type {
  HomePageDocument,
  AboutPageDocument,
  SiteSettingsDocument,
  ResourceDocument,
  JournalDocument,
} from '../../types/cms/index.ts';

interface SnapshotMeta {
  version: string;
  generatedAt: string;
  source: string;
  buildEnvironment: string;
  resourceCount: number;
  publishedResourceCount: number;
  journalCount: number;
  publishedJournalCount: number;
}

interface CmsSnapshot {
  _meta?: SnapshotMeta;
  siteSettings?: SiteSettingsDocument;
  homePage?: HomePageDocument;
  aboutPage?: AboutPageDocument;
  resources?: ResourceDocument[];
  journals?: JournalDocument[];
}

const snapshot = (snapshotData || {}) as CmsSnapshot;

/**
 * Returns snapshot build metadata.
 */
export function getPublishingMeta(): SnapshotMeta {
  return (
    snapshot._meta || {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'fallback',
      buildEnvironment: 'production',
      resourceCount: defaultResourcesData.length,
      publishedResourceCount: defaultGetAllPublishedResources().length,
      journalCount: defaultSampleJournalEntries.length,
      publishedJournalCount: defaultGetAllJournalArticles().length,
    }
  );
}

/**
 * Returns merged site settings and identity configuration.
 */
export function getPublicSiteConfig() {
  const settings = snapshot.siteSettings;
  if (!settings) return defaultSiteConfig;

  return {
    name: settings.fullName || defaultSiteConfig.name,
    title: settings.websiteTitle || defaultSiteConfig.title,
    description: settings.shortDescription || defaultSiteConfig.description,
    tagline: settings.tagline || defaultSiteConfig.tagline,
    positioning: settings.positioning || defaultSiteConfig.positioning,
    identity: settings.identity || defaultSiteConfig.identity,
    location: settings.location || defaultSiteConfig.location,
    email: settings.email || defaultSiteConfig.email,
    phone: settings.phone || defaultSiteConfig.phone,
    whatsappNumber: settings.whatsappNumber || defaultSiteConfig.whatsappNumber,
    url: settings.seo?.canonicalUrl || defaultSiteConfig.url,
    profileImage: (!settings.profileImage || settings.profileImage.startsWith('blob:'))
      ? '/images/aakash-das.webp'
      : settings.profileImage,
    favicon: settings.favicon || '/favicon.svg',
    socialLinks: (settings.socialLinks && settings.socialLinks.length > 0)
      ? settings.socialLinks.filter((s) => s.visible !== false)
      : defaultSiteConfig.socialLinks,
    navItems: (settings.navItems && settings.navItems.length > 0)
      ? settings.navItems.filter((n) => n.visible !== false)
      : defaultSiteConfig.navItems,
  };
}

/**
 * Returns homepage content and section layout.
 */
export function getPublicHomePage(): HomePageDocument {
  if (snapshot.homePage && snapshot.homePage.heroHeadline) {
    const hp = { ...snapshot.homePage };
    if (!hp.heroPhotoUrl || hp.heroPhotoUrl.startsWith('blob:')) {
      hp.heroPhotoUrl = (snapshot.siteSettings?.profileImage && !snapshot.siteSettings.profileImage.startsWith('blob:'))
        ? snapshot.siteSettings.profileImage
        : '/images/aakash-das.webp';
    }
    return hp;
  }

  return {
    id: 'home',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    heroHeadline: "I'm Aakash Das.",
    heroRolePrefix: 'Founder of',
    heroRoleBrand: 'RisePaisa',
    heroRoleUrl: 'https://risepaisa.com',
    heroTagline: 'I love learning, building, and sharing.',
    heroPhotoUrl: '/images/aakash-das.webp',
    heroPhotoAlt: 'Aakash Das',
    primaryCta: {
      text: 'Explore free resources',
      url: '/resources',
      visible: true,
    },
    secondaryCta: {
      text: 'About me',
      url: '/about',
      visible: true,
    },
    sections: {
      hero: { visible: true, order: 0 },
      finder: {
        visible: true,
        heading: 'Find Resources',
        placeholder: 'Enter resource number',
        buttonLabel: 'Find',
        order: 1,
      },
      featuredResources: {
        visible: true,
        heading: 'Free Resources',
        count: 3,
        customResourceIds: ['001', '002', '003'],
        order: 2,
      },
      journal: {
        visible: true,
        heading: 'Journal',
        description:
          'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
        ctaText: 'Read articles',
        ctaUrl: '/journal',
        order: 3,
      },
      contact: {
        visible: true,
        heading: 'Get in Touch',
        description:
          'Feel free to reach out directly via email or connect on social platforms.',
        showEmail: true,
        showSocial: true,
        order: 4,
      },
    },
    sectionOrder: ['finder', 'featuredResources', 'journal', 'contact'],
    seo: {},
  };
}

/**
 * Returns About page content and section layout.
 */
export function getPublicAboutPage(): AboutPageDocument {
  if (snapshot.aboutPage && snapshot.aboutPage.title) {
    return snapshot.aboutPage;
  }

  return {
    id: 'about',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    title: 'About Aakash Das',
    introParagraphs: [
      "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources.",
      "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market. Through RisePaisa, I aim to make reliable financial knowledge more accessible and help students, young professionals, and everyday learners make better-informed financial decisions.",
      "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances.",
    ],
    workEntries: [
      {
        id: 'work-1',
        order: 1,
        index: '01',
        name: 'RisePaisa',
        desc: 'Building a Nepal-focused financial education platform that makes personal finance, banking, taxation, fintech, and investment concepts easier to understand through educational content, practical resources, and digital learning tools.',
        link: {
          text: 'Visit RisePaisa',
          url: 'https://risepaisa.com',
          isExternal: true,
        },
      },
      {
        id: 'work-2',
        order: 2,
        index: '02',
        name: 'riseNEPSE',
        desc: "Creating educational content focused on Nepal's stock market, NEPSE, fundamental and technical analysis, and investment knowledge to make stock market education more accessible.",
      },
      {
        id: 'work-3',
        order: 3,
        index: '03',
        name: 'Finance Education & Content',
        desc: "Creating educational videos, research-based explanations, and practical digital resources covering Nepal's financial system, personal finance, and technology.",
        link: {
          text: 'Explore Resources',
          url: '/resources',
          isExternal: false,
        },
      },
    ],
    mediaEntries: [
      {
        id: 'media-1',
        order: 1,
        show: 'The Amit Show',
        role: 'Podcast Guest',
        format: 'Featured Interview',
        desc: 'A conversation about building RisePaisa, content creation, audience growth, and my journey as a young entrepreneur and finance educator.',
        url: 'https://youtube.com',
      },
    ],
    educationEntries: [
      {
        id: 'edu-1',
        order: 1,
        index: '01',
        title: 'Information Technology',
        degree: 'BSc (Hons) Information Technology',
        institution: 'Coventry University | Via Softwarica College of IT & E-Commerce',
        period: '2025–2028',
        status: 'Currently pursuing.',
      },
      {
        id: 'edu-2',
        order: 2,
        index: '02',
        title: 'Chartered Accountancy',
        desc: 'Previously pursued Chartered Accountancy studies through ICAI, 2024–2025. Later transitioned towards Information Technology.',
      },
    ],
    experienceEntries: [],
    contact: {
      visible: true,
      showEmail: true,
      showSocial: true,
    },
    sectionOrder: ['about-intro', 'work', 'media', 'education', 'contact'],
    sectionVisibility: {
      'about-intro': true,
      work: true,
      media: true,
      education: true,
      contact: true,
    },
    seo: {},
  };
}

/**
 * Maps CMS ResourceDocument to public Resource format.
 */
function mapDocToResource(doc: ResourceDocument): Resource {
  return {
    id: doc.id || doc.resourceNumber,
    resourceNumber: doc.resourceNumber,
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    subcategory: doc.subcategory,
    coverImage: doc.coverImage && !doc.coverImage.startsWith('blob:') ? doc.coverImage : undefined,
    thumbnailAlt: doc.thumbnailAlt,
    publishedAt: doc.publishedAt,
    updatedAt: doc.updatedAtDate,
    published: doc.published,
    featured: doc.featured,
    order: doc.order,
    downloadFormat: doc.downloadFormat,
    fileSize: doc.fileSize,
    downloadUrl: doc.downloadUrl && !doc.downloadUrl.startsWith('blob:') ? doc.downloadUrl : undefined,
    pdfPreviewUrl: doc.pdfPreviewUrl && !doc.pdfPreviewUrl.startsWith('blob:') ? doc.pdfPreviewUrl : undefined,
    docxUrl: doc.docxUrl && !doc.docxUrl.startsWith('blob:') ? doc.docxUrl : undefined,
    attachments: (doc.attachments || [])
      .filter((att) => att.visible !== false && att.url && !att.url.startsWith('blob:'))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((att) => ({
        id: att.id,
        name: att.name,
        fileName: att.fileName,
        format: att.format,
        fileSize: att.fileSize,
        fileExtension: att.fileExtension,
        description: att.description,
        url: att.url,
        isPreviewable: att.isPreviewable,
        visible: att.visible,
      })),
    externalLinks: (doc.externalLinks || []).filter(
      (link) => link.url && !link.url.startsWith('blob:')
    ),
    youtubeEmbed: doc.youtubeEmbed,
    description: doc.description,
    fullDescription: doc.fullDescription,
    tags: doc.tags || [],
    summaryPoints: doc.summaryPoints || [],
    targetAudience: doc.targetAudience,
    contentHtml: doc.contentHtml,
    contentJson: doc.contentJson,
    blocknoteJson: doc.blocknoteJson,
    blocknoteHtml: doc.blocknoteHtml,
    contentBlocks: doc.contentBlocks as any,
  };
}

/**
 * Returns all published resources, sorted by custom order (when > 0) then resource number.
 */
export function getPublicResources(): Resource[] {
  if (snapshot.resources && snapshot.resources.length > 0) {
    return snapshot.resources
      .filter((r) => r.published && r.status !== 'draft' && r.status !== 'archived')
      .map(mapDocToResource)
      .sort((a, b) => {
        const orderA = a.order && a.order > 0 ? a.order : 9999;
        const orderB = b.order && b.order > 0 ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.resourceNumber.localeCompare(b.resourceNumber, undefined, {
          numeric: true,
        });
      });
  }
  return defaultGetAllPublishedResources();
}

/**
 * Resolves a published resource by canonical ID or display number (e.g. "001", "015", "res-...").
 */
export function getPublicResourceByNumber(numberOrId: string): Resource | undefined {
  if (snapshot.resources && snapshot.resources.length > 0) {
    const raw = String(numberOrId || '').trim();
    const padded = /^\d+$/.test(raw) && raw.length < 3 ? raw.padStart(3, '0') : raw;
    const found = snapshot.resources.find(
      (r) =>
        r.published &&
        r.status !== 'draft' &&
        r.status !== 'archived' &&
        (r.id === raw || r.resourceNumber === raw || r.resourceNumber === padded)
    );
    return found ? mapDocToResource(found) : undefined;
  }
  return defaultGetPublishedResourceByNumber(numberOrId);
}

/**
 * Returns list of published route identifiers (canonical IDs plus display numbers) for static paths.
 */
export function getAllPublicResourceNumbers(): string[] {
  const routes = new Set<string>();
  for (const r of getPublicResources()) {
    if (r.id) routes.add(r.id);
    if (r.resourceNumber) routes.add(r.resourceNumber);
  }
  return Array.from(routes);
}

/**
 * Returns adjacent published resources (previous and next) in catalog order.
 */
export function getAdjacentPublicResources(currentNumberOrId: string): {
  prev?: Resource;
  next?: Resource;
} {
  const published = getPublicResources();
  const raw = String(currentNumberOrId || '').trim();
  const padded = /^\d+$/.test(raw) && raw.length < 3 ? raw.padStart(3, '0') : raw;
  const currentIndex = published.findIndex(
    (r) => r.id === raw || r.resourceNumber === raw || r.resourceNumber === padded
  );

  if (currentIndex === -1) {
    return { prev: undefined, next: undefined };
  }

  return {
    prev: currentIndex > 0 ? published[currentIndex - 1] : undefined,
    next:
      currentIndex < published.length - 1
        ? published[currentIndex + 1]
        : undefined,
  };
}

/**
 * Maps CMS JournalDocument to public JournalEntry format.
 */
function mapDocToJournalEntry(doc: JournalDocument): JournalEntry {
  const hasRichEditorHtml =
    !(doc.content?.sections?.length) ||
    (doc.updatedBy === 'aakashdas.photo@gmail.com' &&
      Boolean(doc.blocknoteHtml || doc.contentHtml));

  return {
    id: doc.id || doc.slug,
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    excerpt: doc.excerpt,
    publishedAt: doc.publishedAt,
    readTime: doc.readTime,
    isSample: doc.isSample ?? false,
    ...(hasRichEditorHtml ? { contentHtml: doc.blocknoteHtml || doc.contentHtml } : {}),
    content: {
      lead: doc.content?.lead || doc.excerpt,
      sections: (doc.content?.sections || []).map((sec) => ({
        heading: sec.heading,
        paragraphs: sec.paragraphs,
        quote: sec.quote,
      })),
    },
  };
}

/**
 * Returns all published journal articles, sorted by order or publishedAt.
 */
export function getPublicJournalArticles(): JournalEntry[] {
  if (snapshot.journals && snapshot.journals.length > 0) {
    return snapshot.journals
      .filter((j) => j.published && j.status !== 'draft')
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map(mapDocToJournalEntry);
  }
  return defaultGetAllJournalArticles();
}

/**
 * Resolves a published journal article by slug.
 */
export function getPublicJournalArticleBySlug(slug: string): JournalEntry | undefined {
  if (snapshot.journals && snapshot.journals.length > 0) {
    const found = snapshot.journals.find(
      (j) => j.published && j.status !== 'draft' && j.slug === slug
    );
    return found ? mapDocToJournalEntry(found) : undefined;
  }
  return defaultGetJournalArticleBySlug(slug);
}

/**
 * Returns list of published journal slugs for static path generation.
 */
export function getAllPublicJournalSlugs(): string[] {
  return getPublicJournalArticles().map((a) => a.slug);
}

/**
 * Returns adjacent published journal articles.
 */
export function getAdjacentPublicJournalArticles(slug: string): {
  prev?: JournalEntry;
  next?: JournalEntry;
} {
  const articles = getPublicJournalArticles();
  const index = articles.findIndex((a) => a.slug === slug);
  if (index === -1) return { prev: undefined, next: undefined };

  return {
    prev: index > 0 ? articles[index - 1] : undefined,
    next: index < articles.length - 1 ? articles[index + 1] : undefined,
  };
}
