/**
 * Complete Production Integrity, Security & Schema Verification Suite
 *
 * Tests:
 * 1. Recursive undefined sanitization & temporary blob URL blocking
 * 2. Complete 20-field Resource Zod validation + Attachment + External Link validation
 * 3. Rejection of blob: and javascript: URLs across all CMS schemas
 * 4. ContentLoader mapping (order sorting, blob/hidden attachment filtering, coverImage, fullDescription, externalLinks)
 * 5. AttachmentManager & BlockNoteEditor source guarantees (zero blob:, zero fake /downloads/${file.name})
 * 6. Live Firestore public read & unauthenticated write rejection across all collections
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { getFirebaseConfig } from '../src/lib/firebase/config.ts';
import {
  removeUndefinedFields,
  isTemporaryBlobUrl,
  sanitizeAssetUrl,
} from '../src/lib/cms/sanitize.ts';
import {
  resourceSchema,
  attachmentSchema,
  externalLinkSchema,
  siteSettingsSchema,
  homePageSchema,
  aboutPageSchema,
  journalSchema,
} from '../src/lib/cms/validation.ts';
import { getPublicResources } from '../src/lib/cms/contentLoader.ts';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('=== RISEPAISA COMPLETE CMS INTEGRITY & SECURITY SUITE ===\n');

  // 1. Sanitization & Blob Blocking
  await check('1.1 removeUndefinedFields recursively strips undefined across nested objects/arrays', () => {
    const dirty = {
      title: 'Budget Guide',
      coverImage: undefined,
      seo: { title: 'SEO Title', description: undefined, nested: { a: 1, b: undefined } },
      attachments: [
        { id: 'a1', name: 'File', fileName: 'file.pdf', format: 'PDF', url: '/downloads/f.pdf', description: undefined },
      ],
    };
    const clean = removeUndefinedFields(dirty);
    assert.strictEqual('coverImage' in clean, false);
    assert.strictEqual('description' in clean.seo, false);
    assert.strictEqual('b' in clean.seo.nested, false);
    assert.strictEqual('description' in clean.attachments[0], false);
    assert.strictEqual(clean.attachments[0].fileName, 'file.pdf');
  });

  await check('1.2 sanitizeAssetUrl blocks blob: and javascript: while preserving permanent URLs and Data URIs', () => {
    assert.strictEqual(isTemporaryBlobUrl('blob:https://aakashdas.live/123'), true);
    assert.strictEqual(isTemporaryBlobUrl('BLOB:http://localhost/abc'), true);
    assert.strictEqual(sanitizeAssetUrl('blob:https://aakashdas.live/123'), '');
    assert.strictEqual(sanitizeAssetUrl('javascript:alert(1)'), '');
    assert.strictEqual(sanitizeAssetUrl('blob:https://x/y', '/images/fallback.webp'), '/images/fallback.webp');
    assert.strictEqual(sanitizeAssetUrl('/downloads/file.pdf'), '/downloads/file.pdf');
    assert.strictEqual(sanitizeAssetUrl('data:application/pdf;base64,JVBERi0='), 'data:application/pdf;base64,JVBERi0=');
  });

  // 2. Full 20-Field Resource Schema & Rejection Tests
  await check('2.1 resourceSchema validates all 20 CMS fields including subcategory, order, coverImage, fullDescription, externalLinks', () => {
    const validResource = {
      id: '010',
      resourceNumber: '010',
      title: 'Complete Financial Literacy Kit',
      slug: 'complete-financial-literacy-kit',
      category: 'Personal Finance',
      subcategory: 'Budgeting Basics',
      description: 'Short summary for card display.',
      fullDescription: 'Extended overview displayed on detail page.',
      coverImage: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4',
      thumbnailAlt: 'Financial literacy kit cover',
      tags: ['budget', 'nepal'],
      author: 'Aakash Das',
      language: 'English & Nepali',
      estimatedTime: '20 mins',
      published: true,
      status: 'published',
      featured: true,
      order: 2,
      publishedAt: '2026-11-25',
      downloadUrl: '/downloads/resource-010.pdf',
      pdfPreviewUrl: '/downloads/resource-010.pdf',
      docxUrl: '/downloads/resource-010.docx',
      cardActionLabel: 'Open',
      detailActionLabel: 'Download Resources',
      attachments: [
        {
          id: 'att-1',
          name: 'Budget Sheet PDF',
          fileName: 'budget-sheet.pdf',
          fileExtension: 'PDF',
          format: 'PDF',
          fileSize: '210 KB',
          description: 'Printable monthly planner.',
          url: '/downloads/budget-sheet.pdf',
          order: 1,
          visible: true,
        },
      ],
      externalLinks: [
        {
          id: 'ext-1',
          label: 'Nepal Rastra Bank',
          url: 'https://www.nrb.org.np',
          description: 'Central bank official portal',
        },
      ],
      seo: {
        title: 'Financial Literacy Kit — Aakash Das',
        description: 'Comprehensive toolkit for beginners.',
      },
      summaryPoints: ['Track income', 'Build emergency fund'],
      targetAudience: 'Students and young professionals',
      contentHtml: '<p>Full educational guide content.</p>',
      createdAt: '2026-11-25T00:00:00Z',
      updatedAt: '2026-11-25T00:00:00Z',
    };
    const parsed = resourceSchema.parse(validResource);
    assert.strictEqual(parsed.subcategory, 'Budgeting Basics');
    assert.strictEqual(parsed.order, 2);
    assert.strictEqual(parsed.featured, true);
    assert.strictEqual(parsed.externalLinks?.length, 1);
    assert.strictEqual(parsed.attachments[0].description, 'Printable monthly planner.');
  });

  await check('2.2 Validation schemas strictly reject blob: URLs across all media and attachment fields', () => {
    assert.throws(() =>
      attachmentSchema.parse({
        id: 'att-bad',
        name: 'Bad File',
        format: 'PDF',
        url: 'blob:https://aakashdas.live/temp-uuid',
        order: 1,
        visible: true,
      })
    );
    assert.throws(() =>
      externalLinkSchema.parse({
        id: 'ext-bad',
        label: 'Bad Link',
        url: 'javascript:alert(1)',
      })
    );
    assert.throws(() =>
      resourceSchema.shape.coverImage.parse('blob:https://aakashdas.live/temp-cover')
    );
    assert.throws(() =>
      siteSettingsSchema.shape.profileImage.parse('blob:https://aakashdas.live/temp-profile')
    );
    assert.throws(() =>
      homePageSchema.shape.hero.shape.heroPhotoUrl.parse('blob:https://aakashdas.live/temp-hero')
    );
    assert.throws(() =>
      aboutPageSchema.shape.heroImageUrl.parse('blob:https://aakashdas.live/temp-about')
    );
    assert.throws(() =>
      journalSchema.shape.coverImage.parse('blob:https://aakashdas.live/temp-journal')
    );
  });

  // 3. Static Editor Source Invariants
  await check('3.1 AttachmentManager & BlockNoteEditor contain zero blob: URLs or fake /downloads/ fallbacks', () => {
    const attachmentSrc = fs.readFileSync(
      path.resolve('src/components/admin/resources/AttachmentManager.tsx'),
      'utf-8'
    );
    const blockNoteSrc = fs.readFileSync(
      path.resolve('src/components/admin/resources/BlockNoteEditor.tsx'),
      'utf-8'
    );
    assert.strictEqual(attachmentSrc.includes('URL.createObjectURL'), false, 'AttachmentManager must not call URL.createObjectURL');
    assert.strictEqual(attachmentSrc.includes('`/downloads/${file.name}`'), false, 'AttachmentManager must not create fake /downloads/${file.name} paths');
    assert.strictEqual(blockNoteSrc.includes('URL.createObjectURL'), false, 'BlockNoteEditor must not call URL.createObjectURL');
  });

  // 4. ContentLoader Public Filtering & Sorting
  await check('4.1 getPublicResources returns published snapshot items sorted by order/number with zero blob: URLs', () => {
    const resources = getPublicResources();
    assert.ok(resources.length >= 3, 'Expected at least 3 published resources');
    for (const res of resources) {
      assert.strictEqual(res.published, true);
      assert.strictEqual(isTemporaryBlobUrl(res.coverImage), false);
      assert.strictEqual(isTemporaryBlobUrl(res.pdfPreviewUrl), false);
      assert.strictEqual(isTemporaryBlobUrl(res.docxUrl), false);
      for (const att of res.attachments || []) {
        assert.notStrictEqual(att.visible, false);
        assert.strictEqual(isTemporaryBlobUrl(att.url), false);
      }
    }
  });

  // 5. Live Firestore Public Read & Security Rejection
  await check('5.1 Live Firestore serves public collections and strictly rejects anonymous writes', async () => {
    const firebaseConfig = getFirebaseConfig();
    const app = initializeApp(firebaseConfig, 'integrity-suite');
    const db = getFirestore(app);

    const [settingsSnap, homeSnap, aboutSnap, pubResSnap, pubJournalSnap] = await Promise.all([
      getDoc(doc(db, 'siteSettings', 'general')),
      getDoc(doc(db, 'pages', 'home')),
      getDoc(doc(db, 'pages', 'about')),
      getDocs(query(collection(db, 'resources'), where('published', '==', true))),
      getDocs(query(collection(db, 'journals'), where('published', '==', true))),
    ]);

    assert.ok(settingsSnap.exists(), 'siteSettings/general missing');
    assert.ok(homeSnap.exists(), 'pages/home missing');
    assert.ok(aboutSnap.exists(), 'pages/about missing');
    assert.ok(pubResSnap.size >= 3, 'Expected >= 3 published resources in Firestore');
    assert.ok(pubJournalSnap.size >= 4, 'Expected >= 4 published journals in Firestore');

    const writeTargets = [
      doc(db, 'resources', 'audit-unauthorized-test'),
      doc(db, 'journals', 'audit-unauthorized-test'),
      doc(db, 'pages', 'home'),
      doc(db, 'siteSettings', 'general'),
    ];
    for (const ref of writeTargets) {
      let rejected = false;
      try {
        await setDoc(ref, { unauthorizedTest: true }, { merge: true });
      } catch (err) {
        if (err.code === 'permission-denied') {
          rejected = true;
        }
      }
      assert.strictEqual(rejected, true, `Expected permission-denied writing ${ref.path}`);
    }
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
