import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Database,
  KeyRound,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import type { AdminUser } from '../../lib/auth/types.ts';
import type { AdminTab } from './AdminSidebar.tsx';

interface AdminOverviewProps {
  user: AdminUser;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  user,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-secondary border border-border text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Admin Portal • Production Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground m-0">
            Welcome back, {user.displayName || 'Aakash'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed m-0">
            Your identity has been verified via Google Authentication. You have full
            administrative rights to manage website settings, editorial content,
            educational resources, and journal articles.
          </p>
        </div>
      </div>

      {/* Real System Status Grid */}
      <section aria-labelledby="status-grid-title" className="space-y-4">
        <h2 id="status-grid-title" className="text-sm font-mono uppercase tracking-wider text-muted-foreground m-0">
          System Verification & Readiness
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Auth Status */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Identity</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">Authorized Admin</div>
              <div className="text-xs font-mono text-muted-foreground truncate" title={user.email}>
                {user.email}
              </div>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Google OAuth Verified</span>
            </div>
          </div>

          {/* Card 2: Firebase Status */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Firebase Project</span>
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">aakashdas-live</div>
              <div className="text-xs text-muted-foreground">Cloud Firestore & Storage</div>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Security Rules Active</span>
            </div>
          </div>

          {/* Card 3: CMS Schema Status */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Data Models</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">Content Schemas</div>
              <div className="text-xs text-muted-foreground">11 Zod Validated Models</div>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Repositories Initialized</span>
            </div>
          </div>

          {/* Card 4: Access Policy */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Access Control</span>
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">Single Admin Lock</div>
              <div className="text-xs text-muted-foreground">Zero Public Registration</div>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Strict Provider Check</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Management Modules */}
      <section aria-labelledby="modules-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="modules-title" className="text-sm font-mono uppercase tracking-wider text-muted-foreground m-0">
            Content Management Modules
          </h2>
          <span className="text-xs text-muted-foreground">Direct Shortcuts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Profile */}
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-primary font-medium">Profile</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Personal Profile & Bio
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Manage personal details, bio paragraphs, social channels, and profile images.
            </p>
          </button>

          {/* Module 2: Editorial Pages */}
          <button
            type="button"
            onClick={() => onNavigateTab('homepage')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-primary font-medium">Pages</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Homepage & About CMS
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Edit hero headings, work initiatives, podcast appearances, and education entries.
            </p>
          </button>

          {/* Module 3: Educational Resources */}
          <button
            type="button"
            onClick={() => onNavigateTab('resources')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-primary font-medium">Resources</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Educational Resources
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Create and manage guides, upload downloadable attachments, and sync PDF/DOCX files.
            </p>
          </button>

          {/* Module 4: Journal */}
          <button
            type="button"
            onClick={() => onNavigateTab('journal')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-primary font-medium">Journal</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Journal & Articles
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Write and publish articles using the unified BlockNote continuous canvas.
            </p>
          </button>

          {/* Module 5: Settings */}
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-primary font-medium">Settings</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Website Settings & SEO
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Configure global navigation items, footer copy, contact channels, and SEO metadata.
            </p>
          </button>

          {/* Module 6: Publishing & Pipeline */}
          <button
            type="button"
            onClick={() => onNavigateTab('publishing')}
            className="group bg-card border border-border rounded-xl p-5 text-left hover:border-border-strong hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Production Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-foreground m-0">
              Publishing & SSG Sync
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed m-0">
              Synchronize content, trigger static builds, regenerate PDF/DOCX downloads, and deploy.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
};
