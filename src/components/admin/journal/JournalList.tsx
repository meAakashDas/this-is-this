import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { JournalDocument, JournalStatus } from '../../../types/cms/journal.ts';

interface JournalListProps {
  articles: JournalDocument[];
  onCreate: () => void;
  onEdit: (slug: string) => void;
  onTogglePublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  isDevPreview?: boolean;
}

export const JournalList: React.FC<JournalListProps> = ({
  articles,
  onCreate,
  onEdit,
  onTogglePublish,
  onDelete,
  isDevPreview = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const currentStatus: JournalStatus = art.status || (art.published ? 'published' : 'draft');
      if (statusFilter === 'published' && currentStatus !== 'published') return false;
      if (statusFilter === 'draft' && currentStatus !== 'draft') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = (art.title || '').toLowerCase().includes(q);
        const excerptMatch = (art.excerpt || '').toLowerCase().includes(q);
        const slugMatch = (art.slug || '').toLowerCase().includes(q);
        if (!titleMatch && !excerptMatch && !slugMatch) return false;
      }

      return true;
    });
  }, [articles, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {isDevPreview && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
          <strong>Development Preview Mode:</strong> Changes are preserved locally until Google Sign-In.
        </div>
      )}

      {/* Header & Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 m-0">
          <FileText className="w-5 h-5 text-primary" />
          Journal & Articles
        </h2>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Article</span>
        </button>
      </div>

      {/* Simple Search & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles by title or excerpt..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(['all', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Article List */}
      <div className="space-y-3">
        {filteredArticles.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-9 h-9 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-foreground m-0">No articles found</p>
            <p className="text-xs text-muted-foreground mt-1 m-0">
              {searchTerm || statusFilter !== 'all'
                ? 'Try clearing your search or status filter.'
                : 'Click "Create Article" to write your first journal entry.'}
            </p>
          </div>
        ) : (
          filteredArticles.map((art) => {
            const isPub = Boolean(art.published || art.status === 'published');

            return (
              <div
                key={art.slug}
                className="article-card p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                data-article-slug={art.slug}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground m-0 truncate">
                      {art.title}
                    </h3>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0 ${
                        isPub
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isPub ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </div>

                  {art.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 m-0 max-w-3xl">
                      {art.excerpt}
                    </p>
                  )}
                </div>

                {/* Essential Actions: Edit, Publish/Unpublish, Delete */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onEdit(art.slug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs cursor-pointer"
                    aria-label={`Edit Article ${art.slug}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublish(art.slug)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-xs cursor-pointer ${
                      isPub
                        ? 'border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    aria-label={isPub ? 'Unpublish article' : 'Publish article'}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmSlug(art.slug)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-xs font-medium text-destructive transition-colors cursor-pointer"
                    aria-label={`Delete Article ${art.slug}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 rounded-full bg-destructive/10">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground m-0">Delete Article</h3>
            </div>

            <p className="text-xs text-muted-foreground m-0 leading-relaxed">
              Delete article <strong>/journal/{deleteConfirmSlug}</strong>? This permanently removes it from the website and database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSlug(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(deleteConfirmSlug);
                  setDeleteConfirmSlug(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer"
              >
                Delete Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
