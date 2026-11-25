import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../lib/auth/useAdminAuth.ts';
import { AdminLoginCard } from './AdminLoginCard.tsx';
import { AdminHeader } from './AdminHeader.tsx';
import { AdminSidebar, type AdminTab } from './AdminSidebar.tsx';
import { ProfileEditor } from './profile/ProfileEditor.tsx';
import { HomepageEditor } from './homepage/HomepageEditor.tsx';
import { AboutEditor } from './about/AboutEditor.tsx';
import { ResourcesManager } from './resources/ResourcesManager.tsx';
import { JournalManager } from './journal/JournalManager.tsx';
import { PublishingDashboard } from './publishing/PublishingDashboard.tsx';
import { WebsiteSettingsEditor } from './settings/WebsiteSettingsEditor.tsx';
import { Toaster } from '../ui/sonner.tsx';
import { Loader2, Info } from 'lucide-react';

const VALID_TABS: AdminTab[] = [
  'profile',
  'homepage',
  'about',
  'resources',
  'journal',
  'publishing',
  'settings',
];

const DEFAULT_TAB: AdminTab = 'profile';

export const AdminPortal: React.FC = () => {
  const {
    user,
    status,
    isLoading,
    error,
    isDevPreview,
    loginWithGoogle,
    logout,
    clearError,
    enableDevPreview,
  } = useAdminAuth();

  // Read initial tab from URL if valid; default directly to Profile (no Overview dashboard)
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTab;
      if (tabParam && VALID_TABS.includes(tabParam)) {
        return tabParam;
      }
    }
    return DEFAULT_TAB;
  });

  // Handle tab selection and keep URL search params in sync
  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      url.searchParams.delete('id');
      url.searchParams.delete('slug');
      url.searchParams.delete('edit');
      window.history.pushState(null, '', url.toString());
    }
  };

  // Sync with browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as AdminTab;
        if (tabParam && VALID_TABS.includes(tabParam)) {
          setActiveTab(tabParam);
        } else {
          setActiveTab(DEFAULT_TAB);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (status === 'initializing') {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <p className="text-xs font-mono">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (status !== 'authorized' || !user) {
    return (
      <AdminLoginCard
        isLoading={isLoading}
        status={status}
        error={error}
        onLogin={loginWithGoogle}
        onClearError={clearError}
        onEnableDevPreview={enableDevPreview}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminHeader user={user} onLogout={logout} />

      {isDevPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-mono text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Development Preview Mode Active. Live Firestore writes require Google Sign-In.
          </span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <AdminSidebar activeTab={activeTab} onSelectTab={handleSelectTab} />

          <section className="flex-1 w-full min-w-0" aria-label="Admin Content Pane">
            {activeTab === 'homepage' ? (
              <HomepageEditor isDevPreview={isDevPreview} />
            ) : activeTab === 'about' ? (
              <AboutEditor isDevPreview={isDevPreview} />
            ) : activeTab === 'resources' ? (
              <ResourcesManager isDevPreview={isDevPreview} />
            ) : activeTab === 'journal' ? (
              <JournalManager isDevPreview={isDevPreview} />
            ) : activeTab === 'publishing' ? (
              <PublishingDashboard isDevPreview={isDevPreview} />
            ) : activeTab === 'settings' ? (
              <WebsiteSettingsEditor isDevPreview={isDevPreview} />
            ) : (
              <ProfileEditor isDevPreview={isDevPreview} />
            )}
          </section>
        </div>
      </main>
      <Toaster />
    </div>
  );
};
