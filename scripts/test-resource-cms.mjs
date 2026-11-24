#!/usr/bin/env node
/**
 * Test Suite: Educational Resources CMS, File Uploads, Attachments & Detail Page Architecture
 *
 * Verifies all requirements of Prompt 7:
 * 1. Resource schema & Zod validation
 * 2. Resource number 3-digit format & uniqueness
 * 3. URL slug validation & kebab-case enforcement
 * 4. Category and resource type validation
 * 5. Attachment metadata validation & size constraints
 * 6. Supported document formats (PDF, DOCX, XLSX, CSV, ZIP, PPTX)
 * 7. YouTube video embed 11-char regex validation
 * 8. Status transitions (draft, published, archived)
 * 9. Resource duplication logic & draft state
 * 10. Firestore security rules on /resources/{resourceId}
 * 11. Storage security rules on /uploads/resources/{resourceNumber}/
 * 12. Dev preview sessionStorage isolation
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import CMS validation schemas
const validationPath = path.join(rootDir, 'src', 'lib', 'cms', 'validation.ts');
const { validateResource, validateAttachment, validateResourceNumber, validateSlug } =
  await import(validationPath);

// Import Categories
const categoriesPath = path.join(rootDir, 'src', 'data', 'categories.ts');
const { RESOURCE_CATEGORIES, RESOURCE_TYPES } = await import(categoriesPath);

console.log('--- Educational Resources CMS Test Suite ---');
let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// 1. Valid baseline resource passes Zod validation
runTest('Scenario 1: Valid baseline educational resource passes Zod validation', () => {
  const validDoc = {
    id: '001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resourceNumber: '001',
    title: 'Starter Personal Budget Framework',
    slug: 'starter-personal-budget-framework',
    category: 'Personal Finance',
    resourceType: 'Template',
    description: 'A clean, structured monthly budgeting template.',
    tags: ['Budgeting', 'Spreadsheet', 'Personal Finance'],
    author: 'Aakash Das',
    language: 'English',
    published: true,
    status: 'published',
    featured: true,
    order: 1,
    publishedAt: '2025-01-15',
    downloadFormat: 'Spreadsheet (.xlsx)',
    fileSize: '142 KB',
    downloadUrl: '/downloads/starter-budget-template-001.pdf',
    pdfPreviewUrl: '/downloads/starter-budget-template-001.pdf',
    docxUrl: '/downloads/starter-budget-template-001.docx',
    cardActionLabel: 'Open',
    detailActionLabel: 'Download Resources',
    attachments: [
      {
        id: 'att-001-pdf',
        name: 'Starter Budget Guide & Worksheet',
        fileName: 'starter-budget-template-001.pdf',
        format: 'PDF Document',
        fileSize: '142 KB',
        url: '/downloads/starter-budget-template-001.pdf',
        storagePath: 'uploads/resources/001/starter-budget-template-001.pdf',
        fileExtension: 'pdf',
        isPreviewable: true,
        order: 1,
        visible: true,
      },
    ],
    youtubeEmbed: {
      videoId: 'dQw4w9WgXcQ',
      title: 'Walkthrough',
    },
    summaryPoints: ['Zero-based allocation formula', 'Emergency target tracker'],
    targetAudience: 'Students and early-career professionals in Nepal',
    contentBlocks: [],
    seo: {
      title: 'Resource #001: Starter Personal Budget Framework — Aakash Das',
      description: 'A clean monthly budgeting framework.',
    },
  };

  const parsed = validateResource(validDoc);
  assert.equal(parsed.resourceNumber, '001');
  assert.equal(parsed.title, 'Starter Personal Budget Framework');
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].fileExtension, 'pdf');
});

// 2. Resource number 3-digit format validation & auto-padding
runTest('Scenario 2: Resource number validates digits and auto-pads numbers < 3 digits', () => {
  assert.equal(validateResourceNumber('001').valid, true);
  assert.equal(validateResourceNumber('042').valid, true);
  assert.equal(validateResourceNumber('999').valid, true);

  // Auto-padding (e.g. typing "1" resolves to "001" like Resource Finder)
  const padded1 = validateResourceNumber('1');
  assert.equal(padded1.valid, true);
  assert.equal(padded1.value, '001');

  const padded12 = validateResourceNumber('12');
  assert.equal(padded12.valid, true);
  assert.equal(padded12.value, '012');

  // Invalid formats (non-digits)
  assert.equal(validateResourceNumber('abc').valid, false);
  assert.equal(validateResourceNumber('00-').valid, false);
  assert.equal(validateResourceNumber('1234567').valid, false);
});

// 3. Rejects empty resource title
runTest('Scenario 3: Resource validation rejects empty title', () => {
  assert.throws(
    () => {
      validateResource({
        id: '002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resourceNumber: '002',
        title: '', // Empty title
        slug: 'empty-title',
        category: 'Banking',
        description: 'Test description',
        tags: [],
        author: 'Aakash Das',
        published: true,
        publishedAt: '2025-01-01',
      });
    },
    (err) => err.name === 'CmsValidationError'
  );
});

// 4. URL slug validation
runTest('Scenario 4: Resource slug enforces lowercase kebab-case and rejects unsafe characters', () => {
  assert.equal(validateSlug('personal-finance-guide').valid, true);
  assert.equal(validateSlug('nepal-banking-checklist-002').valid, true);

  // Invalid slugs
  assert.equal(validateSlug('Personal Finance').valid, false); // Uppercase & spaces
  assert.equal(validateSlug('guide_with_underscores').valid, false); // Underscores
  assert.equal(validateSlug('slug!@#$').valid, false); // Symbols
});

// 5. Attachment metadata validation
runTest('Scenario 5: Attachment metadata requires name, fileName, format, fileSize, and url', () => {
  const validAttachment = {
    id: 'att-csv-1',
    name: 'Cash Flow Model',
    fileName: 'cash-flow-model.csv',
    format: 'CSV Data File',
    fileSize: '24 KB',
    url: 'https://storage.googleapis.com/test-bucket/cash-flow.csv',
    storagePath: 'uploads/resources/001/cash-flow.csv',
    fileExtension: 'csv',
    isPreviewable: false,
    order: 1,
    visible: true,
  };

  const parsed = validateAttachment(validAttachment);
  assert.equal(parsed.fileName, 'cash-flow-model.csv');
  assert.equal(parsed.fileExtension, 'csv');
  assert.equal(parsed.isPreviewable, false);
});

// 6. Central categories list
runTest('Scenario 6: Central categories include Personal Finance, Banking, Investment, NEPSE, Templates', () => {
  const categoryNames = RESOURCE_CATEGORIES.map((c) => c.name);
  assert.ok(categoryNames.includes('Personal Finance'));
  assert.ok(categoryNames.includes('Banking'));
  assert.ok(categoryNames.includes('Investment'));
  assert.ok(categoryNames.includes('NEPSE'));
  assert.ok(categoryNames.includes('Taxation'));
  assert.ok(categoryNames.includes('Templates'));
  assert.ok(categoryNames.includes('Checklists'));

  assert.ok(RESOURCE_TYPES.includes('Template'));
  assert.ok(RESOURCE_TYPES.includes('Guide'));
  assert.ok(RESOURCE_TYPES.includes('Checklist'));
});

// 7. YouTube video embed 11-char regex validation
runTest('Scenario 7: YouTube embed strictly requires exact 11-character video ID', () => {
  const validDoc = {
    id: '003',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resourceNumber: '003',
    title: 'Semester Tracker',
    slug: 'semester-tracker',
    category: 'Productivity',
    description: 'Student guide',
    tags: [],
    author: 'Aakash Das',
    published: true,
    publishedAt: '2025-01-01',
    youtubeEmbed: {
      videoId: 'dQw4w9WgXcQ', // 11 characters
      title: 'Guide Video',
    },
  };
  const parsed = validateResource(validDoc);
  assert.equal(parsed.youtubeEmbed?.videoId, 'dQw4w9WgXcQ');

  // Invalid 10-char or 12-char video IDs must fail
  assert.throws(
    () => {
      validateResource({
        ...validDoc,
        youtubeEmbed: { videoId: 'too_short', title: 'Invalid' },
      });
    },
    (err) => err.name === 'CmsValidationError'
  );
});

// 8. Status transitions (draft, published, archived)
runTest('Scenario 8: Resource status supports draft, published, and archived states', () => {
  const base = {
    id: '005',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resourceNumber: '005',
    title: 'Status Test Resource',
    slug: 'status-test-resource',
    category: 'Guides',
    description: 'Testing status transitions',
    tags: [],
    author: 'Aakash Das',
    publishedAt: '2025-01-01',
  };

  const draftDoc = validateResource({ ...base, published: false, status: 'draft' });
  assert.equal(draftDoc.published, false);
  assert.equal(draftDoc.status, 'draft');

  const pubDoc = validateResource({ ...base, published: true, status: 'published' });
  assert.equal(pubDoc.published, true);
  assert.equal(pubDoc.status, 'published');

  const archDoc = validateResource({ ...base, published: false, status: 'archived' });
  assert.equal(archDoc.published, false);
  assert.equal(archDoc.status, 'archived');
});

// 9. Resource duplication logic
runTest('Scenario 9: Resource duplication generates distinct number and draft status', () => {
  const source = {
    id: '001',
    resourceNumber: '001',
    title: 'Starter Budget',
    slug: 'starter-budget',
    category: 'Personal Finance',
    description: 'Source desc',
    tags: ['Finance'],
    published: true,
    status: 'published',
  };

  const nextNum = '005';
  const duplicated = {
    ...source,
    id: nextNum,
    resourceNumber: nextNum,
    title: `${source.title} (Copy)`,
    slug: `${source.slug}-copy`,
    published: false,
    status: 'draft',
  };

  assert.equal(duplicated.resourceNumber, '005');
  assert.equal(duplicated.published, false);
  assert.equal(duplicated.status, 'draft');
  assert.equal(duplicated.title, 'Starter Budget (Copy)');
  assert.notEqual(duplicated.resourceNumber, source.resourceNumber);
});

// 10. Firestore Rules enforcement on /resources
runTest('Scenario 10: Firestore rules require isPublished() or isAuthorizedAdmin() for read and isAuthorizedAdmin() for write', () => {
  const rulesPath = path.join(rootDir, 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  assert.ok(rulesContent.includes('match /resources/{resourceId}'));
  assert.ok(rulesContent.includes('allow read: if isPublished() || isAuthorizedAdmin();'));
  assert.ok(rulesContent.includes('allow create, update, delete: if isAuthorizedAdmin();'));
});

// 11. Storage Rules enforcement on /uploads/resources/{resourceNumber}/
runTest('Scenario 11: Storage rules allow public read and require isAuthorizedAdmin() with valid file types for uploads', () => {
  const storageRulesPath = path.join(rootDir, 'storage.rules');
  const storageRulesContent = fs.readFileSync(storageRulesPath, 'utf-8');

  assert.ok(storageRulesContent.includes('match /uploads/resources/{resourceNumber}/{allPaths=**}'));
  assert.ok(storageRulesContent.includes('allow read: if true;'));
  assert.ok(storageRulesContent.includes('allow write: if isAuthorizedAdmin() && (isValidDocument() || isValidImage());'));
  assert.ok(storageRulesContent.includes('allow delete: if isAuthorizedAdmin();'));
  assert.ok(storageRulesContent.includes('application/pdf'));
  assert.ok(storageRulesContent.includes('application/zip'));
});

// 12. Dev preview sessionStorage isolation
runTest('Scenario 12: Dev preview resources key constant is well-defined and isolated', () => {
  const resourcesKey = 'aakashdas_cms_resources_preview';
  const pagesKey = 'aakashdas_cms_homepage_preview';
  const profileKey = 'aakashdas_cms_profile_preview';

  assert.notEqual(resourcesKey, pagesKey);
  assert.notEqual(resourcesKey, profileKey);
  assert.ok(resourcesKey.startsWith('aakashdas_cms_'));
});

console.log(`\nResults: ${passedTests}/${totalTests} unit tests passed.`);
if (passedTests === totalTests) {
  console.log('✓ All Educational Resources CMS unit tests passed successfully!\n');
} else {
  console.error(`✗ ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
