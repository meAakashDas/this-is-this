import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  FileText,
  UploadCloud,
  Eye,
  Edit3,
  Copy,
  Archive,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  Star,
  FileSpreadsheet,
} from 'lucide-react';
import { RESOURCE_CATEGORIES } from '../../../data/categories.ts';
import type { ResourceDocument, ResourceStatus } from '../../../types/cms/resource.ts';

interface ResourceListProps {
  resources: ResourceDocument[];
  onCreate: () => void;
  onEdit: (resource: ResourceDocument) => void;
  onPreview: (resource: ResourceDocument) => void;
  onDuplicate: (resource: ResourceDocument) => void;
  onTogglePublish: (resource: ResourceDocument) => void;
  onArchive: (resource: ResourceDocument) => void;
  onDelete: (resourceNumber: string) => void;
  isDevPreview?: boolean;
}

type SortField = 'number-asc' | 'number-desc' | 'title' | 'updated' | 'published';

export const ResourceList: React.FC<ResourceListProps> = ({
  resources,
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
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('number-asc');

  // Metrics computation
  const metrics = useMemo(() => {
    const total = resources.length;
    const published = resources.filter((r) => r.published || r.status === 'published').length;
    const draft = resources.filter((r) => !r.published && r.status !== 'archived').length;
    const archived = resources.filter((r) => r.status === 'archived').length;
    const featured = resources.filter((r) => r.featured).length;
    const withAttachments = resources.filter((r) => r.attachments && r.attachments.length > 0).length;

    return { total, published, draft, archived, featured, withAttachments };
  }, [resources]);

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    return resources
      .filter((res) => {
        // Status match
        if (statusFilter !== 'all') {
          const currentStatus = res.status || (res.published ? 'published' : 'draft');
          if (currentStatus !== statusFilter) return false;
        }

        // Category match
        if (
          categoryFilter !== 'all' &&
          res.category.toLowerCase() !== categoryFilter.toLowerCase() &&
          !res.category.toLowerCase().includes(categoryFilter.toLowerCase())
        ) {
          return false;
        }

        // Search match
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const numMatch = res.resourceNumber.includes(q);
          const titleMatch = res.title.toLowerCase().includes(q);
          const descMatch = (res.description || '').toLowerCase().includes(q);
          const tagMatch = (res.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!numMatch && !titleMatch && !descMatch && !tagMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortField) {
          case 'number-asc':
            return a.resourceNumber.localeCompare(b.resourceNumber, undefined, { numeric: true });
          case 'number-desc':
            return b.resourceNumber.localeCompare(a.resourceNumber, undefined, { numeric: true });
          case 'title':
            return a.title.localeCompare(b.title);
          case 'updated':
            return (b.updatedAt || '').localeCompare(a.updatedAt || '');
          case 'published':
            return (b.publishedAt || '').localeCompare(a.publishedAt || '');
          default:
            return 0;
        }
      });
  }, [resources, searchTerm, statusFilter, categoryFilter, sortField]);

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      {isDevPreview && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              <strong>Development Preview Mode:</strong> Changes are preserved in local preview storage and will not touch production Firestore.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20">
            Dev Active
          </span>
        </div>
      )}

      {/* Header and New Resource CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 m-0">
            <FileText className="w-5 h-5 text-primary" />
            Educational Resources <span className="sr-only">CMS</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Resource
        </button>
      </div>

      {/* Metrics Bar - Compact 4-status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border bg-card shadow-xs">
          <span className="text-[11px] font-mono text-muted-foreground block">Total Archive</span>
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
            {metrics.draft}
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
              placeholder="Search by title, resource number (e.g. 001), tag, or description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Categories</option>
              {RESOURCE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              aria-label="Sort resources"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="number-asc">Sort: Number (001 → 999)</option>
              <option value="number-desc">Sort: Number (999 → 001)</option>
              <option value="title">Sort: Title (A → Z)</option>
              <option value="updated">Sort: Last Updated</option>
              <option value="published">Sort: Publication Date</option>
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Records List */}
      <div className="space-y-3">
        {filteredResources.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-foreground">No resources found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try clearing active search queries or status filters.'
                : 'Click "Create Resource" to publish your first educational resource.'}
            </p>
          </div>
        ) : (
          filteredResources.map((res) => {
            const isPub = res.published || res.status === 'published';
            const isArch = res.status === 'archived';
            const attCount = (res.attachments || []).length;

            return (
              <div
                key={res.resourceNumber}
                className="resource-card p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                data-resource-number={res.resourceNumber}
              >
                {/* Resource Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">
                      NO. {res.resourceNumber}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-foreground">
                      {res.category}
                    </span>
                    {res.featured && (
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
                      {isArch ? 'ARCHIVED' : isPub ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-foreground m-0 truncate">
                    {res.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 m-0 leading-relaxed max-w-3xl">
                    {res.description}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
                    <span>Slug: /{res.slug}</span>
                    <span>•</span>
                    <span>
                      {attCount} {attCount === 1 ? 'attachment' : 'attachments'}
                    </span>
                    {res.publishedAt && (
                      <>
                        <span>•</span>
                        <span>Date: {res.publishedAt}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onEdit(res)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
                    title="Edit Resource"
                    aria-label={`Edit Resource ${res.resourceNumber}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onPreview(res)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
                    title="Live Preview"
                    aria-label={`Preview Resource ${res.resourceNumber}`}
                  >
                    <Eye className="w-4 h-4 text-primary" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(res)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
                    title="Duplicate into Draft"
                    aria-label={`Duplicate Resource ${res.resourceNumber}`}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublish(res)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
                    title={isPub ? 'Unpublish to Draft' : 'Publish live'}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onArchive(res)}
                    className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                    title={isArch ? 'Restore from Archive' : 'Archive Resource'}
                    aria-label={`Archive Resource ${res.resourceNumber}`}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Permanently delete Resource #${res.resourceNumber}: "${res.title}"?`)) {
                        onDelete(res.resourceNumber);
                      }
                    }}
                    className="p-2 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                    title="Delete Resource"
                    aria-label={`Delete Resource ${res.resourceNumber}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
