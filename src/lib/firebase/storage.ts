import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseApp, tryGetFirebaseApp } from './app.ts';

let cachedStorage: FirebaseStorage | null = null;

/**
 * Returns the singleton Firebase Storage instance.
 * Throws if Firebase is not configured.
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) {
    return cachedStorage;
  }
  const app = getFirebaseApp();
  cachedStorage = getStorage(app);
  // Prevent Firebase Storage SDK from retrying for 10 minutes when Spark storage is unprovisioned
  cachedStorage.maxUploadRetryTime = 3500;
  cachedStorage.maxOperationRetryTime = 3500;
  return cachedStorage;
}

/**
 * Safely returns the Firebase Storage instance if configured, or null otherwise.
 */
export function tryGetFirebaseStorage(): FirebaseStorage | null {
  if (cachedStorage) {
    return cachedStorage;
  }
  const app = tryGetFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    cachedStorage = getStorage(app);
    cachedStorage.maxUploadRetryTime = 3500;
    cachedStorage.maxOperationRetryTime = 3500;
    return cachedStorage;
  } catch (error) {
    console.warn('[Firebase Storage] Failed to initialize Storage instance:', error);
    return null;
  }
}
