/**
 * Idempotent Firestore Content Migration & Seeding Engine
 *
 * Extracts 100% of existing website content from static TypeScript data files and page components,
 * validates against Zod CMS schemas, creates a local JSON snapshot backup, and seeds Firestore.
 *
 * Usage:
 *   node scripts/seed-firestore.mjs               # Default: Dry-run with local backup & validation
 *   node scripts/seed-firestore.mjs --dry-run     # Explicit dry-run
 *   node scripts/seed-firestore.mjs --apply       # Live migration to Firestore (requires configured credentials)
 *   node scripts/seed-firestore.mjs --force       # Live migration with overwrite permission on conflicts
 */

import fs from 'node:fs';
import path from 'node:path';

// Import existing static data sources
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

// CLI Flags
const args = process.argv.slice(2);
const isApplyMode = args.includes('--apply');
const isForceMode = args.includes('--force');
const isBackupOnly = args.includes('--backup-only');
const isDryRun = !isApplyMode || args.includes('--dry-run');

const BACKUP_DIR = path.resolve('backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// =============================================================================
// 1. Content Extraction & Normalization
// =============================================================================

function extractAllData() {
  const timestamp = new Date().toISOString();

  // 1. Site Settings Document
  const siteSettingsDoc = {
    id: 'general',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'seed-migration',
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

  // 2. Homepage Document
  const homePageDoc = {
    id: 'home',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'seed-migration',
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
      },
      featuredResources: {
        visible: true,
        heading: 'Free Resources',
        count: 3,
        customResourceIds: ['001', '002', '003'],
      },
      journal: {
        visible: true,
        heading: 'Journal',
        description: 'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
        ctaText: 'Read articles',
        ctaUrl: '/journal',
      },
      contact: {
        visible: true,
        heading: 'Get in Touch',
        description: 'Feel free to reach out directly via email or connect on social platforms.',
        showEmail: true,
        showSocial: true,
      },
    },
    seo: {
      title: `${siteConfig.name} — Personal Website & Digital Archive`,
      description: siteConfig.description,
      ogImage: '/images/aakash-das.webp',
      canonicalUrl: siteConfig.url,
    },
  };

  // 3. About Page Document (Combining about.astro & aboutData.ts)
  const aboutPageDoc = {
    id: 'about',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'seed-migration',
    title: 'About Aakash Das',
    introParagraphs: [
      "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources.",
      "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market. Through RisePaisa, I aim to make reliable financial knowledge more accessible and help students, young professionals, and everyday learners make better-informed financial decisions.",
      "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances.",
    ],
    workEntries: [
      {
        id: 'work-risepaisa',
        index: '01',
        name: 'RisePaisa',
        desc: 'Building a Nepal-focused financial education platform that makes personal finance, banking, taxation, fintech, and investment concepts easier to understand through educational content, practical resources, and digital learning tools.',
        link: {
          text: 'Visit RisePaisa',
          url: 'https://risepaisa.com',
          isExternal: true,
        },
        order: 1,
        visible: true,
      },
      {
        id: 'work-risenepse',
        index: '02',
        name: 'riseNEPSE',
        desc: "Creating educational content focused on Nepal's stock market, NEPSE, fundamental and technical analysis, and investment knowledge to make stock market education more accessible.",
        order: 2,
        visible: true,
      },
      {
        id: 'work-finance-education',
        index: '03',
        name: 'Finance Education & Content',
        desc: "Creating educational videos, research-based explanations, and practical digital resources covering Nepal's financial system, personal finance, and technology.",
        link: {
          text: 'Explore Resources',
          url: '/resources',
          isExternal: false,
        },
        order: 3,
        visible: true,
      },
    ],
    mediaEntries: [
      {
        id: 'media-amit-show',
        show: 'The Amit Show',
        role: 'Podcast Guest',
        format: 'Featured Interview',
        desc: 'A conversation about building RisePaisa, content creation, audience growth, and my journey as a young entrepreneur and finance educator.',
        order: 1,
        visible: true,
      },
    ],
    educationEntries: [
      {
        id: 'edu-it',
        index: '01',
        title: 'Information Technology',
        degree: 'BSc (Hons) Information Technology',
        institution: 'Coventry University | Via Softwarica College of IT & E-Commerce',
        period: '2025–2028',
        status: 'Currently pursuing.',
        order: 1,
        visible: true,
      },
      {
        id: 'edu-ca',
        index: '02',
        title: 'Chartered Accountancy',
        desc: 'Previously pursued Chartered Accountancy studies through ICAI, 2024–2025. Later transitioned towards Information Technology.',
        order: 2,
        visible: true,
      },
    ],
    experienceEntries: [
      {
        id: 'exp-risepaisa',
        organization: 'RisePaisa',
        position: 'Founder & Finance Educator',
        period: '2024 — Present',
        desc: 'Creating educational initiatives simplifying personal finance and economic awareness for Nepali youth.',
        status: 'Active',
        order: 1,
        visible: true,
      },
    ],
    storyMilestones: aboutData.story.map((s, idx) => ({
      id: `story-${s.number}`,
      number: s.number,
      title: s.title,
      paragraph: s.paragraph,
      order: idx + 1,
      visible: true,
    })),
    contact: {
      visible: true,
      showEmail: true,
      showSocial: true,
    },
    seo: {
      title: 'About Aakash Das — Personal Website',
      description: "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education.",
      ogImage: '/images/aakash-das.webp',
      canonicalUrl: 'https://aakashdas.live/about',
    },
  };

  // 4. Resources Documents
  const resourceDocs = resourcesData.map((res, idx) => {
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

    return {
      id: res.resourceNumber,
      createdAt: `${res.publishedAt}T00:00:00.000Z`,
      updatedAt: res.updatedAt ? `${res.updatedAt}T00:00:00.000Z` : `${res.publishedAt}T00:00:00.000Z`,
      updatedBy: 'seed-migration',
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
      seo: {
        title: `Resource #${res.resourceNumber}: ${res.title} — Aakash Das`,
        description: res.description,
      },
    };
  });

  // 5. Journal Documents
  const journalDocs = sampleJournalEntries.map((entry, idx) => {
    return {
      id: entry.slug,
      createdAt: '2024-11-01T00:00:00.000Z',
      updatedAt: timestamp,
      updatedBy: 'seed-migration',
      legacyId: entry.id,
      slug: entry.slug,
      title: entry.title,
      category: entry.category,
      tags: [entry.category],
      excerpt: entry.excerpt,
      author: 'Aakash Das',
      published: true,
      featured: idx === 0,
      order: idx + 1,
      publishedAt: entry.publishedAt,
      readTime: entry.readTime,
      isSample: entry.isSample,
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

  return {
    siteSettings: siteSettingsDoc,
    pages: {
      home: homePageDoc,
      about: aboutPageDoc,
    },
    resources: resourceDocs,
    journals: journalDocs,
  };
}

// =============================================================================
// 2. Validation Suite
// =============================================================================

function validateAllData(data) {
  const errors = [];

  try {
    validateSiteSettings(data.siteSettings);
  } catch (err) {
    errors.push({ collection: 'siteSettings', id: 'general', error: err.message, fields: err.fieldErrors });
  }

  try {
    validateHomePage(data.pages.home);
  } catch (err) {
    errors.push({ collection: 'pages', id: 'home', error: err.message, fields: err.fieldErrors });
  }

  try {
    validateAboutPage(data.pages.about);
  } catch (err) {
    errors.push({ collection: 'pages', id: 'about', error: err.message, fields: err.fieldErrors });
  }

  for (const res of data.resources) {
    try {
      validateResource(res);
    } catch (err) {
      errors.push({ collection: 'resources', id: res.resourceNumber, error: err.message, fields: err.fieldErrors });
    }
  }

  for (const jnl of data.journals) {
    try {
      validateJournal(jnl);
    } catch (err) {
      errors.push({ collection: 'journals', id: jnl.slug, error: err.message, fields: err.fieldErrors });
    }
  }

  return errors;
}

// =============================================================================
// 3. Execution Engine
// =============================================================================

async function runMigration() {
  console.log('=================================================================');
  console.log(' Aakash Das Personal Website — Firestore Content Seeding Engine');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulated Validation)' : 'LIVE APPLY (Firestore Write)'}`);
  console.log('=================================================================\n');

  console.log('1. Extracting data from source files...');
  const data = extractAllData();

  console.log(`   - Site settings: 1 document (general)`);
  console.log(`   - Editorial pages: 2 documents (home, about)`);
  console.log(`   - Educational resources: ${data.resources.length} documents (${data.resources.map((r) => r.resourceNumber).join(', ')})`);
  console.log(`   - Journal articles: ${data.journals.length} documents`);

  console.log('\n2. Validating extracted documents against CMS Zod schemas...');
  const validationErrors = validateAllData(data);

  if (validationErrors.length > 0) {
    console.error(`\n❌ Validation Failed with ${validationErrors.length} errors:`);
    for (const err of validationErrors) {
      console.error(`   - [${err.collection}/${err.id}]: ${err.error}`);
      if (err.fields) console.error('     Details:', JSON.stringify(err.fields));
    }
    process.exit(1);
  }
  console.log('   ✓ All 11 documents passed strict CMS schema validation.');

  // Create Local Backup
  const backupFileName = `firestore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);
  fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n3. Local JSON backup generated:`);
  console.log(`   ↳ ${backupFilePath}`);

  if (isBackupOnly) {
    console.log('\nBackup-only flag provided. Exiting cleanly.');
    return;
  }

  // Check Firebase Client & Auth
  console.log('\n4. Checking Firebase environment and connection...');
  const envLocalPath = path.resolve('.env.local');
  const hasEnvLocal = fs.existsSync(envLocalPath);

  if (!hasEnvLocal && !process.env.PUBLIC_FIREBASE_PROJECT_ID) {
    console.log('   ⚠️  .env.local not found and no environment variables detected.');
    console.log('   Running in DRY-RUN mode. All data is verified and backed up locally.');
    console.log('   To apply to live Firestore:');
    console.log('     1. Copy .env.example to .env.local');
    console.log('     2. Fill in your Firebase Web App credentials');
    console.log('     3. Run: node scripts/seed-firestore.mjs --apply\n');
    printDryRunReport(data);
    return;
  }

  if (isDryRun) {
    console.log('   ℹ️  Dry-run flag is active. Skipping live network writes.');
    printDryRunReport(data);
    return;
  }

  // Attempt Live Writes
  console.log('\n5. Executing live migration to Cloud Firestore...');
  try {
    const { getFirebaseFirestore } = await import('../src/lib/firebase/index.ts');
    const { doc, setDoc } = await import('firebase/firestore');
    const db = getFirebaseFirestore();

    // 1. Site Settings
    await setDoc(doc(db, 'siteSettings', 'general'), data.siteSettings, { merge: !isForceMode });
    console.log('   ✓ [siteSettings/general] Written successfully.');

    // 2. Pages
    await setDoc(doc(db, 'pages', 'home'), data.pages.home, { merge: !isForceMode });
    console.log('   ✓ [pages/home] Written successfully.');
    await setDoc(doc(db, 'pages', 'about'), data.pages.about, { merge: !isForceMode });
    console.log('   ✓ [pages/about] Written successfully.');

    // 3. Resources
    for (const res of data.resources) {
      await setDoc(doc(db, 'resources', res.resourceNumber), res, { merge: !isForceMode });
      console.log(`   ✓ [resources/${res.resourceNumber}] "${res.title}" written.`);
    }

    // 4. Journals
    for (const jnl of data.journals) {
      await setDoc(doc(db, 'journals', jnl.slug), jnl, { merge: !isForceMode });
      console.log(`   ✓ [journals/${jnl.slug}] "${jnl.title}" written.`);
    }

    console.log('\n🎉 Live migration completed successfully! All 11 documents populated.');
  } catch (err) {
    console.error(`\n❌ Live write encountered an error: ${err.message}`);
    console.log('Note: Local backup was preserved and data validation passed.');
    process.exit(1);
  }
}

function printDryRunReport(data) {
  console.log('\n=================================================================');
  console.log(' MIGRATION DRY-RUN AUDIT REPORT');
  console.log('=================================================================');
  console.log(`Total Collections: 4`);
  console.log(`Total Documents Prepared: 11`);
  console.log(`Validation Errors: 0`);
  console.log(`Document Breakdown:`);
  console.log(`  - siteSettings/general:`);
  console.log(`      * Name: ${data.siteSettings.fullName}`);
  console.log(`      * Social Links: ${data.siteSettings.socialLinks.length}`);
  console.log(`      * Navigation Items: ${data.siteSettings.navItems.length}`);
  console.log(`  - pages/home:`);
  console.log(`      * Hero: "${data.pages.home.heroHeadline}"`);
  console.log(`      * Featured Resource IDs: ${data.pages.home.sections.featuredResources.customResourceIds.join(', ')}`);
  console.log(`  - pages/about:`);
  console.log(`      * Bio Paragraphs: ${data.pages.about.introParagraphs.length}`);
  console.log(`      * Work Initiatives: ${data.pages.about.workEntries.length}`);
  console.log(`      * Media Entries: ${data.pages.about.mediaEntries.length}`);
  console.log(`      * Education Entries: ${data.pages.about.educationEntries.length}`);
  console.log(`  - resources/ (${data.resources.length} items):`);
  for (const r of data.resources) {
    console.log(`      * #${r.resourceNumber}: "${r.title}" (published: ${r.published}, ${r.attachments.length} attachments, ${r.contentBlocks.length} content blocks)`);
  }
  console.log(`  - journals/ (${data.journals.length} items):`);
  for (const j of data.journals) {
    console.log(`      * [${j.slug}]: "${j.title}" (${j.readTime}, ${j.content.sections.length} sections)`);
  }
  console.log('=================================================================\n');
}

runMigration().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
