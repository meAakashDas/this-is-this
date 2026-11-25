import type { FirebaseOptions } from 'firebase/app';

/**
 * Canonical public client configuration for project: aakashdas-live
 * Note: These are public web client identifiers required by the browser SDK,
 * not private credentials or secrets. Security is strictly enforced by Firestore
 * Security Rules and Firebase Authentication.
 */
export const DEFAULT_FIREBASE_CONFIG: Required<Omit<FirebaseOptions, 'measurementId'>> = {
  apiKey: 'AIzaSyBjYmwR6Zn4A9MCTdarlUEIodpTq0GOAHY',
  authDomain: 'aakashdas-live.firebaseapp.com',
  projectId: 'aakashdas-live',
  storageBucket: 'aakashdas-live.firebasestorage.app',
  messagingSenderId: '128286218310',
  appId: '1:128286218310:web:962c0197ecfa1366a65247',
};

/**
 * Expected Firebase public client environment variables
 */
export const REQUIRED_FIREBASE_ENV_VARS = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_STORAGE_BUCKET',
  'PUBLIC_FIREBASE_APP_ID',
] as const;

/**
 * Checks if a string value is an empty or placeholder configuration value.
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('your_') ||
    lower.includes('your-project') ||
    lower === 'placeholder' ||
    lower === 'undefined' ||
    lower === 'null'
  );
}

/**
 * Safely resolves an environment variable using static Vite/Astro accesses,
 * Node process.env, and canonical fallback defaults.
 */
function resolveConfigValue(
  staticImportMetaVal: string | undefined,
  processEnvKey: string,
  fallbackDefault: string
): string {
  // 1. Static Vite / Astro inlined browser value
  if (staticImportMetaVal && typeof staticImportMetaVal === 'string' && !isPlaceholder(staticImportMetaVal)) {
    return staticImportMetaVal.trim();
  }
  // 2. Node.js process.env value (CLI, SSR, build scripts)
  if (typeof process !== 'undefined' && process.env && typeof process.env[processEnvKey] === 'string') {
    const val = process.env[processEnvKey]?.trim();
    if (val && !isPlaceholder(val)) {
      return val;
    }
  }
  // 3. Canonical public configuration fallback
  return fallbackDefault;
}

/**
 * Returns true if all mandatory Firebase environment variables are configured.
 */
export function isFirebaseConfigured(): boolean {
  return true;
}

/**
 * Returns a list of missing variables (empty since canonical fallbacks exist).
 */
export function getMissingFirebaseEnvVars(): string[] {
  return [];
}

/**
 * Retrieves the normalized Firebase configuration object.
 */
export function getFirebaseConfig(): FirebaseOptions {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;

  return {
    apiKey: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_API_KEY : undefined,
      'PUBLIC_FIREBASE_API_KEY',
      DEFAULT_FIREBASE_CONFIG.apiKey
    ),
    authDomain: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
      'PUBLIC_FIREBASE_AUTH_DOMAIN',
      DEFAULT_FIREBASE_CONFIG.authDomain
    ),
    projectId: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_PROJECT_ID : undefined,
      'PUBLIC_FIREBASE_PROJECT_ID',
      DEFAULT_FIREBASE_CONFIG.projectId
    ),
    storageBucket: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
      'PUBLIC_FIREBASE_STORAGE_BUCKET',
      DEFAULT_FIREBASE_CONFIG.storageBucket
    ),
    messagingSenderId: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
      'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      DEFAULT_FIREBASE_CONFIG.messagingSenderId
    ),
    appId: resolveConfigValue(
      metaEnv ? metaEnv.PUBLIC_FIREBASE_APP_ID : undefined,
      'PUBLIC_FIREBASE_APP_ID',
      DEFAULT_FIREBASE_CONFIG.appId
    ),
  };
}
