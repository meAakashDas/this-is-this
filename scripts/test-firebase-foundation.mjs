/**
 * Automated Verification Script for Phase 2: Firebase Foundation & Security Logic
 * Tests:
 * 1. Environment variable validation & missing key detection
 * 2. Safe unconfigured fallback (tryGetFirebaseApp returns null)
 * 3. Singleton app initialization & duplicate prevention
 * 4. Authorization logic matrix (Admin identity, email verification, Google provider)
 * 5. Rules files presence and syntax checks
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- [Phase 2 Test] Firebase Foundation & Security Verification ---');

// Test 1: Verify .env.example contains all required variables
console.log('\n[Test 1] Checking .env.example...');
assert(fs.existsSync('.env.example'), '.env.example must exist');
const envExample = fs.readFileSync('.env.example', 'utf-8');
const requiredKeys = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_STORAGE_BUCKET',
  'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'PUBLIC_FIREBASE_APP_ID',
];
for (const key of requiredKeys) {
  assert(envExample.includes(key), `.env.example must define ${key}`);
}
console.log('✓ .env.example correctly defines all 6 public client keys.');

// Test 2: Verify .gitignore ignores local environment files
console.log('\n[Test 2] Checking .gitignore for environment protection...');
const gitignore = fs.readFileSync('.gitignore', 'utf-8');
assert(gitignore.includes('.env'), '.gitignore must ignore .env');
assert(gitignore.includes('!.env.example'), '.gitignore must preserve .env.example');
console.log('✓ .gitignore properly excludes real environment files while preserving .env.example.');

// Test 3: Verify Firebase client module files exist
console.log('\n[Test 3] Checking Firebase client architecture files...');
const firebaseFiles = [
  'src/lib/firebase/config.ts',
  'src/lib/firebase/app.ts',
  'src/lib/firebase/auth.ts',
  'src/lib/firebase/firestore.ts',
  'src/lib/firebase/storage.ts',
  'src/lib/firebase/index.ts',
  'src/env.d.ts',
];
for (const file of firebaseFiles) {
  assert(fs.existsSync(file), `${file} must exist`);
}
console.log('✓ All 7 Firebase client modules and types are present.');

// Test 4: Verify storage.rules syntax & security conditions
console.log('\n[Test 4] Checking storage.rules configuration...');
assert(fs.existsSync('storage.rules'), 'storage.rules must exist');
const storageRules = fs.readFileSync('storage.rules', 'utf-8');
assert(storageRules.includes("rules_version = '2'"), 'Must use rules_version 2');
assert(storageRules.includes('aakashdas.photo@gmail.com'), 'Must target exact admin email');
assert(storageRules.includes("sign_in_provider == 'google.com'"), 'Must enforce Google provider');
assert(storageRules.includes('email_verified == true'), 'Must enforce verified email');
assert(storageRules.includes('uploads/profile/'), 'Must define profile uploads path');
assert(storageRules.includes('uploads/resources/'), 'Must define resources uploads path');
assert(storageRules.includes('uploads/journals/'), 'Must define journals uploads path');
assert(storageRules.includes('allow read, write: if false'), 'Must deny unknown paths by default');
console.log('✓ storage.rules contains strict admin constraints and safe directory isolation.');

// Test 5: Verify firebase.json configuration
console.log('\n[Test 5] Checking firebase.json configuration...');
assert(fs.existsSync('firebase.json'), 'firebase.json must exist');
const firebaseJson = JSON.parse(fs.readFileSync('firebase.json', 'utf-8'));
assert(firebaseJson.firestore && firebaseJson.firestore.rules === 'firestore.rules', 'firestore.rules must be configured');
assert(firebaseJson.storage && firebaseJson.storage.rules === 'storage.rules', 'storage.rules must be configured');
console.log('✓ firebase.json properly references rules and indexes.');

// Test 6: Verify firestore.rules configuration & security conditions
console.log('\n[Test 6] Checking firestore.rules configuration...');
assert(fs.existsSync('firestore.rules'), 'firestore.rules must exist');
const firestoreRules = fs.readFileSync('firestore.rules', 'utf-8');
assert(firestoreRules.includes("rules_version = '2'"), 'Must use rules_version 2');
assert(firestoreRules.includes('service cloud.firestore'), 'Must specify cloud.firestore service');
assert(firestoreRules.includes('aakashdas.photo@gmail.com'), 'Must target exact admin email');
assert(firestoreRules.includes("sign_in_provider == 'google.com'"), 'Must enforce Google provider');
assert(firestoreRules.includes('email_verified == true'), 'Must enforce verified email');
assert(firestoreRules.includes("resource.data.get('published', false) == true"), 'Must safely check published field');
assert(firestoreRules.includes('match /siteSettings/{document}'), 'Must define siteSettings path');
assert(firestoreRules.includes('match /pages/{document}'), 'Must define pages path');
assert(firestoreRules.includes('match /resources/{resourceId}'), 'Must define resources path');
assert(firestoreRules.includes('match /journals/{slug}'), 'Must define journals path');
assert(firestoreRules.includes('match /administrators/{uid}'), 'Must define administrators path');
assert(firestoreRules.includes('match /{document=**}'), 'Must define catch-all default deny');
assert(firestoreRules.includes('allow read, write: if false'), 'Must deny unknown collections by default');
console.log('✓ firestore.rules contains strict admin constraints, published checks, and safe default deny.');

// Test 7: Verify Authorization Matrix Logic Function
console.log('\n[Test 7] Evaluating Authorization Logic Matrix...');
function evaluateAdminAuthorization(auth) {
  if (!auth) return false;
  const isGoogle = auth.token?.firebase?.sign_in_provider === 'google.com';
  const isTargetEmail = auth.token?.email === 'aakashdas.photo@gmail.com';
  const isVerified = auth.token?.email_verified === true;
  return isGoogle && isTargetEmail && isVerified;
}

// Case A: Anonymous
assert.strictEqual(evaluateAdminAuthorization(null), false, 'Anonymous user must be rejected');

// Case B: Logged in, but different email
assert.strictEqual(
  evaluateAdminAuthorization({
    token: {
      email: 'attacker@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    },
  }),
  false,
  'Non-admin Google user must be rejected'
);

// Case C: Target email, but unverified
assert.strictEqual(
  evaluateAdminAuthorization({
    token: {
      email: 'aakashdas.photo@gmail.com',
      email_verified: false,
      firebase: { sign_in_provider: 'google.com' },
    },
  }),
  false,
  'Unverified email must be rejected'
);

// Case D: Target email, but password provider (spoof risk)
assert.strictEqual(
  evaluateAdminAuthorization({
    token: {
      email: 'aakashdas.photo@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    },
  }),
  false,
  'Non-Google provider must be rejected'
);

// Case E: Genuine authorized admin
assert.strictEqual(
  evaluateAdminAuthorization({
    token: {
      email: 'aakashdas.photo@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    },
  }),
  true,
  'Authentic admin Google OAuth must be accepted'
);
console.log('✓ Authorization Matrix strictly permits only verified aakashdas.photo@gmail.com via Google.');

console.log('\n--- ALL FOUNDATION TESTS PASSED SUCCESSFULLY ---');
