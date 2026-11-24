/**
 * Idempotent Content Migration Script for Aakash Das CMS
 *
 * Inspects local source data, validates against CMS schemas, creates
 * a pre-migration backup in backups/pre-migration-backup-[timestamp].json,
 * and idempotently writes or updates Firestore collections.
 *
 * Usage:
 *   node scripts/migrate-cms-content.mjs --dry-run
 *   node scripts/migrate-cms-content.mjs --apply
 *   node scripts/migrate-cms-content.mjs --backup-only
 */

import fs from 'node:fs';
import path from 'node:path';

// Import source data
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

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isForce = args.includes('--force');
const isBackupOnly = args.includes('--backup-only');
const isDryRun = !isApply || args.includes('--dry-run');

const BACKUP_DIR = path.resolve('backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function extractData() {
  const timestamp = new Date().toISOString();

  // 1. Site Settings Document
  const siteSettings = {
    id: 'general',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'migrate-cms-content',
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

  // 2. Home Page Document
  const homePage = {
    id: 'home',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'migrate-cms-content',
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

  // 3. About Page Document
  const aboutPage = {
    id: 'about',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: timestamp,
    updatedBy: 'migrate-cms-content',
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

    return {
      id: res.resourceNumber,
      createdAt: `${res.publishedAt}T00:00:00.000Z`,
      updatedAt: res.updatedAt ? `${res.updatedAt}T00:00:00.000Z` : `${res.publishedAt}T00:00:00.000Z`,
      updatedBy: 'migrate-cms-content',
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

  // 5. Journal Entries
  const journals = sampleJournalEntries.map((entry, idx) => {
    return {
      id: entry.slug,
      createdAt: '2024-11-01T00:00:00.000Z',
      updatedAt: timestamp,
      updatedBy: 'migrate-cms-content',
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

  return { siteSettings, homePage, aboutPage, resources, journals, timestamp };
}

async function run() {
  console.log('=================================================================');
  console.log(' Aakash Das Personal Website — CMS Content Migration Engine');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulated Validation)' : 'APPLY (Writing Live Content)'}`);
  console.log('=================================================================\n');

  console.log('1. Extracting data from local TypeScript sources...');
  const { siteSettings, homePage, aboutPage, resources, journals, timestamp } = extractData();

  console.log(`   - Site settings: 1 document (general)`);
  console.log(`   - Pages: 2 documents (home, about)`);
  console.log(`   - Resources: ${resources.length} documents (${resources.filter((r) => r.published).length} published)`);
  console.log(`   - Journal Articles: ${journals.length} documents (all published)`);

  console.log('\n2. Validating documents with Zod CMS schemas...');
  const validatedSettings = validateSiteSettings(siteSettings);
  const validatedHome = validateHomePage(homePage);
  const validatedAbout = validateAboutPage(aboutPage);
  const validatedResources = resources.map((r) => validateResource(r));
  const validatedJournals = journals.map((j) => validateJournal(j));

  const totalDocs = 1 + 1 + 1 + validatedResources.length + validatedJournals.length;
  console.log(`   ✓ All ${totalDocs} documents passed strict schema validation.`);

  // 3. Create Backup
  const backupFilename = `pre-migration-backup-${timestamp.replace(/[:.]/g, '-')}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);
  const backupPayload = {
    metadata: {
      version: '1.0.0',
      timestamp,
      documentCount: totalDocs,
      generator: 'migrate-cms-content.mjs',
    },
    siteSettings: validatedSettings,
    pages: {
      home: validatedHome,
      about: validatedAbout,
    },
    resources: validatedResources,
    journals: validatedJournals,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), 'utf-8');
  console.log(`\n3. Pre-migration backup created:`);
  console.log(`   ↳ ${backupPath}`);

  if (isBackupOnly) {
    console.log('\nBackup complete. Exiting (--backup-only flag was set).');
    process.exit(0);
  }

  // 4. Live Firestore Migration Check
  if (isDryRun) {
    console.log('\n4. Live Migration Status: SKIPPED (Dry-Run Mode)');
    console.log('   All documents are validated and backed up.');
    console.log('   To apply live to Firestore:');
    console.log('     node scripts/migrate-cms-content.mjs --apply\n');
  } else {
    console.log('\n4. Applying changes to Firestore...');
    try {
      // Lazy import firebase to avoid loading network drivers in dry-run
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');

      const config = {
        apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || 'aakashdas-live',
        storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
        appId: process.env.PUBLIC_FIREBASE_APP_ID,
      };

      if (!config.apiKey && !process.env.FIREBASE_CONFIG) {
        console.warn('   ⚠️  No Firebase credentials configured in environment.');
        console.warn('   Skipping cloud write. Local backup remains safe.');
      } else {
        const app = initializeApp(config);
        const db = getFirestore(app);

        await setDoc(doc(db, 'siteSettings', 'general'), validatedSettings, { merge: true });
        await setDoc(doc(db, 'pages', 'home'), validatedHome, { merge: true });
        await setDoc(doc(db, 'pages', 'about'), validatedAbout, { merge: true });

        for (const res of validatedResources) {
          await setDoc(doc(db, 'resources', res.resourceNumber), res, { merge: true });
        }

        for (const j of validatedJournals) {
          await setDoc(doc(db, 'journals', j.slug), j, { merge: true });
        }
        console.log(`   ✓ Successfully wrote ${totalDocs} documents to Firestore.`);
      }
    } catch (err) {
      console.error('   ❌ Cloud write failed:', err.message);
      if (!isForce) {
        process.exit(1);
      }
    }
  }

  console.log('=================================================================');
  console.log(' MIGRATION SUMMARY');
  console.log('=================================================================');
  console.log(`Total Documents Prepared : ${totalDocs}`);
  console.log(`Site Settings            : siteSettings/general`);
  console.log(`Pages                    : pages/home, pages/about`);
  console.log(`Resources Seeded         : ${validatedResources.length} items`);
  console.log(`Journals Seeded          : ${validatedJournals.length} items`);
  console.log(`Backup Location          : ${backupPath}`);
  console.log('=================================================================\n');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
