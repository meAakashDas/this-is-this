import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Eye,
  Download,
  FileText,
  Share2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { ResourceDocument } from '../../../types/cms/resource.ts';

interface ResourcePreviewProps {
  resource: Partial<ResourceDocument>;
}

export const ResourcePreview: React.FC<ResourcePreviewProps> = ({ resource }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'detail' | 'card'>('detail');

  const num = resource.resourceNumber || '001';
  const title = resource.title || 'Untitled Resource';
  const category = resource.category || 'Personal Finance';
  const desc = resource.description || 'No description provided.';
  const author = resource.author || 'Aakash Das';
  const publishedAt = resource.publishedAt || new Date().toISOString().split('T')[0];
  const attachments = (resource.attachments || []).filter((a) => a.visible !== false);
  const summaryPoints = resource.summaryPoints || [];
  const targetAudience = resource.targetAudience || '';
  const youtubeEmbed = resource.youtubeEmbed;

  return (
    <div className="space-y-4">
      {/* Viewport & View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'detail'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Detail Page View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Library Card View
            </button>
          </div>

          {/* Device Switcher */}
          <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'desktop'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'mobile'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile (390px)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Preview • {device === 'desktop' ? 'Fluid Width' : '390px Viewport'}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center bg-muted/20 rounded-xl p-4 md:p-6 border border-border/60 overflow-hidden">
        <div
          className={`transition-all duration-300 bg-background text-foreground rounded-2xl shadow-lg border border-border overflow-hidden ${
            device === 'desktop' ? 'w-full max-w-4xl' : 'w-[390px] min-w-[390px]'
          }`}
        >
          {/* Mock Browser URL Bar */}
          <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground bg-background/80 px-4 py-0.5 rounded-md border border-border/60">
              {viewMode === 'detail'
                ? `aakashdas.live/resources/${num}`
                : `aakashdas.live/resources`}
            </div>
            <div className="w-10"></div>
          </div>

          {/* Render Content */}
          <div className="p-6 md:p-10">
            {viewMode === 'card' ? (
              /* =============================================================
                 1. Library Card View Mode
                 ============================================================= */
              <div className="max-w-md mx-auto">
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs p-5 sm:p-6 flex flex-col space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">
                      NO. {num}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {category}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold tracking-tight text-foreground m-0">
                    {title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed m-0 flex-1">
                    {desc}
                  </p>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-medium">
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <span>{resource.cardActionLabel || 'Open'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                    {attachments.length > 0 && (
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* =============================================================
                 2. Full Detail Page View Mode
                 ============================================================= */
              <article className="space-y-8">
                {/* Header Section */}
                <header className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
                      NO. {num}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {category}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {title}
                  </h1>

                  <div className="text-xs font-mono text-muted-foreground">
                    Published {publishedAt} by {author}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background shadow-xs text-foreground"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save as PDF</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background shadow-xs text-foreground"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Save as DOCX</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background shadow-xs text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View as PDF</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background shadow-xs text-foreground"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </header>

                <div className="h-px bg-border w-full" />

                {/* Download Resources / Attachments Section (Immediately below header & divider) */}
                {attachments.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground m-0">
                      {resource.detailActionLabel || 'Download Resources'}
                    </h2>
                    <div className="space-y-3">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold tracking-tight text-foreground m-0">
                              {att.name}
                            </h3>
                            {att.description && (
                              <p className="text-xs text-muted-foreground m-0">
                                {att.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-border bg-secondary text-muted-foreground">
                                {att.fileExtension.toUpperCase()}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">
                                {att.fileSize}
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-medium rounded-md bg-primary text-primary-foreground shadow-xs shrink-0 cursor-default">
                            <span>Download</span>
                            <Download className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Written Educational Content (Immediately below downloadable attachments) */}
                {(resource.blocknoteHtml || resource.contentHtml) && (
                  <section className="space-y-6 pt-2">
                    <div
                      className="resource-document-content max-w-none text-foreground leading-relaxed space-y-4 my-4"
                      dangerouslySetInnerHTML={{
                        __html: (resource.blocknoteHtml || resource.contentHtml)!,
                      }}
                    />
                  </section>
                )}

                  {/* YouTube Embed */}
                  {youtubeEmbed && youtubeEmbed.videoId && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-base font-semibold text-foreground">
                        Video Walkthrough
                      </h3>
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
                        <div className="text-center p-4">
                          <img
                            src={`https://img.youtube.com/vi/${youtubeEmbed.videoId}/hqdefault.jpg`}
                            alt={youtubeEmbed.title}
                            className="max-h-48 mx-auto rounded-lg shadow-md mb-2"
                          />
                          <p className="text-xs font-semibold text-foreground">{youtubeEmbed.title}</p>
                          {youtubeEmbed.caption && (
                            <p className="text-xs text-muted-foreground mt-0.5">{youtubeEmbed.caption}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
