import type { FirebaseOptions } from 'firebase/app';

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
 * Helper to safely extract environment variables in browser, Vite, Astro, or Node environments.
 */
function getEnvValue(key: string): string {
  // Vite / Astro browser & build environment
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
    return import.meta.env[key].trim();
  }
  // Node.js script environment (e.g., seeding scripts, CLI tools)
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key]!.trim();
  }
  return '';
}

/**
 * Checks if a string value is an empty or placeholder configuration value.
 */
function isPlaceholder(value: string): boolean {
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
 * Returns a list of required Firebase environment variables that are missing or set to placeholder values.
 */
export function getMissingFirebaseEnvVars(): string[] {
  return REQUIRED_FIREBASE_ENV_VARS.filter((key) => {
    const val = getEnvValue(key);
    return !val || isPlaceholder(val);
  });
}

/**
 * Returns true if all mandatory Firebase environment variables are configured.
 */
export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseEnvVars().length === 0;
}

/**
 * Retrieves the normalized Firebase configuration object.
 * Throws a helpful diagnostic error if mandatory environment variables are missing.
 */
export function getFirebaseConfig(): FirebaseOptions {
  const missing = getMissingFirebaseEnvVars();
  if (missing.length > 0) {
    throw new Error(
      `[Firebase] Missing or invalid configuration for: ${missing.join(', ')}.\n` +
      `Please configure these variables in .env.local (copy from .env.example) or your hosting environment.`
    );
  }

  return {
    apiKey: getEnvValue('PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnvValue('PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvValue('PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvValue('PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvValue('PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || undefined,
    appId: getEnvValue('PUBLIC_FIREBASE_APP_ID'),
  };
}
