import React from 'react';
import { Loader2 } from 'lucide-react';
import type { AdminAuthStatus } from '../../lib/auth/types.ts';

interface AdminLoginCardProps {
  isLoading: boolean;
  status?: AdminAuthStatus;
  error: string | null;
  onLogin: () => void;
  onClearError: () => void;
  onEnableDevPreview?: () => void;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({
  isLoading,
  status,
  error,
  onLogin,
  onClearError,
}) => {
  const isAuthenticating = isLoading || status === 'authenticating';

  // Sanitize any error to strictly guarantee no email address or personal account info is ever displayed
  const sanitizedError = error
    ? error.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '').trim()
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-4 bg-background selection:bg-primary/10 selection:text-primary">
      <div className="w-full max-w-[360px] sm:max-w-[380px]">
        {/* Minimal White Card with Subtle Border */}
        <div className="bg-white dark:bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-xs flex flex-col items-center text-center space-y-6">
          {/* 1. Heading */}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground m-0">
            Admin Access
          </h1>

          {/* Conditional Sanitized Error (subtle alert if sign-in fails or is rejected) */}
          {sanitizedError && (
            <div
              role="alert"
              className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive text-left space-y-1 transition-all"
            >
              <div className="font-medium leading-relaxed">{sanitizedError}</div>
              <button
                type="button"
                onClick={onClearError}
                className="text-[11px] underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 2. Button: Sign in with Google */}
          <button
            type="button"
            onClick={onLogin}
            disabled={isAuthenticating}
            className="w-full inline-flex items-center justify-center gap-3 h-12 px-5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                {/* Google 'G' Mark */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
