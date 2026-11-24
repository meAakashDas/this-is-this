import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Archive,
  CheckCircle2,
  Star,
  ExternalLink,
  Clock,
  Calendar,
  AlertCircle,
  Tag,
  ImageIcon,
} from 'lucide-react';
import type { JournalDocument, JournalStatus } from '../../../types/cms/journal.ts';
import { JOURNAL_CATEGORIES } from '../../../data/journalCategories.ts';

interface JournalListProps {
  articles: JournalDocument[];
  onCreate: () => void;
  onEdit: (slug: string) => void;
  onPreview: (slug: string) => void;
  onDuplicate: (slug: string) => void;
  onTogglePublish: (slug: string) => void;
  onArchive: (slug: string) => void;
  onDelete: (slug: string) => void;
  isDevPreview?: boolean;
}

type SortOption = 'published-desc' | 'published-asc' | 'title' | 'updated' | 'wordCount';

export const JournalList: React.FC<JournalListProps> = ({
  articles,
  onCreate,
  onEdit,
  onPreview,
  onDuplicate,
  onTogglePublish,
  onArchive,
  onDelete,
  isDevPreview = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JournalStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>('published-desc');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);

  // Extract all unique tags across articles
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      (a.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [articles]);

  // Metrics
  const metrics = useMemo(() => {
    let published = 0;
    let drafts = 0;
    let archived = 0;
    let featured = 0;
    let missingCovers = 0;
    let missingSeo = 0;

    articles.forEach((a) => {
      const st = a.status || (a.published ? 'published' : 'draft');
      if (st === 'published') published++;
      else if (st === 'archived') archived++;
      else drafts++;

      if (a.featured) featured++;
      if (!a.coverImage) missingCovers++;
      if (!a.seo?.description && !a.excerpt) missingSeo++;
    });

    return {
      total: articles.length,
      published,
      drafts,
      archived,
      featured,
      missingCovers,
      missingSeo,
    };
  }, [articles]);

  // Filtered and sorted articles
  const filteredArticles = useMemo(() => {
    return articles
      .filter((art) => {
        // Status filter
        if (statusFilter !== 'all') {
          const currentStatus = art.status || (art.published ? 'published' : 'draft');
          if (currentStatus !== statusFilter) return false;
        }

        // Category filter
        if (categoryFilter !== 'all') {
          const matches =
            art.category.toLowerCase() === categoryFilter.toLowerCase() ||
            art.category.toLowerCase().includes(categoryFilter.toLowerCase());
          if (!matches) return false;
        }

        // Tag filter
        if (tagFilter !== 'all') {
          if (!(art.tags || []).includes(tagFilter)) return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const titleMatch = art.title.toLowerCase().includes(q);
          const slugMatch = art.slug.toLowerCase().includes(q);
          const excerptMatch = (art.excerpt || '').toLowerCase().includes(q);
          const tagMatch = (art.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!titleMatch && !slugMatch && !excerptMatch && !tagMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'published-desc':
            return (b.publishedAt || '').localeCompare(a.publishedAt || '');
          case 'published-asc':
            return (a.publishedAt || '').localeCompare(b.publishedAt || '');
          case 'title':
            return a.title.localeCompare(b.title);
          case 'updated':
            return (b.updatedAt || '').localeCompare(a.updatedAt || '');
          case 'wordCount':
            return (b.wordCount || 0) - (a.wordCount || 0);
          default:
            return 0;
        }
      });
  }, [articles, searchTerm, statusFilter, categoryFilter, tagFilter, sortOption]);

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      {isDevPreview && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Development Preview Mode:</strong> Changes are preserved in local preview storage and will not touch production Firestore.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20">
            Dev Active
          </span>
        </div>
      )}

      {/* Header and Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 m-0">
            <FileText className="w-5 h-5 text-primary" />
            Journal & Articles <span className="sr-only">CMS</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Article
        </button>
      </div>

      {/* Metrics Bar - Compact 4-status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-[11px] font-mono text-muted-foreground block">Total Articles</span>
          <span className="text-lg font-bold text-foreground mt-0.5 block">{metrics.total}</span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-[11px] font-mono text-muted-foreground block">Published</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {metrics.published}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-[11px] font-mono text-muted-foreground block">Drafts</span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            {metrics.drafts}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-[11px] font-mono text-muted-foreground block">Archived</span>
          <span className="text-lg font-bold text-muted-foreground mt-0.5 block">{metrics.archived}</span>
        </div>
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, slug, excerpt, or tag..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Categories</option>
              {JOURNAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    Tag: {t}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Sort articles"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="published-desc">Sort: Publication (Newest)</option>
              <option value="published-asc">Sort: Publication (Oldest)</option>
              <option value="title">Sort: Title (A → Z)</option>
              <option value="updated">Sort: Last Updated</option>
              <option value="wordCount">Sort: Length (Word Count)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1 text-xs border-t border-border/60">
          <span className="text-muted-foreground mr-1 text-[11px]">Status:</span>
          {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Article Records List */}
      <div className="space-y-3">
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-foreground">No articles found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || tagFilter !== 'all'
                ? 'Try clearing active search queries or filters.'
                : 'Click "Create Article" to write your first journal entry.'}
            </p>
          </div>
        ) : (
          filteredArticles.map((art) => {
            const isPub = art.published || art.status === 'published';
            const isArch = art.status === 'archived';

            return (
              <div
                key={art.slug}
                className="article-card p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                data-article-slug={art.slug}
              >
                {/* Article Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-foreground">
                      {art.category}
                    </span>
                    {art.featured && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                        isPub
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : isArch
                          ? 'border-border bg-secondary text-muted-foreground'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isPub ? 'PUBLISHED' : isArch ? 'ARCHIVED' : 'DRAFT'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {art.readTime || '4 min read'}
                    </span>
                    {art.wordCount ? (
                      <span className="text-xs text-muted-foreground font-mono">
                        • {art.wordCount} words
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-semibold text-foreground m-0 truncate">
                    {art.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 m-0 max-w-3xl">
                    {art.excerpt}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-1 flex-wrap">
                    <span>slug: /journal/{art.slug}</span>
                    <span>• published: {art.publishedAt}</span>
                    {art.tags && art.tags.length > 0 && (
                      <span>• tags: {art.tags.slice(0, 3).join(', ')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onPreview(art.slug)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                    title="Live Preview"
                    aria-label={`Preview Article ${art.title}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(art.slug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
                    aria-label={`Edit Article ${art.slug}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(art.slug)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                    title="Duplicate as Draft"
                    aria-label={`Duplicate Article ${art.slug}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublish(art.slug)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-xs ${
                      isPub
                        ? 'border-border bg-background hover:bg-secondary text-muted-foreground'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={isPub ? 'Unpublish to Draft' : 'Publish Article'}
                    aria-label={isPub ? 'Unpublish article' : 'Publish article'}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onArchive(art.slug)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                    title={isArch ? 'Unarchive Article' : 'Archive Article'}
                    aria-label={`Archive Article ${art.slug}`}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmSlug(art.slug)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shadow-xs"
                    title="Delete Article"
                    aria-label={`Delete Article ${art.slug}`}
                  >
                    <Trash2 className="w-4 h-4" />
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
              <h3 className="text-lg font-bold text-foreground m-0">Confirm Delete</h3>
            </div>

            <p className="text-xs text-muted-foreground m-0 leading-relaxed">
              Are you sure you want to delete article <strong>/journal/{deleteConfirmSlug}</strong>?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSlug(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(deleteConfirmSlug);
                  setDeleteConfirmSlug(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
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
