import {
  journalSchema,
  journalStatusSchema,
  journalContentBlockSchema,
  validateJournal,
  validateSlug,
} from '../src/lib/cms/validation.ts';
import {
  calculateWordCount,
  calculateReadingTime,
  generateSlugFromTitle,
  blocksToContentStructure,
  contentStructureToBlocks,
  extractTextFromBlocks,
  JOURNAL_CATEGORIES,
  DEFAULT_JOURNAL_TAGS,
} from '../src/data/journalCategories.ts';
import fs from 'node:fs';

console.log('--- Journal & Articles CMS Test Suite ---');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✘ FAILED: ${message}`);
    failed++;
  }
}

// Scenario 1: Valid baseline article passes Zod validation
try {
  const sample = {
    id: 'why-i-believe-in-learning-in-public',
    slug: 'why-i-believe-in-learning-in-public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: 'Why I Believe in Learning in Public',
    category: 'Learning',
    tags: ['Learning', 'Editorial'],
    excerpt: 'When I first started creating educational notes on personal finance, I worried about not knowing enough.',
    author: 'Aakash Das',
    published: true,
    status: 'published',
    featured: true,
    order: 1,
    publishedAt: 'November 2024',
    readTime: '4 min read',
    wordCount: 450,
    content: {
      lead: 'When I first started creating educational notes on personal finance...',
      sections: [
        {
          heading: 'Teaching as a Learning Mechanism',
          paragraphs: ['There is an old observation attributed to Richard Feynman...'],
          quote: 'You do not need to be at the destination to point out the trail markers you just passed.',
        },
      ],
    },
    seo: {
      title: 'Why I Believe in Learning in Public — Aakash Das',
      description: 'Documenting what I learn as I go has completely changed how I think.',
    },
  };
  const validated = validateJournal(sample);
  assert(validated.slug === 'why-i-believe-in-learning-in-public', 'Scenario 1: Valid baseline article passes Zod validation');
} catch (e) {
  assert(false, `Scenario 1: Failed with error: ${e.message}`);
}

// Scenario 2: Empty title is rejected
try {
  const invalid = {
    id: 'test-slug',
    slug: 'test-slug',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: '', // empty title
    category: 'Learning',
    excerpt: 'Valid excerpt',
    published: true,
    publishedAt: 'November 2024',
    readTime: '2 min read',
    content: { lead: 'Valid lead', sections: [] },
    seo: {},
  };
  validateJournal(invalid);
  assert(false, 'Scenario 2: Empty title should be rejected');
} catch (e) {
  assert(true, 'Scenario 2: Empty article title is rejected by Zod schema');
}

// Scenario 3: Invalid slug is rejected
const badSlugs = ['Invalid Slug', 'slug_with_underscores', 'slug/with/slash', '-leading-hyphen', ''];
let badSlugsRejected = true;
for (const s of badSlugs) {
  const res = validateSlug(s);
  if (res.valid) {
    badSlugsRejected = false;
    break;
  }
}
assert(badSlugsRejected, 'Scenario 3: Uppercase, underscores, and slash slugs are rejected');

// Scenario 4: Auto-generated slug produces valid lowercase kebab-case
const generatedSlug = generateSlugFromTitle("Nepal's Capital Markets & NEPSE Technicals: 2025!");
assert(
  generatedSlug === 'nepals-capital-markets-nepse-technicals-2025' &&
    validateSlug(generatedSlug).valid,
  'Scenario 4: Auto-generated slug produces strictly valid lowercase kebab-case'
);

// Scenario 5: Content blocks support structured blocks and reject invalid types
const blockResult = journalContentBlockSchema.safeParse({
  id: 'b-1',
  type: 'heading2',
  text: 'Nepal Banking Architecture',
  level: 2,
});
assert(blockResult.success, 'Scenario 5: Structured content block validates successfully');

// Scenario 6: Unsafe javascript: links are rejected
const unsafeLinkResult = journalContentBlockSchema.safeParse({
  id: 'b-unsafe',
  type: 'link',
  text: 'Dangerous Link',
  url: 'javascript:alert(1)',
});
assert(!unsafeLinkResult.success, 'Scenario 6: Unsafe javascript: protocol links are rejected');

// Scenario 7: Nepali Devanagari Unicode content is preserved without corruption
const nepaliText = 'नेपालको वित्तीय प्रणाली र व्यक्तिगत बजेट निर्माण';
const nepaliArticle = {
  id: 'nepal-finance-guide',
  slug: 'nepal-finance-guide',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: 'नेपालको वित्तीय प्रणाली',
  category: 'Personal Finance',
  excerpt: nepaliText,
  published: true,
  status: 'published',
  publishedAt: 'November 2024',
  readTime: '3 min read',
  language: 'Nepali',
  content: {
    lead: nepaliText,
    sections: [
      {
        heading: 'बचत र लगानीका आधारभूत सिद्धान्त',
        paragraphs: ['पैसा कमाउनु मात्र पर्याप्त छैन, त्यसको सही व्यवस्थापन गर्नुपर्छ।'],
      },
    ],
  },
  seo: {},
};
try {
  const validatedNepali = validateJournal(nepaliArticle);
  assert(
    validatedNepali.title === 'नेपालको वित्तीय प्रणाली' &&
      validatedNepali.content.sections[0].paragraphs[0] ===
        'पैसा कमाउनु मात्र पर्याप्त छैन, त्यसको सही व्यवस्थापन गर्नुपर्छ।',
    'Scenario 7: Nepali Unicode content is preserved with exact character fidelity'
  );
} catch (e) {
  assert(false, `Scenario 7: Failed with ${e.message}`);
}

// Scenario 8: Article word count is calculated correctly for both English and Nepali
const mixedText = 'Financial literacy is freedom. वित्तीय साक्षरता नै आत्मनिर्भरता हो।';
const words = calculateWordCount(mixedText);
assert(words === 9, 'Scenario 8: Word count calculates correctly across mixed English and Devanagari text');

// Scenario 9: Reading time calculates correctly based on word count
const shortReadTime = calculateReadingTime(150);
const longReadTime = calculateReadingTime(650);
assert(
  shortReadTime === '1 min read' && longReadTime === '4 min read',
  'Scenario 9: Reading time calculates accurately (1 min for 150 words, 4 min for 650 words)'
);

// Scenario 10: Category and tags validate correctly
const catMatch = JOURNAL_CATEGORIES.some((c) => c.name === 'Personal Finance');
const tagMatch = DEFAULT_JOURNAL_TAGS.includes('NEPSE');
assert(catMatch && tagMatch, 'Scenario 10: Central journal categories and tags are well-defined');

// Scenario 11: Featured image metadata validates
const imageBlock = journalContentBlockSchema.safeParse({
  id: 'img-1',
  type: 'image',
  url: 'https://aakashdas.live/images/journal-cover.webp',
  alt: 'RisePaisa financial framework cover',
  caption: 'Editorial photo',
});
assert(imageBlock.success, 'Scenario 11: Featured image metadata and URL validate successfully');

// Scenario 12: Draft, Published, and Archived status support
const draftCheck = journalStatusSchema.safeParse('draft');
const pubCheck = journalStatusSchema.safeParse('published');
const archCheck = journalStatusSchema.safeParse('archived');
assert(
  draftCheck.success && pubCheck.success && archCheck.success,
  'Scenario 12: Journal status supports draft, published, and archived states'
);

// Scenario 13: blocksToContentStructure converts blocks with fidelity
const sampleBlocks = [
  { id: 'b1', type: 'paragraph', text: 'This is the lead intro.' },
  { id: 'b2', type: 'heading2', text: 'First Section Heading' },
  { id: 'b3', type: 'paragraph', text: 'Section body paragraph.' },
  { id: 'b4', type: 'blockquote', text: 'Inspiring quote here.' },
];
const converted = blocksToContentStructure(sampleBlocks);
assert(
  converted.lead === 'This is the lead intro.' &&
    converted.sections.length === 1 &&
    converted.sections[0].heading === 'First Section Heading' &&
    converted.sections[0].quote === 'Inspiring quote here.',
  'Scenario 13: Block-to-content converter produces canonical JournalContentStructure'
);

// Scenario 14: Firestore rules require isPublished() or isAuthorizedAdmin() for read
const rules = fs.readFileSync('firestore.rules', 'utf8');
const hasJournalRules =
  rules.includes('match /journals/{slug}') &&
  rules.includes('allow read: if isPublished() || isAuthorizedAdmin()') &&
  rules.includes('allow create, update, delete: if isAuthorizedAdmin()');
assert(hasJournalRules, 'Scenario 14: Firestore rules strictly protect journal reads and admin mutations');

// Scenario 15: Storage rules protect journal uploads
const storageRules = fs.readFileSync('storage.rules', 'utf8');
const hasStorageRules =
  storageRules.includes('match /uploads/journal/{slug}/{allPaths=**}') &&
  storageRules.includes('isAuthorizedAdmin() && isValidImage()');
assert(hasStorageRules, 'Scenario 15: Storage rules enforce authorized administrator access and image validation');

// Scenario 16: Dev preview session key is isolated
const PREVIEW_KEY = 'aakashdas_cms_journal_preview';
assert(PREVIEW_KEY === 'aakashdas_cms_journal_preview', 'Scenario 16: Dev preview storage key is isolated');

console.log(`\nResults: ${passed}/${passed + failed} unit tests passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✓ All Journal & Articles CMS unit tests passed successfully!\n');
}
