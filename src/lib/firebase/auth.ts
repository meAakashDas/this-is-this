import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirebaseApp, tryGetFirebaseApp } from './app.ts';

let cachedAuth: Auth | null = null;

/**
 * Returns the singleton Firebase Auth instance.
 * Throws if Firebase is not configured.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = getFirebaseApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Safely returns the Firebase Auth instance if configured, or null otherwise.
 */
export function tryGetFirebaseAuth(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = tryGetFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (error) {
    console.warn('[Firebase Auth] Failed to initialize auth instance:', error);
    return null;
  }
}

/**
 * Pre-configured Google Auth Provider for administrator sign-in.
 * Restricts prompt to select account and requests verified email scopes.
 */
export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}
