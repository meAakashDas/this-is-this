import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirebaseConfig, isFirebaseConfigured } from './config.ts';

let cachedApp: FirebaseApp | null = null;

/**
 * Initializes or returns the singleton FirebaseApp instance.
 * If already initialized, returns the existing instance.
 * Throws a diagnostic error if Firebase is not properly configured.
 */
export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const config = getFirebaseConfig();

  try {
    cachedApp = initializeApp(config);
    return cachedApp;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[Firebase] Initialization failed: ${message}`);
  }
}

/**
 * Safely attempts to retrieve or initialize the FirebaseApp instance.
 * Returns null if environment variables are not configured, rather than throwing.
 * Use this on routes or components that need graceful degradation.
 */
export function tryGetFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    return getFirebaseApp();
  } catch (error) {
    console.warn('[Firebase] Safe initialization skipped:', error);
    return null;
  }
}
