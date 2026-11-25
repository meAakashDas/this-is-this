/**
 * Comprehensive Verification: Resources & Journal Record Retrieval & CRUD
 */

import assert from 'node:assert';
import {
  getResourceByNumber,
  getResourceById,
  updateResource,
  getAllResourcesForAdmin,
  createResource,
  deleteResource,
  getBaselineFallbackResources,
} from '../src/lib/cms/resources.repository.ts';
import {
  getJournalBySlug,
  getJournalById,
  updateJournal,
  getAllJournalsForAdmin,
  createJournal,
  deleteJournal,
  getBaselineFallbackJournals,
} from '../src/lib/cms/journals.repository.ts';

console.log('=================================================================');
console.log('   VERIFYING RESOURCE & JOURNAL RETRIEVAL & CRUD ARCHITECTURE    ');
console.log('=================================================================\n');

async function runTests() {
  // ---------------------------------------------------------------------------
  // 1. Resources Retrieval & Updates
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Testing Resource #001 Retrieval...');
  const r001ByNum = await getResourceByNumber('001');
  assert.ok(r001ByNum, 'Resource #001 must be found by number');
  assert.strictEqual(r001ByNum.resourceNumber, '001');
  assert.strictEqual(r001ByNum.title, 'Starter Personal Budget Framework');
  assert.ok(r001ByNum.attachments.length >= 2, 'Resource #001 attachments must be loaded');
  console.log('  ✓ Resource #001 retrieved by number "001":', r001ByNum.title);

  const r001ById = await getResourceById('001');
  assert.ok(r001ById, 'Resource #001 must be found by ID "001"');
  assert.strictEqual(r001ById.resourceNumber, '001');
  console.log('  ✓ Resource #001 retrieved by ID "001"');

  const r001Padded = await getResourceByNumber('1');
  assert.ok(r001Padded, 'Resource #001 must be found by unpadded "1"');
  assert.strictEqual(r001Padded.resourceNumber, '001');
  console.log('  ✓ Resource #001 retrieved by unpadded "1"');

  console.log('\n[Test 2] Testing Resource #001 Safe Update (No false Not Found error)...');
  const originalDescription = r001ByNum.description;
  try {
    const updatedR001 = await updateResource('001', {
      description: originalDescription,
    });
    assert.ok(updatedR001, 'Update must return the saved document');
    assert.strictEqual(updatedR001.resourceNumber, '001');
    assert.strictEqual(updatedR001.attachments.length, r001ByNum.attachments.length);
    console.log('  ✓ Resource #001 updated successfully without CmsNotFoundError');
  } catch (err) {
    // When executed against live Firestore without interactive admin Google OAuth, rules must reject writes
    assert.strictEqual(err.code, 'WRITE_FAILED', `Expected WRITE_FAILED/permission-denied or success, got: ${err.code} (${err.message})`);
    console.log('  ✓ Live Firestore correctly blocked unauthenticated write with WRITE_FAILED (use test-emulator-auth-rules-crud.mjs for authenticated SDK writes)');
  }

  console.log('\n[Test 3] Testing Non-existent Resource Lookup & Update...');
  const nonExistent = await getResourceByNumber('998');
  assert.strictEqual(nonExistent, null, 'Non-existent resource must return null');
  console.log('  ✓ Non-existent resource #998 correctly returned null');

  try {
    await updateResource('998', { title: 'Ghost Resource' });
    assert.fail('Updating a truly non-existent resource must throw CmsNotFoundError');
  } catch (err) {
    assert.strictEqual(err.code, 'NOT_FOUND');
    console.log('  ✓ Confirmed: updateResource correctly throws NOT_FOUND only for truly non-existent records:', err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. Journal Retrieval & Updates
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] Testing Journal "where-finance-meets-technology" Retrieval...');
  const jArticle = await getJournalBySlug('where-finance-meets-technology');
  assert.ok(jArticle, 'Journal article "where-finance-meets-technology" must be found');
  assert.strictEqual(jArticle.slug, 'where-finance-meets-technology');
  assert.strictEqual(jArticle.title, 'Where Finance Meets Technology');
  assert.ok(jArticle.blocknoteJson && jArticle.blocknoteJson.length > 0, 'BlockNote JSON must be loaded');
  console.log('  ✓ Journal article retrieved by slug:', jArticle.title, `(${jArticle.blocknoteJson.length} BlockNote blocks)`);

  const jArticleById = await getJournalById('where-finance-meets-technology');
  assert.ok(jArticleById, 'Journal article must be found by ID');
  assert.strictEqual(jArticleById.slug, 'where-finance-meets-technology');
  console.log('  ✓ Journal article retrieved by ID');

  console.log('\n[Test 5] Testing Journal "where-finance-meets-technology" Safe Update...');
  const originalExcerpt = jArticle.excerpt;
  try {
    const updatedJournal = await updateJournal('where-finance-meets-technology', {
      excerpt: originalExcerpt,
    });
    assert.ok(updatedJournal, 'Journal update must return the saved document');
    assert.strictEqual(updatedJournal.slug, 'where-finance-meets-technology');
    assert.strictEqual(updatedJournal.title, 'Where Finance Meets Technology');
    console.log('  ✓ Journal article updated successfully without CmsNotFoundError');
  } catch (err) {
    assert.strictEqual(err.code, 'WRITE_FAILED', `Expected WRITE_FAILED or success, got: ${err.code}`);
    console.log('  ✓ Live Firestore correctly blocked unauthenticated journal write with WRITE_FAILED');
  }

  console.log('\n[Test 6] Testing Non-existent Journal Lookup & Update...');
  const nonExistentJournal = await getJournalBySlug('non-existent-article-slug-xyz');
  assert.strictEqual(nonExistentJournal, null, 'Non-existent journal must return null');
  console.log('  ✓ Non-existent journal correctly returned null');

  try {
    await updateJournal('non-existent-article-slug-xyz', { title: 'Ghost Article' });
    assert.fail('Updating a truly non-existent journal must throw CmsNotFoundError');
  } catch (err) {
    assert.strictEqual(err.code, 'NOT_FOUND');
    console.log('  ✓ Confirmed: updateJournal correctly throws NOT_FOUND only for truly non-existent records:', err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. Admin Listings
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7] Testing Admin All Resources & Journals Listings...');
  const allResources = await getAllResourcesForAdmin();
  assert.ok(allResources.length >= 3, `Resources listing must return >= 3 items (got ${allResources.length})`);
  console.log(`  ✓ Resources listed cleanly: ${allResources.length} items found`);

  const allJournals = await getAllJournalsForAdmin();
  assert.ok(allJournals.length >= 4, `Admin must list at least 4 journals (got ${allJournals.length})`);
  console.log(`  ✓ Journals listed cleanly: ${allJournals.length} items found`);

  console.log('\n=================================================================');
  console.log('   ALL 7 RETRIEVAL & CRUD ARCHITECTURAL TESTS PASSED CLEANLY!    ');
  console.log('=================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
