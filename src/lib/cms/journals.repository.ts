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
import { CmsError, CmsNotFoundError, CmsConflictError } from './errors.ts';
import type { JournalDocument } from '../../types/cms/index.ts';

const COLLECTION = 'journals';

/**
 * Retrieves all published journal articles for public listing.
 */
export async function getPublishedJournals(): Promise<JournalDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (!db) return [];

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('published', '==', true), orderBy('publishedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as JournalDocument);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch published journal articles: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Retrieves all journal articles (including drafts) for admin dashboard.
 */
export async function getAllJournalsForAdmin(): Promise<JournalDocument[]> {
  const db = getFirebaseFirestore();

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, orderBy('publishedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as JournalDocument);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch journals for admin: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Retrieves a single journal article by its unique URL slug.
 */
export async function getJournalBySlug(rawSlug: string): Promise<JournalDocument | null> {
  const db = tryGetFirebaseFirestore();
  if (!db) return null;

  const valid = validateSlug(rawSlug);
  if (!valid.valid || !valid.value) return null;
  const slug = valid.value;

  try {
    const docRef = doc(db, COLLECTION, slug);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as JournalDocument;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch journal article "${slug}": ${msg}`, 'READ_FAILED');
  }
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
    createdAt: now,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateJournal(fullDoc);

  try {
    const docRef = doc(db, COLLECTION, slug);
    await setDoc(docRef, validated);
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to create journal article "${slug}": ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Updates an existing journal article document.
 */
export async function updateJournal(
  rawSlug: string,
  data: Partial<JournalDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<JournalDocument> {
  const db = getFirebaseFirestore();

  const slugValidation = validateSlug(rawSlug);
  if (!slugValidation.valid || !slugValidation.value) {
    throw new CmsError('Invalid journal slug', 'VALIDATION_ERROR');
  }
  const slug = slugValidation.value;

  const existing = await getJournalBySlug(slug);
  if (!existing) {
    throw new CmsNotFoundError('Journal', slug);
  }

  const now = new Date().toISOString();
  const merged: JournalDocument = {
    ...existing,
    ...data,
    id: slug,
    slug,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateJournal(merged);

  try {
    const docRef = doc(db, COLLECTION, slug);
    await setDoc(docRef, validated, { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to update journal article "${slug}": ${msg}`, 'WRITE_FAILED');
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
export async function deleteJournal(rawSlug: string): Promise<void> {
  const db = getFirebaseFirestore();

  const slugValidation = validateSlug(rawSlug);
  if (!slugValidation.valid || !slugValidation.value) {
    throw new CmsError('Invalid journal slug', 'VALIDATION_ERROR');
  }
  const slug = slugValidation.value;

  try {
    const docRef = doc(db, COLLECTION, slug);
    await deleteDoc(docRef);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to delete journal article "${slug}": ${msg}`, 'DELETE_FAILED');
  }
}

// Aliases conforming to Section 15 specifications
export const getArticles = getAllJournalsForAdmin;
export const getArticleById = getJournalBySlug;
export const getArticleBySlug = getJournalBySlug;
export const createArticle = createJournal;
export const updateArticle = updateJournal;
export const duplicateArticle = duplicateJournal;
export const publishArticle = publishJournal;
export const unpublishArticle = unpublishJournal;
export const archiveArticle = archiveJournal;
export const deleteArticle = deleteJournal;
