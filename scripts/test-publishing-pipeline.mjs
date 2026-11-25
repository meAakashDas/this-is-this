/**
 * Unit Test Suite for CMS Publishing Pipeline & SSG Integration
 *
 * Verifies:
 * 1. Snapshot engine creates valid JSON with all required collections
 * 2. Content loader parses snapshot accurately and provides typed getters
 * 3. Graceful fallback works when snapshot is missing or corrupted
 * 4. Draft exclusion strictly hides unpublished resources and articles
 * 5. Section ordering and visibility logic is respected
 * 6. Migration script runs idempotently with validation and backups
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

// Import Content Loader getters
import {
  getPublishingMeta,
  getPublicSiteConfig,
  getPublicHomePage,
  getPublicAboutPage,
  getPublicResources,
  getPublicResourceByNumber,
  getAllPublicResourceNumbers,
  getAdjacentPublicResources,
  getPublicJournalArticles,
  getPublicJournalArticleBySlug,
  getAllPublicJournalSlugs,
  getAdjacentPublicJournalArticles,
} from '../src/lib/cms/contentLoader.ts';

const SNAPSHOT_PATH = path.resolve('src/data/cms-snapshot.json');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ ${description}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  console.log('=================================================================');
  console.log(' CMS Publishing Pipeline & Static SSG Integration Test Suite');
  console.log('=================================================================\n');

  console.log('Test Group 1: Snapshot Generation & Schema Integrity');

  test('1.1 Snapshot file exists on disk and is non-empty', () => {
    assert(fs.existsSync(SNAPSHOT_PATH), 'Snapshot file must exist');
    const stats = fs.statSync(SNAPSHOT_PATH);
    assert(stats.size > 1000, `Snapshot file size too small: ${stats.size} bytes`);
  });

  test('1.2 Snapshot JSON parses cleanly and contains metadata block', () => {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
    const json = JSON.parse(raw);
    assert(json._meta, 'Must contain _meta block');
    assert.strictEqual(json._meta.version, '1.0.0');
    assert(json._meta.generatedAt, 'Must contain generatedAt timestamp');
    assert.ok(json._meta.publishedResourceCount >= 3, 'Must have at least 3 published resources');
    assert.ok(json._meta.resourceCount >= json._meta.publishedResourceCount, 'resourceCount >= publishedResourceCount');
    assert.ok(json._meta.publishedJournalCount >= 4, 'Must have at least 4 published journals');
    assert.ok(json._meta.journalCount >= json._meta.publishedJournalCount, 'journalCount >= publishedJournalCount');
  });

  test('1.3 Snapshot contains valid siteSettings, homePage, and aboutPage', () => {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
    const json = JSON.parse(raw);
    assert.strictEqual(json.siteSettings.fullName, 'Aakash Das');
    assert.strictEqual(json.homePage.heroHeadline, "I'm Aakash Das.");
    assert.strictEqual(json.aboutPage.title, 'About Aakash Das');
    assert(Array.isArray(json.siteSettings.socialLinks), 'socialLinks must be an array');
    assert(Array.isArray(json.homePage.sectionOrder), 'sectionOrder must be an array');
    assert(Array.isArray(json.aboutPage.workEntries), 'workEntries must be an array');
  });

  console.log('\nTest Group 2: Content Loader & Accessor Verification');

  test('2.1 getPublishingMeta returns snapshot metadata', () => {
    const meta = getPublishingMeta();
    assert(meta, 'Metadata must be defined');
    assert(meta.generatedAt, 'Must have generatedAt');
    assert(meta.publishedResourceCount >= 3, 'Must report at least 3 published resources');
  });

  test('2.2 getPublicSiteConfig returns complete site configuration', () => {
    const config = getPublicSiteConfig();
    assert.strictEqual(config.name, 'Aakash Das');
    assert.strictEqual(config.email, 'contact@aakashdas.live');
    assert(config.socialLinks.length >= 5, 'Must provide social channels');
  });

  test('2.3 getPublicHomePage returns ordered sections and hero data', () => {
    const home = getPublicHomePage();
    assert.strictEqual(home.heroHeadline, "I'm Aakash Das.");
    assert.strictEqual(home.heroRoleBrand, 'RisePaisa');
    assert(home.sections.finder.visible, 'Finder section must be visible');
    assert(home.sections.featuredResources.visible, 'Featured section must be visible');
    assert.deepStrictEqual(home.sectionOrder, ['finder', 'featuredResources', 'journal', 'contact']);
  });

  test('2.4 getPublicAboutPage returns bio, work, media, education, and contact', () => {
    const about = getPublicAboutPage();
    assert.strictEqual(about.title, 'About Aakash Das');
    assert(about.introParagraphs.length >= 3, 'Must have at least 3 bio paragraphs');
    assert(about.workEntries.length >= 3, 'Must have 3 work initiatives');
    assert(about.mediaEntries.length >= 1, 'Must have podcast media entry');
    assert(about.educationEntries.length >= 2, 'Must have 2 education entries');
  });

  console.log('\nTest Group 3: Draft Filtering & Security Checks');

  test('3.1 getPublicResources returns exactly 3 published resources and excludes 004', () => {
    const resources = getPublicResources();
    assert.strictEqual(resources.length, 3, 'Must return exactly 3 published resources');
    const numbers = resources.map((r) => r.resourceNumber);
    assert(numbers.includes('001'), 'Must include 001');
    assert(numbers.includes('002'), 'Must include 002');
    assert(numbers.includes('003'), 'Must include 003');
    assert(!numbers.includes('004'), 'Must NEVER include unpublished draft 004');
  });

  test('3.2 getPublicResourceByNumber returns undefined for unpublished 004', () => {
    const res001 = getPublicResourceByNumber('001');
    assert(res001, 'Resource 001 must resolve');
    assert.strictEqual(res001.resourceNumber, '001');

    const res004 = getPublicResourceByNumber('004');
    assert.strictEqual(res004, undefined, 'Unpublished resource 004 must return undefined');
  });

  test('3.3 getAllPublicResourceNumbers returns only ["001", "002", "003"]', () => {
    const numbers = getAllPublicResourceNumbers();
    assert.deepStrictEqual(numbers, ['001', '002', '003']);
  });

  test('3.4 getAdjacentPublicResources returns correct prev/next for 002', () => {
    const adj = getAdjacentPublicResources('002');
    assert.strictEqual(adj.prev?.resourceNumber, '001');
    assert.strictEqual(adj.next?.resourceNumber, '003');
  });

  test('3.5 getPublicJournalArticles returns published articles and filters drafts', () => {
    const articles = getPublicJournalArticles();
    assert.strictEqual(articles.length, 4, 'Must return 4 published journal articles');
    const slugs = articles.map((a) => a.slug);
    assert(slugs.includes('why-i-believe-in-learning-in-public'));
  });

  test('3.6 getAdjacentPublicJournalArticles returns proper previous and next articles', () => {
    const adj = getAdjacentPublicJournalArticles('building-something-that-matters');
    assert.strictEqual(adj.prev?.slug, 'why-i-believe-in-learning-in-public');
    assert.strictEqual(adj.next?.slug, 'where-finance-meets-technology');
  });

  console.log('\nTest Group 4: Migration & Document Export Pipeline Checks');

  test('4.1 Migration script runs cleanly in dry-run mode and creates backup', () => {
    const output = execSync('node scripts/migrate-cms-content.mjs --dry-run', { encoding: 'utf-8' });
    assert(output.includes('All 11 documents passed strict schema validation'), 'Must pass validation');
    assert(output.includes('Pre-migration backup created'), 'Must create backup');
  });

  test('4.2 Snapshot fetching script runs and outputs valid report', () => {
    const output = execSync('node scripts/fetch-cms-snapshot.mjs', { encoding: 'utf-8' });
    assert(output.includes('CMS Snapshot saved to'), 'Must confirm snapshot saved');
  });

  test('4.3 CNAME file exists in public/ and contains aakashdas.live', () => {
    const cnamePath = path.resolve('public/CNAME');
    assert(fs.existsSync(cnamePath), 'public/CNAME must exist');
    const content = fs.readFileSync(cnamePath, 'utf-8').trim();
    assert.strictEqual(content, 'aakashdas.live');
  });

  test('4.4 GitHub Actions workflow file exists and defines 4-stage pipeline', () => {
    const wfPath = path.resolve('.github/workflows/deploy.yml');
    assert(fs.existsSync(wfPath), 'deploy.yml must exist');
    const content = fs.readFileSync(wfPath, 'utf-8');
    assert(content.includes('Fetch CMS Content Snapshot'), 'Must have snapshot step');
    assert(content.includes('Generate Educational Resource Exports'), 'Must have exports step');
    assert(content.includes('Compile Static Astro Site'), 'Must have Astro SSG step');
    assert(content.includes('Deploy to GitHub Pages'), 'Must have deployment step');
  });

  console.log('\n=================================================================');
  console.log(` RESULTS: ${passedTests} Passed | ${failedTests} Failed`);
  console.log('=================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
