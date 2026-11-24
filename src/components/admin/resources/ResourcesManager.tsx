import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { ResourceList } from './ResourceList.tsx';
import { ResourceEditor } from './ResourceEditor.tsx';
import { ResourcePreview } from './ResourcePreview.tsx';
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
} from '../../../lib/cms/resources.repository.ts';
import type { ResourceDocument } from '../../../types/cms/resource.ts';

interface ResourcesManagerProps {
  isDevPreview?: boolean;
}

const DEV_STORAGE_KEY = 'aakashdas_cms_resources_preview';
const HIGHEST_NUM_KEY = 'aakashdas_highest_resource_number';

function calculateNextNumber(resources: ResourceDocument[]): string {
  let highestStored = 4;
  if (typeof window !== 'undefined') {
    const val = parseInt(sessionStorage.getItem(HIGHEST_NUM_KEY) || '4', 10);
    if (!isNaN(val) && val >= 4) highestStored = val;
  }
  const nums = resources
    .map((r) => parseInt(r.resourceNumber, 10))
    .filter((n) => !isNaN(n));
  const max = Math.max(highestStored, ...nums, 4);
  const next = max + 1;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(HIGHEST_NUM_KEY, String(next));
  }
  return String(next).padStart(3, '0');
}

export const ResourcesManager: React.FC<ResourcesManagerProps> = ({ isDevPreview = false }) => {
  const [resources, setResources] = useState<ResourceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [recordNotFoundId, setRecordNotFoundId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedResource, setSelectedResource] = useState<ResourceDocument | null>(null);

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
          // Live Firestore fetch with resilient fallback
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
                title: '',
                slug: '',
                category: 'Personal Finance',
                description: '',
                tags: [],
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
              setViewState('editor');
            }
          }
        }
      } catch (err) {
        console.warn('Could not load resources, falling back to baseline:', err);
        if (mounted) setResources(getBaselineFallbackResources());
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
    const nextNum = calculateNextNumber(resources);
    const newDoc: Partial<ResourceDocument> = {
      resourceNumber: nextNum,
      title: '',
      slug: '',
      category: 'Personal Finance',
      description: '',
      tags: [],
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
    setViewState('editor');
    setRecordNotFoundId(null);
    updateUrlParam(null, true);
  };

  const handleEdit = async (resource: ResourceDocument) => {
    const canonicalId = resource.resourceNumber || resource.id;
    updateUrlParam(canonicalId);
    setRecordNotFoundId(null);
    setIsRecordLoading(true);

    try {
      if (isDevPreview) {
        const foundLocal = resources.find(
          (r) => r.resourceNumber === canonicalId || r.id === canonicalId
        );
        if (foundLocal) {
          setSelectedResource(foundLocal);
          setViewState('editor');
          return;
        }
      }

      // Retrieve fresh record from database
      const fullRecord =
        (await getResourceByNumber(canonicalId)) ||
        (await getResourceById(canonicalId)) ||
        resource;
      setSelectedResource(fullRecord);
      setViewState('editor');
    } catch (err) {
      console.warn('Error loading fresh resource record, using cached:', err);
      setSelectedResource(resource);
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
    const nextNum = calculateNextNumber(resources);
    const duplicated: ResourceDocument = {
      ...resource,
      id: nextNum,
      resourceNumber: nextNum,
      title: `${resource.title} (Copy)`,
      slug: `${resource.slug}-copy`,
      published: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString().split('T')[0],
    };

    if (isDevPreview) {
      const updated = [...resources, duplicated];
      persistDevChanges(updated);
    } else {
      try {
        await createResource(duplicated);
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
      } catch (err) {
        console.error('Failed to duplicate resource in Firestore:', err);
      }
    }
  };

  const handleTogglePublish = async (resource: ResourceDocument) => {
    const willPublish = !resource.published;
    const updatedStatus = willPublish ? 'published' : 'draft';

    const updatedResource: ResourceDocument = {
      ...resource,
      published: willPublish,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const updatedList = resources.map((r) =>
        r.resourceNumber === resource.resourceNumber ? updatedResource : r
      );
      persistDevChanges(updatedList);
    } else {
      try {
        if (willPublish) {
          await publishResource(resource.id || resource.resourceNumber);
        } else {
          await unpublishResource(resource.id || resource.resourceNumber);
        }
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
      } catch (err) {
        console.error('Failed to toggle publish status:', err);
      }
    }
  };

  const handleArchive = async (resource: ResourceDocument) => {
    const isCurrentlyArchived = resource.status === 'archived';
    const newStatus = isCurrentlyArchived ? 'draft' : 'archived';

    const updatedResource: ResourceDocument = {
      ...resource,
      published: false,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const updatedList = resources.map((r) =>
        r.resourceNumber === resource.resourceNumber ? updatedResource : r
      );
      persistDevChanges(updatedList);
    } else {
      try {
        if (!isCurrentlyArchived) {
          await archiveResource(resource.id || resource.resourceNumber);
        } else {
          await unpublishResource(resource.id || resource.resourceNumber);
        }
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
      } catch (err) {
        console.error('Failed to archive resource:', err);
      }
    }
  };

  const handleDelete = async (resourceNumber: string) => {
    if (isDevPreview) {
      const updatedList = resources.filter((r) => r.resourceNumber !== resourceNumber);
      persistDevChanges(updatedList);
    } else {
      try {
        await deleteResource(resourceNumber);
        const refreshed = await getAllResourcesForAdmin();
        setResources(refreshed);
      } catch (err) {
        console.error('Failed to delete resource in Firestore:', err);
      }
    }
  };

  const handleSaveEditor = async (doc: ResourceDocument) => {
    if (isDevPreview) {
      const existingIndex = resources.findIndex(
        (r) => r.resourceNumber === doc.resourceNumber || r.id === doc.id
      );
      let updatedList: ResourceDocument[];
      if (existingIndex >= 0) {
        updatedList = [...resources];
        updatedList[existingIndex] = doc;
      } else {
        updatedList = [...resources, doc];
      }
      persistDevChanges(updatedList);
    } else {
      const canonicalId = doc.id || doc.resourceNumber;
      const existing =
        (await getResourceByNumber(doc.resourceNumber)) ||
        (await getResourceById(canonicalId));

      if (existing) {
        await updateResource(canonicalId, doc);
      } else {
        await createResource(doc);
      }
      const refreshed = await getAllResourcesForAdmin();
      setResources(refreshed);
    }

    updateUrlParam(null);
    setViewState('list');
    setSelectedResource(null);
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

  // Not Found State for direct URL access to non-existent record
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
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
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
        key={selectedResource?.id || selectedResource?.resourceNumber || 'new'}
        initialResource={selectedResource || undefined}
        existingNumbers={resources.map((r) => r.resourceNumber)}
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
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Resources List
          </button>
          <button
            type="button"
            onClick={() => setViewState('editor')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Edit This Resource
          </button>
        </div>
        <ResourcePreview resource={selectedResource} />
      </div>
    );
  }

  return (
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
  );
};
