import React, { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  FileText,
  UploadCloud,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { AttachmentManager } from './AttachmentManager.tsx';
import { BlockNoteEditor } from './BlockNoteEditor.tsx';
import { ResourcePreview } from './ResourcePreview.tsx';
import { ImagePreview, ImageUploader } from '../media/index.ts';
import { RESOURCE_CATEGORIES, RESOURCE_TYPES } from '../../../data/categories.ts';
import {
  legacyBlocksToBlockNote,
  blockNoteToHtml,
  blockNoteToContentBlocks,
} from '../../../utils/blockNoteMigration.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';
import { isTemporaryBlobUrl, sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';
import type {
  ResourceDocument,
  CmsAttachment,
  CmsExternalLink,
  ResourceStatus,
} from '../../../types/cms/resource.ts';

export type EditorMode = 'editor' | 'preview';

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
  existingNumbers,
  existingSlugs,
  onSave,
  onCancel,
  isDevPreview = false,
}) => {
  const isNew = !initialResource?.id;
  const initialCanonicalNumber = (initialResource?.resourceNumber || '').trim().padStart(3, '0');

  // Active workspace mode: editor or preview
  const [activeMode, setActiveMode] = useState<EditorMode>('editor');
  const [showSettings, setShowSettings] = useState(false);

  // Core Identity & Header Metadata
  const [resourceNumber, setResourceNumber] = useState(
    initialResource?.resourceNumber || ''
  );
  const [title, setTitle] = useState(initialResource?.title || '');
  const [slug, setSlug] = useState(initialResource?.slug || '');
  const [description, setDescription] = useState(
    initialResource?.description || ''
  );
  const [fullDescription, setFullDescription] = useState(
    initialResource?.fullDescription || ''
  );

  // Initialize BlockNote document blocks
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

  // Downloadable Resources (Attachments) & External Links
  const [attachments, setAttachments] = useState<CmsAttachment[]>(
    initialResource?.attachments || []
  );
  const [externalLinks, setExternalLinks] = useState<CmsExternalLink[]>(
    initialResource?.externalLinks || []
  );
  const [newExtLabel, setNewExtLabel] = useState('');
  const [newExtUrl, setNewExtUrl] = useState('');
  const [newExtDesc, setNewExtDesc] = useState('');

  // Primary Export / Preview URLs
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(
    sanitizeAssetUrl(initialResource?.pdfPreviewUrl, '')
  );
  const [docxUrl, setDocxUrl] = useState(
    sanitizeAssetUrl(initialResource?.docxUrl, '')
  );
  const [downloadUrl, setDownloadUrl] = useState(
    sanitizeAssetUrl(initialResource?.downloadUrl, '')
  );
  const [downloadFormat, setDownloadFormat] = useState(
    initialResource?.downloadFormat || ''
  );
  const [fileSize, setFileSize] = useState(
    initialResource?.fileSize || ''
  );

  // YouTube Walkthrough Embed
  const [youtubeVideoId, setYoutubeVideoId] = useState(
    initialResource?.youtubeEmbed?.videoId || ''
  );
  const [youtubeTitle, setYoutubeTitle] = useState(
    initialResource?.youtubeEmbed?.title || ''
  );
  const [youtubeCaption, setYoutubeCaption] = useState(
    initialResource?.youtubeEmbed?.caption || ''
  );

  // Settings & Metadata
  const [category, setCategory] = useState(
    initialResource?.category || 'Personal Finance'
  );
  const [subcategory, setSubcategory] = useState(
    initialResource?.subcategory || ''
  );
  const [resourceType, setResourceType] = useState(
    initialResource?.resourceType || 'Template'
  );
  const [tagsInput, setTagsInput] = useState(
    (initialResource?.tags || []).join(', ')
  );
  const [author, setAuthor] = useState(
    initialResource?.author || 'Aakash Das'
  );
  const [language, setLanguage] = useState(
    initialResource?.language || 'English'
  );
  const [estimatedTime, setEstimatedTime] = useState(
    initialResource?.estimatedTime || ''
  );
  const [coverImage, setCoverImage] = useState(
    sanitizeAssetUrl(initialResource?.coverImage, '')
  );
  const [thumbnailAlt, setThumbnailAlt] = useState(
    initialResource?.thumbnailAlt || ''
  );
  const [featured, setFeatured] = useState(
    Boolean(initialResource?.featured)
  );
  const [status, setStatus] = useState<ResourceStatus>(
    initialResource?.status || (initialResource?.published ? 'published' : 'draft')
  );
  const [publishedAt, setPublishedAt] = useState(
    initialResource?.publishedAt || new Date().toISOString().split('T')[0]
  );
  const [cardActionLabel, setCardActionLabel] = useState(
    initialResource?.cardActionLabel || 'Open'
  );
  const [detailActionLabel, setDetailActionLabel] = useState(
    initialResource?.detailActionLabel || 'Download Resources'
  );
  const [order, setOrder] = useState<number>(initialResource?.order || 0);

  // SEO fields
  const [seoTitle, setSeoTitle] = useState(initialResource?.seo?.title || '');
  const [seoDescription, setSeoDescription] = useState(
    initialResource?.seo?.description || ''
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    initialResource?.seo?.canonicalUrl || ''
  );

  // Status & feedback
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-slugify
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
    if (
      isNew &&
      (!slug ||
        slug ===
          title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''))
    ) {
      const autoSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleBlockNoteChange = useCallback((blocks: any[]) => {
    setBlocknoteJson(blocks);
    setIsDirty(true);
  }, []);

  /**
   * Synchronizes primary pdfPreviewUrl / downloadUrl / docxUrl when attachments are added or removed
   * so removing a PDF attachment also removes stale references from the public preview player.
   */
  const handleAttachmentsChange = (updated: CmsAttachment[]) => {
    const previousUrls = new Set(attachments.map((a) => a.url));
    setAttachments(updated);
    setIsDirty(true);

    const visiblePdfs = updated.filter(
      (a) =>
        a.visible !== false &&
        (a.fileExtension?.toLowerCase() === 'pdf' || a.isPreviewable)
    );
    const visibleDocx = updated.filter(
      (a) => a.visible !== false && a.fileExtension?.toLowerCase() === 'docx'
    );
    const firstVisible = updated.find((a) => a.visible !== false);

    // If pdfPreviewUrl was empty or belonged to a removed/hidden attachment, sync to current PDFs
    if (!pdfPreviewUrl || (previousUrls.has(pdfPreviewUrl) && !visiblePdfs.some((a) => a.url === pdfPreviewUrl))) {
      setPdfPreviewUrl(visiblePdfs[0]?.url || '');
    }
    if (!downloadUrl || (previousUrls.has(downloadUrl) && !updated.some((a) => a.visible !== false && a.url === downloadUrl))) {
      setDownloadUrl(visiblePdfs[0]?.url || firstVisible?.url || '');
    }
    if (!docxUrl || (previousUrls.has(docxUrl) && !visibleDocx.some((a) => a.url === docxUrl))) {
      setDocxUrl(visibleDocx[0]?.url || '');
    }
  };

  const handleAddExternalLink = () => {
    setErrorMsg(null);
    const label = newExtLabel.trim();
    const url = newExtUrl.trim();
    if (!label || !url) {
      setErrorMsg('External link label and URL are required.');
      return;
    }
    if (isTemporaryBlobUrl(url) || url.toLowerCase().startsWith('javascript:')) {
      setErrorMsg('Invalid or temporary external link URL.');
      return;
    }
    if (!url.startsWith('/')) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setErrorMsg('External links must begin with https:// or http://');
          return;
        }
      } catch {
        setErrorMsg('Please enter a valid external URL (e.g. https://...)');
        return;
      }
    }
    const newItem: CmsExternalLink = {
      id: `ext-${Date.now()}`,
      label,
      url,
      ...(newExtDesc.trim() ? { description: newExtDesc.trim() } : {}),
    };
    setExternalLinks([...externalLinks, newItem]);
    setNewExtLabel('');
    setNewExtUrl('');
    setNewExtDesc('');
    setIsDirty(true);
  };

  const handleUpdateExternalLink = (
    index: number,
    field: keyof CmsExternalLink,
    value: string
  ) => {
    const updated = [...externalLinks];
    updated[index] = { ...updated[index], [field]: value };
    setExternalLinks(updated);
    setIsDirty(true);
  };

  const handleRemoveExternalLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const buildDocument = (currentStatus: ResourceStatus): ResourceDocument => {
    const paddedNum = (resourceNumber || '001').trim().padStart(3, '0');
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const isPub = currentStatus === 'published';
    const now = new Date().toISOString();

    const generatedHtml = blockNoteToHtml(blocknoteJson);
    const contentBlocks = blockNoteToContentBlocks(blocknoteJson);

    const cleanCoverImage = sanitizeAssetUrl(coverImage, '');
    const cleanPdfPreviewUrl = sanitizeAssetUrl(pdfPreviewUrl, '');
    const cleanDocxUrl = sanitizeAssetUrl(docxUrl, '');
    const cleanDownloadUrl = sanitizeAssetUrl(downloadUrl, '');

    const cleanYoutube = youtubeVideoId.trim()
      ? {
          videoId: youtubeVideoId.trim(),
          title: youtubeTitle.trim() || 'Video Walkthrough',
          ...(youtubeCaption.trim() ? { caption: youtubeCaption.trim() } : {}),
        }
      : undefined;

    return {
      id: initialResource?.id || paddedNum,
      resourceNumber: paddedNum,
      createdAt: initialResource?.createdAt || now,
      updatedAt: now,
      updatedBy: 'aakashdas.photo@gmail.com',
      title: title.trim(),
      slug: slug.trim(),
      category: category.trim(),
      subcategory: subcategory.trim() || undefined,
      resourceType: resourceType.trim() || undefined,
      description: description.trim() || title.trim(),
      fullDescription: fullDescription.trim() || undefined,
      contentHtml: generatedHtml,
      blocknoteHtml: generatedHtml,
      blocknoteJson,
      contentJson: blocknoteJson,
      tags,
      coverImage: cleanCoverImage || undefined,
      thumbnailAlt: thumbnailAlt.trim() || undefined,
      author: author.trim() || 'Aakash Das',
      language: language.trim() || 'English',
      estimatedTime: estimatedTime.trim() || undefined,
      published: isPub,
      status: currentStatus,
      featured,
      order: Number.isFinite(Number(order)) ? Math.max(0, Math.floor(Number(order))) : 0,
      publishedAt,
      updatedAtDate: now.split('T')[0],
      downloadFormat: downloadFormat.trim() || undefined,
      fileSize: fileSize.trim() || undefined,
      downloadUrl: cleanDownloadUrl || undefined,
      pdfPreviewUrl: cleanPdfPreviewUrl || undefined,
      docxUrl: cleanDocxUrl || undefined,
      cardActionLabel: cardActionLabel.trim() || 'Open',
      detailActionLabel: detailActionLabel.trim() || 'Download Resources',
      attachments,
      externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
      youtubeEmbed: cleanYoutube,
      summaryPoints: initialResource?.summaryPoints || [],
      targetAudience: initialResource?.targetAudience || '',
      contentBlocks,
      prevResourceNumber: initialResource?.prevResourceNumber,
      nextResourceNumber: initialResource?.nextResourceNumber,
      relatedResourceNumbers: initialResource?.relatedResourceNumbers,
      seo: {
        title: seoTitle.trim(),
        description: seoDescription.trim(),
        canonicalUrl: canonicalUrl.trim(),
      },
    };
  };

  const validate = (): string | null => {
    if (!resourceNumber.trim()) {
      return 'Resource number is required (e.g. 001).';
    }
    const padded = resourceNumber.trim().padStart(3, '0');
    if (!/^\d{3,6}$/.test(padded)) {
      return 'Resource number must be a 3-to-6 digit numerical identifier (e.g. 001, 002).';
    }
    if (
      (isNew || padded !== initialCanonicalNumber) &&
      existingNumbers.includes(padded)
    ) {
      return `Resource #${padded} already exists. Please choose a unique resource number.`;
    }
    if (!title.trim()) {
      return 'Resource title is required.';
    }
    if (!slug.trim()) {
      return 'URL slug is required.';
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      return 'URL slug must be lowercase alphanumeric with single hyphens (e.g. my-resource-slug).';
    }
    if (!category.trim()) {
      return 'Category is required.';
    }
    if (existingSlugs && existingSlugs.length > 0) {
      const normalizedSlug = slug.trim().toLowerCase();
      const dup = existingSlugs.find(
        (s) =>
          s.slug.toLowerCase() === normalizedSlug &&
          s.number !== padded &&
          s.number !== initialCanonicalNumber
      );
      if (dup) {
        return `URL slug "${slug}" is already in use by Resource #${dup.number}. Please choose a unique slug.`;
      }
    }
    if (isTemporaryBlobUrl(coverImage)) {
      return 'Cover image cannot use a temporary blob: URL. Please re-upload or enter a permanent URL.';
    }
    if (attachments.some((a) => isTemporaryBlobUrl(a.url))) {
      return 'Attachments cannot use temporary blob: URLs.';
    }
    if (youtubeVideoId.trim() && !/^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId.trim())) {
      return 'YouTube Video ID must be an 11-character ID (e.g. dQw4w9WgXcQ).';
    }
    return null;
  };

  const handleSave = async (targetStatus: ResourceStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSaving(true);
    setStatus(targetStatus);

    try {
      const doc = buildDocument(targetStatus);
      await onSave(doc);
      setIsDirty(false);
      setSuccessMsg(
        targetStatus === 'published'
          ? `Resource #${doc.resourceNumber} published successfully!`
          : targetStatus === 'archived'
          ? `Resource #${doc.resourceNumber} archived.`
          : `Resource #${doc.resourceNumber} saved as draft.`
      );
    } catch (err: any) {
      console.error('Failed to save resource:', err);
      setErrorMsg(
        err?.message || 'Failed to save resource. Please check inputs.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewDoc = buildDocument(status);

  return (
    <div className="resource-editor-container space-y-6 max-w-5xl mx-auto">
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

      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs shrink-0 cursor-pointer"
            title="Back to Resources list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-foreground m-0 truncate">
                {title ? title : isNew ? 'Create Educational Resource' : `Edit Resource #${resourceNumber}`}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                  status === 'published'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : status === 'archived'
                    ? 'border-border bg-secondary text-muted-foreground'
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
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : status === 'published' ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {status === 'published' ? 'Unpublish to Draft' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={() => setActiveMode(activeMode === 'preview' ? 'editor' : 'preview')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors shadow-xs cursor-pointer ${
              activeMode === 'preview'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-card hover:bg-secondary text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {activeMode === 'preview' ? 'Exit Preview' : 'Live Preview'}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {status === 'published' ? 'Update Resource' : 'Publish Resource'}
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {activeMode === 'preview' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-4 h-4 text-primary" />
              <span>Interactive preview of how this educational resource appears on the public website.</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMode('editor')}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              Back to Writing
            </button>
          </div>

          <ResourcePreview resource={previewDoc} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Metadata Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground uppercase">Number:</span>
                <input
                  type="text"
                  placeholder="001"
                  value={resourceNumber}
                  onChange={(e) => {
                    setResourceNumber(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-16 px-2 py-1 text-xs font-mono font-bold rounded-md border border-input bg-background text-foreground text-center"
                />
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Category:</span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setIsDirty(true);
                  }}
                  className="px-2.5 py-1 text-xs rounded-md border border-input bg-background text-foreground"
                >
                  {category && !RESOURCE_CATEGORIES.some((c) => c.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                  {RESOURCE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Date:</span>
                <input
                  type="date"
                  value={publishedAt}
                  onChange={(e) => {
                    setPublishedAt(e.target.value);
                    setIsDirty(true);
                  }}
                  className="px-2 py-1 text-xs rounded-md border border-input bg-background text-foreground font-mono"
                />
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Slug:</span>
                <span className="text-xs font-mono text-muted-foreground">/</span>
                <input
                  type="text"
                  placeholder="starter-budget-template"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-40 sm:w-48 px-2 py-1 text-xs font-mono rounded-md border border-input bg-background text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('downloadable-resources');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-primary" />
                <span>Downloadable Resources ({attachments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (!showSettings) {
                    setTimeout(() => {
                      const el = document.getElementById('settings-seo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Configure cover image, external links, ordering, and SEO metadata"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showSettings ? 'Hide Settings' : 'Settings & SEO'}</span>
              </button>
            </div>
          </div>

          {/* Resource Title, Short Description & Full Description */}
          <div className="space-y-3 px-1 sm:px-2">
            <input
              type="text"
              placeholder="Resource Title (e.g. Starter Personal Budget Framework)"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/35 border-0 outline-none p-0 focus:ring-0 leading-tight"
            />

            <textarea
              placeholder="Write a concise overview or summary explaining what this resource covers..."
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              className="w-full text-sm sm:text-base text-muted-foreground bg-transparent placeholder:text-muted-foreground/35 border-0 outline-none p-0 focus:ring-0 resize-none leading-relaxed"
            />

            <textarea
              placeholder="Optional full description (displayed in extended overview when provided)..."
              rows={2}
              value={fullDescription}
              onChange={(e) => {
                setFullDescription(e.target.value);
                setIsDirty(true);
              }}
              className="w-full text-xs sm:text-sm text-muted-foreground/90 bg-secondary/20 rounded-lg border border-border/60 placeholder:text-muted-foreground/40 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
            />
          </div>

          {/* ===================================================================
              CONTENT AREA 1: DOWNLOADABLE RESOURCES (ATTACHMENT MANAGEMENT)
              =================================================================== */}
          <div
            id="downloadable-resources"
            className="pt-6 border-t border-border space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold tracking-tight text-foreground m-0">
                  Downloadable Resources <span className="sr-only">Educational Attachments</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-foreground border border-border">
                  {attachments.length} file{attachments.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <AttachmentManager
              resourceNumber={resourceNumber || '001'}
              attachments={attachments}
              onChange={handleAttachmentsChange}
              isDevPreview={isDevPreview}
            />
          </div>

          {/* ===================================================================
              EXTERNAL RESOURCE LINKS
              =================================================================== */}
          <div className="pt-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold tracking-tight text-foreground m-0">
                  External Resource Links
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-foreground border border-border">
                  {externalLinks.length}
                </span>
              </div>
            </div>

            {externalLinks.length > 0 && (
              <div className="space-y-2.5">
                {externalLinks.map((lnk, idx) => (
                  <div
                    key={lnk.id || idx}
                    className="p-3.5 rounded-xl border border-border bg-card grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                  >
                    <input
                      type="text"
                      value={lnk.label}
                      onChange={(e) => handleUpdateExternalLink(idx, 'label', e.target.value)}
                      placeholder="Link Label"
                      className="md:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                    <input
                      type="text"
                      value={lnk.url}
                      onChange={(e) => handleUpdateExternalLink(idx, 'url', e.target.value)}
                      placeholder="https://..."
                      className="md:col-span-5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                    />
                    <input
                      type="text"
                      value={lnk.description || ''}
                      onChange={(e) => handleUpdateExternalLink(idx, 'description', e.target.value)}
                      placeholder="Short note (optional)"
                      className="md:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExternalLink(idx)}
                      className="md:col-span-1 inline-flex items-center justify-center p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      aria-label={`Remove external link ${lnk.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3.5 rounded-xl border border-dashed border-border bg-card/50 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              <input
                type="text"
                value={newExtLabel}
                onChange={(e) => setNewExtLabel(e.target.value)}
                placeholder="Link Label (e.g. NRB Official Portal)"
                className="md:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
              />
              <input
                type="text"
                value={newExtUrl}
                onChange={(e) => setNewExtUrl(e.target.value)}
                placeholder="https://example.com/resource"
                className="md:col-span-5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
              />
              <input
                type="text"
                value={newExtDesc}
                onChange={(e) => setNewExtDesc(e.target.value)}
                placeholder="Description (optional)"
                className="md:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
              />
              <button
                type="button"
                onClick={handleAddExternalLink}
                className="md:col-span-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border cursor-pointer"
                title="Add external link"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="md:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* ===================================================================
              CONTENT AREA 2: WRITTEN CONTENT (SINGLE BLOCKNOTE CANVAS)
              =================================================================== */}
          <div className="written-content-area pt-8 border-t border-border space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold tracking-tight text-foreground m-0">
                  Written Resource Content
                </h3>
              </div>
            </div>

            <BlockNoteEditor
              initialBlocks={blocknoteJson}
              onChange={handleBlockNoteChange}
              resourceNumber={resourceNumber || '001'}
              isDevPreview={isDevPreview}
            />
          </div>

          {/* ===================================================================
              COVER IMAGE, METADATA, VISIBILITY & SEO
              =================================================================== */}
          <div id="settings-seo" className="pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Cover Image, Ordering, Visibility & SEO
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Cover image, subcategory, display order, PDF/DOCX overrides, visibility, featured status, and SEO tags
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-primary">
                {showSettings ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </button>

            {showSettings && (
              <div className="mt-3 p-5 rounded-xl border border-border bg-card space-y-6 animate-in fade-in duration-150">
                {/* Cover Image */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold text-foreground m-0">
                      Resource Cover Image
                    </h4>
                  </div>

                  {coverImage ? (
                    <ImagePreview
                      src={coverImage}
                      alt={thumbnailAlt || title || `Resource #${resourceNumber}`}
                      isTemporary={isDevPreview}
                      onRemove={() => {
                        setCoverImage('');
                        setThumbnailAlt('');
                        setIsDirty(true);
                      }}
                      onReplace={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/webp,image/jpeg,image/png';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 1200, 800, 0.84);
                              setCoverImage(compressed.dataUrl);
                              setIsDirty(true);
                            } catch (err) {
                              console.error('Failed to compress cover image:', err);
                            }
                          }
                        };
                        input.click();
                      }}
                    />
                  ) : (
                    <ImageUploader
                      isDevPreview={isDevPreview}
                      storagePathPrefix={`uploads/resources/${resourceNumber || '001'}`}
                      onImageSelected={(url) => {
                        setCoverImage(url);
                        setIsDirty(true);
                      }}
                    />
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Cover Image Alt Text
                    </label>
                    <input
                      type="text"
                      value={thumbnailAlt}
                      onChange={(e) => {
                        setThumbnailAlt(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Descriptive alt text for cover image"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Taxonomy, Ordering & Visibility */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="starter-budget-template"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => {
                        setSubcategory(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="e.g. Zero-Based Budgeting"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Resource Type
                    </label>
                    <select
                      value={resourceType}
                      onChange={(e) => {
                        setResourceType(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    >
                      {RESOURCE_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={order}
                      onChange={(e) => {
                        setOrder(parseInt(e.target.value || '0', 10));
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Visibility / Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as ResourceStatus);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="published">Published (Publicly Visible)</option>
                      <option value="draft">Draft (Hidden from Public)</option>
                      <option value="archived">Archived (Hidden from Public)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Language
                    </label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="English / Nepali"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Author
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => {
                        setAuthor(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Estimated Time
                    </label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => {
                        setEstimatedTime(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="e.g. 15 min"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => {
                        setTagsInput(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Budgeting, Cash Flow, Personal Finance"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <label htmlFor="featured-toggle" className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      id="featured-toggle"
                      checked={featured}
                      onChange={(e) => {
                        setFeatured(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="rounded-sm border-input text-primary focus:ring-primary/20"
                    />
                    <span>Feature on Homepage (pin this resource to the homepage featured resources section)</span>
                  </label>

                  {status === 'archived' && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSave('archived')}
                      className="ml-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                    >
                      Save as Archived
                    </button>
                  )}
                </div>

                {/* Primary Export & Video Walkthrough */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-foreground m-0">
                    Primary Document Exports & Video Walkthrough
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Primary PDF Preview / Download URL
                      </label>
                      <input
                        type="text"
                        value={pdfPreviewUrl.startsWith('data:') ? '[Inline PDF Data URI]' : pdfPreviewUrl}
                        readOnly={pdfPreviewUrl.startsWith('data:')}
                        onChange={(e) => {
                          setPdfPreviewUrl(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="/downloads/resource-001.pdf"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Primary DOCX Download URL
                      </label>
                      <input
                        type="text"
                        value={docxUrl.startsWith('data:') ? '[Inline DOCX Data URI]' : docxUrl}
                        readOnly={docxUrl.startsWith('data:')}
                        onChange={(e) => {
                          setDocxUrl(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="/downloads/resource-001.docx"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        YouTube Video ID (11 chars, optional)
                      </label>
                      <input
                        type="text"
                        value={youtubeVideoId}
                        onChange={(e) => {
                          setYoutubeVideoId(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. dQw4w9WgXcQ"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        YouTube Video Title
                      </label>
                      <input
                        type="text"
                        value={youtubeTitle}
                        onChange={(e) => {
                          setYoutubeTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Understanding Zero-Based Cash Flow Mechanics"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground">
                        YouTube Video Caption
                      </label>
                      <input
                        type="text"
                        value={youtubeCaption}
                        onChange={(e) => {
                          setYoutubeCaption(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Brief caption displayed beneath video embed"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Card Button Label
                      </label>
                      <input
                        type="text"
                        value={cardActionLabel}
                        onChange={(e) => {
                          setCardActionLabel(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Open"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Downloads Section Heading
                      </label>
                      <input
                        type="text"
                        value={detailActionLabel}
                        onChange={(e) => {
                          setDetailActionLabel(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Download Resources"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* SEO */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-foreground m-0">
                    Search Engine Optimization (SEO)
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        SEO Meta Title
                      </label>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => {
                          setSeoTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Starter Personal Budget Framework — Aakash Das"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        SEO Meta Description
                      </label>
                      <textarea
                        rows={2}
                        value={seoDescription}
                        onChange={(e) => {
                          setSeoDescription(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Comprehensive budgeting template and cash flow allocation framework..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Canonical URL Override (optional)
                      </label>
                      <input
                        type="text"
                        value={canonicalUrl}
                        onChange={(e) => {
                          setCanonicalUrl(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="https://aakashdas.live/resources/001"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
