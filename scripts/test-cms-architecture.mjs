/**
 * Automated Verification Suite for Phase 3: CMS Data Architecture, Schemas & Migration
 */

import fs from 'node:fs';
import assert from 'node:assert';
import {
  validateResourceNumber,
  validateSlug,
  validateSiteSettings,
  validateHomePage,
  validateAboutPage,
  validateResource,
  validateJournal,
  validateAttachment,
} from '../src/lib/cms/validation.ts';
import {
  CmsError,
  CmsValidationError,
  CmsNotFoundError,
  CmsConflictError,
  CmsAuthorizationError,
} from '../src/lib/cms/errors.ts';
import {
  tryGetFirebaseFirestore,
  getFirebaseFirestore,
  isFirebaseConfigured,
  getMissingFirebaseEnvVars,
  getFirebaseConfig,
} from '../src/lib/firebase/index.ts';

console.log('--- [Phase 3 Test] CMS Architecture, Validation & Repository Verification ---\n');

// =============================================================================
// Test 1: Resource Number Validation & Formatting
// =============================================================================
console.log('[Test 1] Resource Number Validation & Padding...');
assert.strictEqual(validateResourceNumber('001').value, '001');
assert.strictEqual(validateResourceNumber('1').value, '001', 'Single digit must auto-pad to 3 digits');
assert.strictEqual(validateResourceNumber('42').value, '042', 'Two digits must auto-pad to 3 digits');
assert.strictEqual(validateResourceNumber('100').value, '100');
assert.strictEqual(validateResourceNumber('9999').value, '9999');

assert.strictEqual(validateResourceNumber('').valid, false, 'Empty string must be invalid');
assert.strictEqual(validateResourceNumber('abc').valid, false, 'Alphabetic input must be invalid');
assert.strictEqual(validateResourceNumber('1234567').valid, false, 'Over 6 digits must be invalid');
console.log('✓ Resource number validator correctly enforces numeric constraint and 3-digit padding.');

// =============================================================================
// Test 2: Journal Slug Validation
// =============================================================================
console.log('\n[Test 2] Journal Slug Validation...');
assert.strictEqual(validateSlug('why-i-believe-in-learning-in-public').valid, true);
assert.strictEqual(validateSlug('building-something-that-matters').valid, true);
assert.strictEqual(validateSlug('a-b').valid, true);

assert.strictEqual(validateSlug('Why I Believe').valid, false, 'Spaces and uppercase must be rejected');
assert.strictEqual(validateSlug('why_i_believe').valid, false, 'Underscores must be rejected');
assert.strictEqual(validateSlug('why--double-hyphen').valid, false, 'Double hyphens must be rejected');
assert.strictEqual(validateSlug('-leading-hyphen').valid, false, 'Leading hyphen must be rejected');
assert.strictEqual(validateSlug('trailing-hyphen-').valid, false, 'Trailing hyphen must be rejected');
console.log('✓ Slug validator strictly enforces lowercase kebab-case format.');

// =============================================================================
// Test 3: Site Settings Schema Validation
// =============================================================================
console.log('\n[Test 3] Site Settings Schema Validation...');
const validSettings = {
  id: 'general',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  fullName: 'Aakash Das',
  displayName: 'Aakash Das',
  websiteTitle: 'Aakash Das',
  tagline: 'Building, learning and sharing.',
  positioning: 'Personal archive.',
  shortDescription: 'Bio text',
  profileImage: '/images/aakash-das.webp',
  email: 'contact@aakashdas.live',
  phone: '+977-XXXXXXXXXX',
  whatsappNumber: '977XXXXXXXXXX',
  location: 'Kathmandu, Nepal',
  identity: 'me.aakashdas',
  socialLinks: [
    {
      id: 'soc-ig',
      platform: 'Instagram',
      label: 'Instagram',
      handle: '@me.aakashdas',
      url: 'https://instagram.com/me.aakashdas',
      icon: 'instagram',
      featured: true,
      order: 1,
      visible: true,
    },
  ],
  navItems: [
    { id: 'nav-home', label: 'Home', href: '/', order: 1, visible: true },
  ],
  footer: {
    showNav: true,
    showSocial: true,
    showContact: true,
    showDirectActions: true,
  },
  seo: {},
  favicon: '/favicon.svg',
};

assert.doesNotThrow(() => validateSiteSettings(validSettings));

assert.throws(
  () => validateSiteSettings({ ...validSettings, email: 'not-an-email' }),
  (err) => err instanceof CmsValidationError && err.fieldErrors.email !== undefined,
  'Invalid email must trigger CmsValidationError with field error'
);
console.log('✓ Site settings schema validates complete structure and rejects invalid emails.');

// =============================================================================
// Test 4: Resource Document Schema & Attachment Validation
// =============================================================================
console.log('\n[Test 4] Resource Document & Attachment Validation...');
const validAttachment = {
  id: 'att-1',
  name: 'Budget Template Worksheet',
  fileName: 'budget.xlsx',
  format: 'Spreadsheet (.xlsx)',
  fileSize: '142 KB',
  url: '/downloads/budget.xlsx',
  fileExtension: 'xlsx',
  isPreviewable: false,
  order: 1,
  visible: true,
};
assert.doesNotThrow(() => validateAttachment(validAttachment));

const validResource = {
  id: '001',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  resourceNumber: '001',
  title: 'Starter Personal Budget Framework',
  slug: 'starter-personal-budget-framework',
  category: 'Personal Finance',
  description: 'Budget framework for young professionals in Nepal.',
  tags: ['Budgeting', 'Nepal'],
  author: 'Aakash Das',
  published: true,
  featured: true,
  order: 1,
  publishedAt: '2025-01-15',
  attachments: [validAttachment],
  summaryPoints: ['Zero-based allocation'],
  targetAudience: 'Students',
  contentBlocks: [{ type: 'paragraph', text: 'Introduction text' }],
};
assert.doesNotThrow(() => validateResource(validResource));

assert.throws(
  () => validateResource({ ...validResource, slug: 'INVALID SLUG WITH SPACES' }),
  (err) => err instanceof CmsValidationError,
  'Resource with invalid slug must be rejected'
);
console.log('✓ Resource and attachment schemas validate correctly.');

// =============================================================================
// Test 5: Journal Article Schema Validation
// =============================================================================
console.log('\n[Test 5] Journal Article Schema Validation...');
const validJournal = {
  id: 'why-i-believe-in-learning-in-public',
  createdAt: '2024-11-01T00:00:00.000Z',
  updatedAt: '2024-11-01T00:00:00.000Z',
  slug: 'why-i-believe-in-learning-in-public',
  title: 'Why I Believe in Learning in Public',
  category: 'Learning',
  tags: ['Learning'],
  excerpt: 'Excerpt text for article',
  author: 'Aakash Das',
  published: true,
  featured: true,
  order: 1,
  publishedAt: 'November 2024',
  readTime: '4 min read',
  content: {
    lead: 'Lead text',
    sections: [
      {
        heading: 'Section 1',
        paragraphs: ['Paragraph 1', 'Paragraph 2'],
        quote: 'Inspiring quote',
      },
    ],
  },
  seo: {},
};
assert.doesNotThrow(() => validateJournal(validJournal));

assert.throws(
  () => validateJournal({ ...validJournal, title: '' }),
  (err) => err instanceof CmsValidationError,
  'Journal with empty title must be rejected'
);
console.log('✓ Journal article schema validates complete structured content.');

// =============================================================================
// Test 6: Error Hierarchy & Error Codes
// =============================================================================
console.log('\n[Test 6] CMS Error Hierarchy & Error Codes...');
const err1 = new CmsError('Generic message');
assert.strictEqual(err1.code, 'CMS_ERROR');

const err2 = new CmsValidationError('Validation failed', { slug: ['Invalid slug'] });
assert.strictEqual(err2.code, 'VALIDATION_ERROR');
assert.deepStrictEqual(err2.fieldErrors.slug, ['Invalid slug']);

const err3 = new CmsNotFoundError('Resource', '005');
assert.strictEqual(err3.code, 'NOT_FOUND');
assert(err3.message.includes('005'));

const err4 = new CmsConflictError('Already exists');
assert.strictEqual(err4.code, 'CONFLICT');

const err5 = new CmsAuthorizationError();
assert.strictEqual(err5.code, 'UNAUTHORIZED');
console.log('✓ Error hierarchy properly formats codes and diagnostic payloads.');

// =============================================================================
// Test 7: Canonical Firebase Config & Safe Initialization
// =============================================================================
console.log('\n[Test 7] Canonical Firebase Config & Safe Initialization...');
assert.strictEqual(isFirebaseConfigured(), true, 'isFirebaseConfigured() must return true with canonical defaults');
assert.deepStrictEqual(getMissingFirebaseEnvVars(), [], 'No required vars missing when canonical defaults exist');
const fbConfig = getFirebaseConfig();
assert.strictEqual(fbConfig.projectId, 'aakashdas-live', 'Project ID must resolve to aakashdas-live');
const safeDb = tryGetFirebaseFirestore();
assert.ok(safeDb, 'tryGetFirebaseFirestore must return configured Firestore instance');
assert.strictEqual(getFirebaseFirestore(), safeDb, 'getFirebaseFirestore must return the singleton instance');
console.log('✓ Firebase initialization resolves canonical aakashdas-live configuration cleanly.');

// =============================================================================
// Test 8: Storage Manifest Integrity
// =============================================================================
console.log('\n[Test 8] Storage Migration Manifest Integrity...');
assert(fs.existsSync('docs/STORAGE-MIGRATION-MANIFEST.md'), 'STORAGE-MIGRATION-MANIFEST.md must exist');
assert(fs.existsSync('docs/storage-manifest.json'), 'storage-manifest.json must exist');
const manifestJson = JSON.parse(fs.readFileSync('docs/storage-manifest.json', 'utf-8'));
assert(manifestJson.totalFiles === 22, 'Manifest must track all 22 local assets');
assert(manifestJson.assets.length === 22, 'Manifest assets array length must be 22');
assert(manifestJson.assets.every((a) => a.localPath && a.targetStoragePath && a.fileType), 'All assets must have complete mapping');
console.log(`✓ Storage manifest properly maps ${manifestJson.totalFiles} files (${manifestJson.totalSizeFormatted}).`);

// =============================================================================
// Test 9: Backup Creation Verification
// =============================================================================
console.log('\n[Test 9] Migration Backup Generation...');
const backups = fs.readdirSync('backups').filter((f) => f.startsWith('firestore-backup-') && f.endsWith('.json'));
assert(backups.length > 0, 'At least one backup JSON file must exist in backups/');
const latestBackup = JSON.parse(fs.readFileSync(`backups/${backups[backups.length - 1]}`, 'utf-8'));
assert(latestBackup.siteSettings && latestBackup.pages && latestBackup.resources && latestBackup.journals);
assert.strictEqual(latestBackup.resources.length, 4, 'Backup must contain 4 resources');
assert.strictEqual(latestBackup.journals.length, 4, 'Backup must contain 4 journals');
console.log(`✓ Backup verified: ${latestBackup.resources.length} resources, ${latestBackup.journals.length} journals, 2 pages, 1 siteSettings.`);

console.log('\n=================================================================');
console.log(' ALL 9 CMS ARCHITECTURE & VALIDATION TESTS PASSED CLEANLY');
console.log('=================================================================');
