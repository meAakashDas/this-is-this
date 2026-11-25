import React from 'react';
import { LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import type { AdminUser } from '../../lib/auth/types.ts';

interface AdminHeaderProps {
  user: AdminUser;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onLogout }) => {
  const isDevPreview = Boolean(user.isDevPreview);

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <a
            href="/admin"
            className="flex items-center gap-2 text-foreground font-semibold tracking-tight text-sm sm:text-base no-underline"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDevPreview ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              aria-hidden="true"
            />
            <span>Admin Portal</span>
          </a>

          {isDevPreview ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Dev Preview
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Authorized</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary no-underline"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Administrator'}
                className="w-7 h-7 rounded-full border border-border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-[11px] font-semibold">
                {initials}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-foreground leading-none">
                {user.displayName || 'Aakash Das'}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground leading-tight mt-0.5">
                {user.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title={isDevPreview ? 'Exit development preview' : 'Sign out securely'}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">
              {isDevPreview ? 'Exit Preview' : 'Sign out'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
