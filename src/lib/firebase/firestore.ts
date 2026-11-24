import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseApp, tryGetFirebaseApp } from './app.ts';

let cachedFirestore: Firestore | null = null;

/**
 * Returns the singleton Cloud Firestore instance.
 * Throws if Firebase is not configured.
 */
export function getFirebaseFirestore(): Firestore {
  if (cachedFirestore) {
    return cachedFirestore;
  }
  const app = getFirebaseApp();
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

/**
 * Safely returns the Cloud Firestore instance if configured, or null otherwise.
 */
export function tryGetFirebaseFirestore(): Firestore | null {
  if (cachedFirestore) {
    return cachedFirestore;
  }
  const app = tryGetFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    cachedFirestore = getFirestore(app);
    return cachedFirestore;
  } catch (error) {
    console.warn('[Cloud Firestore] Failed to initialize Firestore instance:', error);
    return null;
  }
}
