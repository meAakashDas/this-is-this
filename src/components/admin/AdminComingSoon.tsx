import React from 'react';
import { ArrowLeft, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import type { AdminTab } from './AdminSidebar.tsx';

interface AdminComingSoonProps {
  tab: AdminTab;
  onBackToOverview: () => void;
}

const TAB_METADATA: Record<
  AdminTab,
  {
    title: string;
    phase: string;
    description: string;
    features: string[];
  }
> = {
  overview: {
    title: 'Overview',
    phase: 'Phase 4',
    description: 'Central dashboard overview and system status.',
    features: [],
  },
  profile: {
    title: 'Personal Profile Management',
    phase: 'Phase 5',
    description:
      'Manage personal identity, credentials, professional summary, and profile photographs.',
    features: [
      'Full name and professional headline editing',
      'Editorial bio paragraphs and story milestones',
      'Profile photograph upload and replacement',
      'Social channel handle and URL configuration',
    ],
  },
  homepage: {
    title: 'Homepage Content Management',
    phase: 'Phase 6',
    description:
      'Customize homepage hero typography, call-to-action buttons, and section visibility.',
    features: [
      'Hero greeting, headline, and subhead copy',
      'Call to action links and text',
      'Section visibility toggles (Work, Media, Education)',
      'Featured educational resources ordering',
    ],
  },
  about: {
    title: 'About Page Content Management',
    phase: 'Phase 6',
    description:
      'Manage biographical copy, work initiatives, podcast appearances, and education history.',
    features: [
      'Biography paragraphs and intro lead copy',
      'Primary work initiatives with custom links',
      'Conversations & media podcast appearance details',
      'Education and professional experience credentials',
    ],
  },
  resources: {
    title: 'Educational Resources & Attachments',
    phase: 'Phase 7',
    description:
      'Full lifecycle management for educational guides, downloads, and embedded walkthroughs.',
    features: [
      'Add, edit, draft, and publish educational resources',
      'Upload and sync downloadable PDF and DOCX attachments',
      'Structured content blocks editor (lists, callouts, tables)',
      'YouTube walkthrough video integration',
    ],
  },
  journal: {
    title: 'Journal & Tiptap Rich Text Publishing',
    phase: 'Phase 8',
    description:
      'Publish and edit long-form articles with an integrated Tiptap rich-text editor.',
    features: [
      'Visual Tiptap rich-text authoring experience',
      'Article title, subtitle, slug, and read-time metadata',
      'Topic categories and tags',
      'Instant draft vs. published state control',
    ],
  },
  publishing: {
    title: 'Publishing & Snapshot Pipeline',
    phase: 'Phase 10',
    description:
      'Manage production build snapshots and static asset synchronization.',
    features: [
      'Static asset sync',
      'Production snapshot regeneration',
      'Document exports rebuild',
    ],
  },
  settings: {
    title: 'Website Settings & SEO Management',
    phase: 'Phase 10',
    description:
      'Global website configuration, contact channels, header navigation, and SEO tags.',
    features: [
      'Canonical website domain and brand identity',
      'Email, WhatsApp, and phone contact channels',
      'Global header navigation items and ordering',
      'Default OpenGraph and meta descriptions',
    ],
  },
};

export const AdminComingSoon: React.FC<AdminComingSoonProps> = ({
  tab,
  onBackToOverview,
}) => {
  const meta = TAB_METADATA[tab] || TAB_METADATA.overview;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-xs space-y-8">
      {/* Top back button */}
      <button
        type="button"
        onClick={onBackToOverview}
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Overview</span>
      </button>

      {/* Main card */}
      <div className="space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-secondary border border-border text-foreground">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Scheduled for {meta.phase}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground m-0">
          {meta.title}
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed m-0">
          {meta.description}
        </p>
      </div>

      {/* Features preview */}
      {meta.features.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/80">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground m-0">
            Planned Capabilities for {meta.phase}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none p-0 m-0">
            {meta.features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-foreground bg-secondary/40 border border-border/60 rounded-lg p-3"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Security note */}
      <div className="pt-4 border-t border-border/80 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          Data models and Firestore repositories are already implemented and waiting for editor UI connection.
        </span>
      </div>
    </div>
  );
};
