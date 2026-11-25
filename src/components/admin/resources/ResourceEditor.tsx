import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { AttachmentManager, cleanupObsoleteAttachmentBinary } from './AttachmentManager.tsx';
import { BlockNoteEditor } from './BlockNoteEditor.tsx';
import {
  legacyBlocksToBlockNote,
  blockNoteToHtml,
  blockNoteToContentBlocks,
} from '../../../utils/blockNoteMigration.ts';
import { sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';
import type {
  ResourceDocument,
  CmsAttachment,
  ResourceStatus,
} from '../../../types/cms/resource.ts';

interface ResourceEditorProps {
  initialResource?: Partial<ResourceDocument>;
  existingNumbers: string[];
  existingSlugs?: { number: string; slug: string }[];
  onSave: (doc: ResourceDocument) => Promise<void>;
  onCancel: () => void;
  isDevPreview?: boolean;
}

export const ResourceEditor: React.FC<ResourceEditorProps> = ({
  initialResource,
  onSave,
  onCancel,
  isDevPreview = false,
}) => {
  const resourceNumber = (initialResource?.resourceNumber || '001').trim().padStart(3, '0');
  const displayTitle =
    initialResource?.title?.trim() || `Resource #${resourceNumber}`;

  // Section 1: Downloadable Files
  const [attachments, setAttachments] = useState<CmsAttachment[]>(
    (initialResource?.attachments || []).filter(
      (a) => a.visible !== false && !a.url?.trim().toLowerCase().startsWith('blob:')
    )
  );
  const [attachmentsMutated, setAttachmentsMutated] = useState(false);

  // Queue storage paths removed/replaced during this edit session; only delete after Firestore save succeeds
  const pendingCleanupPathsRef = useRef<Set<string>>(new Set());

  // Section 2: Resource Content (BlockNote document canvas)
  const [blocknoteJson, setBlocknoteJson] = useState<any[]>(() => {
    if (
      initialResource?.blocknoteJson &&
      Array.isArray(initialResource.blocknoteJson) &&
      initialResource.blocknoteJson.length > 0
    ) {
      return initialResource.blocknoteJson;
    }
    if (
      initialResource?.contentBlocks &&
      initialResource.contentBlocks.length > 0
    ) {
      return legacyBlocksToBlockNote(
        initialResource.contentBlocks,
        initialResource.summaryPoints,
        initialResource.targetAudience
      );
    }
    return [];
  });

  // Publication & feedback state
  const [status, setStatus] = useState<ResourceStatus>(
    initialResource?.status || (initialResource?.published ? 'published' : 'draft')
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleQueueBinaryCleanup = useCallback((storagePath: string) => {
    if (storagePath) {
      pendingCleanupPathsRef.current.add(storagePath);
    }
  }, []);

  const handleAttachmentsChange = (
    updated: CmsAttachment[],
    meta?: { attachmentsMutated?: boolean }
  ) => {
    setAttachments(updated);
    if (meta?.attachmentsMutated) {
      setAttachmentsMutated(true);
    }
    setIsDirty(true);
    setErrorMsg(null);
  };

  const handleBlockNoteChange = useCallback((blocks: any[]) => {
    setBlocknoteJson(blocks);
    setIsDirty(true);
    setErrorMsg(null);
  }, []);

  /**
   * Builds the full ResourceDocument preserving ALL existing metadata internally
   * (title, category, date, slug, resourceNumber, SEO, coverImage, ordering, etc.)
   * while updating Downloadable Files and Resource Content.
   */
  const buildDocument = (targetStatus: ResourceStatus): ResourceDocument => {
    const now = new Date().toISOString();
    const isPub = targetStatus === 'published';

    const generatedHtml = blockNoteToHtml(blocknoteJson);
    const contentBlocks = blockNoteToContentBlocks(blocknoteJson);

    const visibleAttachments = attachments.filter(
      (a) => a.visible !== false && !a.url?.trim().toLowerCase().startsWith('blob:')
    );
    const visiblePdfs = visibleAttachments.filter(
      (a) => a.fileExtension?.toLowerCase() === 'pdf' || a.isPreviewable
    );
    const visibleDocx = visibleAttachments.filter(
      (a) => a.fileExtension?.toLowerCase() === 'docx'
    );

    const existingPdfPreview = sanitizeAssetUrl(initialResource?.pdfPreviewUrl, '');
    const existingDownloadUrl = sanitizeAssetUrl(initialResource?.downloadUrl, '');
    const existingDocxUrl = sanitizeAssetUrl(initialResource?.docxUrl, '');

    const resolvedPdfPreviewUrl = attachmentsMutated
      ? (visiblePdfs[0]?.url || '')
      : (existingPdfPreview || visiblePdfs[0]?.url || '');

    const resolvedDownloadUrl = attachmentsMutated
      ? (visiblePdfs[0]?.url || visibleAttachments[0]?.url || '')
      : (existingDownloadUrl || visiblePdfs[0]?.url || visibleAttachments[0]?.url || '');

    const resolvedDocxUrl = attachmentsMutated
      ? (visibleDocx[0]?.url || '')
      : (existingDocxUrl || visibleDocx[0]?.url || '');

    const safeSlug =
      initialResource?.slug?.trim() ||
      (initialResource?.title || `resource-${resourceNumber}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `resource-${resourceNumber}`;

    return {
      ...initialResource,
      id: initialResource?.id || resourceNumber,
      resourceNumber,
      createdAt: initialResource?.createdAt || now,
      updatedAt: now,
      updatedBy: 'aakashdas.photo@gmail.com',
      title: initialResource?.title?.trim() || `Resource #${resourceNumber}`,
      slug: safeSlug,
      category: initialResource?.category?.trim() || 'Personal Finance',
      description:
        initialResource?.description?.trim() ||
        initialResource?.title?.trim() ||
        `Resource #${resourceNumber}`,
      tags: initialResource?.tags || [],
      author: initialResource?.author || 'Aakash Das',
      language: initialResource?.language || 'English',
      published: isPub,
      status: targetStatus,
      featured: Boolean(initialResource?.featured),
      order: initialResource?.order ?? 0,
      publishedAt: initialResource?.publishedAt || now.split('T')[0],
      updatedAtDate: now.split('T')[0],
      downloadUrl: resolvedDownloadUrl || '',
      pdfPreviewUrl: resolvedPdfPreviewUrl || '',
      docxUrl: resolvedDocxUrl || '',
      cardActionLabel: initialResource?.cardActionLabel || 'Open',
      detailActionLabel: initialResource?.detailActionLabel || 'Download Resources',
      attachments: visibleAttachments,
      blocknoteJson,
      contentJson: blocknoteJson,
      blocknoteHtml: generatedHtml,
      contentHtml: generatedHtml,
      contentBlocks,
      summaryPoints: initialResource?.summaryPoints || [],
      targetAudience: initialResource?.targetAudience || '',
      seo: initialResource?.seo || {
        title: `Resource #${resourceNumber} — Aakash Das`,
        description: initialResource?.description || '',
      },
    } as ResourceDocument;
  };

  const handleSave = async (targetStatus: ResourceStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (attachments.some((a) => !a.name?.trim())) {
      setErrorMsg('Every uploaded file must have a non-empty Display Name.');
      return;
    }

    setIsSaving(true);
    try {
      const doc = buildDocument(targetStatus);
      await onSave(doc);

      // Clean up obsolete binaries ONLY after Firestore save has been confirmed
      if (!isDevPreview && pendingCleanupPathsRef.current.size > 0) {
        const stillInUse = new Set(doc.attachments.map((a) => a.storagePath).filter(Boolean));
        const pathsToDelete = Array.from(pendingCleanupPathsRef.current).filter(
          (p) => !stillInUse.has(p)
        );
        pendingCleanupPathsRef.current.clear();
        await Promise.allSettled(pathsToDelete.map((p) => cleanupObsoleteAttachmentBinary(p)));
      }

      setStatus(targetStatus);
      setIsDirty(false);
      setAttachmentsMutated(false);
      setSuccessMsg(
        targetStatus === 'published'
          ? isDevPreview
            ? `Resource #${resourceNumber} published in preview.`
            : `Resource #${resourceNumber} saved and published to Cloud Firestore.`
          : isDevPreview
          ? `Resource #${resourceNumber} saved as draft in preview.`
          : `Resource #${resourceNumber} saved as draft in Cloud Firestore.`
      );
    } catch (err: any) {
      console.error('Failed to save resource:', err);
      // Do NOT clear unsaved content or change status when save fails
      setErrorMsg(
        err?.message || 'Failed to save changes to Cloud Firestore. Your edits remain intact.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="resource-editor-container space-y-6 max-w-5xl mx-auto">
      {isDevPreview && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>
            <strong>Development Preview Mode:</strong> Changes are stored locally in session preview until Google Sign-In.
          </span>
        </div>
      )}

      {/* Minimal Header & Save/Publish Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs shrink-0 cursor-pointer"
            title="Back to Resources"
            aria-label="Back to Resources"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground shrink-0">
              NO. {resourceNumber}
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground m-0 truncate">
              {displayTitle}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                status === 'published'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
            >
              {status.toUpperCase()}
            </span>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{status === 'published' ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Save Feedback Banners */}
      {errorMsg && (
        <div role="alert" className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* =====================================================================
          SECTION 1: DOWNLOADABLE FILES
          ===================================================================== */}
      <section
        id="downloadable-resources"
        aria-labelledby="downloadable-files-heading"
        className="space-y-4 pt-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            <h3 id="downloadable-files-heading" className="text-base font-semibold tracking-tight text-foreground m-0">
              1. Downloadable Files
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-foreground border border-border">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        <AttachmentManager
          resourceNumber={resourceNumber}
          attachments={attachments}
          onChange={handleAttachmentsChange}
          onQueueBinaryCleanup={handleQueueBinaryCleanup}
          isDevPreview={isDevPreview}
        />
      </section>

      {/* =====================================================================
          SECTION 2: RESOURCE CONTENT (BLOCKNOTE CANVAS)
          ===================================================================== */}
      <section
        id="resource-content"
        aria-labelledby="resource-content-heading"
        className="written-content-area pt-6 border-t border-border space-y-4"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 id="resource-content-heading" className="text-base font-semibold tracking-tight text-foreground m-0">
            2. Resource Content
          </h3>
        </div>

        <BlockNoteEditor
          initialBlocks={blocknoteJson}
          onChange={handleBlockNoteChange}
          resourceNumber={resourceNumber}
          isDevPreview={isDevPreview}
        />
      </section>
    </div>
  );
};
