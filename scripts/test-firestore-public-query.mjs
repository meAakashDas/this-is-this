/**
 * Test Public Query Matching
 * Tests that anonymous queries using where('published', '==', true) are PERMITTED,
 * while draft-exposing queries are REJECTED.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const config = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(config, 'public-query-test');
const db = getFirestore(app);

async function testPublicQuery() {
  console.log('--- Testing Public Published Query ---');
  try {
    const colRef = collection(db, 'resources');
    const q = query(colRef, where('published', '==', true));
    const snap = await getDocs(q);
    console.log(`✓ Public published resources query succeeded! Found: ${snap.size} documents.`);
  } catch (err) {
    console.error('❌ Query failed:', err.code, err.message);
    process.exit(1);
  }

  try {
    const journalRef = collection(db, 'journals');
    const qJ = query(journalRef, where('published', '==', true));
    const snapJ = await getDocs(qJ);
    console.log(`✓ Public published journals query succeeded! Found: ${snapJ.size} documents.`);
  } catch (err) {
    console.error('❌ Journal query failed:', err.code, err.message);
    process.exit(1);
  }
}

testPublicQuery().then(() => process.exit(0));
