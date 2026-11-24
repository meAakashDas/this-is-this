/**
 * Administrator Authentication & Session Types
 *
 * Exclusively supports authorized administrator identity:
 * aakashdas.photo@gmail.com
 */

export const AUTHORIZED_ADMIN_EMAIL = 'aakashdas.photo@gmail.com' as const;

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId: string;
  lastLoginAt?: string;
  isDevPreview?: boolean;
}

export interface AdminVerificationResult {
  isAuthorized: boolean;
  reason?: string;
}

export type AdminAuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticating'
  | 'authorized'
  | 'unauthorized'
  | 'error';

export interface AdminAuthState {
  user: AdminUser | null;
  status: AdminAuthStatus;
  isLoading: boolean;
  error: string | null;
  isDevPreview: boolean;
}

export const DEV_PREVIEW_ADMIN_USER: AdminUser = {
  uid: 'dev-preview-admin-uid',
  email: 'aakashdas.photo@gmail.com',
  displayName: 'Aakash Das (Dev Preview)',
  photoURL: '/images/aakash-das.webp',
  emailVerified: true,
  providerId: 'google.com',
  lastLoginAt: new Date().toISOString(),
  isDevPreview: true,
};
