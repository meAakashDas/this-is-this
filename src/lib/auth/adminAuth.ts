import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, tryGetFirebaseAuth, createGoogleAuthProvider } from '../firebase/auth.ts';
import {
  AUTHORIZED_ADMIN_EMAIL,
  type AdminUser,
  type AdminVerificationResult,
} from './types.ts';

/**
 * Strict verification of administrator identity.
 *
 * Verifies:
 * 1. User object exists.
 * 2. Email exists.
 * 3. Email strictly matches aakashdas.photo@gmail.com (case-normalized).
 * 4. Email is verified by Google.
 * 5. Provider is google.com.
 */
export function verifyAdminUser(
  user: {
    email?: string | null;
    emailVerified?: boolean | null;
    providerData?: Array<{ providerId?: string | null }>;
    providerId?: string | null;
  } | null
): AdminVerificationResult {
  if (!user) {
    return {
      isAuthorized: false,
      reason: 'No active authentication session found.',
    };
  }

  if (!user.email || typeof user.email !== 'string') {
    return {
      isAuthorized: false,
      reason: 'Access denied. Account has no verified email address.',
    };
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  if (normalizedEmail !== AUTHORIZED_ADMIN_EMAIL) {
    return {
      isAuthorized: false,
      reason: 'Access denied. This account is not authorized to administer this website.',
    };
  }

  if (user.emailVerified !== true) {
    return {
      isAuthorized: false,
      reason: 'Access denied. Google account email address is not verified.',
    };
  }

  const isGoogle =
    user.providerId === 'google.com' ||
    Boolean(
      user.providerData &&
        user.providerData.some((provider) => provider?.providerId === 'google.com')
    );

  if (!isGoogle) {
    return {
      isAuthorized: false,
      reason: 'Access denied. Only Google authentication is permitted.',
    };
  }

  return { isAuthorized: true };
}

/**
 * Transforms a verified Firebase User into an application AdminUser.
 */
export function toAdminUser(user: User): AdminUser {
  return {
    uid: user.uid,
    email: user.email ? user.email.trim().toLowerCase() : '',
    displayName: user.displayName || 'Aakash Das',
    photoURL: user.photoURL || null,
    emailVerified: user.emailVerified,
    providerId: 'google.com',
    lastLoginAt: user.metadata?.lastSignInTime || new Date().toISOString(),
  };
}

/**
 * Maps Firebase Auth error codes into safe, friendly messages.
 * Does not expose internal stack traces or configuration secrets.
 */
export function mapAdminAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred during authentication.';

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled: The Google sign-in window was closed before completing.';
      case 'auth/popup-blocked':
        return 'Pop-up blocked: Please allow pop-ups for this site in your browser to sign in.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in cancelled: A newer sign-in window was opened.';
      case 'auth/network-request-failed':
        return 'Network error: Unable to reach Google Authentication servers. Please check your connection.';
      case 'auth/unauthorized-domain':
        return 'Domain not authorized: This domain has not been added to the Firebase Console authorized domains list.';
      case 'auth/operation-not-allowed':
        return 'Provider disabled: Google Sign-In is not enabled in Firebase Authentication.';
      case 'auth/user-disabled':
        return 'Access disabled: This Google account has been disabled.';
      case 'auth/invalid-api-key':
        return 'Configuration error: Firebase API key is invalid.';
      case 'auth/app-deleted':
      case 'auth/invalid-app-credential':
        return 'Configuration error: Firebase authentication app instance is invalid.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Access denied')) {
      return error.message;
    }
  }

  return 'Authentication failed. Please verify your credentials and try again.';
}

/**
 * Executes administrator sign-in using Google OAuth pop-up.
 * Automatically validates administrator identity and signs out unauthorized users.
 */
export async function signInAdminWithGooglePopup(): Promise<AdminUser> {
  const auth = getFirebaseAuth();

  try {
    if (typeof window !== 'undefined') {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistErr) {
        console.warn('[Admin Auth] Local persistence fallback:', persistErr);
      }
    }

    const provider = createGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const verification = verifyAdminUser(result.user);
    if (!verification.isAuthorized) {
      // Immediate revoke of unauthorized session
      await signOut(auth);
      throw new Error(
        verification.reason ||
          'Access denied. This account is not authorized to administer this website.'
      );
    }

    return toAdminUser(result.user);
  } catch (error) {
    // If user is partially signed in but unauthorized, ensure signOut
    if (auth.currentUser) {
      const check = verifyAdminUser(auth.currentUser);
      if (!check.isAuthorized) {
        await signOut(auth).catch(() => {});
      }
    }
    throw error;
  }
}

/**
 * Fallback administrator sign-in using Google redirect.
 */
export async function signInAdminWithGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = createGoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

/**
 * Signs out the administrator and cleans up local session state.
 */
export async function signOutAdmin(): Promise<void> {
  const auth = tryGetFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Subscribes to Firebase Auth state changes with automatic administrator verification.
 * Automatically evicts unauthorized users.
 */
export function subscribeToAdminAuth(
  callback: (user: AdminUser | null, error: string | null) => void
): () => void {
  const auth = tryGetFirebaseAuth();
  if (!auth) {
    callback(null, null);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null, null);
        return;
      }

      const verification = verifyAdminUser(firebaseUser);
      if (!verification.isAuthorized) {
        // Immediate termination of unauthorized session
        try {
          await signOut(auth);
        } catch {
          // ignore signout errors
        }
        callback(
          null,
          verification.reason ||
            'Access denied. This account is not authorized to administer this website.'
        );
        return;
      }

      callback(toAdminUser(firebaseUser), null);
    },
    (authError) => {
      const friendlyMessage = mapAdminAuthError(authError);
      callback(null, friendlyMessage);
    }
  );

  return unsubscribe;
}
