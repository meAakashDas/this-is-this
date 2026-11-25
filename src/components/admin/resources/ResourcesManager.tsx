import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceList } from './ResourceList.tsx';
import { ResourceEditor } from './ResourceEditor.tsx';
import { ResourcePreview } from './ResourcePreview.tsx';
import { cleanupObsoleteAttachmentBinary } from './AttachmentManager.tsx';
import {
  getAllResourcesForAdmin,
  getResourceByNumber,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  publishResource,
  unpublishResource,
  archiveResource,
  getBaselineFallbackResources,
  getNextAvailableResourceNumber,
} from '../../../lib/cms/resources.repository.ts';
import type { ResourceDocument } from '../../../types/cms/resource.ts';

interface ResourcesManagerProps {
  isDevPreview?: boolean;
}

const DEV_STORAGE_KEY = 'aakashdas_cms_resources_preview';

function calculateNextNumber(resources: ResourceDocument[]): string {
  return getNextAvailableResourceNumber(resources);
}

export const ResourcesManager: React.FC<ResourcesManagerProps> = ({ isDevPreview = false }) => {
  const [resources, setResources] = useState<ResourceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [recordNotFoundId, setRecordNotFoundId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedResource, setSelectedResource] = useState<ResourceDocument | null>(null);
  const [editorSessionKey, setEditorSessionKey] = useState<string>('editor-init');
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Helper to sync URL search params
  const updateUrlParam = useCallback((id: string | null, isCreate: boolean = false) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'resources');
    if (id) {
      url.searchParams.set('id', id);
      url.searchParams.delete('create');
    } else if (isCreate) {
      url.searchParams.set('create', 'true');
      url.searchParams.delete('id');
    } else {
      url.searchParams.delete('id');
      url.searchParams.delete('create');
      url.searchParams.delete('edit');
    }
    window.history.pushState(null, '', url.toString());
  }, []);

  // Load resources and check URL parameters on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        let loadedResources: ResourceDocument[] = [];

        if (isDevPreview && typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(DEV_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedResources = parsed;
            }
          }
          if (loadedResources.length === 0) {
            loadedResources = getBaselineFallbackResources();
            sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(loadedResources));
          }
        } else {
          // Live Firestore fetch
          loadedResources = await getAllResourcesForAdmin();
        }

        if (mounted) {
          setResources(loadedResources);

          // Check direct navigation URL search params: ?tab=resources&id=001 or create=true
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get('id') || params.get('edit');
            const isCreate = params.get('create') === 'true';

            if (targetId) {
              setIsRecordLoading(true);
              const found =
                loadedResources.find((r) => r.resourceNumber === targetId || r.id === targetId || r.slug === targetId) ||
                (await getResourceByNumber(targetId)) ||
                (await getResourceById(targetId));

              if (mounted) {
                if (found) {
                  setSelectedResource(found);
                  setEditorSessionKey(found.id || found.resourceNumber);
                  setViewState('editor');
                  setRecordNotFoundId(null);
                } else {
                  setRecordNotFoundId(targetId);
                  setViewState('list');
                }
                setIsRecordLoading(false);
              }
            } else if (isCreate) {
              const nextNum = calculateNextNumber(loadedResources);
              const newDoc: Partial<ResourceDocument> = {
                resourceNumber: nextNum,
                title: `Resource #${nextNum}`,
                slug: `resource-${nextNum}`,
                category: 'Personal Finance',
                description: `Educational resource #${nextNum}`,
                tags: ['Finance'],
                author: 'Aakash Das',
                language: 'English',
                published: false,
                status: 'draft',
                featured: false,
                order: loadedResources.length + 1,
                publishedAt: new Date().toISOString().split('T')[0],
                attachments: [],
                summaryPoints: [],
                targetAudience: '',
                contentBlocks: [],
              };
              setSelectedResource(newDoc as ResourceDocument);
              setEditorSessionKey(`create-${Date.now()}`);
              setViewState('editor');
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not load resources, falling back to baseline:', err);
        if (mounted) {
          setResources(getBaselineFallbackResources());
          setStatusFeedback({
            type: 'error',
            message: err?.message || 'Could not load resources from Firestore.',
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isDevPreview]);

  // Persist dev changes to sessionStorage
  const persistDevChanges = (updated: ResourceDocument[]) => {
    setResources(updated);
    if (isDevPreview && typeof window !== 'undefined') {
      sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Actions
  const handleCreate = () => {
    setStatusFeedback(null);
    const nextNum = calculateNextNumber(resources);
    const newDoc: Partial<ResourceDocument> = {
      resourceNumber: nextNum,
      title: `Resource #${nextNum}`,
      slug: `resource-${nextNum}`,
      category: 'Personal Finance',
      description: `Educational resource #${nextNum}`,
      tags: ['Finance'],
      author: 'Aakash Das',
      language: 'English',
      published: false,
      status: 'draft',
      featured: false,
      order: resources.length + 1,
      publishedAt: new Date().toISOString().split('T')[0],
      attachments: [],
      summaryPoints: [],
      targetAudience: '',
      contentBlocks: [],
    };
    setSelectedResource(newDoc as ResourceDocument);
    setEditorSessionKey(`create-${Date.now()}`);
    setViewState('editor');
    setRecordNotFoundId(null);
    updateUrlParam(null, true);
  };

  const handleEdit = async (resource: ResourceDocument) => {
    setStatusFeedback(null);
    const canonicalId = resource.id || resource.resourceNumber;
    updateUrlParam(canonicalId);
    setRecordNotFoundId(null);
    setIsRecordLoading(true);

    try {
      if (isDevPreview) {
        const foundLocal = resources.find(
          (r) => r.id === canonicalId || r.resourceNumber === resource.resourceNumber
        );
        if (foundLocal) {
          setSelectedResource(foundLocal);
          setEditorSessionKey(foundLocal.id || foundLocal.resourceNumber);
          setViewState('editor');
          return;
        }
      }

      const fullRecord =
        (await getResourceById(canonicalId)) ||
        (await getResourceByNumber(resource.resourceNumber)) ||
        resource;
      setSelectedResource(fullRecord);
      setEditorSessionKey(fullRecord.id || fullRecord.resourceNumber);
      setViewState('editor');
    } catch (err) {
      console.warn('Error loading fresh resource record, using cached:', err);
      setSelectedResource(resource);
      setEditorSessionKey(canonicalId);
      setViewState('editor');
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handlePreview = (resource: ResourceDocument) => {
    setSelectedResource(resource);
    setViewState('preview');
  };

  const handleDuplicate = async (resource: ResourceDocument) => {
    setStatusFeedback(null);
    const nextNum = calculateNextNumber(resources);
    const baseSlug = `${resource.slug}-copy-${nextNum}`;
    const duplicated: ResourceDocument = {
      ...resource,
      id: nextNum,
      resourceNumber: nextNum,
      title: `${resource.title} (Copy)`,
      slug: baseSlug,
      published: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString().split('T')[0],
    };

    if (isDevPreview) {
      const updated = [...resources, duplicated];
      persistDevChanges(updated);
      toast.success(`Duplicated into draft Resource #${nextNum}.`);
    } else {
      try {
        await createResource(duplicated);
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
        const msg = `Duplicated Resource #${resource.resourceNumber} into draft #${nextNum}.`;
        toast.success(msg);
        setStatusFeedback({ type: 'success', message: msg });
      } catch (err: any) {
        const msg = err?.message || 'Failed to duplicate resource in Firestore.';
        toast.error(msg);
        setStatusFeedback({ type: 'error', message: msg });
      }
    }
  };

  const handleTogglePublish = async (resource: ResourceDocument) => {
    setStatusFeedback(null);
    const willPublish = !resource.published;
    const updatedStatus = willPublish ? 'published' : 'draft';

    const updatedResource: ResourceDocument = {
      ...resource,
      published: willPublish,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const targetId = resource.id || resource.resourceNumber;
      const updatedList = resources.map((r) =>
        (r.id || r.resourceNumber) === targetId ? updatedResource : r
      );
      persistDevChanges(updatedList);
      toast.success(willPublish ? `Resource #${resource.resourceNumber} published.` : `Resource #${resource.resourceNumber} unpublished.`);
    } else {
      try {
        if (willPublish) {
          await publishResource(resource.id || resource.resourceNumber);
        } else {
          await unpublishResource(resource.id || resource.resourceNumber);
        }
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
        const msg = willPublish
          ? `Resource #${resource.resourceNumber} published to Cloud Firestore.`
          : `Resource #${resource.resourceNumber} unpublished and removed from public listing.`;
        toast.success(msg);
        setStatusFeedback({ type: 'success', message: msg });
      } catch (err: any) {
        const msg = err?.message || 'Failed to update publication status.';
        toast.error(msg);
        setStatusFeedback({ type: 'error', message: msg });
      }
    }
  };

  const handleArchive = async (resource: ResourceDocument) => {
    setStatusFeedback(null);
    const isCurrentlyArchived = resource.status === 'archived';
    const newStatus = isCurrentlyArchived ? 'draft' : 'archived';

    const updatedResource: ResourceDocument = {
      ...resource,
      published: false,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const targetId = resource.id || resource.resourceNumber;
      const updatedList = resources.map((r) =>
        (r.id || r.resourceNumber) === targetId ? updatedResource : r
      );
      persistDevChanges(updatedList);
      toast.success(isCurrentlyArchived ? `Restored #${resource.resourceNumber} to draft.` : `Archived #${resource.resourceNumber}.`);
    } else {
      try {
        if (!isCurrentlyArchived) {
          await archiveResource(resource.id || resource.resourceNumber);
        } else {
          await unpublishResource(resource.id || resource.resourceNumber);
        }
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
        const msg = isCurrentlyArchived
          ? `Resource #${resource.resourceNumber} restored to draft.`
          : `Resource #${resource.resourceNumber} archived.`;
        toast.success(msg);
        setStatusFeedback({ type: 'success', message: msg });
      } catch (err: any) {
        const msg = err?.message || 'Failed to update archive status.';
        toast.error(msg);
        setStatusFeedback({ type: 'error', message: msg });
      }
    }
  };

  const handleDelete = async (idOrNumber: string) => {
    setStatusFeedback(null);
    const targetResource = resources.find(
      (r) => r.id === idOrNumber || r.resourceNumber === idOrNumber
    );
    const displayNum = targetResource?.resourceNumber || idOrNumber;
    if (isDevPreview) {
      const updatedList = resources.filter(
        (r) => (r.id || r.resourceNumber) !== (targetResource?.id || targetResource?.resourceNumber || idOrNumber)
      );
      persistDevChanges(updatedList);
      toast.success(`Resource #${displayNum} deleted from preview.`);
    } else {
      try {
        await deleteResource(targetResource?.id || idOrNumber);
        if (targetResource?.attachments?.length) {
          await Promise.allSettled(
            targetResource.attachments
              .map((a) => a.storagePath)
              .filter((p): p is string => Boolean(p))
              .map((p) => cleanupObsoleteAttachmentBinary(p))
          );
        }
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
        const msg = `Resource #${displayNum} permanently deleted from Cloud Firestore.`;
        toast.success(msg);
        setStatusFeedback({ type: 'success', message: msg });
      } catch (err: any) {
        const msg = err?.message || 'Failed to delete resource in Firestore.';
        toast.error(msg);
        setStatusFeedback({ type: 'error', message: msg });
      }
    }
  };

  const handleSaveEditor = async (doc: ResourceDocument) => {
    setStatusFeedback(null);

    if (isDevPreview) {
      const targetInt = parseInt(String(doc.resourceNumber || ''), 10);
      const isEditing = Boolean(selectedResource?.id);
      const currentDocId = selectedResource?.id;

      const conflict = resources.find((r) => {
        const rId = r.id || r.resourceNumber;
        if (isEditing && rId === currentDocId) return false;
        return parseInt(String(r.resourceNumber || ''), 10) === targetInt;
      });
      if (conflict) {
        throw new Error(
          `Resource number NO. ${doc.resourceNumber} is already assigned to "${conflict.title}".`
        );
      }

      let savedDoc: ResourceDocument;
      let updatedList: ResourceDocument[];
      if (isEditing) {
        const existingIndex = resources.findIndex(
          (r) => (r.id || r.resourceNumber) === currentDocId
        );
        savedDoc = { ...doc, id: currentDocId! };
        updatedList = [...resources];
        if (existingIndex >= 0) {
          updatedList[existingIndex] = savedDoc;
        } else {
          updatedList.push(savedDoc);
        }
      } else {
        const newDocId = `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        savedDoc = { ...doc, id: newDocId };
        updatedList = [...resources, savedDoc];
      }

      persistDevChanges(updatedList);
      setSelectedResource(savedDoc);
      updateUrlParam(savedDoc.id || savedDoc.resourceNumber);
      toast.success(
        savedDoc.published
          ? `Resource #${savedDoc.resourceNumber} published (Dev Preview).`
          : `Resource #${savedDoc.resourceNumber} saved as draft (Dev Preview).`
      );
    } else {
      const existingDocId = selectedResource?.id;
      const existing = existingDocId ? await getResourceById(existingDocId) : null;

      const savedDoc = existing
        ? await updateResource(existing.id, doc)
        : await createResource(doc);

      const refreshed = await getAllResourcesForAdmin();
      setResources(refreshed);
      setSelectedResource(savedDoc);
      updateUrlParam(savedDoc.id || savedDoc.resourceNumber);
      const msg = savedDoc.published
        ? `Resource #${savedDoc.resourceNumber} saved & published to Cloud Firestore.`
        : `Resource #${savedDoc.resourceNumber} saved as ${savedDoc.status || 'draft'} in Cloud Firestore.`;
      toast.success(msg);
    }
  };

  const handleCancelEditor = () => {
    updateUrlParam(null);
    setViewState('list');
    setSelectedResource(null);
    setRecordNotFoundId(null);
  };

  if (isLoading || isRecordLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">
          {isRecordLoading ? 'Retrieving resource record from database...' : 'Loading Educational Resources CMS...'}
        </p>
      </div>
    );
  }

  if (recordNotFoundId && viewState === 'list') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 border border-destructive/20 bg-destructive/5 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">Resource Not Found</h3>
        <p className="text-sm text-muted-foreground">
          Resource with identifier &quot;{recordNotFoundId}&quot; was not found in the educational archive.
        </p>
        <button
          type="button"
          onClick={() => {
            setRecordNotFoundId(null);
            updateUrlParam(null);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Resources List</span>
        </button>
      </div>
    );
  }

  if (viewState === 'editor') {
    return (
      <ResourceEditor
        key={editorSessionKey}
        initialResource={selectedResource || undefined}
        existingNumbers={resources.map((r) => r.resourceNumber)}
        existingResources={resources.map((r) => ({
          id: r.id || r.resourceNumber,
          resourceNumber: r.resourceNumber,
          title: r.title,
        }))}
        defaultAutoNumber={calculateNextNumber(resources)}
        existingSlugs={resources.map((r) => ({ number: r.resourceNumber, slug: r.slug }))}
        onSave={handleSaveEditor}
        onCancel={handleCancelEditor}
        isDevPreview={isDevPreview}
      />
    );
  }

  if (viewState === 'preview' && selectedResource) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <button
            type="button"
            onClick={handleCancelEditor}
            className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ← Back to Resources List
          </button>
          <button
            type="button"
            onClick={() => setViewState('editor')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Edit This Resource
          </button>
        </div>
        <ResourcePreview resource={selectedResource} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusFeedback && (
        <div
          role="alert"
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
            statusFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{statusFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-[11px] underline cursor-pointer hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      <ResourceList
        resources={resources}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onPreview={handlePreview}
        onDuplicate={handleDuplicate}
        onTogglePublish={handleTogglePublish}
        onArchive={handleArchive}
        onDelete={handleDelete}
        isDevPreview={isDevPreview}
      />
    </div>
  );
};
