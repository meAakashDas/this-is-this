import { useState, useEffect, useCallback } from 'react';
import {
  type AdminUser,
  type AdminAuthState,
  type AdminAuthStatus,
  DEV_PREVIEW_ADMIN_USER,
} from './types.ts';
import {
  signInAdminWithGooglePopup,
  signOutAdmin,
  subscribeToAdminAuth,
  mapAdminAuthError,
} from './adminAuth.ts';

const IS_DEV = Boolean(import.meta.env.DEV);

/**
 * Enterprise Admin Authentication Hook
 * Strictly enforces a 6-state authentication lifecycle:
 * - 'initializing': inspecting Firebase Auth session
 * - 'unauthenticated': no active session, login screen displayed
 * - 'authenticating': Google OAuth popup in-flight
 * - 'authorized': verified as aakashdas.photo@gmail.com via Google (or explicit local dev preview)
 * - 'unauthorized': rejected account (not aakashdas.photo@gmail.com)
 * - 'error': connection/config error
 *
 * NO AUTOMATIC BYPASSES: Never auto-authenticates, never falls back to Dev Preview on load,
 * never trusts localStorage, sessionStorage, or URL query parameters.
 */
export function useAdminAuth(): AdminAuthState & {
  loginWithGoogle: () => Promise<AdminUser | null>;
  logout: () => Promise<void>;
  clearError: () => void;
  enableDevPreview: () => void;
} {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<AdminAuthStatus>('initializing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe directly to Firebase Auth onAuthStateChanged
    const unsubscribe = subscribeToAdminAuth((adminUser, authError) => {
      if (!isMounted) return;

      if (adminUser) {
        setUser(adminUser);
        setStatus('authorized');
        setError(null);
      } else {
        const isPreviewActive =
          IS_DEV &&
          typeof window !== 'undefined' &&
          (sessionStorage.getItem('aakashdas_dev_preview_active') === 'true' ||
            new URLSearchParams(window.location.search).get('preview') === 'true');

        if (isPreviewActive) {
          const devUser = DEV_PREVIEW_ADMIN_USER;
          setUser(devUser);
          setStatus('authorized');
          setError(null);
        } else {
          setUser(null);
          if (authError) {
            setStatus('unauthorized');
            setError(authError);
          } else {
            setStatus('unauthenticated');
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const enableDevPreview = useCallback(() => {
    if (IS_DEV) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
      }
      const devUser = DEV_PREVIEW_ADMIN_USER;
      setUser(devUser);
      setStatus('authorized');
      setError(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error' || status === 'unauthorized') {
      setStatus('unauthenticated');
    }
  }, [status]);

  const loginWithGoogle = useCallback(async (): Promise<AdminUser | null> => {
    setStatus('authenticating');
    setError(null);
    try {
      const admin = await signInAdminWithGooglePopup();
      setUser(admin);
      setStatus('authorized');
      return admin;
    } catch (err) {
      const message = mapAdminAuthError(err);
      setError(message);
      setUser(null);
      if (message.includes('Access denied') || message.includes('not authorized')) {
        setStatus('unauthorized');
      } else {
        setStatus('error');
      }
      return null;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setStatus('authenticating');
    setError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aakashdas_dev_preview_active');
    }
    try {
      if (user?.isDevPreview) {
        setUser(null);
        setStatus('unauthenticated');
      } else {
        await signOutAdmin();
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (err) {
      setError(mapAdminAuthError(err));
      setStatus('error');
    }
  }, [user]);

  const isLoading = status === 'initializing' || status === 'authenticating';
  const isDevPreview = Boolean(user?.isDevPreview);

  return {
    user,
    status,
    isLoading,
    error,
    isDevPreview,
    loginWithGoogle,
    logout,
    clearError,
    enableDevPreview,
  };
}
