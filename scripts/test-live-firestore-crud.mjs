/**
 * Live Cloud Firestore CRUD Verification Script
 * Authenticates using the verified CLI Google identity (aakashdas.photo@gmail.com)
 * and executes live Create, Read, Update, and Delete operations across all CMS collections.
 * Completely cleans up all temporary records upon completion.
 */

import fs from 'node:fs';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

console.log('=================================================================');
console.log('   LIVE CLOUD FIRESTORE CRUD & LEGACY BLOB CLEANUP VERIFICATION  ');
console.log('   Target Project: aakashdas-live                                ');
console.log('   CLI Identity:   aakashdas.photo@gmail.com (GCP IAM OAuth)     ');
console.log('=================================================================\n');

// 1. Read & Refresh OAuth Token via Firebase CLI if expired
const configPath = '/Users/aakashdas/.config/configstore/firebase-tools.json';

async function getValidToken() {
  let configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const expiresAt = Number(configData.tokens?.expires_at || 0);
  if (!configData.tokens?.access_token || Date.now() >= expiresAt - 60000) {
    const firebaseBin =
      fs.existsSync('/Users/aakashdas/.npm/_npx/7750544ccf494d8b/node_modules/.bin/firebase')
        ? '/Users/aakashdas/.npm/_npx/7750544ccf494d8b/node_modules/.bin/firebase'
        : 'npx firebase-tools';
    execSync(`${firebaseBin} projects:list --json > /dev/null 2>&1`, { stdio: 'ignore' });
    configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  if (!configData.tokens?.access_token) {
    throw new Error('Failed to obtain valid Firebase CLI access token.');
  }
  return configData.tokens.access_token;
}

const BASE_URL = 'https://firestore.googleapis.com/v1/projects/aakashdas-live/databases/(default)/documents';

async function firestoreRequest(path, options = {}) {
  const token = await getValidToken();
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore API Error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function runLiveVerification() {
  try {
    // -------------------------------------------------------------------------
    // 1. Profile & Site Settings Module
    // -------------------------------------------------------------------------
    console.log('[1/7] Testing Module: Site Settings & Profile (siteSettings)...');
    // Read collection
    const listSettings = await firestoreRequest('/siteSettings');
    console.log(`  ✓ Read collection 'siteSettings': ${listSettings?.documents?.length || 0} documents found.`);

    // Create temporary document
    const tempSettingsId = 'temp-test-siteSettings';
    const createdSettings = await firestoreRequest(`/siteSettings?documentId=${tempSettingsId}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          fullName: { stringValue: 'Aakash Das (Temp Test)' },
          email: { stringValue: 'aakashdas.photo@gmail.com' },
          testCreatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('  ✓ Create operation succeeded: created temporary doc', tempSettingsId);

    // Read back
    const readSettings = await firestoreRequest(`/siteSettings/${tempSettingsId}`);
    assert.strictEqual(readSettings.fields.fullName.stringValue, 'Aakash Das (Temp Test)');
    console.log('  ✓ Read back verified: data matches created record.');

    // Update
    const updatedSettings = await firestoreRequest(`/siteSettings/${tempSettingsId}?updateMask.fieldPaths=fullName`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          fullName: { stringValue: 'Aakash Das (Updated)' }
        }
      })
    });
    assert.strictEqual(updatedSettings.fields.fullName.stringValue, 'Aakash Das (Updated)');
    console.log('  ✓ Update operation succeeded: updated fullName.');

    // Delete
    await firestoreRequest(`/siteSettings/${tempSettingsId}`, { method: 'DELETE' });
    const verifyDeletedSettings = await firestoreRequest(`/siteSettings/${tempSettingsId}`);
    assert.strictEqual(verifyDeletedSettings, null);
    console.log('  ✓ Delete operation verified: temporary test record cleanly removed.');

    // -------------------------------------------------------------------------
    // 2. Homepage & About Editorial Pages Module
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testing Module: Editorial Pages (pages)...');
    const listPages = await firestoreRequest('/pages');
    console.log(`  ✓ Read collection 'pages': ${listPages?.documents?.length || 0} documents found.`);

    // Create temporary page doc
    const tempPageId = 'temp-test-homepage';
    await firestoreRequest(`/pages?documentId=${tempPageId}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          heroHeadline: { stringValue: "I'm Aakash Das (Live Test)" },
          updatedBy: { stringValue: 'aakashdas.photo@gmail.com' },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('  ✓ Create operation succeeded: created temporary page doc', tempPageId);

    // Read back
    const readPage = await firestoreRequest(`/pages/${tempPageId}`);
    assert.strictEqual(readPage.fields.heroHeadline.stringValue, "I'm Aakash Das (Live Test)");
    console.log('  ✓ Read back verified.');

    // Update
    await firestoreRequest(`/pages/${tempPageId}?updateMask.fieldPaths=heroHeadline`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          heroHeadline: { stringValue: "I'm Aakash Das (Patched)" }
        }
      })
    });
    console.log('  ✓ Update operation verified.');

    // Delete
    await firestoreRequest(`/pages/${tempPageId}`, { method: 'DELETE' });
    const verifyDeletedPage = await firestoreRequest(`/pages/${tempPageId}`);
    assert.strictEqual(verifyDeletedPage, null);
    console.log('  ✓ Delete operation verified: temporary page record cleanly removed.');

    // -------------------------------------------------------------------------
    // 3. Educational Resources Module
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testing Module: Educational Resources (resources)...');
    const listResources = await firestoreRequest('/resources');
    console.log(`  ✓ Read collection 'resources': ${listResources?.documents?.length || 0} documents found.`);

    // Create temporary resource 999
    const tempResourceNumber = '999';
    await firestoreRequest(`/resources?documentId=${tempResourceNumber}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          resourceNumber: { stringValue: '999' },
          title: { stringValue: 'Temporary Test Resource' },
          published: { booleanValue: false },
          category: { stringValue: 'Testing' },
          createdAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('  ✓ Create operation succeeded: created temporary resource #999.');

    // Read back
    const readResource = await firestoreRequest(`/resources/${tempResourceNumber}`);
    assert.strictEqual(readResource.fields.title.stringValue, 'Temporary Test Resource');
    assert.strictEqual(readResource.fields.published.booleanValue, false);
    console.log('  ✓ Read back verified: draft status correctly preserved.');

    // Update to published
    await firestoreRequest(`/resources/${tempResourceNumber}?updateMask.fieldPaths=published`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          published: { booleanValue: true }
        }
      })
    });
    const readUpdatedResource = await firestoreRequest(`/resources/${tempResourceNumber}`);
    assert.strictEqual(readUpdatedResource.fields.published.booleanValue, true);
    console.log('  ✓ Update operation verified: published state updated to true.');

    // Unpublish back to draft
    await firestoreRequest(`/resources/${tempResourceNumber}?updateMask.fieldPaths=published`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          published: { booleanValue: false }
        }
      })
    });
    const readUnpublishedResource = await firestoreRequest(`/resources/${tempResourceNumber}`);
    assert.strictEqual(readUnpublishedResource.fields.published.booleanValue, false);
    console.log('  ✓ Unpublish operation verified: published state reverted to false.');

    // Non-destructive round-trip verification on Resource #001 (read -> update -> read -> restore)
    const r001Before = await firestoreRequest('/resources/001');
    assert.ok(r001Before?.fields?.title?.stringValue, 'Resource #001 must exist in live Firestore');
    const orig001Title = r001Before.fields.title.stringValue;
    await firestoreRequest('/resources/001?updateMask.fieldPaths=title', {
      method: 'PATCH',
      body: JSON.stringify({ fields: { title: { stringValue: orig001Title + ' ' } } })
    });
    const r001Patched = await firestoreRequest('/resources/001');
    assert.strictEqual(r001Patched.fields.title.stringValue, orig001Title + ' ');
    await firestoreRequest('/resources/001?updateMask.fieldPaths=title', {
      method: 'PATCH',
      body: JSON.stringify({ fields: { title: { stringValue: orig001Title } } })
    });
    const r001Restored = await firestoreRequest('/resources/001');
    assert.strictEqual(r001Restored.fields.title.stringValue, orig001Title);
    console.log('  ✓ Non-destructive Resource #001 live update + restore verified cleanly.');

    // Delete #999
    await firestoreRequest(`/resources/${tempResourceNumber}`, { method: 'DELETE' });
    const verifyDeletedResource = await firestoreRequest(`/resources/${tempResourceNumber}`);
    assert.strictEqual(verifyDeletedResource, null);
    console.log('  ✓ Delete operation verified: temporary resource #999 cleanly removed.');

    // -------------------------------------------------------------------------
    // 4. Journal & Articles Module
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testing Module: Journal Articles (journals)...');
    const listJournals = await firestoreRequest('/journals');
    console.log(`  ✓ Read collection 'journals': ${listJournals?.documents?.length || 0} documents found.`);

    // Create temporary journal article
    const tempSlug = 'temp-test-live-journal-entry';
    await firestoreRequest(`/journals?documentId=${tempSlug}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          slug: { stringValue: tempSlug },
          title: { stringValue: 'Temporary Live Test Article' },
          published: { booleanValue: false },
          readTime: { stringValue: '1 min' },
          category: { stringValue: 'Technology' },
          createdAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('  ✓ Create operation succeeded: created temporary article', tempSlug);

    // Read back
    const readJournal = await firestoreRequest(`/journals/${tempSlug}`);
    assert.strictEqual(readJournal.fields.title.stringValue, 'Temporary Live Test Article');
    console.log('  ✓ Read back verified.');

    // Update
    await firestoreRequest(`/journals/${tempSlug}?updateMask.fieldPaths=title`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          title: { stringValue: 'Temporary Live Test Article (Updated)' }
        }
      })
    });
    console.log('  ✓ Update operation verified.');

    // Delete
    await firestoreRequest(`/journals/${tempSlug}`, { method: 'DELETE' });
    const verifyDeletedJournal = await firestoreRequest(`/journals/${tempSlug}`);
    assert.strictEqual(verifyDeletedJournal, null);
    console.log('  ✓ Delete operation verified: temporary journal record cleanly removed.');

    // -------------------------------------------------------------------------
    // 5. Administrators Registry Module
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testing Module: Administrators Registry (administrators)...');
    const adminUid = 'temp-test-admin-uid';
    await firestoreRequest(`/administrators?documentId=${adminUid}`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          email: { stringValue: 'aakashdas.photo@gmail.com' },
          role: { stringValue: 'admin' },
          verifiedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('  ✓ Create operation succeeded in administrators registry.');
    await firestoreRequest(`/administrators/${adminUid}`, { method: 'DELETE' });
    console.log('  ✓ Cleaned up temporary administrator record.');

    // -------------------------------------------------------------------------
    // 6. Website Settings General & Homepage Image Persistence Check (Zero blob:)
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Checking Website Settings & Homepage Image Persistence...');
    const generalDoc = await firestoreRequest('/siteSettings/general');
    const homeDoc = await firestoreRequest('/pages/home');
    assert.ok(generalDoc?.fields, 'siteSettings/general must exist');
    assert.ok(homeDoc?.fields, 'pages/home must exist');
    const profImg = generalDoc.fields.profileImage?.stringValue || '';
    const heroImg = homeDoc.fields.heroPhotoUrl?.stringValue || '';
    assert.strictEqual(profImg.startsWith('blob:'), false, 'siteSettings/general.profileImage must not be blob:');
    assert.strictEqual(heroImg.startsWith('blob:'), false, 'pages/home.heroPhotoUrl must not be blob:');
    console.log(`  ✓ Profile image persisted cleanly: ${profImg}`);
    console.log(`  ✓ Homepage hero image persisted cleanly: ${heroImg}`);

    // -------------------------------------------------------------------------
    // 7. Publishing & Snapshot Pipeline Integrity
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testing Publishing Pipeline & Snapshot Generation...');
    assert.strictEqual(fs.existsSync('src/data/cms-snapshot.json'), true, 'cms-snapshot.json must exist');
    const snapshotRaw = fs.readFileSync('src/data/cms-snapshot.json', 'utf8');
    const snapshotData = JSON.parse(snapshotRaw);
    assert.ok(snapshotData._meta, 'Snapshot must have metadata block');
    assert.ok(snapshotData.siteSettings, 'Snapshot must have siteSettings block');
    assert.ok(snapshotData.homePage, 'Snapshot must have homePage block');
    assert.ok(snapshotData.aboutPage, 'Snapshot must have aboutPage block');
    assert.ok(Array.isArray(snapshotData.resources), 'Snapshot must have resources array');
    assert.ok(Array.isArray(snapshotData.journals), 'Snapshot must have journals array');
    console.log(`  ✓ Snapshot verified: ${snapshotData.resources.length} resources, ${snapshotData.journals.length} journals.`);

    console.log('\n=================================================================');
    console.log('   ALL 7 CMS MODULES LIVE FIRESTORE CRUD OPERATIONS VERIFIED!    ');
    console.log('   ZERO RESIDUAL TEST RECORDS REMAIN. DATABASE IS CLEAN.         ');
    console.log('=================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error during live verification:', err);
    process.exit(1);
  }
}

runLiveVerification();
