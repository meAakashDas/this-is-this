/**
 * Test Suite: Firestore Sanitization and Serialization Verification
 */
import { removeUndefinedFields } from '../src/lib/cms/sanitize.ts';
import { getPublicHomePage, getPublicSiteConfig } from '../src/lib/cms/contentLoader.ts';

console.log('=== TEST 1: removeUndefinedFields() Recursive Stripping ===');

const dirtyPayload = {
  id: '001',
  resourceNumber: '001',
  title: 'Capital Gains Tax Calculator',
  subcategory: undefined,
  resourceType: undefined,
  coverImage: undefined,
  tags: ['Taxation', 'Finance'],
  seo: {
    title: undefined,
    description: 'A comprehensive calculator for capital gains tax in Nepal.',
    canonicalUrl: undefined,
  },
  attachments: [
    {
      id: 'att-1',
      name: 'Guide.pdf',
      mimeType: undefined,
      visible: true,
    },
    {
      id: 'att-2',
      name: 'Sheet.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      visible: true,
    },
  ],
  nestedBlock: {
    level1: {
      level2: {
        deadKey: undefined,
        aliveKey: 'OK',
      },
    },
  },
};

const cleaned = removeUndefinedFields(dirtyPayload);

// Assertions
let hasUndefined = false;
function checkUndefined(obj, path = '') {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => checkUndefined(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined) {
        console.error(`FAIL: Found undefined at ${path}.${key}`);
        hasUndefined = true;
      }
      checkUndefined(val, `${path}.${key}`);
    }
  }
}

checkUndefined(cleaned);

if (hasUndefined) {
  console.error('TEST 1 FAILED: Undefined values still present in cleaned payload!');
  process.exit(1);
}

if ('subcategory' in cleaned) {
  console.error('TEST 1 FAILED: "subcategory" key should not exist in cleaned object!');
  process.exit(1);
}

if ('title' in cleaned.seo) {
  console.error('TEST 1 FAILED: "title" in seo should not exist in cleaned object!');
  process.exit(1);
}

if ('deadKey' in cleaned.nestedBlock.level1.level2) {
  console.error('TEST 1 FAILED: "deadKey" in nestedBlock should not exist!');
  process.exit(1);
}

console.log('TEST 1 PASSED: All undefined values and keys removed recursively.');

console.log('\n=== TEST 2: Content Loader Blob URL Protection ===');
const homePage = getPublicHomePage();
console.log('Homepage heroPhotoUrl:', homePage.heroPhotoUrl);
if (homePage.heroPhotoUrl && homePage.heroPhotoUrl.startsWith('blob:')) {
  console.error('TEST 2 FAILED: Homepage heroPhotoUrl is still a blob: URL!');
  process.exit(1);
}
console.log('TEST 2 PASSED: Homepage heroPhotoUrl is not a blob: URL.');

const siteSettings = getPublicSiteConfig();
console.log('Site profileImage:', siteSettings.profileImage);
if (siteSettings.profileImage && siteSettings.profileImage.startsWith('blob:')) {
  console.error('TEST 2 FAILED: Site profileImage is still a blob: URL!');
  process.exit(1);
}
console.log('TEST 2 PASSED: Site profileImage is safe and permanent.');

console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
