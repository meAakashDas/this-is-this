import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { JournalDocument } from '../../../types/cms/journal.ts';
import { JournalList } from './JournalList.tsx';
import { JournalEditor } from './JournalEditor.tsx';
import {
  getAllJournalsForAdmin,
  getJournalBySlug,
  getJournalById,
  createJournal,
  updateJournal,
  publishJournal,
  unpublishJournal,
  deleteJournal,
  getBaselineFallbackJournals,
} from '../../../lib/cms/journals.repository.ts';

const PREVIEW_STORAGE_KEY = 'aakashdas_cms_journal_preview';

interface JournalManagerProps {
  isDevPreview?: boolean;
}

export const JournalManager: React.FC<JournalManagerProps> = ({ isDevPreview = false }) => {
  const [articles, setArticles] = useState<JournalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [recordNotFoundSlug, setRecordNotFoundSlug] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<JournalDocument | null>(null);
  const [editorSessionKey, setEditorSessionKey] = useState<string>('initial');

  // Helper to sync URL search params
  const updateUrlParam = useCallback((idOrSlug: string | null, isCreate: boolean = false) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'journal');
    if (idOrSlug) {
      url.searchParams.set('id', idOrSlug);
      url.searchParams.delete('create');
    } else if (isCreate) {
      url.searchParams.set('create', 'true');
      url.searchParams.delete('id');
    } else {
      url.searchParams.delete('id');
      url.searchParams.delete('slug');
      url.searchParams.delete('create');
      url.searchParams.delete('edit');
    }
    window.history.pushState(null, '', url.toString());
  }, []);

  // Load articles and check URL parameters on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);

      let loadedArticles: JournalDocument[] = [];

      // Dev Preview Mode: read from sessionStorage
      if (isDevPreview) {
        try {
          const cached = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedArticles = parsed;
            }
          }
          if (loadedArticles.length === 0) {
            loadedArticles = getBaselineFallbackJournals();
            sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(loadedArticles));
          }
        } catch (e) {
          console.warn('Failed to read journal from sessionStorage:', e);
          loadedArticles = getBaselineFallbackJournals();
        }
      } else {
        // Production mode: fetch from Firestore with fallback to baseline
        try {
          loadedArticles = await getAllJournalsForAdmin();
        } catch (err) {
          console.warn('Could not fetch journals from Firestore, using baseline:', err);
          loadedArticles = getBaselineFallbackJournals();
        }
      }

      if (mounted) {
        setArticles(loadedArticles);

        // Check direct navigation URL search params: ?tab=journal&id=slug or create=true
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const targetSlug = params.get('id') || params.get('slug') || params.get('edit');
          const isCreate = params.get('create') === 'true';

          if (targetSlug) {
            setIsRecordLoading(true);
            const found =
              loadedArticles.find((a) => a.slug === targetSlug || a.id === targetSlug || a.legacyId === targetSlug) ||
              (await getJournalBySlug(targetSlug)) ||
              (await getJournalById(targetSlug));

            if (mounted) {
              if (found) {
                setSelectedSlug(found.slug);
                setSelectedArticle(found);
                setEditorSessionKey(`edit-${found.slug}`);
                setActiveView('editor');
                setRecordNotFoundSlug(null);
              } else {
                setRecordNotFoundSlug(targetSlug);
                setActiveView('list');
              }
              setIsRecordLoading(false);
            }
          } else if (isCreate) {
            setSelectedSlug(null);
            setSelectedArticle(null);
            setEditorSessionKey(`create-${Date.now()}`);
            setActiveView('editor');
          }
        }

        setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
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
    setSelectedArticle(null);
    setEditorSessionKey(`create-${Date.now()}`);
    setRecordNotFoundSlug(null);
    setActiveView('editor');
    updateUrlParam(null, true);
  };

  const handleEdit = async (slug: string) => {
    updateUrlParam(slug);
    setRecordNotFoundSlug(null);
    setIsRecordLoading(true);

    try {
      if (isDevPreview) {
        const foundLocal = articles.find(
          (a) => a.slug === slug || a.id === slug || a.legacyId === slug
        );
        if (foundLocal) {
          setSelectedSlug(foundLocal.slug);
          setSelectedArticle(foundLocal);
          setEditorSessionKey(`edit-${foundLocal.slug}`);
          setActiveView('editor');
          return;
        }
      }

      // Retrieve fresh article record from database
      const fullDoc =
        articles.find((a) => a.slug === slug || a.id === slug || a.legacyId === slug) ||
        (await getJournalBySlug(slug)) ||
        (await getJournalById(slug)) ||
        null;

      if (fullDoc) {
        setSelectedSlug(fullDoc.slug);
        setSelectedArticle(fullDoc);
        setEditorSessionKey(`edit-${fullDoc.slug}`);
        setActiveView('editor');
      } else {
        setRecordNotFoundSlug(slug);
        setActiveView('list');
      }
    } catch (err) {
      console.warn('Error fetching journal article for edit:', err);
      const cached = articles.find((a) => a.slug === slug || a.id === slug) || null;
      if (cached) {
        setSelectedSlug(cached.slug);
        setSelectedArticle(cached);
        setEditorSessionKey(`edit-${cached.slug}`);
        setActiveView('editor');
      } else {
        setRecordNotFoundSlug(slug);
        setActiveView('list');
      }
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleBackToList = () => {
    updateUrlParam(null);
    setSelectedSlug(null);
    setSelectedArticle(null);
    setRecordNotFoundSlug(null);
    setActiveView('list');
  };

  // CRUD actions
  const handleSaveArticle = async (
    doc: JournalDocument,
    action: 'draft' | 'publish'
  ): Promise<void> => {
    const isPub = action === 'publish';
    const canonicalId = doc.id || doc.slug;

    const finalDoc: JournalDocument = {
      ...doc,
      id: canonicalId,
      published: isPub,
      status: isPub ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    };

    if (isDevPreview) {
      const lookupId = selectedArticle?.id || selectedArticle?.slug || finalDoc.id;
      const existingIdx = articles.findIndex((a) => a.id === lookupId || a.slug === lookupId);
      let updated: JournalDocument[];
      if (existingIdx >= 0) {
        updated = articles.map((a, i) => (i === existingIdx ? { ...finalDoc, id: finalDoc.slug } : a));
      } else {
        updated = [finalDoc, ...articles];
      }
      persistArticles(updated);
      setSelectedSlug(finalDoc.slug);
      setSelectedArticle(finalDoc);
      updateUrlParam(finalDoc.slug);
      toast.success(isPub ? `Article "${finalDoc.title}" published (Dev Preview).` : `Draft "${finalDoc.title}" saved (Dev Preview).`);
    } else {
      const originalLookupId = selectedArticle?.id || selectedArticle?.slug || canonicalId;
      const existing =
        (await getJournalById(originalLookupId)) ||
        (await getJournalBySlug(originalLookupId)) ||
        (await getJournalBySlug(finalDoc.slug));

      const savedDoc = existing
        ? await updateJournal(existing.id || existing.slug, finalDoc)
        : await createJournal(finalDoc);

      const refreshed = await getAllJournalsForAdmin();
      setArticles(refreshed);
      setSelectedSlug(savedDoc.slug);
      setSelectedArticle(savedDoc);
      updateUrlParam(savedDoc.slug);
      toast.success(
        isPub
          ? `Article "${savedDoc.title}" published to Cloud Firestore.`
          : `Article "${savedDoc.title}" saved as draft in Cloud Firestore.`
      );
    }
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
      toast.success(isCurrentlyPub ? 'Article moved to draft.' : 'Article published.');
      return;
    }

    try {
      if (isCurrentlyPub) {
        await unpublishJournal(target.id || slug);
      } else {
        await publishJournal(target.id || slug);
      }

      const refreshed = await getAllJournalsForAdmin();
      setArticles(refreshed);
      toast.success(isCurrentlyPub ? `Unpublished "${target.title}" to draft.` : `Published "${target.title}" to Cloud Firestore.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update article publish status.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (isDevPreview) {
      const updated = articles.filter((a) => a.slug !== slug);
      persistArticles(updated);
      toast.success('Article deleted from preview.');
      return;
    }

    try {
      await deleteJournal(slug);
      const refreshed = await getAllJournalsForAdmin();
      setArticles(refreshed);
      toast.success('Article permanently deleted from Cloud Firestore.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete article.');
    }
  };

  if (loading || isRecordLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-mono">
          {isRecordLoading ? 'Retrieving article record from database...' : 'Loading Journal Articles...'}
        </p>
      </div>
    );
  }

  // Not Found State for direct URL access to non-existent journal article
  if (recordNotFoundSlug && activeView === 'list') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 border border-destructive/20 bg-destructive/5 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">Journal Article Not Found</h3>
        <p className="text-sm text-muted-foreground">
          Journal with identifier &quot;{recordNotFoundSlug}&quot; was not found in the archive.
        </p>
        <button
          type="button"
          onClick={handleBackToList}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Journal Articles</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {activeView === 'list' && (
        <JournalList
          articles={articles}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onTogglePublish={handleTogglePublish}
          onDelete={handleDelete}
          isDevPreview={isDevPreview}
        />
      )}

      {activeView === 'editor' && (
        <JournalEditor
          key={editorSessionKey}
          initialArticle={selectedArticle}
          existingSlugs={articles.map((a) => a.slug)}
          onSave={handleSaveArticle}
          onCancel={handleBackToList}
          isDevPreview={isDevPreview}
        />
      )}
    </div>
  );
};
