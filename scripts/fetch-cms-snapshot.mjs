/**
 * Build-Time CMS Content Snapshot Engine
 *
 * Retrieves published content from Firestore (or falls back gracefully to
 * validated static data sources in offline/dev environments), validates against
 * CMS schemas, and writes `src/data/cms-snapshot.json` for Astro SSG.
 *
 * Usage:
 *   node scripts/fetch-cms-snapshot.mjs
 *   node scripts/fetch-cms-snapshot.mjs --force-static
 *   node scripts/fetch-cms-snapshot.mjs --output <custom-path>
 */

import fs from 'node:fs';
import path from 'node:path';

// Import local fallback data
import { siteConfig } from '../src/data/siteConfig.ts';
import { aboutData } from '../src/data/aboutData.ts';
import { resourcesData } from '../src/data/resources.ts';
import { sampleJournalEntries } from '../src/data/journal.ts';

// Import CMS Validators
import {
  validateSiteSettings,
  validateHomePage,
  validateAboutPage,
  validateResource,
  validateJournal,
} from '../src/lib/cms/validation.ts';
import {
  legacyBlocksToBlockNote,
  journalContentToBlockNote,
  blockNoteToHtml,
} from '../src/utils/blockNoteMigration.ts';

const args = process.argv.slice(2);
const forceStatic = args.includes('--force-static');
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex !== -1 && args[outputIndex + 1]
  ? path.resolve(args[outputIndex + 1])
  : path.resolve('src/data/cms-snapshot.json');

function extractLocalData() {
  const timestamp = new Date().toISOString();

  // 1. Site Settings
  const siteSettings = {
    id: 'general',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'build-snapshot-generator',
    fullName: siteConfig.name,
    displayName: siteConfig.name,
    websiteTitle: `${siteConfig.name} — Personal Website & Digital Archive`,
    tagline: siteConfig.tagline,
    positioning: siteConfig.positioning,
    shortDescription: siteConfig.description,
    profileImage: '/images/aakash-das.webp',
    email: siteConfig.email,
    phone: siteConfig.phone || '+977-XXXXXXXXXX',
    whatsappNumber: siteConfig.whatsappNumber || '977XXXXXXXXXX',
    location: siteConfig.location,
    identity: siteConfig.identity,
    socialLinks: siteConfig.socialLinks.map((s, idx) => ({
      id: `social-${s.platform.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      platform: s.platform,
      label: s.label,
      handle: s.handle,
      url: s.url,
      icon: s.icon,
      featured: s.featured ?? true,
      order: idx + 1,
      visible: true,
    })),
    navItems: siteConfig.navItems.map((n, idx) => ({
      id: `nav-${n.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      label: n.label,
      href: n.href,
      badge: n.badge,
      order: idx + 1,
      visible: true,
    })),
    footer: {
      showNav: true,
      showSocial: true,
      showContact: true,
      showDirectActions: true,
      customNote: 'Personal archive and educational initiative by Aakash Das.',
      copyrightText: `© ${new Date().getFullYear()} Aakash Das. All rights reserved.`,
    },
    seo: {
      title: `${siteConfig.name} — Personal Website & Digital Archive`,
      description: siteConfig.description,
      ogImage: '/images/aakash-das.webp',
      canonicalUrl: siteConfig.url,
    },
    favicon: '/favicon.svg',
  };

  // 2. Home Page
  const homePage = {
    id: 'home',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'build-snapshot-generator',
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
        description: 'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
        ctaText: 'Read articles',
        ctaUrl: '/journal',
        order: 3,
      },
      contact: {
        visible: true,
        heading: 'Get in Touch',
        description: 'Feel free to reach out directly via email or connect on social platforms.',
        showEmail: true,
        showSocial: true,
        order: 4,
      },
    },
    sectionOrder: ['finder', 'featuredResources', 'journal', 'contact'],
    seo: {
      title: `${siteConfig.name} — Personal Website & Digital Archive`,
      description: siteConfig.description,
      canonicalUrl: siteConfig.url,
      ogImage: '/images/aakash-das.webp',
    },
  };

  // 3. About Page
  const aboutPage = {
    id: 'about',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'build-snapshot-generator',
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
    seo: {
      title: 'About Aakash Das — Personal Website',
      description: "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education.",
      canonicalUrl: `${siteConfig.url}/about`,
      ogImage: '/images/aakash-das.webp',
    },
  };

  // 4. Resources
  const resources = resourcesData.map((res, idx) => {
    const slug = res.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const attachments = (res.attachments || []).map((att, aIdx) => {
      const ext = att.url.split('.').pop() || 'file';
      return {
        id: att.id,
        name: att.name,
        fileName: path.basename(att.url),
        format: att.format,
        fileSize: att.fileSize,
        url: att.url,
        storagePath: `uploads/resources/${res.resourceNumber}/${path.basename(att.url)}`,
        fileExtension: ext,
        mimeType: ext === 'pdf' ? 'application/pdf' : ext === 'csv' ? 'text/csv' : 'application/octet-stream',
        isPreviewable: att.isPreviewable ?? false,
        order: aIdx + 1,
        visible: true,
      };
    });

    const bnBlocks = legacyBlocksToBlockNote(res.contentBlocks || [], res.summaryPoints || [], res.targetAudience || '');
    const bnHtml = blockNoteToHtml(bnBlocks);

    return {
      id: res.resourceNumber,
      createdAt: `${res.publishedAt}T00:00:00.000Z`,
      updatedAt: res.updatedAt ? `${res.updatedAt}T00:00:00.000Z` : `${res.publishedAt}T00:00:00.000Z`,
      updatedBy: 'build-snapshot-generator',
      resourceNumber: res.resourceNumber,
      title: res.title,
      slug,
      category: res.category,
      description: res.description,
      tags: res.tags,
      author: 'Aakash Das',
      published: res.published,
      featured: idx < 3,
      order: idx + 1,
      publishedAt: res.publishedAt,
      updatedAtDate: res.updatedAt,
      downloadFormat: res.downloadFormat,
      fileSize: res.fileSize,
      downloadUrl: res.downloadUrl,
      pdfPreviewUrl: res.pdfPreviewUrl,
      docxUrl: res.docxUrl,
      attachments,
      youtubeEmbed: res.youtubeEmbed,
      summaryPoints: res.summaryPoints || [],
      targetAudience: res.targetAudience || '',
      contentBlocks: res.contentBlocks || [],
      contentHtml: bnHtml,
      blocknoteJson: bnBlocks,
      blocknoteHtml: bnHtml,
      seo: {
        title: `Resource #${res.resourceNumber}: ${res.title} — Aakash Das`,
        description: res.description,
      },
    };
  });

  // 5. Journal Entries
  const journals = sampleJournalEntries.map((entry, idx) => {
    const bnBlocks = journalContentToBlockNote(entry.content);
    const bnHtml = blockNoteToHtml(bnBlocks);

    return {
      id: entry.slug,
      createdAt: '2024-11-01T00:00:00.000Z',
      updatedAt: timestamp,
      updatedBy: 'build-snapshot-generator',
      legacyId: entry.id,
      slug: entry.slug,
      title: entry.title,
      category: entry.category,
      tags: [entry.category],
      excerpt: entry.excerpt,
      author: 'Aakash Das',
      published: true,
      status: 'published',
      featured: idx === 0,
      order: idx + 1,
      publishedAt: entry.publishedAt,
      readTime: entry.readTime,
      isSample: entry.isSample,
      blocknoteJson: bnBlocks,
      blocknoteHtml: bnHtml,
      contentHtml: bnHtml,
      content: {
        lead: entry.content.lead,
        sections: entry.content.sections,
      },
      tiptapJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { class: 'lead' },
            content: [{ type: 'text', text: entry.content.lead }],
          },
          ...entry.content.sections.flatMap((sec) => {
            const nodes = [];
            if (sec.heading) {
              nodes.push({
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: sec.heading }],
              });
            }
            for (const p of sec.paragraphs) {
              nodes.push({
                type: 'paragraph',
                content: [{ type: 'text', text: p }],
              });
            }
            if (sec.quote) {
              nodes.push({
                type: 'blockquote',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: sec.quote }] }],
              });
            }
            return nodes;
          }),
        ],
      },
      seo: {
        title: `${entry.title} — Journal — Aakash Das`,
        description: entry.excerpt,
      },
    };
  });

  return { siteSettings, homePage, aboutPage, resources, journals };
}

async function fetchFromFirestore() {
  if (forceStatic) {
    return null;
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, getDoc, collection, getDocs, query, where } = await import('firebase/firestore');

    const config = {
      apiKey: process.env.PUBLIC_FIREBASE_API_KEY || 'AIzaSyBjYmwR6Zn4A9MCTdarlUEIodpTq0GOAHY',
      authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'aakashdas-live.firebaseapp.com',
      projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || 'aakashdas-live',
      storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'aakashdas-live.firebasestorage.app',
      messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '128286218310',
      appId: process.env.PUBLIC_FIREBASE_APP_ID || '1:128286218310:web:962c0197ecfa1366a65247',
    };

    const app = initializeApp(config);
    const db = getFirestore(app);

    // Fetch in parallel
    const [settingsSnap, homeSnap, aboutSnap, resourcesSnap, journalsSnap] = await Promise.all([
      getDoc(doc(db, 'siteSettings', 'general')),
      getDoc(doc(db, 'pages', 'home')),
      getDoc(doc(db, 'pages', 'about')),
      getDocs(query(collection(db, 'resources'), where('published', '==', true))),
      getDocs(query(collection(db, 'journals'), where('published', '==', true))),
    ]);

    if (!settingsSnap.exists() && !homeSnap.exists()) {
      return null;
    }

    const siteSettings = settingsSnap.exists() ? settingsSnap.data() : null;
    if (siteSettings && siteSettings.profileImage && siteSettings.profileImage.startsWith('blob:')) {
      siteSettings.profileImage = '/images/aakash-das.webp';
    }
    const homePage = homeSnap.exists() ? homeSnap.data() : null;
    if (homePage && homePage.heroPhotoUrl && homePage.heroPhotoUrl.startsWith('blob:')) {
      homePage.heroPhotoUrl = (siteSettings && siteSettings.profileImage && !siteSettings.profileImage.startsWith('blob:'))
        ? siteSettings.profileImage
        : '/images/aakash-das.webp';
    }
    const aboutPage = aboutSnap.exists() ? aboutSnap.data() : null;
    const resources = resourcesSnap.docs.map((d) => d.data());
    const journals = journalsSnap.docs.map((d) => d.data());

    return { siteSettings, homePage, aboutPage, resources, journals };
  } catch (err) {
    console.warn(`[Snapshot] Cloud fetch skipped (${err.message}). Using local fallback.`);
    return null;
  }
}

async function main() {
  console.log('--- Fetching CMS Content Snapshot for SSG ---');
  const now = new Date().toISOString();

  let source = 'local-data-fallback';
  let data = null;

  try {
    const cloudData = await fetchFromFirestore();
    if (cloudData && cloudData.siteSettings) {
      source = 'firestore';
      data = cloudData;
      console.log('✓ Successfully retrieved content from Cloud Firestore.');
    }
  } catch {
    // Graceful fallback
  }

  if (!data) {
    console.log('ℹ Loading validated baseline content from local repository data.');
    data = extractLocalData();
  }

  // Validate all data before generating snapshot
  const siteSettings = validateSiteSettings(data.siteSettings);
  const homePage = validateHomePage(data.homePage);
  const aboutPage = validateAboutPage(data.aboutPage);
  const resources = (data.resources || []).map((r) => validateResource(r));
  const journals = (data.journals || []).map((j) => validateJournal(j));

  const publishedResources = resources.filter((r) => r.published);
  const publishedJournals = journals.filter((j) => j.published && j.status !== 'draft');

  const snapshot = {
    _meta: {
      version: '1.0.0',
      generatedAt: now,
      source,
      buildEnvironment: process.env.NODE_ENV || 'production',
      resourceCount: resources.length,
      publishedResourceCount: publishedResources.length,
      journalCount: journals.length,
      publishedJournalCount: publishedJournals.length,
    },
    siteSettings,
    homePage,
    aboutPage,
    resources,
    journals,
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  const stats = fs.statSync(outputPath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log(`✓ CMS Snapshot saved to: ${outputPath} (${sizeKb} KB)`);
  console.log(`  Source: ${source}`);
  console.log(`  Site Settings: ${siteSettings.fullName} (${siteSettings.socialLinks.length} social links)`);
  console.log(`  Pages: home (${homePage.sectionOrder?.length || 4} sections), about (${aboutPage.sectionOrder?.length || 5} sections)`);
  console.log(`  Resources: ${publishedResources.length} published (${resources.length} total)`);
  console.log(`  Journals: ${publishedJournals.length} published (${journals.length} total)`);
  console.log('--- CMS Snapshot Generation Complete ---\n');
}

main().catch((err) => {
  console.error('[Snapshot Error]:', err);
  process.exit(1);
});
