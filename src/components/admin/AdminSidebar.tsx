import React, { useEffect } from 'react';
import {
  User,
  Home,
  FileText,
  BookOpen,
  PenSquare,
  Globe,
  Settings,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { AdminUser } from '../../lib/auth/types.ts';

export type AdminTab =
  | 'profile'
  | 'homepage'
  | 'about'
  | 'resources'
  | 'journal'
  | 'publishing'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  user?: AdminUser;
}

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'homepage', label: 'Homepage', icon: Home },
  { id: 'about', label: 'About', icon: FileText },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'journal', label: 'Journal', icon: PenSquare },
  { id: 'publishing', label: 'Publishing', icon: Globe },
  { id: 'settings', label: 'Website Settings', icon: Settings },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen = false,
  onCloseMobile,
  user,
}) => {
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  const handleMobileSelect = (tab: AdminTab) => {
    onSelectTab(tab);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Desktop Sidebar Navigation (1024px+ unchanged) */}
      <aside className="hidden lg:block w-52 shrink-0">
        <nav aria-label="Admin Navigation" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer text-left w-full ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile & Tablet Navigation Drawer (< 1024px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => onCloseMobile?.()}
          />

          <div
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation Drawer"
            className="relative z-10 w-[280px] max-w-[85vw] h-full bg-background border-r border-border shadow-xl flex flex-col"
          >
            <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    user?.isDevPreview ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-foreground truncate">
                  Admin Menu
                </span>
              </div>

              <button
                type="button"
                onClick={() => onCloseMobile?.()}
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center w-10 h-10 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {user && (
              <div className="px-4 py-3 border-b border-border/60 bg-secondary/25 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {user.displayName || 'Aakash Das'}
                  </div>
                  {user.email && (
                    <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </div>
                  )}
                </div>
                {user.isDevPreview ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    Dev Preview
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Authorized</span>
                  </span>
                )}
              </div>
            )}

            <nav
              aria-label="Mobile Admin Navigation"
              className="flex-1 overflow-y-auto p-3 flex flex-col gap-1"
            >
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-3 px-3.5 min-h-[44px] py-2.5 rounded-lg text-sm font-medium cursor-pointer text-left w-full transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/60 shrink-0">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3.5 min-h-[44px] py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary no-underline"
              >
                <span>View Live Site</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
