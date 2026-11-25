import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import type { ResourceDocument } from '../../../types/cms/resource.ts';

interface ResourceListProps {
  resources: ResourceDocument[];
  onCreate: () => void;
  onEdit: (resource: ResourceDocument) => void;
  onPreview?: (resource: ResourceDocument) => void;
  onDuplicate?: (resource: ResourceDocument) => void;
  onTogglePublish: (resource: ResourceDocument) => void;
  onArchive?: (resource: ResourceDocument) => void;
  onDelete: (resourceNumber: string) => void;
  isDevPreview?: boolean;
}

export const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  onCreate,
  onEdit,
  onTogglePublish,
  onDelete,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleteTarget, setDeleteTarget] = useState<ResourceDocument | null>(null);

  const filteredResources = useMemo(() => {
    return [...resources]
      .filter((res) => {
        const isPub = Boolean(res.published || res.status === 'published');
        if (statusFilter === 'published') return isPub;
        if (statusFilter === 'draft') return !isPub && res.status !== 'archived';
        return true;
      })
      .sort((a, b) =>
        a.resourceNumber.localeCompare(b.resourceNumber, undefined, { numeric: true })
      );
  }, [resources, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header: Page title and Create Resource action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <h2 className="text-xl font-semibold tracking-tight text-foreground m-0">
          Resources
        </h2>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Resource</span>
        </button>
      </div>

      {/* Simple status filter: All, Published, Draft */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Filter resources by status">
        {(['all', 'published', 'draft'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {/* Compact resource list */}
      {filteredResources.length === 0 ? (
        <div className="p-8 text-center border border-border rounded-lg bg-card text-xs text-muted-foreground">
          {statusFilter === 'all'
            ? 'No resources found. Click "Create Resource" to add one.'
            : `No ${statusFilter} resources found.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResources.map((res) => {
            const isPub = Boolean(res.published || res.status === 'published');
            const isArch = res.status === 'archived';
            const statusLabel = isPub ? 'PUBLISHED' : isArch ? 'ARCHIVED' : 'DRAFT';

            return (
              <div
                key={res.resourceNumber}
                className="resource-card px-3.5 py-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                data-resource-number={res.resourceNumber}
              >
                {/* Number, Title, Status */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-mono text-xs font-medium text-muted-foreground shrink-0">
                    NO. {res.resourceNumber}
                  </span>

                  <h3 className="text-sm font-medium text-foreground m-0 truncate min-w-0 flex-1">
                    {res.title}
                  </h3>

                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                      isPub
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : isArch
                        ? 'border-border bg-secondary text-muted-foreground'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Actions: Edit, Publish/Unpublish, Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(res)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-secondary text-foreground cursor-pointer"
                    aria-label={`Edit Resource ${res.resourceNumber}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublish(res)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                      isPub
                        ? 'border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    aria-label={`${isPub ? 'Unpublish' : 'Publish'} Resource ${res.resourceNumber}`}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(res)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-destructive cursor-pointer"
                    aria-label={`Delete Resource ${res.resourceNumber}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80">
          <div className="w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-lg space-y-4">
            <h3 className="text-base font-semibold text-foreground m-0">Delete Resource</h3>
            <p className="text-xs text-muted-foreground m-0 leading-relaxed">
              Permanently delete <strong>NO. {deleteTarget.resourceNumber}</strong> ({deleteTarget.title})?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-secondary text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(deleteTarget.resourceNumber);
                  setDeleteTarget(null);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
