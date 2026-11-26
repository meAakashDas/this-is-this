import React from 'react';
import { LogOut, ExternalLink, ShieldCheck, Menu } from 'lucide-react';
import type { AdminUser } from '../../lib/auth/types.ts';

interface AdminHeaderProps {
  user: AdminUser;
  onLogout: () => void;
  mobileNavOpen?: boolean;
  onOpenMobileNav?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  onLogout,
  mobileNavOpen = false,
  onOpenMobileNav,
}) => {
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-drawer"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 -ml-1 rounded-lg border border-border bg-card hover:bg-secondary text-foreground shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <a
            href="/admin"
            className="flex items-center gap-2 text-foreground font-semibold tracking-tight text-sm sm:text-base no-underline min-w-0 truncate"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDevPreview ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">Admin Portal</span>
          </a>

          {isDevPreview ? (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
              Dev Preview
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3 h-3" />
              <span>Authorized</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary no-underline"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2 sm:pl-2 sm:border-l border-border">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Administrator'}
                className="w-7 h-7 rounded-full border border-border object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
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
            aria-label={isDevPreview ? 'Exit development preview' : 'Sign out'}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 min-w-[36px] sm:min-w-0 px-2 sm:px-2.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">
              {isDevPreview ? 'Exit Preview' : 'Sign out'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
