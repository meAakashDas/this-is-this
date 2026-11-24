/**
 * Live Firebase Connection Verification Script
 * Uses real public config from .env.local to test:
 * 1. Firebase App initialization
 * 2. Firebase Auth initialization & project ID confirmation
 * 3. Firestore connection test (read attempt on siteSettings)
 * 4. Firebase Storage bucket connectivity test
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, listAll } from 'firebase/storage';

console.log('=================================================================');
console.log('   VERIFYING LIVE FIREBASE CONNECTION (PROJECT: aakashdas-live)  ');
console.log('=================================================================');

const config = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
};

console.log('\n[1/4] Checking Config Values:');
console.log('  Project ID:      ', config.projectId);
console.log('  Auth Domain:     ', config.authDomain);
console.log('  Storage Bucket:  ', config.storageBucket);
console.log('  API Key prefix:  ', config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'MISSING');
console.log('  App ID prefix:   ', config.appId ? config.appId.substring(0, 15) + '...' : 'MISSING');

// 1. Initialize App
console.log('\n[2/4] Initializing Firebase App...');
const app = initializeApp(config);
console.log('✓ Firebase App initialized:', app.name, 'with project:', app.options.projectId);

// 2. Initialize Auth
console.log('\n[3/4] Initializing Firebase Auth...');
const auth = getAuth(app);
console.log('✓ Firebase Auth initialized. Current user:', auth.currentUser ? auth.currentUser.email : 'None (Anonymous/Signed Out)');

// 3. Test Firestore
console.log('\n[4/4] Testing Firestore & Storage connectivity...');
const db = getFirestore(app);
const storage = getStorage(app);

async function testConnections() {
  console.log('\n--- Testing Firestore reads ---');
  try {
    const siteSettingsRef = doc(db, 'siteSettings', 'general');
    const snap = await getDoc(siteSettingsRef);
    if (snap.exists()) {
      console.log('✓ Firestore read successful: document siteSettings/general exists!');
      console.log('  Title:', snap.data().websiteTitle || snap.data().title);
    } else {
      console.log('✓ Firestore connection established! (Document siteSettings/general does not exist yet)');
    }
  } catch (err) {
    console.log('ℹ Firestore read result:', err.code, '-', err.message);
  }

  // Check collections count or status
  try {
    const resourcesCol = collection(db, 'resources');
    const resourcesSnap = await getDocs(resourcesCol);
    console.log(`✓ Firestore resources collection accessible: found ${resourcesSnap.size} documents.`);
    resourcesSnap.forEach(d => {
      console.log(`  - Resource ID ${d.id}: ${d.data().title || '(No title)'}`);
    });
  } catch (err) {
    console.log('ℹ Firestore resources collection read result:', err.code, '-', err.message);
  }

  // Test Storage
  console.log('\n--- Testing Storage bucket ---');
  try {
    const rootRef = ref(storage, 'uploads');
    const result = await listAll(rootRef);
    console.log('✓ Storage bucket accessible:', config.storageBucket);
    console.log('  Subfolders in uploads:', result.prefixes.map(p => p.name));
    console.log('  Files in uploads root:', result.items.map(i => i.name));
  } catch (err) {
    console.log('ℹ Storage bucket access result:', err.code, '-', err.message);
  }
}

testConnections().then(() => {
  console.log('\n=================================================================');
  console.log('   INITIAL CONNECTIVITY CHECK COMPLETED                          ');
  console.log('=================================================================');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
