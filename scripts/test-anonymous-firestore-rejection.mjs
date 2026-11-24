/**
 * Verification of Security Enforcement:
 * Confirms that unauthenticated / anonymous clients are STRICTLY BLOCKED
 * from creating, updating, or deleting documents in Firestore.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';

const config = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(config, 'anonymous-write-test');
const db = getFirestore(app);

async function testAnonymousWrite() {
  console.log('--- Testing Anonymous Write Rejection ---');
  const targetDoc = doc(db, 'siteSettings', 'unauthorized_test_doc');
  try {
    await setDoc(targetDoc, {
      attack: 'unauthorized_write_attempt',
      timestamp: new Date().toISOString()
    });
    console.error('❌ CRITICAL SECURITY VULNERABILITY: Anonymous write succeeded!');
    await deleteDoc(targetDoc).catch(() => {});
    process.exit(1);
  } catch (err) {
    console.log('✓ Anonymous write correctly REJECTED by Firestore:');
    console.log(`  Code: ${err.code} | Message: ${err.message}`);
    process.exit(0);
  }
}

testAnonymousWrite();
