import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Eye,
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  User,
  Tag,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { JournalDocument } from '../../../types/cms/journal.ts';

interface JournalPreviewProps {
  article: Partial<JournalDocument>;
}

export const JournalPreview: React.FC<JournalPreviewProps> = ({ article }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'detail' | 'card'>('detail');

  const title = article.title || 'Untitled Journal Article';
  const slug = article.slug || 'untitled-article';
  const category = article.category || 'Personal Finance';
  const excerpt =
    article.excerpt ||
    'A thoughtful exploration of personal finance, systems, and practical execution...';
  const author = article.author || 'Aakash Das';
  const publishedAt = article.publishedAt || 'November 2024';
  const readTime = article.readTime || '4 min read';
  const wordCount = article.wordCount || 0;
  const status = article.status || (article.published ? 'published' : 'draft');
  const blocks = article.contentBlocks || [];
  const content = article.content;

  return (
    <div className="space-y-4">
      {/* Preview Bar & Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Public Website Mirror Preview
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
              status === 'published'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : status === 'archived'
                ? 'border-border bg-secondary text-muted-foreground'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}
          >
            {status.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {wordCount} words • {readTime}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'detail'
                  ? 'bg-secondary text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Article Detail View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-secondary text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Journal List Card View
            </button>
          </div>

          {/* Device Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-md transition-colors ${
                deviceMode === 'desktop'
                  ? 'bg-secondary text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Desktop View"
              aria-label="Desktop preview"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-md transition-colors ${
                deviceMode === 'mobile'
                  ? 'bg-secondary text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Mobile (390px)"
              aria-label="Mobile preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        className={`mx-auto transition-all ${
          deviceMode === 'mobile'
            ? 'w-full max-w-[390px] border-4 border-muted-foreground/30 rounded-[32px] overflow-hidden shadow-xl my-4 bg-background'
            : 'w-full rounded-xl border border-border bg-background shadow-xs'
        }`}
      >
        {/* Mock browser top bar */}
        <div className="px-4 py-2 border-b border-border bg-secondary/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span className="truncate">
            https://aakashdas.live/journal/{viewMode === 'detail' ? slug : ''}
          </span>
          <span className="shrink-0">{deviceMode === 'mobile' ? '390px' : 'Desktop'}</span>
        </div>

        {/* Render Preview Content */}
        {viewMode === 'card' ? (
          /* ========================================================= */
          /* Journal Listing Card Mode (/journal)                      */
          /* ========================================================= */
          <div className="p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
            <div className="border-t border-b border-border divide-y divide-border">
              <article className="py-7 group">
                {/* Category & Date */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground font-medium">
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {publishedAt}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    • {readTime}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-[22px] font-semibold tracking-tight text-foreground m-0 mb-2.5 leading-snug">
                  {title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm sm:text-[15px] font-normal text-muted-foreground leading-relaxed m-0 mb-4 max-w-2xl">
                  {excerpt}
                </p>

                {/* Action Link */}
                <div className="flex items-center text-xs sm:text-[13px] font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <span>Read entry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* Article Detail Page Mode (/journal/[slug])                */
          /* ========================================================= */
          <div className="p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
            {/* Back link */}
            <nav className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Journal</span>
              </span>
            </nav>

            {/* Article Header */}
            <header className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground">
                  {category}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {publishedAt}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  • {readTime}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold tracking-tight text-foreground m-0 text-balance leading-tight">
                {title}
              </h1>

              {article.subtitle && (
                <p className="text-base sm:text-lg text-foreground/80 font-normal leading-relaxed m-0">
                  {article.subtitle}
                </p>
              )}
            </header>

            {/* Featured Image if present */}
            {article.coverImage && (
              <div className="rounded-xl overflow-hidden border border-border my-6">
                <img
                  src={article.coverImage}
                  alt={article.thumbnailAlt || title}
                  className="w-full h-auto max-h-96 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                {article.coverImageCaption && (
                  <p className="text-xs text-muted-foreground text-center py-2 px-3 bg-secondary/30 m-0">
                    {article.coverImageCaption}
                  </p>
                )}
              </div>
            )}

            <div className="h-px bg-border w-full my-6" role="separator" />

            {/* Article Body */}
            <div className="space-y-6">
              {article.contentHtml ? (
                <div
                  className="journal-document-content notion-prose"
                  dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                />
              ) : blocks.length > 0 ? (
                blocks.map((block, bIdx) => {
                  switch (block.type) {
                    case 'heading2':
                      return (
                        <h2
                          key={block.id || bIdx}
                          className="text-lg sm:text-xl font-semibold tracking-tight text-foreground m-0 pt-3"
                        >
                          {block.text}
                        </h2>
                      );
                    case 'heading3':
                      return (
                        <h3
                          key={block.id || bIdx}
                          className="text-base sm:text-lg font-semibold tracking-tight text-foreground m-0 pt-2"
                        >
                          {block.text}
                        </h3>
                      );
                    case 'heading4':
                      return (
                        <h4
                          key={block.id || bIdx}
                          className="text-sm sm:text-base font-semibold tracking-tight text-foreground m-0 pt-1"
                        >
                          {block.text}
                        </h4>
                      );
                    case 'blockquote':
                      return (
                        <blockquote
                          key={block.id || bIdx}
                          className="border-l-2 border-border pl-4 sm:pl-5 my-5 italic text-foreground/80 font-normal text-sm sm:text-[15.5px]"
                        >
                          "{block.text}"
                        </blockquote>
                      );
                    case 'callout':
                      return (
                        <div
                          key={block.id || bIdx}
                          className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1 my-4"
                        >
                          {block.title && (
                            <span className="text-xs font-semibold text-primary block">
                              {block.title}
                            </span>
                          )}
                          <p className="text-xs sm:text-sm text-foreground/90 m-0 leading-relaxed">
                            {block.text}
                          </p>
                        </div>
                      );
                    case 'bulletList':
                      return (
                        <ul
                          key={block.id || bIdx}
                          className="list-disc list-inside space-y-1 text-sm sm:text-[15.5px] text-muted-foreground my-3"
                        >
                          {(block.items || []).map((it, itIdx) => (
                            <li key={itIdx}>{it}</li>
                          ))}
                        </ul>
                      );
                    case 'numberedList':
                      return (
                        <ol
                          key={block.id || bIdx}
                          className="list-decimal list-inside space-y-1 text-sm sm:text-[15.5px] text-muted-foreground my-3"
                        >
                          {(block.items || []).map((it, itIdx) => (
                            <li key={itIdx}>{it}</li>
                          ))}
                        </ol>
                      );
                    case 'image':
                      return (
                        <figure key={block.id || bIdx} className="my-6">
                          <img
                            src={block.url}
                            alt={block.alt || 'Illustration'}
                            className="w-full rounded-lg border border-border"
                          />
                          {block.caption && (
                            <figcaption className="text-xs text-muted-foreground text-center mt-2">
                              {block.caption}
                            </figcaption>
                          )}
                        </figure>
                      );
                    case 'table':
                      return block.tableData ? (
                        <div
                          key={block.id || bIdx}
                          className="overflow-x-auto rounded-lg border border-border my-4"
                        >
                          <table className="w-full text-xs text-left">
                            <thead className="bg-secondary/60 border-b border-border">
                              <tr>
                                {block.tableData.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="p-2.5 font-semibold text-foreground">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {block.tableData.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-muted/10">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2.5 text-muted-foreground">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null;
                    case 'divider':
                      return <div key={block.id || bIdx} className="h-px bg-border w-full my-6" />;
                    case 'link':
                      return (
                        <div key={block.id || bIdx} className="my-2">
                          <a
                            href={block.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-primary hover:underline font-medium"
                          >
                            {block.text || block.url} →
                          </a>
                        </div>
                      );
                    case 'paragraph':
                    default:
                      return (
                        <p
                          key={block.id || bIdx}
                          className="text-sm sm:text-[15.5px] text-muted-foreground leading-relaxed m-0"
                        >
                          {block.text}
                        </p>
                      );
                  }
                })
              ) : content ? (
                /* Fallback to canonical content structure */
                <>
                  {content.lead && (
                    <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal m-0 mb-6">
                      {content.lead}
                    </p>
                  )}
                  {(content.sections || []).map((sec, sIdx) => (
                    <section key={sIdx} className="space-y-3.5 my-6 sm:my-8">
                      {sec.heading && (
                        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground m-0 pt-2">
                          {sec.heading}
                        </h2>
                      )}
                      {(sec.paragraphs || []).map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-sm sm:text-[15.5px] text-muted-foreground leading-relaxed m-0"
                        >
                          {para}
                        </p>
                      ))}
                      {sec.quote && (
                        <blockquote className="border-l-2 border-border pl-4 sm:pl-5 my-5 italic text-foreground/80 font-normal text-sm sm:text-[15.5px]">
                          "{sec.quote}"
                        </blockquote>
                      )}
                    </section>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No content written yet.
                </p>
              )}
            </div>

            <div className="h-px bg-border w-full my-8" role="separator" />

            {/* Pagination footer */}
            <div className="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Author: {author}</span>
              <span>Published: {publishedAt}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
