import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseFirestore, tryGetFirebaseFirestore } from '../firebase/index.ts';
import { validateJournal, validateSlug } from './validation.ts';
import { removeUndefinedFields, sanitizeAssetUrl, clearLiveSyncCache } from './sanitize.ts';
import { CmsError, CmsNotFoundError, CmsConflictError } from './errors.ts';
import type { JournalDocument } from '../../types/cms/index.ts';
import snapshotData from '../../data/cms-snapshot.json' with { type: 'json' };
import { sampleJournalEntries } from '../../data/journal.ts';
import {
  calculateWordCount,
  calculateReadingTime,
  contentStructureToBlocks,
  extractTextFromBlocks,
} from '../../data/journalCategories.ts';
import {
  journalContentToBlockNote,
  blockNoteToHtml,
} from '../../utils/blockNoteMigration.ts';

const COLLECTION = 'journals';

/**
 * Sanitizes journal document data for Firestore by converting nested arrays
 * (e.g. In BlockNote tables or table data) into Firestore-compatible formats and stripping undefined values.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const cleaned = removeUndefinedFields(obj);
  const copy = Array.isArray(cleaned) ? [...cleaned] : { ...cleaned };

  // BlockNote JSON can contain tables with nested cell arrays.
  // Serialize blocknoteJson to JSON string to guarantee 100% Firestore compatibility.
  if ('blocknoteJson' in copy && copy.blocknoteJson !== undefined && typeof copy.blocknoteJson !== 'string') {
    copy.blocknoteJson = JSON.stringify(copy.blocknoteJson);
  }

  // Journal contentBlocks tableData.rows is string[][]
  if ('contentBlocks' in copy && Array.isArray(copy.contentBlocks)) {
    copy.contentBlocks = copy.contentBlocks.map((block: any) => {
      if (block && block.tableData && Array.isArray(block.tableData.rows)) {
        return {
          ...block,
          tableData: {
            ...block.tableData,
            rows: block.tableData.rows.map((row: any) =>
              Array.isArray(row) ? { cells: row } : row
            ),
          },
        };
      }
      return block;
    });
  }

  return removeUndefinedFields(copy);
}

/**
 * Restores sanitized journal data from Firestore back into rich JavaScript objects and nested arrays.
 */
function restoreFromFirestore(docData: any): JournalDocument {
  if (!docData) return docData;
  const copy = { ...docData };

  if (typeof copy.blocknoteJson === 'string') {
    try {
      copy.blocknoteJson = JSON.parse(copy.blocknoteJson);
    } catch {
      // keep as string if parsing fails
    }
  }

  if (Array.isArray(copy.contentBlocks)) {
    copy.contentBlocks = copy.contentBlocks.map((block: any) => {
      if (block && block.tableData && Array.isArray(block.tableData.rows)) {
        return {
          ...block,
          tableData: {
            ...block.tableData,
            rows: block.tableData.rows.map((row: any) =>
              row && typeof row === 'object' && 'cells' in row ? row.cells : row
            ),
          },
        };
      }
      return block;
    });
  }

  return copy as JournalDocument;
}

/**
 * Returns baseline fallback journal articles from snapshot or static data.
 */
export function getBaselineFallbackJournals(): JournalDocument[] {
  if (
    snapshotData &&
    Array.isArray((snapshotData as any).journals) &&
    (snapshotData as any).journals.length > 0
  ) {
    return (snapshotData as any).journals.map((j: any) => {
      const restored = restoreFromFirestore(j);
      if (!restored.blocknoteJson && restored.content) {
        const bnBlocks = journalContentToBlockNote(restored.content);
        const bnHtml = blockNoteToHtml(bnBlocks);
        return {
          ...restored,
          blocknoteJson: bnBlocks,
          blocknoteHtml: bnHtml,
          contentHtml: restored.contentHtml || bnHtml,
        };
      }
      return restored;
    });
  }

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
}

function findFallbackJournal(identifier: string): JournalDocument | null {
  const all = getBaselineFallbackJournals();
  const trimmed = identifier ? String(identifier).trim().toLowerCase() : '';
  if (!trimmed) return null;
  return (
    all.find(
      (j) =>
        (j.id && j.id.toLowerCase() === trimmed) ||
        (j.slug && j.slug.toLowerCase() === trimmed) ||
        (j.legacyId && j.legacyId.toLowerCase() === trimmed)
    ) || null
  );
}

/**
 * Retrieves all published journal articles for public listing.
 */
export async function getPublishedJournals(): Promise<JournalDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (!db) {
    return getBaselineFallbackJournals().filter((j) => j.published);
  }

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('published', '==', true), orderBy('publishedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...restoreFromFirestore(docSnap.data()),
      id: docSnap.id,
    }));
  } catch (error) {
    console.warn('[CMS] Failed to fetch published journals from Firestore, using fallback:', error);
    return getBaselineFallbackJournals().filter((j) => j.published);
  }
}

/**
 * Retrieves all journal articles (including drafts) for admin dashboard.
 */
export async function getAllJournalsForAdmin(): Promise<JournalDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (db) {
    try {
      const colRef = collection(db, COLLECTION);
      const q = query(colRef, orderBy('publishedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...restoreFromFirestore(docSnap.data()),
        id: docSnap.id,
      }));
    } catch (error) {
      console.warn('[CMS] Failed to fetch journals for admin from Firestore, falling back to baseline:', error);
      return getBaselineFallbackJournals();
    }
  }

  return getBaselineFallbackJournals();
}

/**
 * Retrieves a single journal article by its unique URL slug or internal document ID.
 */
export async function getJournalBySlug(rawSlug: string): Promise<JournalDocument | null> {
  const db = tryGetFirebaseFirestore();
  const trimmed = rawSlug ? String(rawSlug).trim() : '';
  if (!trimmed) return null;

  const valid = validateSlug(trimmed);
  const slug = valid.valid && valid.value ? valid.value : trimmed.toLowerCase();

  if (db) {
    try {
      // 1. Direct document lookup by slug ID
      const docRef = doc(db, COLLECTION, slug);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...restoreFromFirestore(snap.data()), id: snap.id };
      }

      // 2. Direct document lookup by raw trimmed identifier (if different from slug)
      if (trimmed !== slug) {
        const rawDocRef = doc(db, COLLECTION, trimmed);
        const rawSnap = await getDoc(rawDocRef);
        if (rawSnap.exists()) {
          return { ...restoreFromFirestore(rawSnap.data()), id: rawSnap.id };
        }
      }

      // 3. Query by slug field
      const colRef = collection(db, COLLECTION);
      const qSlug = query(colRef, where('slug', '==', slug));
      const qSlugSnap = await getDocs(qSlug);
      if (!qSlugSnap.empty && qSlugSnap.docs[0]) {
        const d = qSlugSnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // 4. Query by id field
      const qId = query(colRef, where('id', '==', trimmed));
      const qIdSnap = await getDocs(qId);
      if (!qIdSnap.empty && qIdSnap.docs[0]) {
        const d = qIdSnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // 5. Query by legacyId field
      const qLegacy = query(colRef, where('legacyId', '==', trimmed));
      const qLegacySnap = await getDocs(qLegacy);
      if (!qLegacySnap.empty && qLegacySnap.docs[0]) {
        const d = qLegacySnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // Record does not exist in Firestore
      return null;
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        console.warn(`[CMS] Error fetching journal article "${slug}" from Firestore:`, error);
      }
      return null;
    }
  }

  // Resilient fallback to local baseline/snapshot data only when Firestore is offline
  return findFallbackJournal(slug) || findFallbackJournal(trimmed);
}

/**
 * Helper to get journal by ID (checks document ID directly, then delegates to getJournalBySlug).
 */
export async function getJournalById(id: string): Promise<JournalDocument | null> {
  const db = tryGetFirebaseFirestore();
  const trimmed = id ? String(id).trim() : '';
  if (!trimmed) return null;

  if (db) {
    try {
      const docRef = doc(db, COLLECTION, trimmed);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...restoreFromFirestore(snap.data()), id: snap.id };
      }
    } catch (error) {
      console.warn(`[CMS] Error fetching journal by ID "${trimmed}":`, error);
    }
  }

  return getJournalBySlug(trimmed);
}

/**
 * Creates a new journal article document in Firestore.
 */
export async function createJournal(
  data: Omit<JournalDocument, 'id' | 'createdAt' | 'updatedAt'>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const db = getFirebaseFirestore();

  const slugValidation = validateSlug(data.slug);
  if (!slugValidation.valid || !slugValidation.value) {
    throw new CmsError(slugValidation.error || 'Invalid journal slug', 'VALIDATION_ERROR');
  }
  const slug = slugValidation.value;

  const existing = await getJournalBySlug(slug);
  if (existing) {
    throw new CmsConflictError(`Journal article with slug "${slug}" already exists.`);
  }

  const now = new Date().toISOString();
  const fullDoc: JournalDocument = {
    ...data,
    id: slug,
    slug,
    coverImage: sanitizeAssetUrl(data.coverImage, '') || undefined,
    createdAt: now,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateJournal(fullDoc);

  try {
    const docRef = doc(db, COLLECTION, slug);
    await setDoc(docRef, sanitizeForFirestore(validated));
    clearLiveSyncCache('journals');
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to create journal article "${slug}": ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Updates an existing journal article document.
 * Safely targets the canonical database document, preserves stable ID,
 * and preserves all unedited fields (BlockNote content, structured sections, SEO).
 */
export async function updateJournal(
  rawIdentifier: string,
  data: Partial<JournalDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const db = getFirebaseFirestore();

  const trimmedId = rawIdentifier ? String(rawIdentifier).trim() : '';
  if (!trimmedId) {
    throw new CmsError('Journal identifier is required for update.', 'VALIDATION_ERROR');
  }

  // Resilient lookup of the existing article
  const existing = (await getJournalBySlug(trimmedId)) || (await getJournalById(trimmedId));
  if (!existing) {
    throw new CmsNotFoundError('Journal', trimmedId);
  }

  // Canonical document ID (must stay stable)
  const canonicalDocId = existing.id || existing.slug || trimmedId;

  // Determine slug (validate if changed)
  let targetSlug = existing.slug;
  if (data.slug && data.slug.trim() !== '') {
    const slugValidation = validateSlug(data.slug);
    if (!slugValidation.valid || !slugValidation.value) {
      throw new CmsError(slugValidation.error || 'Invalid journal slug', 'VALIDATION_ERROR');
    }
    targetSlug = slugValidation.value;
  }

  const isSlugMigrating = targetSlug !== canonicalDocId;
  if (isSlugMigrating) {
    const conflict = await getJournalBySlug(targetSlug);
    if (conflict && conflict.id !== canonicalDocId) {
      throw new CmsConflictError(`Journal article with slug "${targetSlug}" already exists.`);
    }
  }
  const finalDocId = isSlugMigrating ? targetSlug : canonicalDocId;

  const now = new Date().toISOString();
  const merged: JournalDocument = {
    ...existing,
    ...data,
    id: finalDocId,
    slug: targetSlug,
    coverImage: sanitizeAssetUrl(
      data.coverImage !== undefined ? data.coverImage : existing.coverImage,
      ''
    ) || undefined,
    blocknoteJson: data.blocknoteJson !== undefined ? data.blocknoteJson : existing.blocknoteJson,
    blocknoteHtml: data.blocknoteHtml !== undefined ? data.blocknoteHtml : existing.blocknoteHtml,
    contentHtml: data.contentHtml !== undefined ? data.contentHtml : existing.contentHtml,
    content: data.content !== undefined ? data.content : existing.content,
    contentBlocks: data.contentBlocks !== undefined ? data.contentBlocks : (existing.contentBlocks || []),
    seo: data.seo !== undefined ? { ...(existing.seo || {}), ...data.seo } : existing.seo,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateJournal(merged);

  try {
    const docRef = doc(db, COLLECTION, finalDocId);
    await setDoc(docRef, sanitizeForFirestore(validated), { merge: !isSlugMigrating });
    if (isSlugMigrating) {
      try {
        await deleteDoc(doc(db, COLLECTION, canonicalDocId));
      } catch {
        // Non-fatal
      }
    }
    clearLiveSyncCache('journals');
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to update journal article "${canonicalDocId}": ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Sets the publication status of a journal article.
 */
export async function setJournalPublishStatus(
  rawSlug: string,
  published: boolean,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const status = published ? 'published' : 'draft';
  return updateJournal(rawSlug, { published, status }, adminEmail);
}

/**
 * Publishes a journal article.
 */
export async function publishJournal(
  rawSlug: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const now = new Date().toISOString();
  return updateJournal(
    rawSlug,
    {
      published: true,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      updatedBy: adminEmail,
    },
    adminEmail
  );
}

/**
 * Unpublishes a journal article, returning it to draft state.
 */
export async function unpublishJournal(
  rawSlug: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const now = new Date().toISOString();
  return updateJournal(
    rawSlug,
    {
      published: false,
      status: 'draft',
      updatedAt: now,
      updatedBy: adminEmail,
    },
    adminEmail
  );
}

/**
 * Archives a journal article, hiding it from public listings while preserving all content.
 */
export async function archiveJournal(
  rawSlug: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const now = new Date().toISOString();
  return updateJournal(
    rawSlug,
    {
      published: false,
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
      updatedBy: adminEmail,
    },
    adminEmail
  );
}

/**
 * Duplicates an existing journal article, creating a draft clone with a distinct slug and ID.
 */
export async function duplicateJournal(
  sourceSlug: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const source = await getJournalBySlug(sourceSlug);
  if (!source) {
    throw new CmsNotFoundError('Journal', sourceSlug);
  }

  const baseSlug = `${source.slug}-copy`;
  let newSlug = baseSlug;
  let counter = 1;
  while (await getJournalBySlug(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  const now = new Date().toISOString();
  const duplicated: Omit<JournalDocument, 'id' | 'createdAt' | 'updatedAt'> = {
    ...source,
    slug: newSlug,
    title: `${source.title} (Copy)`,
    published: false,
    status: 'draft',
    order: (source.order || 0) + 1,
    publishedAt: now,
    updatedAtDate: now,
    updatedBy: adminEmail,
  };

  return createJournal(duplicated, adminEmail);
}

/**
 * Deletes a journal article document permanently.
 */
export async function deleteJournal(rawIdentifier: string): Promise<void> {
  const db = getFirebaseFirestore();

  const trimmedId = rawIdentifier ? String(rawIdentifier).trim() : '';
  if (!trimmedId) {
    throw new CmsError('Journal identifier is required for delete.', 'VALIDATION_ERROR');
  }

  const existing = (await getJournalBySlug(trimmedId)) || (await getJournalById(trimmedId));
  const targetDocId = existing?.id || existing?.slug || trimmedId;

  try {
    const docRef = doc(db, COLLECTION, targetDocId);
    await deleteDoc(docRef);

    // Invalidate client-side live sync cache
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('risepaisa_live_journals');
        sessionStorage.removeItem('risepaisa_live_timestamp');
      } catch {}
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to delete journal article "${targetDocId}": ${msg}`, 'DELETE_FAILED');
  }
}

// Aliases conforming to Section 15 specifications
export const getArticles = getAllJournalsForAdmin;
export const getArticleById = getJournalById;
export const getArticleBySlug = getJournalBySlug;
export const createArticle = createJournal;
export const updateArticle = updateJournal;
export const duplicateArticle = duplicateJournal;
export const publishArticle = publishJournal;
export const unpublishArticle = unpublishJournal;
export const archiveArticle = archiveJournal;
export const deleteArticle = deleteJournal;
