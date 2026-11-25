import React, { useState, useEffect } from 'react';
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  FileText,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
  Clock,
  Download,
  Check,
  Play,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import snapshotData from '../../../data/cms-snapshot.json';
import { getAllResourcesForAdmin } from '../../../lib/cms/resources.repository.ts';
import { getAllJournalsForAdmin } from '../../../lib/cms/journals.repository.ts';
import { getSiteSettings } from '../../../lib/cms/siteSettings.repository.ts';
import { getHomePageContent, getAboutPageContent } from '../../../lib/cms/pages.repository.ts';

interface PublishingDashboardProps {
  isDevPreview?: boolean;
}

interface BuildStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed';
}

export const PublishingDashboard: React.FC<PublishingDashboardProps> = ({
  isDevPreview = false,
}) => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDispatchDone, setIsDispatchDone] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const initialRes = (snapshotData as any)?.resources || [];
  const initialJour = (snapshotData as any)?.journals || [];
  const [inventory, setInventory] = useState({
    publishedResources: initialRes.filter((r: any) => r.published).length,
    draftResources: initialRes.filter((r: any) => !r.published).length,
    publishedJournals: initialJour.filter((j: any) => j.published && j.status !== 'draft').length,
    draftJournals: initialJour.filter((j: any) => !j.published || j.status === 'draft').length,
  });

  const [lastBuildTime, setLastBuildTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('aakashdas_last_build_time');
      if (stored) return stored;
    }
    if ((snapshotData as any)?._meta?.generatedAt) {
      try {
        const d = new Date((snapshotData as any)._meta.generatedAt);
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {}
    }
    return 'Snapshot Generated';
  });

  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([
    { id: 'snapshot', label: 'Capture Firestore Content Snapshot', status: 'pending' },
    { id: 'exports', label: 'Generate PDF & DOCX Resource Downloads', status: 'pending' },
    { id: 'ssg', label: 'Pre-render Static HTML Routes', status: 'pending' },
    { id: 'deploy', label: 'Deploy to GitHub Pages (aakashdas.live)', status: 'pending' },
  ]);
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [isTokenSaved, setIsTokenSaved] = useState(false);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_gh_dispatch_token');
    if (savedToken) {
      setGithubToken(savedToken);
      setIsTokenSaved(true);
    }

    if (isDevPreview) return;

    let mounted = true;
    Promise.all([
      getAllResourcesForAdmin().catch(() => null),
      getAllJournalsForAdmin().catch(() => null),
    ]).then(([resList, jourList]) => {
      if (!mounted) return;
      setInventory((prev) => ({
        publishedResources: resList ? resList.filter((r) => r.published).length : prev.publishedResources,
        draftResources: resList ? resList.filter((r) => !r.published).length : prev.draftResources,
        publishedJournals: jourList
          ? jourList.filter((j) => j.published && j.status !== 'draft').length
          : prev.publishedJournals,
        draftJournals: jourList
          ? jourList.filter((j) => !j.published || j.status === 'draft').length
          : prev.draftJournals,
      }));
    });

    return () => {
      mounted = false;
    };
  }, [isDevPreview]);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubToken.trim()) {
      sessionStorage.setItem('admin_gh_dispatch_token', githubToken.trim());
      setIsTokenSaved(true);
      toast.success('GitHub dispatch token stored safely in current session.');
    } else {
      sessionStorage.removeItem('admin_gh_dispatch_token');
      setIsTokenSaved(false);
      toast.info('Dispatch token removed from session.');
    }
  };

  const handleTriggerBuild = async () => {
    setIsConfirmOpen(false);
    setIsBuilding(true);
    setIsDispatchDone(false);

    const token = sessionStorage.getItem('admin_gh_dispatch_token') || githubToken;

    if (!token) {
      setIsBuilding(false);
      toast.info(
        'Live Firestore Sync is active: published changes appear immediately on aakashdas.live. Enter a GitHub token below to dispatch a full static rebuild.'
      );
      setShowTokenConfig(true);
      return;
    }

    setBuildSteps([
      { id: 'snapshot', label: 'Dispatching GitHub Actions Workflow', status: 'running' },
      { id: 'exports', label: 'Generate PDF & DOCX Resource Downloads', status: 'pending' },
      { id: 'ssg', label: 'Pre-render Static HTML Routes', status: 'pending' },
      { id: 'deploy', label: 'Deploy to GitHub Pages (aakashdas.live)', status: 'pending' },
    ]);

    try {
      const res = await fetch(
        'https://api.github.com/repos/meAakashDas/this-is-this/actions/workflows/deploy.yml/dispatches',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `GitHub API error: ${res.status} ${res.statusText}`);
      }

      setBuildSteps([
        { id: 'snapshot', label: 'Workflow dispatched to GitHub Actions (main)', status: 'success' },
        { id: 'exports', label: 'Generating PDF & DOCX exports in CI', status: 'running' },
        { id: 'ssg', label: 'Pre-rendering static HTML routes in CI', status: 'running' },
        { id: 'deploy', label: 'Deploying artifact to GitHub Pages', status: 'pending' },
      ]);

      setIsDispatchDone(true);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formatted = `Dispatched (${nowStr})`;
      setLastBuildTime(formatted);
      try {
        sessionStorage.setItem('aakashdas_last_build_time', formatted);
      } catch {}

      toast.success('GitHub Actions build dispatched to main branch!');
    } catch (err: any) {
      console.error('Workflow dispatch failed:', err);
      toast.error(`Workflow dispatch failed: ${err.message}`);
      setBuildSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' } : s))
      );
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDownloadSnapshot = async () => {
    try {
      const [siteSettings, homePage, aboutPage, resources, journals] = await Promise.all([
        getSiteSettings().catch(() => (snapshotData as any)?.siteSettings || null),
        getHomePageContent().catch(() => (snapshotData as any)?.homePage || null),
        getAboutPageContent().catch(() => (snapshotData as any)?.aboutPage || null),
        getAllResourcesForAdmin().catch(() => (snapshotData as any)?.resources || []),
        getAllJournalsForAdmin().catch(() => (snapshotData as any)?.journals || []),
      ]);

      const payload = {
        _meta: {
          exportedAt: new Date().toISOString(),
          source: isDevPreview ? 'dev-preview-snapshot' : 'live-firestore-export',
          resourceCount: resources.length,
          journalCount: journals.length,
        },
        siteSettings,
        homePage,
        aboutPage,
        resources,
        journals,
      };

      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `cms-snapshot-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Full CMS snapshot exported from live data.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export CMS snapshot.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Live & Synchronized</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground m-0">
              Publishing & Static Site Pipeline
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed m-0">
              Manage the end-to-end publishing pipeline. Synchronize published content from
              Firestore, rebuild static HTML routes, regenerate downloadable PDF/DOCX
              materials, and deploy to GitHub Pages.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <a
              href="https://aakashdas.live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-all shadow-xs no-underline"
            >
              <span>Visit Production Website</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </a>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isBuilding}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} />
              <span>{isBuilding ? 'Dispatching Build...' : 'Trigger Build & Deploy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Build Dispatch Banner */}
      {isDispatchDone && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>GitHub Actions workflow dispatched! Static build & deployment is running on main.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDispatchDone(false)}
            className="text-xs text-muted-foreground hover:text-foreground font-sans cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Globe className="w-5 h-5" />
              </div>
              <h2 id="confirm-modal-title" className="text-lg font-semibold tracking-tight text-foreground m-0">
                Trigger Production Static Build?
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed m-0">
                This action initiates a full static build pipeline via GitHub Actions. The system will retrieve all
                published CMS items from Cloud Firestore, re-generate downloadable documents, build static HTML pages,
                and deploy to <strong>https://aakashdas.live</strong>.
              </p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-xl p-3.5 text-xs text-muted-foreground space-y-1.5 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{inventory.publishedResources} Published Educational Resources included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{inventory.publishedJournals} Published Journal Articles included</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{inventory.draftResources + inventory.draftJournals} Drafts securely excluded</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-9 px-4 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerBuild}
                className="h-9 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Confirm & Build Website</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Publishing Metrics Grid */}
      <section aria-labelledby="publishing-metrics-heading" className="space-y-4">
        <h2 id="publishing-metrics-heading" className="text-xs font-mono uppercase tracking-wider text-muted-foreground m-0">
          Publishing Inventory & Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Target Domain</span>
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="text-base font-semibold text-foreground truncate">aakashdas.live</div>
            <div className="text-xs text-muted-foreground font-mono">GitHub Pages • SSG</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Resources Library</span>
              <BookOpen className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base font-semibold text-foreground">
              {inventory.publishedResources} Published{' '}
              <span className="text-xs text-muted-foreground font-normal">
                ({inventory.draftResources} {inventory.draftResources === 1 ? 'Draft' : 'Drafts'})
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">Firestore live synced</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Journal Articles</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-base font-semibold text-foreground">
              {inventory.publishedJournals} Published{' '}
              <span className="text-xs text-muted-foreground font-normal">
                ({inventory.draftJournals} {inventory.draftJournals === 1 ? 'Draft' : 'Drafts'})
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">Firestore live synced</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Last Deployment</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-semibold text-foreground">{lastBuildTime}</div>
            <div className="text-xs text-muted-foreground font-mono">Astro SSG + Live Sync</div>
          </div>
        </div>
      </section>

      {/* Active Pipeline Status */}
      {(isBuilding || isDispatchDone) && (
        <div className="bg-card border border-primary/30 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-primary ${isBuilding ? 'animate-spin' : ''}`} />
              <h3 className="text-sm font-semibold text-foreground m-0">
                Publishing Pipeline Status
              </h3>
            </div>
            <a
              href="https://github.com/meAakashDas/this-is-this/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-primary hover:underline"
            >
              View GitHub Actions →
            </a>
          </div>

          <div className="space-y-2.5">
            {buildSteps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-muted-foreground">0{idx + 1}</span>
                  <span className="font-medium text-foreground">{step.label}</span>
                </div>
                <div>
                  {step.status === 'running' && (
                    <span className="inline-flex items-center gap-1.5 text-primary font-mono text-xs">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Running in CI</span>
                    </span>
                  )}
                  {step.status === 'success' && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>Dispatched</span>
                    </span>
                  )}
                  {step.status === 'pending' && (
                    <span className="text-muted-foreground font-mono text-xs">Queued</span>
                  )}
                  {step.status === 'failed' && (
                    <span className="text-destructive font-mono text-xs">Failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CI/CD & GitHub Actions Workflow Details */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground m-0">
                GitHub Actions CI/CD Publishing Pipeline
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Workflow file: <code className="font-mono">.github/workflows/deploy.yml</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSnapshot}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Download Snapshot JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTokenConfig(!showTokenConfig)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{showTokenConfig ? 'Hide Token Settings' : 'Configure Dispatch'}</span>
            </button>
          </div>
        </div>

        {showTokenConfig && (
          <form
            onSubmit={handleSaveToken}
            className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3 animate-in fade-in"
          >
            <div className="space-y-1">
              <label htmlFor="gh-token" className="text-xs font-medium text-foreground block">
                GitHub Personal Access Token (Workflow Dispatch & Large Attachment Upload)
              </label>
              <p className="text-[11px] text-muted-foreground m-0">
                Optional. Allows triggering remote GitHub Actions builds and committing large attachments to <code className="font-mono text-foreground">public/downloads/</code>.
                Saved strictly in your browser&apos;s <code className="font-mono text-foreground">sessionStorage</code>.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                id="gh-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 h-9 px-3 text-xs font-mono rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                className="h-9 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 cursor-pointer"
              >
                Save to Session
              </button>
            </div>
            {isTokenSaved && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono m-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>GitHub token active for this browser session.</span>
              </p>
            )}
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-mono text-[10px]">1</span>
              <span>Build-Time Content Snapshot</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed m-0">
              Retrieves published documents from Firestore into <code className="font-mono text-foreground">src/data/cms-snapshot.json</code>, validating each schema with Zod.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-mono text-[10px]">2</span>
              <span>Automated Document Generation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed m-0">
              Renders branded PDFs via headless Chromium and compiles Office DOCX files with metadata and aliases.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-mono text-[10px]">3</span>
              <span>Astro Static Compilation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed m-0">
              Compiles static HTML pages paired with real-time client Firestore synchronization for instant updates.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-mono text-[10px]">4</span>
              <span>Automated Verification & Deploy</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed m-0">
              Executes Playwright test suite in CI and deploys static build artifacts directly to GitHub Pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
