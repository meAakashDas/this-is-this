import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, BookOpen, AlertCircle } from 'lucide-react';
import { getPublishedResources } from '../../../lib/cms/resources.repository.ts';
import { resourcesData } from '../../../data/resources.ts';

export interface FeaturedResourcesState {
  visible: boolean;
  heading: string;
  count: number;
  customResourceIds: string[];
}

interface FeaturedResourcesEditorProps {
  resourcesConfig: FeaturedResourcesState;
  isDevPreview?: boolean;
  onChange: (updated: FeaturedResourcesState) => void;
}

interface ResourceItem {
  resourceNumber: string;
  title: string;
  category: string;
}

export const FeaturedResourcesEditor: React.FC<FeaturedResourcesEditorProps> = ({
  resourcesConfig,
  isDevPreview = false,
  onChange,
}) => {
  const [publishedResources, setPublishedResources] = useState<ResourceItem[]>([]);
  const [selectedIdToAdd, setSelectedIdToAdd] = useState('');
  const [loading, setLoading] = useState(true);

  // Load published resources from Resources CMS
  useEffect(() => {
    let isMounted = true;

    async function loadResources() {
      setLoading(true);
      // 1. In Dev Preview, check if there's preview resources in session storage
      if (isDevPreview && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('aakashdas_cms_resources_preview');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const onlyPublished = parsed
                .filter((r) => r.published === true || r.status === 'published')
                .map((r) => ({
                  resourceNumber: r.resourceNumber,
                  title: r.title,
                  category: r.category,
                }));
              if (isMounted) {
                setPublishedResources(onlyPublished);
                setLoading(false);
                return;
              }
            }
          } catch {
            // fallback
          }
        }
      }

      // 2. Try Firestore
      try {
        const firestoreDocs = await getPublishedResources();
        if (isMounted && firestoreDocs && firestoreDocs.length > 0) {
          setPublishedResources(
            firestoreDocs.map((doc) => ({
              resourceNumber: doc.resourceNumber,
              title: doc.title,
              category: doc.category,
            }))
          );
          setLoading(false);
          return;
        }
      } catch {
        // fallback to baseline data
      }

      // 3. Fallback to published baseline resources
      if (isMounted) {
        const fallback = resourcesData
          .filter((r) => r.published)
          .map((r) => ({
            resourceNumber: r.resourceNumber,
            title: r.title,
            category: r.category,
          }));
        setPublishedResources(fallback);
        setLoading(false);
      }
    }

    loadResources();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  const currentIds = resourcesConfig.customResourceIds || [];

  const handleHeadingChange = (heading: string) => {
    onChange({
      ...resourcesConfig,
      heading,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...currentIds];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange({
      ...resourcesConfig,
      customResourceIds: updated,
      count: updated.length,
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === currentIds.length - 1) return;
    const updated = [...currentIds];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange({
      ...resourcesConfig,
      customResourceIds: updated,
      count: updated.length,
    });
  };

  const handleRemove = (idToRemove: string) => {
    const updated = currentIds.filter((id) => id !== idToRemove);
    onChange({
      ...resourcesConfig,
      customResourceIds: updated,
      count: updated.length,
    });
  };

  const handleAdd = () => {
    if (!selectedIdToAdd || currentIds.includes(selectedIdToAdd)) return;
    const updated = [...currentIds, selectedIdToAdd];
    onChange({
      ...resourcesConfig,
      customResourceIds: updated,
      count: updated.length,
    });
    setSelectedIdToAdd('');
  };

  // Available to add (published resources not yet featured)
  const availableToAdd = publishedResources.filter(
    (res) => !currentIds.includes(res.resourceNumber)
  );

  return (
    <div className="space-y-4">
      {/* Section Heading Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-2">
        <label className="text-xs font-medium text-foreground block">
          Section Heading
        </label>
        <input
          type="text"
          value={resourcesConfig.heading}
          onChange={(e) => handleHeadingChange(e.target.value)}
          placeholder="Free Resources"
          className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Featured Resources List Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground m-0">
            Selected Resources
          </h3>
        </div>

        {currentIds.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
            No resources currently featured. Select a published resource below to feature it on the homepage.
          </div>
        ) : (
          <div className="space-y-2">
            {currentIds.map((id, index) => {
              const matched = publishedResources.find((r) => r.resourceNumber === id);

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-border bg-card text-muted-foreground shrink-0">
                      NO. {id}
                    </span>
                    <div className="min-w-0 truncate">
                      {matched ? (
                        <>
                          <div className="text-xs font-medium text-foreground truncate">
                            {matched.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {matched.category}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Unpublished or missing (safely hidden from public page)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ordering and removal actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Move up"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === currentIds.length - 1}
                      title="Move down"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(id)}
                      title="Remove from homepage"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Resource Selector */}
        <div className="pt-3 border-t border-border/60">
          <label className="text-[11px] font-mono text-muted-foreground block mb-2">
            Add Published Resource
          </label>
          {availableToAdd.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedIdToAdd}
                onChange={(e) => setSelectedIdToAdd(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a published resource...</option>
                {availableToAdd.map((res) => (
                  <option key={res.resourceNumber} value={res.resourceNumber}>
                    NO. {res.resourceNumber} — {res.title} ({res.category})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedIdToAdd}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic m-0">
              {loading
                ? 'Loading published resources...'
                : 'All available published resources are currently featured.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
