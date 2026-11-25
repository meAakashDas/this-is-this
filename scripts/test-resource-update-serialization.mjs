/**
 * Test Suite: Resource 001 Update Serialization & Sanitization
 */
import { validateResource } from '../src/lib/cms/validation.ts';
import { removeUndefinedFields } from '../src/lib/cms/sanitize.ts';

console.log('=== TEST 3: Validate & Sanitize Resource #001 Update Payload ===');

// Simulate the exact scenario that caused the error:
// The user edited resource 001 in ResourceEditor and left subcategory empty
const rawDoc = {
  id: '001',
  resourceNumber: '001',
  title: 'Capital Gains Tax Calculator',
  slug: 'capital-gains-tax-calculator',
  category: 'Taxation & Legal',
  subcategory: '', // or undefined
  resourceType: '', // or undefined
  description: 'An interactive Excel calculator for individual and corporate capital gains tax.',
  tags: ['Taxation', 'Capital Gains', 'NEPSE', 'Finance'],
  coverImage: '',
  thumbnailAlt: '',
  author: 'Aakash Das',
  language: 'English',
  published: true,
  status: 'published',
  featured: true,
  order: 1,
  publishedAt: '2025-01-15',
  cardActionLabel: 'Open',
  detailActionLabel: 'Download Resources',
  attachments: [
    {
      id: 'att-1',
      name: 'Capital Gains Tax Worksheet',
      fileName: 'capital-gains-tax-calculator.xlsx',
      format: 'Excel Spreadsheet',
      fileSize: '142 KB',
      url: '/downloads/capital-gains-tax-calculator.xlsx',
      fileExtension: 'xlsx',
      mimeType: '',
      isPreviewable: false,
      order: 1,
      visible: true,
    },
  ],
  summaryPoints: [],
  targetAudience: '',
  contentBlocks: [],
  seo: {
    title: '',
    description: '',
    canonicalUrl: '',
  },
  createdAt: '2025-01-15T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

// Also test if undefined was explicitly passed
const rawDocWithUndefined = {
  ...rawDoc,
  subcategory: undefined,
  resourceType: undefined,
  coverImage: undefined,
  thumbnailAlt: undefined,
  seo: {
    title: undefined,
    description: undefined,
    canonicalUrl: undefined,
  },
};

const validated = validateResource(rawDocWithUndefined);
const sanitized = removeUndefinedFields(validated);

function assertNoUndefined(obj, path = '') {
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      throw new Error(`Forbidden undefined found at ${path}.${key}`);
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      assertNoUndefined(val, `${path}.${key}`);
    }
  }
}

assertNoUndefined(sanitized, 'resource');

console.log('Sanitized resource keys:', Object.keys(sanitized));
console.log('Sanitized seo keys:', Object.keys(sanitized.seo || {}));
console.log('TEST 3 PASSED: Resource #001 payload is 100% Firestore-safe.');
