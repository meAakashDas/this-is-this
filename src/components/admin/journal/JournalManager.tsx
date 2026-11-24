import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { JournalDocument } from '../../../types/cms/journal.ts';
import { JournalList } from './JournalList.tsx';
import { JournalEditor } from './JournalEditor.tsx';
import { JournalPreview } from './JournalPreview.tsx';
import { sampleJournalEntries } from '../../../data/journal.ts';
import {
  calculateWordCount,
  calculateReadingTime,
  contentStructureToBlocks,
  extractTextFromBlocks,
} from '../../../data/journalCategories.ts';
import {
  journalContentToBlockNote,
  blockNoteToHtml,
} from '../../../utils/blockNoteMigration.ts';
import {
  getAllJournalsForAdmin,
  createJournal,
  updateJournal,
  publishJournal,
  unpublishJournal,
  archiveJournal,
  duplicateJournal,
  deleteJournal,
} from '../../../lib/cms/journals.repository.ts';

const PREVIEW_STORAGE_KEY = 'aakashdas_cms_journal_preview';

interface JournalManagerProps {
  isDevPreview?: boolean;
}

export const JournalManager: React.FC<JournalManagerProps> = ({ isDevPreview = false }) => {
  const [articles, setArticles] = useState<JournalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Convert static sample journal entries into canonical JournalDocuments
  const getInitialBaselineArticles = (): JournalDocument[] => {
    return sampleJournalEntries.map((sample, idx) => {
      const blocks = contentStructureToBlocks(sample.content);
      const bnBlocks = journalContentToBlockNote(sample.content);
      const bnHtml = blockNoteToHtml(bnBlocks);
      const text = extractTextFromBlocks(blocks);
      const words = calculateWordCount(`${sample.title} ${sample.excerpt} ${text}`);
      const readTime = calculateReadingTime(words);
      const now = new Date().toISOString();

      return {
        id: sample.slug,
        legacyId: sample.id,
        slug: sample.slug,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'aakashdas.photo@gmail.com',
        title: sample.title,
        category: sample.category,
        tags: [sample.category, 'Editorial'],
        excerpt: sample.excerpt,
        author: 'Aakash Das',
        language: 'English',
        published: true,
        status: 'published',
        featured: idx === 0,
        order: idx + 1,
        publishedAt: sample.publishedAt,
        readTime: sample.readTime || readTime,
        wordCount: words,
        isSample: sample.isSample,
        content: sample.content,
        contentBlocks: blocks,
        blocknoteJson: bnBlocks,
        blocknoteHtml: bnHtml,
        contentHtml: bnHtml,
        seo: {
          title: `${sample.title} — Journal — Aakash Das`,
          description: sample.excerpt,
        },
      };
    });
  };

  // Load articles
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Dev Preview Mode: read from sessionStorage
      if (isDevPreview) {
        try {
          const cached = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
          if (cached) {
            setArticles(JSON.parse(cached));
          } else {
            const baseline = getInitialBaselineArticles();
            setArticles(baseline);
            sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(baseline));
          }
        } catch (e) {
          console.warn('Failed to read journal from sessionStorage:', e);
          setArticles(getInitialBaselineArticles());
        }
        setLoading(false);
        return;
      }

      // Production mode: fetch from Firestore with fallback to baseline
      try {
        const firestoreArticles = await getAllJournalsForAdmin();
        if (firestoreArticles.length > 0) {
          setArticles(firestoreArticles);
        } else {
          setArticles(getInitialBaselineArticles());
        }
      } catch (err) {
        console.warn('Could not fetch journals from Firestore, using baseline:', err);
        setArticles(getInitialBaselineArticles());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isDevPreview]);

  // Persist helper for preview mode
  const persistArticles = (updated: JournalDocument[]) => {
    setArticles(updated);
    if (isDevPreview) {
      try {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist journal to sessionStorage:', e);
      }
    }
  };

  // Navigation handlers
  const handleCreate = () => {
    setSelectedSlug(null);
    setActiveView('editor');
  };

  const handleEdit = (slug: string) => {
    setSelectedSlug(slug);
    setActiveView('editor');
  };

  const handlePreview = (slug: string) => {
    setSelectedSlug(slug);
    setActiveView('preview');
  };

  const handleBackToList = () => {
    setSelectedSlug(null);
    setActiveView('list');
  };

  // CRUD actions
  const handleSaveArticle = async (
    doc: JournalDocument,
    action: 'draft' | 'publish'
  ): Promise<void> => {
    const isPub = action === 'publish';
    const finalDoc: JournalDocument = {
      ...doc,
      published: isPub,
      status: isPub ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const existingIdx = articles.findIndex((a) => a.slug === finalDoc.slug);
      let updated: JournalDocument[];
      if (existingIdx >= 0) {
        updated = articles.map((a, i) => (i === existingIdx ? finalDoc : a));
      } else {
        updated = [finalDoc, ...articles];
      }
      persistArticles(updated);
      setSelectedSlug(finalDoc.slug);
      return;
    }

    // Production mode
    const existing = articles.find((a) => a.slug === finalDoc.slug);
    if (existing) {
      await updateJournal(finalDoc.slug, finalDoc);
    } else {
      await createJournal(finalDoc);
    }

    const updated = articles.some((a) => a.slug === finalDoc.slug)
      ? articles.map((a) => (a.slug === finalDoc.slug ? finalDoc : a))
      : [finalDoc, ...articles];
    setArticles(updated);
    setSelectedSlug(finalDoc.slug);
  };

  const handleTogglePublish = async (slug: string) => {
    const target = articles.find((a) => a.slug === slug);
    if (!target) return;
    const isCurrentlyPub = target.published || target.status === 'published';
    const nextStatus = isCurrentlyPub ? 'draft' : 'published';

    if (isDevPreview) {
      const updated = articles.map((a) =>
        a.slug === slug
          ? {
              ...a,
              published: !isCurrentlyPub,
              status: nextStatus as any,
              updatedAt: new Date().toISOString(),
            }
          : a
      );
      persistArticles(updated);
      return;
    }

    if (isCurrentlyPub) {
      await unpublishJournal(slug);
    } else {
      await publishJournal(slug);
    }

    setArticles(
      articles.map((a) =>
        a.slug === slug
          ? {
              ...a,
              published: !isCurrentlyPub,
              status: nextStatus as any,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleArchive = async (slug: string) => {
    const target = articles.find((a) => a.slug === slug);
    if (!target) return;
    const isArch = target.status === 'archived';
    const nextStatus = isArch ? 'draft' : 'archived';

    if (isDevPreview) {
      const updated = articles.map((a) =>
        a.slug === slug
          ? {
              ...a,
              published: false,
              status: nextStatus as any,
              archivedAt: isArch ? undefined : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : a
      );
      persistArticles(updated);
      return;
    }

    await archiveJournal(slug);
    setArticles(
      articles.map((a) =>
        a.slug === slug
          ? {
              ...a,
              published: false,
              status: nextStatus as any,
              archivedAt: isArch ? undefined : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleDuplicate = async (slug: string) => {
    const target = articles.find((a) => a.slug === slug);
    if (!target) return;

    if (isDevPreview) {
      const baseSlug = `${target.slug}-copy`;
      let newSlug = baseSlug;
      let counter = 1;
      while (articles.some((a) => a.slug === newSlug)) {
        counter++;
        newSlug = `${baseSlug}-${counter}`;
      }

      const clone: JournalDocument = {
        ...JSON.parse(JSON.stringify(target)),
        id: newSlug,
        slug: newSlug,
        title: `${target.title} (Copy)`,
        published: false,
        status: 'draft',
        order: (target.order || 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [clone, ...articles];
      persistArticles(updated);
      return;
    }

    const duplicated = await duplicateJournal(slug);
    setArticles([duplicated, ...articles]);
  };

  const handleDelete = async (slug: string) => {
    if (isDevPreview) {
      const updated = articles.filter((a) => a.slug !== slug);
      persistArticles(updated);
      return;
    }

    await deleteJournal(slug);
    setArticles(articles.filter((a) => a.slug !== slug));
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-mono">Loading Journal Articles...</p>
      </div>
    );
  }

  const selectedArticle = articles.find((a) => a.slug === selectedSlug) || null;

  return (
    <div className="w-full">
      {activeView === 'list' && (
        <JournalList
          articles={articles}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onDuplicate={handleDuplicate}
          onTogglePublish={handleTogglePublish}
          onArchive={handleArchive}
          onDelete={handleDelete}
          isDevPreview={isDevPreview}
        />
      )}

      {activeView === 'editor' && (
        <JournalEditor
          initialArticle={selectedArticle}
          existingSlugs={articles.map((a) => a.slug)}
          onSave={handleSaveArticle}
          onCancel={handleBackToList}
          isDevPreview={isDevPreview}
        />
      )}

      {activeView === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Journal Articles</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('editor')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              Edit This Article
            </button>
          </div>
          <JournalPreview article={selectedArticle || {}} />
        </div>
      )}
    </div>
  );
};
