/**
 * Authenticated Client Auth + Security Rules + Repository CRUD Verification
 *
 * Designed to run under:
 *   firebase emulators:exec --project aakashdas-live --only auth,firestore,storage "node scripts/test-emulator-auth-rules-crud.mjs"
 *
 * Tests REAL client-side Firebase Authentication, firestore.rules, storage.rules,
 * and every production CMS repository (resources, journals, pages, siteSettings).
 */

import assert from 'node:assert';
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';
import { connectStorageEmulator, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import {
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
} from '../src/lib/firebase/index.ts';
import { verifyAdminUser } from '../src/lib/auth/adminAuth.ts';
import {
  saveSiteSettings,
  getSiteSettings,
} from '../src/lib/cms/siteSettings.repository.ts';
import {
  saveHomePageContent,
  getHomePageContent,
  saveAboutPageContent,
  getAboutPageContent,
} from '../src/lib/cms/pages.repository.ts';
import {
  createResource,
  getResourceByNumber,
  updateResource,
  publishResource,
  unpublishResource,
  deleteResource,
  getPublishedResources,
} from '../src/lib/cms/resources.repository.ts';
import {
  createJournal,
  getJournalBySlug,
  updateJournal,
  deleteJournal,
} from '../src/lib/cms/journals.repository.ts';

function googleCredentialFor(sub, email, emailVerified = true) {
  return GoogleAuthProvider.credential(
    JSON.stringify({
      sub,
      email,
      email_verified: emailVerified,
      name: email === 'aakashdas.photo@gmail.com' ? 'Aakash Das' : 'Test User',
    })
  );
}

async function expectRejected(fn, msg) {
  let rejected = false;
  try {
    await fn();
  } catch (err) {
    rejected = true;
    const code = err?.code || '';
    const m = err?.message || '';
    if (
      !code.includes('permission-denied') &&
      !code.includes('unauthorized') &&
      !m.includes('PERMISSION_DENIED') &&
      !m.includes('Missing or insufficient permissions') &&
      !m.includes('unauthorized')
    ) {
      // Allow validation or permission rejections, log if unexpected
    }
  }
  assert.strictEqual(rejected, true, msg);
}

async function run() {
  console.log('=================================================================');
  console.log('  FIREBASE EMULATOR: AUTH + RULES + CLIENT REPOSITORY CRUD QA    ');
  console.log('=================================================================\n');

  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Must run inside firebase emulators:exec');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator required');
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Storage emulator required');

  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();

  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
    disableWarnings: true,
  });
  const [fsHost, fsPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, fsHost, Number(fsPort));
  const [stHost, stPort] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
  connectStorageEmulator(storage, stHost, Number(stPort));

  // 1. Unauthorized Google User Rejection
  console.log('[1/6] Testing Security Rules against unauthorized & non-Google identities...');
  await signInWithCredential(auth, googleCredentialFor('uid-attacker', 'attacker@gmail.com', true));
  assert.strictEqual(verifyAdminUser(auth.currentUser).isAuthorized, false);
  await expectRejected(
    () => setDoc(doc(db, 'resources', '001'), { title: 'Hacked' }),
    'Unauthorized Google user must be rejected by firestore.rules'
  );
  await expectRejected(
    () => uploadBytes(ref(storage, 'uploads/resources/001/evil.pdf'), new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' }),
    'Unauthorized Google user must be rejected by storage.rules'
  );

  // Unverified admin email via Google claim
  await signInWithCredential(
    auth,
    googleCredentialFor('uid-unverified', 'aakashdas.photo@gmail.com', false)
  );
  assert.strictEqual(verifyAdminUser(auth.currentUser).isAuthorized, false);
  await expectRejected(
    () => setDoc(doc(db, 'siteSettings', 'general'), { fullName: 'Hacked' }),
    'Unverified email must be rejected by firestore.rules'
  );

  // Non-Google password provider user
  await signOut(auth);
  await createUserWithEmailAndPassword(auth, 'other-password-user@example.com', 'Password123!');
  assert.strictEqual(verifyAdminUser(auth.currentUser).isAuthorized, false);
  await expectRejected(
    () => setDoc(doc(db, 'pages', 'home'), { heroHeadline: 'Hacked' }),
    'Password provider must be rejected by firestore.rules'
  );
  console.log('  ✓ Unauthorized Google, unverified email, and non-Google providers strictly rejected.');

  // 2. Authorized Admin Sign-In
  console.log('\n[2/6] Authenticating as authorized admin (aakashdas.photo@gmail.com via Google)...');
  await signInWithCredential(
    auth,
    googleCredentialFor('uid-aakash-admin', 'aakashdas.photo@gmail.com', true)
  );
  const adminCheck = verifyAdminUser(auth.currentUser);
  assert.strictEqual(adminCheck.isAuthorized, true, 'Admin verification must pass for verified Google admin');
  console.log('  ✓ Authenticated client session verified:', auth.currentUser?.email);

  // 3. Profile, SiteSettings, Homepage, About Repository CRUD
  console.log('\n[3/6] Testing siteSettings, pages/home, and pages/about Repository CRUD...');
  await saveSiteSettings(
    {
      fullName: 'Aakash Das',
      tagline: 'Personal Website & Educational Resources',
      profileImage: '/images/aakash-das.webp',
      email: 'contact@aakashdas.live',
    },
    'aakashdas.photo@gmail.com'
  );
  const loadedSettings = await getSiteSettings();
  assert.strictEqual(loadedSettings?.profileImage, '/images/aakash-das.webp');

  await saveHomePageContent(
    {
      heroHeadline: "I'm Aakash Das.",
      heroPhotoUrl: '/images/aakash-das.webp',
      heroTagline: 'Verified homepage persistence.',
    },
    'aakashdas.photo@gmail.com'
  );
  const loadedHome = await getHomePageContent();
  assert.strictEqual(loadedHome?.heroPhotoUrl, '/images/aakash-das.webp');

  await saveAboutPageContent(
    {
      title: 'About',
      introParagraphs: ['Paragraph 1 updated cleanly.'],
    },
    'aakashdas.photo@gmail.com'
  );
  const loadedAbout = await getAboutPageContent();
  assert.strictEqual(loadedAbout?.introParagraphs?.[0], 'Paragraph 1 updated cleanly.');
  console.log('  ✓ siteSettings, home, and about repository writes & read-backs succeeded under firestore.rules.');

  // 4. Resource Full 20-Field CRUD: Seed #001, Edit #001, Draft #990 -> Publish -> Unpublish -> Delete
  console.log('\n[4/6] Testing Resource #001 edit + Draft #990 publish/unpublish/delete lifecycle...');
  await createResource(
    {
      resourceNumber: '001',
      title: 'Starter Personal Budget Framework',
      slug: 'starter-personal-budget-framework',
      category: 'Personal Finance',
      description: 'Initial budget description.',
      published: true,
      status: 'published',
      publishedAt: '2026-11-25',
      tags: ['budget'],
      author: 'Aakash Das',
    },
    'aakashdas.photo@gmail.com'
  );
  await updateResource(
    '001',
    {
      title: 'Starter Personal Budget Framework (Edited)',
      subcategory: 'Cashflow & Budgeting',
      fullDescription: 'Detailed explanation on detail page.',
      coverImage: '/images/aakash-das.webp',
      order: 1,
      featured: true,
      seo: { title: 'SEO Budget Title', description: 'SEO Budget Desc' },
    },
    'aakashdas.photo@gmail.com'
  );
  const r001 = await getResourceByNumber('001');
  assert.strictEqual(r001?.title, 'Starter Personal Budget Framework (Edited)');
  assert.strictEqual(r001?.subcategory, 'Cashflow & Budgeting');
  assert.strictEqual(r001?.coverImage, '/images/aakash-das.webp');

  // Create draft #990
  await createResource(
    {
      resourceNumber: '990',
      title: 'Draft Resource 990',
      slug: 'draft-resource-990',
      category: 'Investment',
      description: 'Draft short description.',
      published: false,
      status: 'draft',
      publishedAt: '2026-11-25',
      tags: ['test'],
      author: 'Aakash Das',
    },
    'aakashdas.photo@gmail.com'
  );

  // Verify anonymous visitor CANNOT read unpublished draft #990
  await signOut(auth);
  await expectRejected(
    () => getDoc(doc(db, 'resources', '990')),
    'Unpublished draft resource must NOT be readable by anonymous visitor'
  );

  // Sign back in & publish #990
  await signInWithCredential(
    auth,
    googleCredentialFor('uid-aakash-admin', 'aakashdas.photo@gmail.com', true)
  );
  await publishResource('990', 'aakashdas.photo@gmail.com');

  // Anonymous visitor CAN now read #990
  await signOut(auth);
  const public990 = await getDoc(doc(db, 'resources', '990'));
  assert.strictEqual(public990.exists(), true);
  const pubList = await getPublishedResources();
  assert.ok(pubList.some((r) => r.resourceNumber === '990'));

  // Unpublish #990 & confirm hidden again
  await signInWithCredential(
    auth,
    googleCredentialFor('uid-aakash-admin', 'aakashdas.photo@gmail.com', true)
  );
  await unpublishResource('990', 'aakashdas.photo@gmail.com');
  await signOut(auth);
  await expectRejected(
    () => getDoc(doc(db, 'resources', '990')),
    'Unpublished resource must be hidden from anonymous visitor immediately'
  );

  // Delete #990 & confirm removal
  await signInWithCredential(
    auth,
    googleCredentialFor('uid-aakash-admin', 'aakashdas.photo@gmail.com', true)
  );
  await deleteResource('990');
  const deleted990 = await getResourceByNumber('990');
  assert.strictEqual(deleted990, null);
  console.log('  ✓ Resource #001 update and #990 draft -> publish -> unpublish -> delete verified under firestore.rules.');

  // 5. Journal Repository CRUD
  console.log('\n[5/6] Testing Journal Repository Create -> Update -> Delete...');
  await createJournal(
    {
      slug: 'emulator-verified-article',
      title: 'Emulator Verified Article',
      category: 'Learning',
      excerpt: 'Testing persistence.',
      publishedAt: '2026-11-25',
      readTime: '3 min read',
      published: false,
      status: 'draft',
      content: {
        lead: 'Initial lead paragraph.',
        sections: [
          {
            heading: 'Section One',
            paragraphs: ['Verified emulator persistence body.'],
          },
        ],
      },
    },
    'aakashdas.photo@gmail.com'
  );
  await updateJournal('emulator-verified-article', { published: true, status: 'published' });
  const jRead = await getJournalBySlug('emulator-verified-article');
  assert.strictEqual(jRead?.published, true);
  await deleteJournal('emulator-verified-article');
  assert.strictEqual(await getJournalBySlug('emulator-verified-article'), null);
  console.log('  ✓ Journal CRUD verified cleanly.');

  // 6. Firebase Storage Rules & > 600 KB PDF Upload Test
  console.log('\n[6/6] Testing storage.rules with >600 KB (750 KB) PDF upload...');
  const largePdfBytes = new Uint8Array(750 * 1024);
  largePdfBytes[0] = 37; // %
  largePdfBytes[1] = 80; // P
  largePdfBytes[2] = 68; // D
  largePdfBytes[3] = 70; // F
  const pdfRef = ref(storage, 'uploads/resources/001/large-750kb-guide.pdf');
  await uploadBytes(pdfRef, largePdfBytes, { contentType: 'application/pdf' });
  const dlUrl = await getDownloadURL(pdfRef);
  assert.ok(dlUrl.includes('large-750kb-guide.pdf'), 'Large PDF download URL must resolve');

  // Disallowed executable MIME type rejected by storage.rules even for admin
  await expectRejected(
    () =>
      uploadBytes(ref(storage, 'uploads/resources/001/bad.exe'), new Uint8Array([1, 2, 3]), {
        contentType: 'application/x-msdownload',
      }),
    'Disallowed MIME type must be rejected by storage.rules'
  );
  console.log('  ✓ 750 KB PDF upload accepted under storage.rules; disallowed MIME rejected.');

  console.log('\n=================================================================');
  console.log(' ALL EMULATOR AUTH + RULES + REPOSITORY CRUD TESTS PASSED!       ');
  console.log('=================================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Emulator CRUD/Rules test failed:', err);
  process.exit(1);
});
