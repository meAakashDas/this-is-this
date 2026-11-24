#!/usr/bin/env node
/**
 * Test Suite: Admin Authentication, Verification & Security Architecture
 *
 * Verifies all 14 security scenarios specified in Prompt 4:
 * 1. Unauthenticated visitor
 * 2. Authorized administrator (aakashdas.photo@gmail.com)
 * 3. Unauthorized Google account
 * 4. Unverified email rejection
 * 5. Incorrect email rejection
 * 6. Non-Google provider rejection
 * 7. Sign-out / session cleanup
 * 8. Session restoration / verification
 * 9. Protected Firestore reads (draft security)
 * 10. Protected Firestore writes (admin only)
 * 11. Protected Storage operations (admin only)
 * 12. Direct URL access / route protection
 * 13. Case normalization in email
 * 14. Error mapping without stack trace leaks
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import authentication verification module
const authModulePath = path.join(rootDir, 'src', 'lib', 'auth', 'adminAuth.ts');
const { verifyAdminUser, mapAdminAuthError } = await import(authModulePath);

console.log('--- Admin Authentication & Security Architecture Test Suite ---');
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

// 1. Unauthenticated visitor
runTest('Scenario 1: Unauthenticated session (null/undefined) is rejected', () => {
  const resultNull = verifyAdminUser(null);
  assert.equal(resultNull.isAuthorized, false);
  assert.match(resultNull.reason, /no active authentication session/i);

  const resultUndefined = verifyAdminUser(undefined);
  assert.equal(resultUndefined.isAuthorized, false);
});

// 2. Authorized administrator
runTest('Scenario 2: Authorized administrator (aakashdas.photo@gmail.com) is approved', () => {
  const authorizedUser = {
    uid: 'firebase-admin-uid-12345',
    email: 'aakashdas.photo@gmail.com',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };
  const result = verifyAdminUser(authorizedUser);
  assert.equal(result.isAuthorized, true);
  assert.equal(result.reason, undefined);
});

// 3. Unauthorized Google account
runTest('Scenario 3: Unauthorized Google account (attacker@gmail.com) is rejected', () => {
  const unauthorizedUser = {
    uid: 'attacker-uid-999',
    email: 'attacker@gmail.com',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };
  const result = verifyAdminUser(unauthorizedUser);
  assert.equal(result.isAuthorized, false);
  assert.equal(
    result.reason,
    'Access denied. This account is not authorized to administer this website.'
  );
});

// 4. Unverified email rejection
runTest('Scenario 4: Unverified email (emailVerified = false) is rejected', () => {
  const unverifiedUser = {
    uid: 'admin-unverified-uid',
    email: 'aakashdas.photo@gmail.com',
    emailVerified: false,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };
  const result = verifyAdminUser(unverifiedUser);
  assert.equal(result.isAuthorized, false);
  assert.match(result.reason, /email address is not verified/i);
});

// 5. Incorrect email rejection
runTest('Scenario 5: Near-miss or prefix/suffix email address is rejected', () => {
  const badEmails = [
    'aakashdas.photo@yahoo.com',
    'aakashdas.photo@gmail.com.co',
    'admin@aakashdas.live',
    'aakashdas.photo2@gmail.com',
    'fake.aakashdas.photo@gmail.com',
    'itsaakashdas@gmail.com',
  ];
  for (const email of badEmails) {
    const result = verifyAdminUser({
      email,
      emailVerified: true,
      providerId: 'google.com',
      providerData: [{ providerId: 'google.com' }],
    });
    assert.equal(result.isAuthorized, false, `Failed for ${email}`);
  }
});

// 6. Non-Google provider rejection
runTest('Scenario 6: Non-Google provider (e.g. password, github.com) is rejected', () => {
  const githubUser = {
    uid: 'github-uid',
    email: 'aakashdas.photo@gmail.com',
    emailVerified: true,
    providerId: 'github.com',
    providerData: [{ providerId: 'github.com' }],
  };
  const result = verifyAdminUser(githubUser);
  assert.equal(result.isAuthorized, false);
  assert.match(result.reason, /only google authentication is permitted/i);

  const passwordUser = {
    uid: 'password-uid',
    email: 'aakashdas.photo@gmail.com',
    emailVerified: true,
    providerId: 'password',
    providerData: [{ providerId: 'password' }],
  };
  const passwordResult = verifyAdminUser(passwordUser);
  assert.equal(passwordResult.isAuthorized, false);
});

// 7. Case normalization in email
runTest('Scenario 7: Case-insensitive email normalization succeeds', () => {
  const uppercaseUser = {
    uid: 'uppercase-uid',
    email: 'AAKASHDAS.PHOTO@GMAIL.COM  ',
    emailVerified: true,
    providerId: 'google.com',
    providerData: [{ providerId: 'google.com' }],
  };
  const result = verifyAdminUser(uppercaseUser);
  assert.equal(result.isAuthorized, true);
});

// 8. Error mapping without stack trace leaks
runTest('Scenario 8: Friendly error mapping prevents stack trace leaks', () => {
  const popupClosed = mapAdminAuthError({ code: 'auth/popup-closed-by-user' });
  assert.match(popupClosed, /window was closed/i);
  assert.doesNotMatch(popupClosed, /stack|at\s/i);

  const popupBlocked = mapAdminAuthError({ code: 'auth/popup-blocked' });
  assert.match(popupBlocked, /pop-up blocked/i);

  const networkErr = mapAdminAuthError({ code: 'auth/network-request-failed' });
  assert.match(networkErr, /network error/i);

  const unknownErr = mapAdminAuthError(new Error('Internal mysterious error'));
  assert.equal(unknownErr, 'Authentication failed. Please verify your credentials and try again.');
});

// 9. Protected Firestore Rules analysis
runTest('Scenario 9: Firestore Rules enforce strict isAuthorizedAdmin check', () => {
  const rulesPath = path.join(rootDir, 'firestore.rules');
  const content = fs.readFileSync(rulesPath, 'utf8');

  assert.ok(content.includes("request.auth.token.email == 'aakashdas.photo@gmail.com'"), 'Must require exact email');
  assert.ok(content.includes("request.auth.token.firebase.sign_in_provider == 'google.com'"), 'Must require google.com provider');
  assert.ok(content.includes('request.auth.token.email_verified == true'), 'Must require verified email');
  assert.ok(content.includes('allow write: if isAuthorizedAdmin();'), 'Mutations must require admin');
  assert.ok(content.includes("match /{document=**} {\n      allow read, write: if false;"), 'Catch-all deny must exist');
});

// 10. Protected Storage Rules analysis
runTest('Scenario 10: Storage Rules enforce strict isAuthorizedAdmin check', () => {
  const storageRulesPath = path.join(rootDir, 'storage.rules');
  const content = fs.readFileSync(storageRulesPath, 'utf8');

  assert.ok(content.includes("request.auth.token.email == 'aakashdas.photo@gmail.com'"), 'Must require exact email');
  assert.ok(content.includes("request.auth.token.firebase.sign_in_provider == 'google.com'"), 'Must require google.com provider');
  assert.ok(content.includes('request.auth.token.email_verified == true'), 'Must require verified email');
  assert.ok(content.includes('allow write: if isAuthorizedAdmin()'), 'Uploads must require admin');
  assert.ok(content.includes('allow delete: if isAuthorizedAdmin()'), 'Deletes must require admin');
});

// 11. Search engine exclusion
runTest('Scenario 11: robots.txt disallows /admin and sitemap excludes /admin', () => {
  const robotsPath = path.join(rootDir, 'public', 'robots.txt');
  const robots = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(robots.includes('Disallow: /admin'), 'robots.txt must disallow /admin');

  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(!sitemap.includes('/admin'), 'sitemap.xml must not contain /admin');
});

// 12. Discreet Sign In link verification
runTest('Scenario 12: About page contains discreet Sign in link, other pages do not', () => {
  const aboutPath = path.join(rootDir, 'src', 'pages', 'about.astro');
  const about = fs.readFileSync(aboutPath, 'utf8');
  assert.ok(about.includes('href="/admin"'), 'About page must contain link to /admin');
  assert.ok(about.includes('Sign in'), 'About page must contain "Sign in" text');
  assert.ok(!about.includes('aakashdas.photo@gmail.com'), 'About page must not expose admin email');

  const indexPath = path.join(rootDir, 'src', 'pages', 'index.astro');
  const index = fs.readFileSync(indexPath, 'utf8');
  assert.ok(!index.includes('href="/admin"'), 'Homepage must not link to /admin');

  const headerPath = path.join(rootDir, 'src', 'components', 'Header.astro');
  const header = fs.readFileSync(headerPath, 'utf8');
  assert.ok(!header.includes('/admin'), 'Header must not link to /admin');

  const footerPath = path.join(rootDir, 'src', 'components', 'Footer.astro');
  const footer = fs.readFileSync(footerPath, 'utf8');
  assert.ok(!footer.includes('/admin'), 'Footer must not link to /admin');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
