import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Settings,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  BookOpen,
} from 'lucide-react';
import type {
  JournalDocument,
  JournalStatus,
  JournalContentBlock,
} from '../../../types/cms/journal.ts';
import { BlockNoteEditor } from '../resources/BlockNoteEditor.tsx';
import { JournalPreview } from './JournalPreview.tsx';
import { ImageUploader } from '../media/ImageUploader.tsx';
import {
  JOURNAL_CATEGORIES,
  DEFAULT_JOURNAL_TAGS,
  calculateWordCount,
  calculateReadingTime,
  generateSlugFromTitle,
} from '../../../data/journalCategories.ts';
import {
  journalContentToBlockNote,
  blockNoteToHtml,
  blockNoteToJournalStructure,
  blockNoteInlineToPlainText,
} from '../../../utils/blockNoteMigration.ts';
import { htmlToJournalBlocks } from '../../../utils/contentConverter.ts';

interface JournalEditorProps {
  initialArticle?: JournalDocument | null;
  existingSlugs?: string[];
  onSave: (article: JournalDocument, action: 'draft' | 'publish') => Promise<void>;
  onCancel: () => void;
  isDevPreview?: boolean;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialArticle,
  existingSlugs = [],
  onSave,
  onCancel,
  isDevPreview = false,
}) => {
  const isNew = !initialArticle;

  // Mode: editor or preview
  const [activeMode, setActiveMode] = useState<'editor' | 'preview'>('editor');
  const [showSettings, setShowSettings] = useState(false);

  // Core Identity State
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [slug, setSlug] = useState(initialArticle?.slug || '');
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '');
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || '');
  const [category, setCategory] = useState(initialArticle?.category || 'Personal Finance');
  const [author, setAuthor] = useState(initialArticle?.author || 'Aakash Das');
  const [language, setLanguage] = useState(initialArticle?.language || 'English');

  // Media State
  const [coverImage, setCoverImage] = useState(initialArticle?.coverImage || '');
  const [thumbnailAlt, setThumbnailAlt] = useState(initialArticle?.thumbnailAlt || '');
  const [coverImageCaption, setCoverImageCaption] = useState(initialArticle?.coverImageCaption || '');

  // Publishing State
  const [status, setStatus] = useState<JournalStatus>(
    initialArticle?.status || (initialArticle?.published ? 'published' : 'draft')
  );
  const [publishedAt, setPublishedAt] = useState(
    initialArticle?.publishedAt ||
      new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  const [featured, setFeatured] = useState(Boolean(initialArticle?.featured));
  const [order, setOrder] = useState(initialArticle?.order || 0);

  // Tags State
  const [tags, setTags] = useState<string[]>(initialArticle?.tags || ['Personal Finance']);
  const [newTagInput, setNewTagInput] = useState('');

  // SEO State
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seo?.title || '');
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seo?.description || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialArticle?.seo?.canonicalUrl || '');
  const [ogTitle, setOgTitle] = useState(initialArticle?.seo?.ogTitle || '');
  const [ogDescription, setOgDescription] = useState(initialArticle?.seo?.ogDescription || '');
  const [ogImage, setOgImage] = useState(initialArticle?.seo?.ogImage || '');
  const [noIndex, setNoIndex] = useState(initialArticle?.seo?.noIndex || false);

  // Continuous BlockNote Document State
  const [blocknoteJson, setBlocknoteJson] = useState<any[]>(() => {
    if (
      initialArticle?.blocknoteJson &&
      Array.isArray(initialArticle.blocknoteJson) &&
      initialArticle.blocknoteJson.length > 0
    ) {
      return initialArticle.blocknoteJson;
    }
    if (initialArticle?.content) {
      return journalContentToBlockNote(initialArticle.content);
    }
    return [];
  });

  // Status & Feedback
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Word Count & Reading Time from BlockNote blocks
  const plainText = useMemo(() => {
    if (!Array.isArray(blocknoteJson)) return '';
    return blocknoteJson
      .map((b) => {
        if (!b) return '';
        if (b.type === 'table') {
          const rows = b.content?.rows || [];
          return rows
            .flatMap((r: any) =>
              (r.cells || []).map((c: any) => blockNoteInlineToPlainText(c))
            )
            .join(' ');
        }
        return blockNoteInlineToPlainText(b.content);
      })
      .join(' ')
      .trim();
  }, [blocknoteJson]);

  const wordCount = useMemo(() => {
    return calculateWordCount(`${title} ${subtitle} ${excerpt} ${plainText}`);
  }, [title, subtitle, excerpt, plainText]);

  const readTime = useMemo(() => {
    return calculateReadingTime(wordCount);
  }, [wordCount]);

  // Auto-slugify on title change for new articles
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
    if (isNew && (!slug || slug === generateSlugFromTitle(title))) {
      setSlug(generateSlugFromTitle(newTitle));
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setIsDirty(true);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setIsDirty(true);
  };

  // Track BlockNote initialization so initial load doesn't trigger dirty flag
  const isBlockNoteInitialized = React.useRef(false);

  const handleBlockNoteChange = useCallback((blocks: any[]) => {
    setBlocknoteJson(blocks);
    if (!isBlockNoteInitialized.current) {
      isBlockNoteInitialized.current = true;
      return;
    }
    setIsDirty(true);
  }, []);

  const buildDocument = (currentStatus: JournalStatus): JournalDocument => {
    const now = new Date().toISOString();
    const isPub = currentStatus === 'published';

    // Generate semantic HTML and backward-compatible structured representations
    const generatedHtml = blockNoteToHtml(blocknoteJson);
    const contentStructure = blockNoteToJournalStructure(blocknoteJson);
    const contentBlocks = htmlToJournalBlocks(generatedHtml);

    return {
      id: initialArticle?.id || slug || generateSlugFromTitle(title) || 'draft-article',
      slug: (slug || generateSlugFromTitle(title) || 'draft-article').trim(),
      legacyId: initialArticle?.legacyId,
      createdAt: initialArticle?.createdAt || now,
      updatedAt: now,
      updatedBy: 'aakashdas.photo@gmail.com',
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category: category.trim(),
      tags,
      excerpt: excerpt.trim(),
      author: author.trim() || 'Aakash Das',
      language: language.trim() || 'English',
      coverImage: coverImage.trim() || undefined,
      thumbnailAlt: thumbnailAlt.trim() || undefined,
      coverImageCaption: coverImageCaption.trim() || undefined,
      published: isPub,
      status: currentStatus,
      featured,
      order,
      publishedAt,
      readTime,
      wordCount,
      isSample: initialArticle?.isSample || false,
      archivedAt: currentStatus === 'archived' ? now : undefined,
      blocknoteJson,
      blocknoteHtml: generatedHtml,
      contentHtml: generatedHtml,
      tiptapJson: initialArticle?.tiptapJson,
      contentBlocks,
      content: contentStructure,
      seo: {
        title: seoTitle.trim() || `${title} — Journal — Aakash Das`,
        description: seoDescription.trim() || excerpt.trim(),
        canonicalUrl: canonicalUrl.trim() || undefined,
        ogTitle: ogTitle.trim() || undefined,
        ogDescription: ogDescription.trim() || undefined,
        ogImage: ogImage.trim() || coverImage.trim() || undefined,
        noIndex,
      },
    };
  };

  const validate = (): string | null => {
    if (!title.trim()) {
      return 'Article title is required.';
    }
    if (!slug.trim()) {
      return 'Article slug is required.';
    }
    if ((isNew || slug.trim() !== initialArticle?.slug) && existingSlugs.includes(slug.trim())) {
      return 'An article with this URL slug already exists. Please choose a unique slug.';
    }
    if (!excerpt.trim()) {
      return 'Article excerpt / summary is required.';
    }
    if (!category.trim()) {
      return 'Category is required.';
    }
    return null;
  };

  const handleSave = async (targetStatus: 'draft' | 'publish') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSaving(true);
    const nextStatus: JournalStatus = targetStatus === 'publish' ? 'published' : 'draft';
    setStatus(nextStatus);

    try {
      const doc = buildDocument(nextStatus);
      await onSave(doc, targetStatus);
      setIsDirty(false);
      setSuccessMsg(
        targetStatus === 'publish'
          ? `Article "${doc.title}" published successfully!`
          : `Article "${doc.title}" saved as draft.`
      );
    } catch (err: any) {
      console.error('Failed to save journal article:', err);
      setErrorMsg(err?.message || 'Failed to save article. Please check inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewDoc = buildDocument(status);

  return (
    <div className="journal-editor-container space-y-6 max-w-5xl mx-auto">
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

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        {/* Left: Back & Title Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs shrink-0 cursor-pointer"
            title="Back to Journal list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-foreground m-0 truncate">
                {title ? title : isNew ? 'Create Journal Article' : 'Edit Article'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                  status === 'published'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : status === 'archived'
                    ? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}
              >
                {status.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {readTime}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                <BookOpen className="w-3 h-3 text-muted-foreground" />
                {wordCount} words
              </span>
              {isDirty && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 m-0">
              BlockNote continuous writing canvas for personal essays and financial analysis.
            </p>
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
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Draft
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
            onClick={() => handleSave('publish')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Publish Article
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
              <span>Interactive preview of how this article appears on the public website.</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMode('editor')}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              Back to Writing
            </button>
          </div>

          <JournalPreview article={previewDoc} />
        </div>
      ) : (
        /* =====================================================================
           UNIFIED JOURNAL WRITING CANVAS:
           1. Main Article Header (Title, Subtitle, Excerpt)
           2. Notion-Style Document Body Canvas
           3. Essential Settings & SEO (Compact & Collapsible)
           ===================================================================== */
        <div className="space-y-8">
          {/* Essential Quick Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3 flex-wrap">
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
                  {category && !JOURNAL_CATEGORIES.some((c) => c.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                  {JOURNAL_CATEGORIES.map((cat) => (
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
                  type="text"
                  placeholder="e.g. November 2024"
                  value={publishedAt}
                  onChange={(e) => {
                    setPublishedAt(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-36 px-2 py-1 text-xs rounded-md border border-input bg-background text-foreground"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSettings(true);
                const el = document.getElementById('settings-seo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Configure slug, cover image, tags, and SEO"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Editorial Settings & SEO</span>
            </button>
          </div>

          {/* Article Title, Subtitle, and Excerpt */}
          <div className="space-y-3 px-1 sm:px-2">
            <input
              type="text"
              placeholder="Article Title (e.g. Why I Believe in Learning in Public)"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/35 border-0 outline-none p-0 focus:ring-0 leading-tight"
            />

            <input
              type="text"
              placeholder="Brief secondary subtitle (optional)..."
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                setIsDirty(true);
              }}
              className="w-full text-base sm:text-lg text-foreground/80 bg-transparent placeholder:text-muted-foreground/35 border-0 outline-none p-0 focus:ring-0 leading-normal"
            />

            <textarea
              placeholder="Short introductory summary or excerpt for the article..."
              rows={2}
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                setIsDirty(true);
              }}
              className="w-full text-sm sm:text-base text-muted-foreground bg-transparent placeholder:text-muted-foreground/35 border-0 outline-none p-0 focus:ring-0 resize-none leading-relaxed"
            />
          </div>

          {/* ===================================================================
              PRIMARY BLOCKNOTE DOCUMENT CANVAS (Shared with Resources CMS)
              =================================================================== */}
          <div className="writing-canvas-container space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Article Document Body
              </span>
              <span>BlockNote continuous canvas • Type &apos;/&apos; for commands</span>
            </div>

            <BlockNoteEditor
              initialBlocks={blocknoteJson}
              onChange={handleBlockNoteChange}
              resourceNumber={slug || 'general'}
              uploadPrefix={`uploads/journal/${slug || 'general'}`}
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
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Editorial Settings, Cover Image & SEO
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    URL slug, taxonomy tags, featured cover image, homepage feature, and search meta tags
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-primary">
                {showSettings ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </button>

            {showSettings && (
              <div className="mt-3 p-5 rounded-xl border border-border bg-card space-y-6 animate-in fade-in duration-150">
                {/* Taxonomy & Identification */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Taxonomy & Categorization
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        URL Slug*
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="why-i-believe-in-learning-in-public"
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
                        Language
                      </label>
                      <input
                        type="text"
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="English / Nepali / Mixed"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Article Tags */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      Article Tags
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {tags.length} tag{tags.length === 1 ? '' : 's'} assigned
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-secondary text-foreground border border-border"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-muted-foreground hover:text-foreground text-xs ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add tag and press Enter..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(newTagInput)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground block">
                      Quick Suggested Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_JOURNAL_TAGS.map((suggested) => {
                        const isSelected = tags.includes(suggested);
                        return (
                          <button
                            key={suggested}
                            type="button"
                            onClick={() =>
                              isSelected
                                ? handleRemoveTag(suggested)
                                : handleAddTag(suggested)
                            }
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                                : 'bg-background hover:bg-secondary text-muted-foreground border-border'
                            }`}
                          >
                            {isSelected ? `✓ ${suggested}` : `+ ${suggested}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Featured Cover Image */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">
                      Featured Article Image
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <ImageUploader
                      currentImageUrl={coverImage}
                      storagePathPrefix="uploads/journal"
                      onImageSelected={(url: string) => {
                        setCoverImage(url);
                        setIsDirty(true);
                      }}
                      isDevPreview={isDevPreview}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Thumbnail Alt Text
                        </label>
                        <input
                          type="text"
                          value={thumbnailAlt}
                          onChange={(e) => {
                            setThumbnailAlt(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="Accessible description of the cover image"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Image Caption
                        </label>
                        <input
                          type="text"
                          value={coverImageCaption}
                          onChange={(e) => {
                            setCoverImageCaption(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="Optional caption displayed under image"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Featured on Homepage */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-foreground block">
                      Feature on Homepage Journal Grid
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Prominently showcases this article on the main landing page.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => {
                      setFeatured(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                {/* SEO & Social Graph Metadata */}
                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">
                    SEO & Social Graph Metadata
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      SEO Title Tag
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => {
                        setSeoTitle(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Why I Believe in Learning in Public — Aakash Das"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Meta Description
                    </label>
                    <textarea
                      rows={2}
                      value={seoDescription}
                      onChange={(e) => {
                        setSeoDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Concise description optimized for Google search results"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-medium text-foreground block">
                        Prevent search engine indexing (noindex)
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Directs search engines not to index this article.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={noIndex}
                      onChange={(e) => {
                        setNoIndex(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                    />
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
