import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import snapshotData from '../../../data/cms-snapshot.json';
import { getAllResourcesForAdmin } from '../../../lib/cms/resources.repository.ts';
import { getAllJournalsForAdmin } from '../../../lib/cms/journals.repository.ts';

interface PublishingDashboardProps {
  isDevPreview?: boolean;
}

type DeploymentPhase = 'idle' | 'running' | 'success' | 'failed';

const WORKFLOW_DISPATCH_URL =
  'https://api.github.com/repos/meAakashDas/this-is-this/actions/workflows/deploy.yml/dispatches';
const WORKFLOW_RUNS_URL =
  'https://api.github.com/repos/meAakashDas/this-is-this/actions/workflows/deploy.yml/runs?branch=main&per_page=5';

function formatDeploymentTimestamp(isoOrDate?: string): string {
  if (!isoOrDate) return 'Not available';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const PublishingDashboard: React.FC<PublishingDashboardProps> = ({
  isDevPreview = false,
}) => {
  const initialRes = (snapshotData as any)?.resources || [];
  const initialJour = (snapshotData as any)?.journals || [];

  const [inventory, setInventory] = useState({
    publishedResources: initialRes.filter((r: any) => Boolean(r.published || r.status === 'published')).length,
    draftResources: initialRes.filter((r: any) => !Boolean(r.published || r.status === 'published') && r.status !== 'archived').length,
    publishedJournals: initialJour.filter((j: any) => Boolean(j.published && j.status !== 'draft')).length,
    draftJournals: initialJour.filter((j: any) => !j.published || j.status === 'draft').length,
  });

  const [productionStatus, setProductionStatus] = useState<'Live' | 'Deploying' | 'Failed'>('Live');
  const [lastDeploymentTime, setLastDeploymentTime] = useState<string>(() =>
    formatDeploymentTimestamp((snapshotData as any)?._meta?.generatedAt)
  );

  const [deployPhase, setDeployPhase] = useState<DeploymentPhase>('idle');
  const [deployMessage, setDeployMessage] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [needsTokenPrompt, setNeedsTokenPrompt] = useState(false);
  const [githubToken, setGithubToken] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('admin_gh_dispatch_token') || '' : ''
  );

  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Load real-time Firestore inventory and latest GitHub Actions deployment state
  useEffect(() => {
    let mounted = true;

    if (!isDevPreview) {
      Promise.all([
        getAllResourcesForAdmin().catch(() => null),
        getAllJournalsForAdmin().catch(() => null),
      ]).then(([resList, jourList]) => {
        if (!mounted) return;
        setInventory((prev) => ({
          publishedResources: resList
            ? resList.filter((r) => Boolean(r.published || r.status === 'published')).length
            : prev.publishedResources,
          draftResources: resList
            ? resList.filter((r) => !Boolean(r.published || r.status === 'published') && r.status !== 'archived').length
            : prev.draftResources,
          publishedJournals: jourList
            ? jourList.filter((j) => Boolean(j.published && j.status !== 'draft' && j.status !== 'archived')).length
            : prev.publishedJournals,
          draftJournals: jourList
            ? jourList.filter((j) => (!j.published || j.status === 'draft') && j.status !== 'archived').length
            : prev.draftJournals,
        }));
      });
    }

    // Check latest confirmed deployment run from GitHub Actions
    fetch(WORKFLOW_RUNS_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.workflow_runs?.length) return;
        const latest = data.workflow_runs[0];
        const latestSuccess = data.workflow_runs.find(
          (r: any) => r.status === 'completed' && r.conclusion === 'success'
        );
        if (latestSuccess?.updated_at) {
          setLastDeploymentTime(formatDeploymentTimestamp(latestSuccess.updated_at));
        }
        if (latest.status !== 'completed') {
          setProductionStatus('Deploying');
        } else if (latest.conclusion === 'success') {
          setProductionStatus('Live');
        } else {
          setProductionStatus('Failed');
        }
      })
      .catch(() => {
        // Offline/rate-limited: keep snapshot fallback timestamp quietly
      });

    return () => {
      mounted = false;
    };
  }, [isDevPreview]);

  const pollDeploymentConfirmation = (token: string, dispatchedAtMs: number, prevLatestId?: number) => {
    stopPolling();
    let attempts = 0;
    const maxAttempts = 60; // ~6 minutes max

    const checkStatus = async () => {
      attempts += 1;
      try {
        const res = await fetch(WORKFLOW_RUNS_URL, {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: 'application/vnd.github+json',
          },
        });

        if (!res.ok) {
          if (attempts >= maxAttempts) {
            stopPolling();
          }
          return;
        }

        const data = await res.json();
        const runs: any[] = data?.workflow_runs || [];
        const trackedRun = runs.find(
          (r) =>
            (prevLatestId && r.id > prevLatestId) ||
            Date.parse(r.created_at) >= dispatchedAtMs - 10000
        );

        if (!trackedRun) {
          if (attempts >= maxAttempts) {
            stopPolling();
            setDeployPhase('running');
            setDeployMessage(
              'Workflow dispatch accepted by GitHub Actions; waiting for run registration.'
            );
          }
          return;
        }

        if (trackedRun.status !== 'completed') {
          setProductionStatus('Deploying');
          setDeployPhase('running');
          setDeployMessage('Deployment is running on GitHub Actions...');
          return;
        }

        stopPolling();
        if (trackedRun.conclusion === 'success') {
          setProductionStatus('Live');
          setLastDeploymentTime(formatDeploymentTimestamp(trackedRun.updated_at));
          setDeployPhase('success');
          setDeployMessage('Deployment completed successfully.');
          toast.success('Deployment completed successfully.');
        } else {
          setProductionStatus('Failed');
          setDeployPhase('failed');
          const msg = `Deployment failed (${trackedRun.conclusion || 'error'}).`;
          setDeployMessage(msg);
          toast.error(msg);
        }
      } catch {
        if (attempts >= maxAttempts) {
          stopPolling();
        }
      }
    };

    pollTimerRef.current = window.setInterval(checkStatus, 6000);
  };

  const executeWorkflowDispatch = async (activeToken: string) => {
    setDeployPhase('running');
    setDeployMessage('Starting deployment on GitHub Actions...');
    setProductionStatus('Deploying');
    setNeedsTokenPrompt(false);

    let prevLatestId: number | undefined;
    try {
      const preRes = await fetch(WORKFLOW_RUNS_URL, {
        headers: {
          Authorization: `Bearer ${activeToken.trim()}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (preRes.ok) {
        const preData = await preRes.json();
        prevLatestId = preData?.workflow_runs?.[0]?.id;
      }
    } catch {
      // Ignore pre-check failure
    }

    const dispatchedAtMs = Date.now();

    try {
      const res = await fetch(WORKFLOW_DISPATCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken.trim()}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `GitHub API error (${res.status})`);
      }

      setDeployPhase('running');
      setDeployMessage('Workflow dispatched. Waiting for GitHub Actions to finish...');
      pollDeploymentConfirmation(activeToken, dispatchedAtMs, prevLatestId);
    } catch (err: any) {
      const msg = err?.message || 'Failed to trigger GitHub Actions deployment.';
      setDeployPhase('failed');
      setDeployMessage(msg);
      setProductionStatus('Failed');
      toast.error(msg);
    }
  };

  const handleTriggerBuild = async () => {
    setIsConfirmOpen(false);
    const token =
      (typeof window !== 'undefined' ? sessionStorage.getItem('admin_gh_dispatch_token') : null) ||
      githubToken;

    if (!token || !token.trim()) {
      setNeedsTokenPrompt(true);
      setDeployPhase('failed');
      setDeployMessage('Enter a GitHub workflow dispatch token to run Build & Deploy.');
      return;
    }

    await executeWorkflowDispatch(token);
  };

  const handleSaveTokenAndDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = githubToken.trim();
    if (!cleaned) {
      setDeployPhase('failed');
      setDeployMessage('Please enter a valid GitHub dispatch token.');
      return;
    }
    sessionStorage.setItem('admin_gh_dispatch_token', cleaned);
    await executeWorkflowDispatch(cleaned);
  };

  const statusTone =
    productionStatus === 'Live'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : productionStatus === 'Deploying'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      : 'border-destructive/30 bg-destructive/10 text-destructive';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground m-0">
          Publishing
        </h1>

        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={deployPhase === 'running'}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${deployPhase === 'running' ? 'animate-spin' : ''}`} />
          <span>{deployPhase === 'running' ? 'Deploying...' : 'Build & Deploy'}</span>
        </button>
      </div>

      {/* Deployment Feedback */}
      {deployMessage && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            deployPhase === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : deployPhase === 'failed'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {deployPhase === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : deployPhase === 'failed' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
            )}
            <span>{deployMessage}</span>
          </div>
          {deployPhase !== 'running' && (
            <button
              type="button"
              onClick={() => setDeployMessage(null)}
              className="text-[11px] underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Session Token Prompt (only shown on demand when unconfigured) */}
      {needsTokenPrompt && (
        <form
          onSubmit={handleSaveTokenAndDeploy}
          className="p-4 rounded-lg border border-border bg-card space-y-3"
        >
          <label htmlFor="gh-token" className="text-xs font-medium text-foreground block">
            GitHub Dispatch Token
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="gh-token"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer"
            >
              Continue & Deploy
            </button>
          </div>
        </form>
      )}

      {/* Deployment Status */}
      <div className="p-4 sm:p-5 rounded-lg border border-border bg-card grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Production Status</span>
          <span
            className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md border ${statusTone}`}
          >
            {productionStatus}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">Last Deployment</span>
          <span className="text-sm font-medium text-foreground block">{lastDeploymentTime}</span>
        </div>
      </div>

      {/* Publishing Inventory */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-foreground m-0">Publishing Inventory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Resources</span>
            <span className="text-xs font-mono text-muted-foreground">
              {inventory.publishedResources} Published · {inventory.draftResources} Draft
            </span>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Journal</span>
            <span className="text-xs font-mono text-muted-foreground">
              {inventory.publishedJournals} Published · {inventory.draftJournals} Draft
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80"
        >
          <div className="w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-lg space-y-4">
            <h2 id="confirm-modal-title" className="text-base font-semibold text-foreground m-0">
              Build & Deploy Website
            </h2>
            <p className="text-xs text-muted-foreground m-0 leading-relaxed">
              Publish {inventory.publishedResources} resources and {inventory.publishedJournals} journal articles via GitHub Actions. Draft items stay excluded.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-secondary text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerBuild}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Confirm Build & Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
