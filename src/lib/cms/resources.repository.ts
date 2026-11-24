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
import { validateResource, validateResourceNumber } from './validation.ts';
import { CmsError, CmsNotFoundError, CmsConflictError } from './errors.ts';
import type { ResourceDocument } from '../../types/cms/index.ts';

const COLLECTION = 'resources';

/**
 * Retrieves all published resources for public viewing.
 * Ordered by permanent resourceNumber ascending.
 */
export async function getPublishedResources(): Promise<ResourceDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (!db) return [];

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('published', '==', true), orderBy('resourceNumber', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as ResourceDocument);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch published resources: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Retrieves all resources (including drafts) for the administrator dashboard.
 */
export async function getAllResourcesForAdmin(): Promise<ResourceDocument[]> {
  const db = getFirebaseFirestore();

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, orderBy('resourceNumber', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as ResourceDocument);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch resources for admin: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Retrieves a single resource by its permanent 3-digit number.
 */
export async function getResourceByNumber(rawNumber: string): Promise<ResourceDocument | null> {
  const db = tryGetFirebaseFirestore();
  if (!db) return null;

  const valid = validateResourceNumber(rawNumber);
  if (!valid.valid || !valid.value) return null;
  const num = valid.value;

  try {
    const docRef = doc(db, COLLECTION, num);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as ResourceDocument;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch resource #${num}: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Creates a brand new resource document.
 * Enforces permanent 3-digit ID formatting and prevents accidental overwrites.
 */
export async function createResource(
  data: Omit<ResourceDocument, 'id' | 'createdAt' | 'updatedAt'>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  const db = getFirebaseFirestore();

  const numValidation = validateResourceNumber(data.resourceNumber);
  if (!numValidation.valid || !numValidation.value) {
    throw new CmsError(numValidation.error || 'Invalid resource number', 'VALIDATION_ERROR');
  }
  const resourceNumber = numValidation.value;

  const existing = await getResourceByNumber(resourceNumber);
  if (existing) {
    throw new CmsConflictError(`Resource #${resourceNumber} already exists in Firestore.`);
  }

  const now = new Date().toISOString();
  const fullDoc: ResourceDocument = {
    ...data,
    id: resourceNumber,
    resourceNumber,
    createdAt: now,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateResource(fullDoc);

  try {
    const docRef = doc(db, COLLECTION, resourceNumber);
    await setDoc(docRef, validated);
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to create resource #${resourceNumber}: ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Updates an existing resource document.
 */
export async function updateResource(
  rawNumber: string,
  data: Partial<ResourceDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  const db = getFirebaseFirestore();

  const numValidation = validateResourceNumber(rawNumber);
  if (!numValidation.valid || !numValidation.value) {
    throw new CmsError('Invalid resource number', 'VALIDATION_ERROR');
  }
  const resourceNumber = numValidation.value;

  const existing = await getResourceByNumber(resourceNumber);
  if (!existing) {
    throw new CmsNotFoundError('Resource', resourceNumber);
  }

  const now = new Date().toISOString();
  const merged: ResourceDocument = {
    ...existing,
    ...data,
    id: resourceNumber,
    resourceNumber,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateResource(merged);

  try {
    const docRef = doc(db, COLLECTION, resourceNumber);
    await setDoc(docRef, validated, { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to update resource #${resourceNumber}: ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Sets the publication status of a resource (draft vs published vs archived).
 */
export async function setResourcePublishStatus(
  rawNumber: string,
  published: boolean,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawNumber,
    {
      published,
      status: published ? 'published' : 'draft',
    },
    adminEmail
  );
}

/**
 * Publishes a resource publicly.
 */
export async function publishResource(
  rawNumber: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawNumber,
    {
      published: true,
      status: 'published',
      publishedAt: new Date().toISOString().split('T')[0],
    },
    adminEmail
  );
}

/**
 * Unpublishes a resource back to draft status without deleting data.
 */
export async function unpublishResource(
  rawNumber: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawNumber,
    {
      published: false,
      status: 'draft',
    },
    adminEmail
  );
}

/**
 * Archives a resource.
 */
export async function archiveResource(
  rawNumber: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawNumber,
    {
      published: false,
      status: 'archived',
    },
    adminEmail
  );
}

/**
 * Duplicates an existing resource into a new draft with a distinct resource number.
 */
export async function duplicateResource(
  sourceNumber: string,
  newNumber: string,
  newTitle?: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  const source = await getResourceByNumber(sourceNumber);
  if (!source) {
    throw new CmsNotFoundError('Resource', sourceNumber);
  }

  const existingTarget = await getResourceByNumber(newNumber);
  if (existingTarget) {
    throw new CmsConflictError(`Target resource number #${newNumber} already exists.`);
  }

  const title = newTitle || `${source.title} (Copy)`;
  const slug = `${source.slug}-copy`;

  const clonedData: Omit<ResourceDocument, 'id' | 'createdAt' | 'updatedAt'> = {
    ...source,
    resourceNumber: newNumber,
    title,
    slug,
    published: false,
    status: 'draft',
    publishedAt: new Date().toISOString().split('T')[0],
  };

  return createResource(clonedData, adminEmail);
}

/**
 * Helper to get resource by ID (alias for getResourceByNumber).
 */
export async function getResourceById(id: string): Promise<ResourceDocument | null> {
  return getResourceByNumber(id);
}

/**
 * Deletes a resource document permanently.
 */
export async function deleteResource(rawNumber: string): Promise<void> {
  const db = getFirebaseFirestore();

  const numValidation = validateResourceNumber(rawNumber);
  if (!numValidation.valid || !numValidation.value) {
    throw new CmsError('Invalid resource number', 'VALIDATION_ERROR');
  }
  const resourceNumber = numValidation.value;

  try {
    const docRef = doc(db, COLLECTION, resourceNumber);
    await deleteDoc(docRef);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to delete resource #${resourceNumber}: ${msg}`, 'DELETE_FAILED');
  }
}
