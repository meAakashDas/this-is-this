#!/usr/bin/env node
/**
 * Test Suite: Complete Firebase Integration & Exclusive Admin Google Login
 *
 * Scenarios tested:
 * Scenario A: Authorized Administrator (aakashdas.photo@gmail.com)
 * Scenario B: Unauthorized Google Account (rejection & eviction)
 * Scenario C: Production Domain & Session Persistence
 * Scenario D: Security & Rules Verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import authentication engine and constants
const {
  verifyAdminUser,
  mapAdminAuthError,
  toAdminUser,
} = await import('../src/lib/auth/adminAuth.ts');
const {
  AUTHORIZED_ADMIN_EMAIL,
  DEV_PREVIEW_ADMIN_USER,
} = await import('../src/lib/auth/types.ts');
const {
  isFirebaseConfigured,
  getMissingFirebaseEnvVars,
  REQUIRED_FIREBASE_ENV_VARS,
} = await import('../src/lib/firebase/config.ts');

let totalTests = 0;
let passedTests = 0;

function runTest(title, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✓ ${title}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${title}`);
    console.error(err);
  }
}

console.log('=================================================================');
console.log('   EXCLUSIVE ADMIN GOOGLE LOGIN & FIREBASE INTEGRATION TEST SUITE');
console.log('=================================================================\n');

// -----------------------------------------------------------------
// SCENARIO A: Authorized Administrator (aakashdas.photo@gmail.com)
// -----------------------------------------------------------------
console.log('--- SCENARIO A: Authorized Administrator ---');

runTest('A.1: AUTHORIZED_ADMIN_EMAIL constant is strictly aakashdas.photo@gmail.com', () => {
  assert.equal(AUTHORIZED_ADMIN_EMAIL, 'aakashdas.photo@gmail.com');
});

runTest('A.2: Authentic Google account with aakashdas.photo@gmail.com is approved', () => {
  const authorizedGoogleUser = {
    uid: 'firebase-admin-uid-photo-1',
    email: 'aakashdas.photo@gmail.com',
    displayName: 'Aakash Das',
    photoURL: 'https://lh3.googleusercontent.com/a/photo.jpg',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };

  const result = verifyAdminUser(authorizedGoogleUser);
  assert.equal(result.isAuthorized, true, 'Must authorize valid admin account');
  assert.equal(result.reason, undefined);

  const adminUser = toAdminUser(authorizedGoogleUser);
  assert.equal(adminUser.email, 'aakashdas.photo@gmail.com');
  assert.equal(adminUser.emailVerified, true);
  assert.equal(adminUser.providerId, 'google.com');
});

runTest('A.3: Case-normalized variation (AAKASHDAS.PHOTO@GMAIL.COM) is approved', () => {
  const upperCaseUser = {
    uid: 'firebase-admin-uid-upper',
    email: '  AAKASHDAS.PHOTO@GMAIL.COM  ',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };

  const result = verifyAdminUser(upperCaseUser);
  assert.equal(result.isAuthorized, true);
});

runTest('A.4: Dev preview default administrator matches aakashdas.photo@gmail.com', () => {
  assert.equal(DEV_PREVIEW_ADMIN_USER.email, 'aakashdas.photo@gmail.com');
  assert.equal(DEV_PREVIEW_ADMIN_USER.providerId, 'google.com');
  assert.equal(DEV_PREVIEW_ADMIN_USER.emailVerified, true);
});

// -----------------------------------------------------------------
// SCENARIO B: Unauthorized Google Account Rejection
// -----------------------------------------------------------------
console.log('\n--- SCENARIO B: Unauthorized Google Accounts & Attackers ---');

runTest('B.1: Previous admin email (itsaakashdas@gmail.com) is now strictly rejected', () => {
  const previousUser = {
    uid: 'old-admin-uid',
    email: 'itsaakashdas@gmail.com',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };

  const result = verifyAdminUser(previousUser);
  assert.equal(result.isAuthorized, false);
  assert.match(result.reason, /not authorized to administer this website/i);
});

runTest('B.2: Arbitrary third-party Google accounts are rejected', () => {
  const attackers = [
    'hacker@gmail.com',
    'attacker.aakashdas@gmail.com',
    'aakashdas.photo@yahoo.com',
    'aakashdas.photo@gmail.com.co',
    'aakashdas.photo@outlook.com',
    'admin@aakashdas.live',
    'aakashdas@gmail.com',
  ];

  for (const email of attackers) {
    const result = verifyAdminUser({
      email,
      emailVerified: true,
      providerId: 'google.com',
      providerData: [{ providerId: 'google.com' }],
    });
    assert.equal(result.isAuthorized, false, `Failed to reject ${email}`);
    assert.match(result.reason, /not authorized to administer this website/i);
  }
});

runTest('B.3: Unverified email address is rejected even if email matches', () => {
  const unverified = {
    uid: 'unverified-uid',
    email: 'aakashdas.photo@gmail.com',
    emailVerified: false,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };

  const result = verifyAdminUser(unverified);
  assert.equal(result.isAuthorized, false);
  assert.match(result.reason, /email address is not verified/i);
});

runTest('B.4: Non-Google provider sign-ins are rejected even if email matches', () => {
  const nonGoogleProviders = ['password', 'github.com', 'facebook.com', 'twitter.com', 'apple.com'];

  for (const provider of nonGoogleProviders) {
    const result = verifyAdminUser({
      email: 'aakashdas.photo@gmail.com',
      emailVerified: true,
      providerId: provider,
      providerData: [{ providerId: provider }],
    });
    assert.equal(result.isAuthorized, false, `Failed to reject non-Google provider ${provider}`);
    assert.match(result.reason, /only google authentication is permitted/i);
  }
});

runTest('B.5: Missing user or null session is safely rejected without crash', () => {
  assert.equal(verifyAdminUser(null).isAuthorized, false);
  assert.equal(verifyAdminUser(undefined).isAuthorized, false);
  assert.equal(verifyAdminUser({ email: null }).isAuthorized, false);
  assert.equal(verifyAdminUser({ email: '' }).isAuthorized, false);
});

// -----------------------------------------------------------------
// SCENARIO C: Production Configuration & Session Persistence
// -----------------------------------------------------------------
console.log('\n--- SCENARIO C: Production Domain & Firebase Config ---');

runTest('C.1: REQUIRED_FIREBASE_ENV_VARS defines 5 client keys', () => {
  assert.deepEqual([...REQUIRED_FIREBASE_ENV_VARS], [
    'PUBLIC_FIREBASE_API_KEY',
    'PUBLIC_FIREBASE_AUTH_DOMAIN',
    'PUBLIC_FIREBASE_PROJECT_ID',
    'PUBLIC_FIREBASE_STORAGE_BUCKET',
    'PUBLIC_FIREBASE_APP_ID',
  ]);
});

runTest('C.2: Missing environment variables are gracefully detected', () => {
  const missing = getMissingFirebaseEnvVars();
  assert.ok(Array.isArray(missing));
});

runTest('C.3: Error mapper prevents stack trace leakage', () => {
  const mapped = mapAdminAuthError(new Error('Firebase: permission denied (auth/network-request-failed)'));
  assert.ok(!mapped.includes('at '), 'Must not include stack traces');
});

runTest('C.4: Production domain is configured in public/CNAME and _redirects', () => {
  const cname = fs.readFileSync(path.join(rootDir, 'public', 'CNAME'), 'utf8').trim();
  assert.equal(cname, 'aakashdas.live');

  const redirects = fs.readFileSync(path.join(rootDir, 'public', '_redirects'), 'utf8');
  assert.ok(redirects.includes('https://aakashdas.live/:splat 301!'));
});

// -----------------------------------------------------------------
// SCENARIO D: Security & Rules Verification
// -----------------------------------------------------------------
console.log('\n--- SCENARIO D: Security Rules & Authorization Architecture ---');

runTest('D.1: firestore.rules strictly requires aakashdas.photo@gmail.com and google.com', () => {
  const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
  assert.ok(rules.includes("request.auth.token.email == 'aakashdas.photo@gmail.com'"), 'firestore.rules must target exact admin email');
  assert.ok(rules.includes("request.auth.token.firebase.sign_in_provider == 'google.com'"), 'firestore.rules must enforce google.com');
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'firestore.rules must enforce verified email');
  assert.ok(!rules.includes("'itsaakashdas@gmail.com'"), 'firestore.rules must NOT contain old email');
});

runTest('D.2: firestore.rules protects unpublished drafts from anonymous access', () => {
  const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
  assert.ok(rules.includes('allow read: if isPublished() || isAuthorizedAdmin();'));
  assert.ok(rules.includes('allow create, update, delete: if isAuthorizedAdmin();'));
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;'));
});

runTest('D.3: storage.rules strictly requires aakashdas.photo@gmail.com and valid file types', () => {
  const rules = fs.readFileSync(path.join(rootDir, 'storage.rules'), 'utf8');
  assert.ok(rules.includes("request.auth.token.email == 'aakashdas.photo@gmail.com'"), 'storage.rules must target exact admin email');
  assert.ok(rules.includes("request.auth.token.firebase.sign_in_provider == 'google.com'"), 'storage.rules must enforce google.com');
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'storage.rules must enforce verified email');
  assert.ok(!rules.includes("'itsaakashdas@gmail.com'"), 'storage.rules must NOT contain old email');
  assert.ok(rules.includes('isValidImage()'));
  assert.ok(rules.includes('isValidDocument()'));
});

runTest('D.4: CMS repositories default to aakashdas.photo@gmail.com for admin operations', () => {
  const resRepo = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'cms', 'resources.repository.ts'), 'utf8');
  assert.ok(resRepo.includes("adminEmail: string = 'aakashdas.photo@gmail.com'"));

  const pageRepo = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'cms', 'pages.repository.ts'), 'utf8');
  assert.ok(pageRepo.includes("adminEmail: string = 'aakashdas.photo@gmail.com'"));

  const journalRepo = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'cms', 'journals.repository.ts'), 'utf8');
  assert.ok(journalRepo.includes("adminEmail: string = 'aakashdas.photo@gmail.com'"));

  const settingsRepo = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'cms', 'siteSettings.repository.ts'), 'utf8');
  assert.ok(settingsRepo.includes("adminEmail: string = 'aakashdas.photo@gmail.com'"));
});

console.log('\n=================================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('=================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
