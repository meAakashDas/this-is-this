import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { AttachmentManager } from './AttachmentManager.tsx';
import { BlockNoteEditor } from './BlockNoteEditor.tsx';
import { ResourcePreview } from './ResourcePreview.tsx';
import { RESOURCE_CATEGORIES, RESOURCE_TYPES } from '../../../data/categories.ts';
import {
  legacyBlocksToBlockNote,
  blockNoteToHtml,
  blockNoteToContentBlocks,
} from '../../../utils/blockNoteMigration.ts';
import type {
  ResourceDocument,
  CmsAttachment,
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

  // Downloadable Resources (Attachments)
  const [attachments, setAttachments] = useState<CmsAttachment[]>(
    initialResource?.attachments || []
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
  const [coverImage, setCoverImage] = useState(
    initialResource?.coverImage || ''
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
  const [order, setOrder] = useState(initialResource?.order || 0);

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

  const isBlockNoteInitialized = React.useRef(false);

  const handleBlockNoteChange = useCallback((blocks: any[]) => {
    setBlocknoteJson(blocks);
    if (!isBlockNoteInitialized.current) {
      isBlockNoteInitialized.current = true;
      return;
    }
    setIsDirty(true);
  }, []);

  const buildDocument = (currentStatus: ResourceStatus): ResourceDocument => {
    const paddedNum = (resourceNumber || '001').padStart(3, '0');
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const isPub = currentStatus === 'published';
    const now = new Date().toISOString();

    // Derive semantic HTML and ContentBlock[] for 100% backward compatibility
    const generatedHtml = blockNoteToHtml(blocknoteJson);
    const contentBlocks = blockNoteToContentBlocks(blocknoteJson);

    return {
      id: initialResource?.id || paddedNum,
      resourceNumber: paddedNum,
      createdAt: initialResource?.createdAt || now,
      updatedAt: now,
      updatedBy: 'aakashdas.photo@gmail.com',
      title: title.trim(),
      slug: slug.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      resourceType: resourceType.trim(),
      description: description.trim() || title.trim(),
      contentHtml: generatedHtml,
      blocknoteHtml: generatedHtml,
      blocknoteJson,
      contentJson: blocknoteJson,
      tags,
      coverImage: coverImage.trim(),
      thumbnailAlt: thumbnailAlt.trim(),
      author: author.trim() || 'Aakash Das',
      language: language.trim() || 'English',
      published: isPub,
      status: currentStatus,
      featured,
      order,
      publishedAt,
      cardActionLabel: cardActionLabel.trim() || 'Open',
      detailActionLabel: detailActionLabel.trim() || 'Download Resources',
      attachments,
      summaryPoints: [],
      targetAudience: '',
      contentBlocks,
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
    if (!/^\d{3}$/.test(padded)) {
      return 'Resource number must be a 3-digit numerical identifier (e.g. 001, 002).';
    }
    if (isNew && existingNumbers.includes(padded)) {
      return `Resource #${padded} already exists. Please choose a unique resource number.`;
    }
    if (!title.trim()) {
      return 'Resource title is required.';
    }
    if (!slug.trim()) {
      return 'URL slug is required.';
    }
    if (!category.trim()) {
      return 'Category is required.';
    }
    if (existingSlugs && existingSlugs.length > 0) {
      const normalizedSlug = slug.trim().toLowerCase();
      const dup = existingSlugs.find(
        (s) => s.slug.toLowerCase() === normalizedSlug && s.number !== padded
      );
      if (dup) {
        return `URL slug "${slug}" is already in use by Resource #${dup.number}. Please choose a unique slug.`;
      }
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
        {/* Left: Back & Title Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs shrink-0"
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
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors shadow-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-xs"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => setActiveMode(activeMode === 'preview' ? 'editor' : 'preview')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors shadow-xs ${
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
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
        <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* =====================================================================
          LIVE PREVIEW MODE
          ===================================================================== */}
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
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              Back to Writing
            </button>
          </div>

          <ResourcePreview resource={previewDoc} />
        </div>
      ) : (
        /* =====================================================================
           SIMPLIFIED BACKEND EDITOR:
           Top: Metadata Bar & Title
           Area 1: Downloadable Resources (Attachments)
           Area 2: Written Content (Single BlockNote Editor Canvas)
           ===================================================================== */
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
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Configure slug and SEO metadata"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showSettings ? 'Hide Settings' : 'Settings & SEO'}</span>
              </button>
            </div>
          </div>

          {/* Resource Title & Overview */}
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
              onChange={(updated) => {
                setAttachments(updated);
                setIsDirty(true);
              }}
              isDevPreview={isDevPreview}
            />
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
              ESSENTIAL SETTINGS & SEO (COMPACT & COLLAPSIBLE)
              =================================================================== */}
          <div id="settings-seo" className="pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Essential Settings & SEO
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Slug, catalog tags, homepage featured status, and search meta tags
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-primary">
                {showSettings ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </button>

            {showSettings && (
              <div className="mt-3 p-5 rounded-xl border border-border bg-card space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="flex items-center gap-2 pt-1">
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
                  <label htmlFor="featured-toggle" className="text-xs font-medium text-foreground cursor-pointer">
                    Feature on Homepage (pin this resource to the homepage featured resources section)
                  </label>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
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
