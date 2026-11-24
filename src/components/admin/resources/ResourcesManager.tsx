import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ResourceList } from './ResourceList.tsx';
import { ResourceEditor } from './ResourceEditor.tsx';
import { ResourcePreview } from './ResourcePreview.tsx';
import {
  getAllResourcesForAdmin,
  createResource,
  updateResource,
  deleteResource,
  publishResource,
  unpublishResource,
  archiveResource,
} from '../../../lib/cms/resources.repository.ts';
import { resourcesData } from '../../../data/resources.ts';
import type { ResourceDocument } from '../../../types/cms/resource.ts';
import {
  legacyBlocksToBlockNote,
  blockNoteToHtml,
} from '../../../utils/blockNoteMigration.ts';

interface ResourcesManagerProps {
  isDevPreview?: boolean;
}

const DEV_STORAGE_KEY = 'aakashdas_cms_resources_preview';

// Convert existing static data to full ResourceDocument baseline
function getBaselineResources(): ResourceDocument[] {
  return resourcesData.map((res, index) => {
    const slug = res.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const cmsAttachments = (res.attachments || []).map((att, aIdx) => ({
      id: att.id,
      name: att.name,
      fileName: att.url.split('/').pop() || `${slug}-${att.id}`,
      format: att.format,
      fileSize: att.fileSize,
      url: att.url,
      fileExtension: att.url.split('.').pop() || 'pdf',
      isPreviewable: Boolean(att.isPreviewable),
      order: aIdx + 1,
      visible: true,
      uploadedAt: res.publishedAt,
    }));

    const bnBlocks = legacyBlocksToBlockNote(
      res.contentBlocks || [],
      res.summaryPoints || [],
      res.targetAudience || ''
    );
    const bnHtml = blockNoteToHtml(bnBlocks);

    return {
      id: res.resourceNumber,
      resourceNumber: res.resourceNumber,
      createdAt: res.publishedAt,
      updatedAt: res.updatedAt || res.publishedAt,
      updatedBy: 'seed-migration',
      title: res.title,
      slug,
      category: res.category,
      description: res.description,
      tags: res.tags,
      author: 'Aakash Das',
      language: 'English',
      published: res.published,
      status: res.published ? 'published' : 'draft',
      featured: index < 3,
      order: index + 1,
      publishedAt: res.publishedAt,
      downloadFormat: res.downloadFormat,
      fileSize: res.fileSize,
      downloadUrl: res.downloadUrl,
      pdfPreviewUrl: res.pdfPreviewUrl,
      docxUrl: res.docxUrl,
      cardActionLabel: 'Open',
      detailActionLabel: 'Download Resources',
      attachments: cmsAttachments,
      youtubeEmbed: res.youtubeEmbed,
      summaryPoints: res.summaryPoints || [],
      targetAudience: res.targetAudience || '',
      contentBlocks: res.contentBlocks || [],
      contentHtml: bnHtml,
      blocknoteJson: bnBlocks,
      blocknoteHtml: bnHtml,
      seo: {
        title: `Resource #${res.resourceNumber}: ${res.title} — Aakash Das`,
        description: res.description,
      },
    };
  });
}

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
  const [viewState, setViewState] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedResource, setSelectedResource] = useState<ResourceDocument | null>(null);

  // Load resources on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        if (isDevPreview && typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(DEV_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (mounted && Array.isArray(parsed) && parsed.length > 0) {
              setResources(parsed);
              setIsLoading(false);
              return;
            }
          }
          // Default to baseline static data in dev preview
          const baseline = getBaselineResources();
          if (mounted) {
            setResources(baseline);
            sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(baseline));
            setIsLoading(false);
            return;
          }
        }

        // Live Firestore fetch
        const firestoreDocs = await getAllResourcesForAdmin();
        if (mounted) {
          if (firestoreDocs && firestoreDocs.length > 0) {
            setResources(firestoreDocs);
          } else {
            setResources(getBaselineResources());
          }
        }
      } catch (err) {
        console.warn('Could not load resources from Firestore, falling back to baseline:', err);
        if (mounted) setResources(getBaselineResources());
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
  };

  const handleEdit = (resource: ResourceDocument) => {
    setSelectedResource(resource);
    setViewState('editor');
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
        setResources([...resources, duplicated]);
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
          await publishResource(resource.resourceNumber);
        } else {
          await unpublishResource(resource.resourceNumber);
        }
        setResources(
          resources.map((r) =>
            r.resourceNumber === resource.resourceNumber ? updatedResource : r
          )
        );
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
          await archiveResource(resource.resourceNumber);
        } else {
          await unpublishResource(resource.resourceNumber);
        }
        setResources(
          resources.map((r) =>
            r.resourceNumber === resource.resourceNumber ? updatedResource : r
          )
        );
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
        setResources(resources.filter((r) => r.resourceNumber !== resourceNumber));
      } catch (err) {
        console.error('Failed to delete resource in Firestore:', err);
      }
    }
  };

  const handleSaveEditor = async (doc: ResourceDocument) => {
    const existingIndex = resources.findIndex(
      (r) => r.resourceNumber === doc.resourceNumber
    );

    if (isDevPreview) {
      let updatedList: ResourceDocument[];
      if (existingIndex >= 0) {
        updatedList = [...resources];
        updatedList[existingIndex] = doc;
      } else {
        updatedList = [...resources, doc];
      }
      persistDevChanges(updatedList);
    } else {
      if (existingIndex >= 0) {
        await updateResource(doc.resourceNumber, doc);
      } else {
        await createResource(doc);
      }
      const refreshed = await getAllResourcesForAdmin();
      setResources(refreshed);
    }

    setViewState('list');
    setSelectedResource(null);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">Loading Educational Resources CMS...</p>
      </div>
    );
  }

  if (viewState === 'editor') {
    return (
      <ResourceEditor
        initialResource={selectedResource || undefined}
        existingNumbers={resources.map((r) => r.resourceNumber)}
        existingSlugs={resources.map((r) => ({ number: r.resourceNumber, slug: r.slug }))}
        onSave={handleSaveEditor}
        onCancel={() => {
          setViewState('list');
          setSelectedResource(null);
        }}
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
            onClick={() => {
              setViewState('list');
              setSelectedResource(null);
            }}
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
