import React, { useState } from 'react';
import { useAdminAuth } from '../../lib/auth/useAdminAuth.ts';
import { AdminLoginCard } from './AdminLoginCard.tsx';
import { AdminHeader } from './AdminHeader.tsx';
import { AdminSidebar, type AdminTab } from './AdminSidebar.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { AdminComingSoon } from './AdminComingSoon.tsx';
import { ProfileEditor } from './profile/ProfileEditor.tsx';
import { HomepageEditor } from './homepage/HomepageEditor.tsx';
import { AboutEditor } from './about/AboutEditor.tsx';
import { ResourcesManager } from './resources/ResourcesManager.tsx';
import { JournalManager } from './journal/JournalManager.tsx';
import { PublishingDashboard } from './publishing/PublishingDashboard.tsx';
import { WebsiteSettingsEditor } from './settings/WebsiteSettingsEditor.tsx';
import { Toaster } from '../ui/sonner.tsx';
import { Loader2, Info } from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // 1. Initializing state: show dedicated loading screen while verifying Firebase session
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

  // 2. Unauthenticated, Authenticating, Unauthorized, or Error state:
  // Render ONLY the dedicated AdminLoginCard. The dashboard is NEVER rendered here.
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

  // 3. ONLY 'authorized' state with real verified admin user renders the protected dashboard
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminHeader user={user} onLogout={logout} />

      {/* Dev Preview Mode Notice Bar */}
      {isDevPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-mono text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Development Preview Mode Active. All forms and preview controls are interactive.
            Live Firestore writes are disabled until Google Sign-In.
          </span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar */}
          <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

          {/* Right Main Content */}
          <section className="flex-1 w-full min-w-0" aria-label="Admin Content Pane">
            {activeTab === 'overview' ? (
              <AdminOverview user={user} onNavigateTab={setActiveTab} />
            ) : activeTab === 'profile' ? (
              <ProfileEditor isDevPreview={isDevPreview} />
            ) : activeTab === 'homepage' ? (
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
              <AdminComingSoon
                tab={activeTab}
                onBackToOverview={() => setActiveTab('overview')}
              />
            )}
          </section>
        </div>
      </main>
      <Toaster />
    </div>
  );
};
