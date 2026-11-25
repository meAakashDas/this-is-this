import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type {
  JournalDocument,
  JournalStatus,
} from '../../../types/cms/journal.ts';
import { BlockNoteEditor } from '../resources/BlockNoteEditor.tsx';
import { JournalPreview } from './JournalPreview.tsx';
import {
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

function extractAutoExcerpt(blocks: any[], fallbackTitle: string): string {
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (!block) continue;
      if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
        const txt = blockNoteInlineToPlainText(block.content).trim();
        if (txt.length > 0) {
          return txt.length > 200 ? `${txt.slice(0, 197).trim()}...` : txt;
        }
      }
    }
  }
  return fallbackTitle.trim() || 'Journal article entry.';
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialArticle,
  existingSlugs = [],
  onSave,
  onCancel,
  isDevPreview = false,
}) => {
  const isNew = !initialArticle;

  // Mode: writing editor or preview
  const [activeMode, setActiveMode] = useState<'editor' | 'preview'>('editor');

  // Core title state
  const [title, setTitle] = useState(initialArticle?.title || '');

  // Preserve existing slug strictly; auto-generate unique slug for new articles
  const stableSlug = useMemo(() => {
    if (initialArticle?.slug) {
      return initialArticle.slug;
    }
    const base = generateSlugFromTitle(title) || `article-${Date.now()}`;
    let candidate = base;
    let counter = 2;
    while (existingSlugs.includes(candidate)) {
      candidate = `${base}-${counter}`;
      counter++;
    }
    return candidate;
  }, [initialArticle?.slug, title, existingSlugs]);

  // Publication status & feedback
  const [status, setStatus] = useState<JournalStatus>(
    initialArticle?.status || (initialArticle?.published ? 'published' : 'draft')
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  // Dynamic metrics computed internally for schema metadata
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
    return calculateWordCount(`${title} ${plainText}`);
  }, [title, plainText]);

  const readTime = useMemo(() => {
    return calculateReadingTime(wordCount);
  }, [wordCount]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
    setErrorMsg(null);
  };

  const handleBlockNoteChange = useCallback((blocks: any[]) => {
    setBlocknoteJson(blocks);
    setIsDirty(true);
    setErrorMsg(null);
  }, []);

  /**
   * Builds complete JournalDocument preserving all existing internal metadata
   * (slug, category, publishedAt, tags, coverImage, seo, etc.) while updating
   * title, content, and publication status.
   */
  const buildDocument = (targetStatus: JournalStatus): JournalDocument => {
    const now = new Date().toISOString();
    const isPub = targetStatus === 'published';
    const generatedHtml = blockNoteToHtml(blocknoteJson);
    const contentStructure = blockNoteToJournalStructure(blocknoteJson);
    const contentBlocks = htmlToJournalBlocks(generatedHtml);

    const autoExcerpt = extractAutoExcerpt(blocknoteJson, title);
    const resolvedExcerpt =
      initialArticle?.excerpt?.trim() || autoExcerpt;

    const defaultDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return {
      ...initialArticle,
      id: initialArticle?.id || stableSlug,
      slug: stableSlug,
      legacyId: initialArticle?.legacyId,
      createdAt: initialArticle?.createdAt || now,
      updatedAt: now,
      updatedBy: 'aakashdas.photo@gmail.com',
      title: title.trim(),
      subtitle: initialArticle?.subtitle || '',
      category: initialArticle?.category?.trim() || 'Learning',
      tags: initialArticle?.tags?.length ? initialArticle.tags : ['Personal Finance'],
      excerpt: resolvedExcerpt,
      author: initialArticle?.author || 'Aakash Das',
      language: initialArticle?.language || 'English',
      coverImage: initialArticle?.coverImage || undefined,
      thumbnailAlt: initialArticle?.thumbnailAlt || '',
      coverImageCaption: initialArticle?.coverImageCaption || '',
      published: isPub,
      status: targetStatus,
      featured: Boolean(initialArticle?.featured),
      order: initialArticle?.order ?? 0,
      publishedAt: initialArticle?.publishedAt || defaultDate,
      readTime,
      wordCount,
      isSample: initialArticle?.isSample || false,
      blocknoteJson,
      blocknoteHtml: generatedHtml,
      contentHtml: generatedHtml,
      tiptapJson: initialArticle?.tiptapJson,
      contentBlocks,
      content: {
        lead: contentStructure.lead || resolvedExcerpt,
        sections: contentStructure.sections || [],
      },
      seo: initialArticle?.seo || {
        title: `${title.trim()} — Journal — Aakash Das`,
        description: resolvedExcerpt,
      },
    };
  };

  const handleSave = async (action: 'draft' | 'publish') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Article title is required.');
      return;
    }

    setIsSaving(true);
    const nextStatus: JournalStatus = action === 'publish' ? 'published' : 'draft';

    try {
      const doc = buildDocument(nextStatus);
      await onSave(doc, action);
      setStatus(nextStatus);
      setIsDirty(false);
      setSuccessMsg(
        action === 'publish'
          ? isDevPreview
            ? `Article "${doc.title}" published in preview.`
            : `Article "${doc.title}" published to Cloud Firestore.`
          : isDevPreview
          ? `Article "${doc.title}" saved as draft in preview.`
          : `Article "${doc.title}" saved as draft in Cloud Firestore.`
      );
    } catch (err: any) {
      console.error('Failed to save journal article:', err);
      // Do NOT clear unsaved content or mutate status on save failure
      setErrorMsg(
        err?.message || 'Failed to save article to Cloud Firestore. Your edits remain intact.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewDoc = buildDocument(status);

  return (
    <div className="journal-editor-container space-y-6 max-w-5xl mx-auto">
      {isDevPreview && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
          <strong>Development Preview Mode:</strong> Changes are stored locally in session preview until Google Sign-In.
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shadow-xs shrink-0 cursor-pointer"
            title="Back to Journal list"
            aria-label="Back to Journal list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-foreground m-0 truncate">
              {title ? title : isNew ? 'Create Journal Article' : 'Article Editor'}
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

        {/* Actions: Cancel, Save Draft, Live Preview, Publish / Update Article */}
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
            onClick={() => setActiveMode(activeMode === 'preview' ? 'editor' : 'preview')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors shadow-xs cursor-pointer ${
              activeMode === 'preview'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-card hover:bg-secondary text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{activeMode === 'preview' ? 'Back to Writing' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('publish')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{status === 'published' ? 'Update Article' : 'Publish Article'}</span>
          </button>
        </div>
      </div>

      {/* Real Save / Error Feedback */}
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
        <JournalPreview article={previewDoc} />
      ) : (
        /* =====================================================================
           SINGLE MAIN SECTION: ARTICLE CONTENT EDITOR
           ===================================================================== */
        <section
          id="article-content-editor"
          aria-label="Article Content Editor"
          className="writing-canvas-container space-y-5"
        >
          <input
            type="text"
            placeholder="Article Title (e.g. Why I Believe in Learning in Public)"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/35 border-0 outline-none px-1 focus:ring-0 leading-tight"
          />

          <BlockNoteEditor
            initialBlocks={blocknoteJson}
            onChange={handleBlockNoteChange}
            resourceNumber={stableSlug}
            uploadPrefix={`uploads/journal/${stableSlug}`}
            isDevPreview={isDevPreview}
          />
        </section>
      )}
    </div>
  );
};
