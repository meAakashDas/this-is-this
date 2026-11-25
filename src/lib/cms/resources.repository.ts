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
import { removeUndefinedFields, sanitizeAssetUrl, clearLiveSyncCache } from './sanitize.ts';
import { CmsError, CmsNotFoundError, CmsConflictError } from './errors.ts';
import type { ResourceDocument } from '../../types/cms/index.ts';
import snapshotData from '../../data/cms-snapshot.json' with { type: 'json' };
import { resourcesData } from '../../data/resources.ts';
import {
  legacyBlocksToBlockNote,
  blockNoteToHtml,
} from '../../utils/blockNoteMigration.ts';

const COLLECTION = 'resources';

/**
 * Sanitizes data for Firestore by converting nested arrays (e.g. in BlockNote tables
 * and content block tables) into Firestore-compatible formats and stripping any undefined values.
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

  // Content blocks can have table blocks with rows: string[][]
  if ('contentBlocks' in copy && Array.isArray(copy.contentBlocks)) {
    copy.contentBlocks = copy.contentBlocks.map((block: any) => {
      if (block && block.type === 'table' && Array.isArray(block.rows)) {
        return {
          ...block,
          rows: block.rows.map((row: any) => (Array.isArray(row) ? { cells: row } : row)),
        };
      }
      return block;
    });
  }

  return removeUndefinedFields(copy);
}

/**
 * Restores sanitized data from Firestore back into rich JavaScript objects and nested arrays.
 */
function restoreFromFirestore(docData: any): ResourceDocument {
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
      if (block && block.type === 'table' && Array.isArray(block.rows)) {
        return {
          ...block,
          rows: block.rows.map((row: any) =>
            row && typeof row === 'object' && 'cells' in row ? row.cells : row
          ),
        };
      }
      return block;
    });
  }

  return copy as ResourceDocument;
}

/**
 * Returns baseline fallback resources from snapshot or static data.
 */
export function getBaselineFallbackResources(): ResourceDocument[] {
  if (
    snapshotData &&
    Array.isArray((snapshotData as any).resources) &&
    (snapshotData as any).resources.length > 0
  ) {
    return (snapshotData as any).resources.map((r: any) => restoreFromFirestore(r));
  }

  return resourcesData.map((res, index) => {
    const slug = res.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const cmsAttachments = (res.attachments || []).map((att, aIdx) => ({
      id: att.id,
      name: att.name,
      fileName: att.url.split('/').pop() || `${slug}-${att.id}`,
      format: att.format,
      fileSize: att.fileSize,
      url: att.url,
      fileExtension: att.url.split('.').pop() || 'pdf',
      isPreviewable: Boolean(att.isPreviewable),
      order: aIdx + 1,
      visible: true,
      uploadedAt: res.publishedAt,
    }));

    const bnBlocks = legacyBlocksToBlockNote(
      res.contentBlocks || [],
      res.summaryPoints || [],
      res.targetAudience || ''
    );
    const bnHtml = blockNoteToHtml(bnBlocks);

    return {
      id: res.resourceNumber,
      resourceNumber: res.resourceNumber,
      createdAt: res.publishedAt,
      updatedAt: res.updatedAt || res.publishedAt,
      updatedBy: 'seed-migration',
      title: res.title,
      slug,
      category: res.category,
      description: res.description,
      tags: res.tags,
      author: 'Aakash Das',
      language: 'English',
      published: res.published,
      status: res.published ? 'published' : 'draft',
      featured: index < 3,
      order: index + 1,
      publishedAt: res.publishedAt,
      downloadFormat: res.downloadFormat,
      fileSize: res.fileSize,
      downloadUrl: res.downloadUrl,
      pdfPreviewUrl: res.pdfPreviewUrl,
      docxUrl: res.docxUrl,
      cardActionLabel: 'Open',
      detailActionLabel: 'Download Resources',
      attachments: cmsAttachments,
      youtubeEmbed: res.youtubeEmbed,
      summaryPoints: res.summaryPoints || [],
      targetAudience: res.targetAudience || '',
      contentBlocks: res.contentBlocks || [],
      contentHtml: bnHtml,
      blocknoteJson: bnBlocks,
      blocknoteHtml: bnHtml,
      seo: {
        title: `Resource #${res.resourceNumber}: ${res.title} — Aakash Das`,
        description: res.description,
      },
    };
  });
}

function findFallbackResource(identifier: string): ResourceDocument | null {
  const all = getBaselineFallbackResources();
  const trimmed = identifier ? String(identifier).trim() : '';
  if (!trimmed) return null;
  const padded = trimmed.padStart(3, '0');
  return (
    all.find(
      (r) =>
        r.id === trimmed ||
        r.id === padded ||
        r.resourceNumber === trimmed ||
        r.resourceNumber === padded ||
        (r.slug && r.slug.toLowerCase() === trimmed.toLowerCase())
    ) || null
  );
}

/**
 * Retrieves all published resources for public viewing.
 * Ordered by permanent resourceNumber ascending.
 */
export async function getPublishedResources(): Promise<ResourceDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (!db) {
    return getBaselineFallbackResources().filter((r) => r.published);
  }

  try {
    const colRef = collection(db, COLLECTION);
    const q = query(colRef, where('published', '==', true), orderBy('resourceNumber', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((docSnap) => ({
        ...restoreFromFirestore(docSnap.data()),
        id: docSnap.id,
      }))
      .sort((a, b) => {
        const orderA = a.order && a.order > 0 ? a.order : 9999;
        const orderB = b.order && b.order > 0 ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.resourceNumber.localeCompare(b.resourceNumber, undefined, { numeric: true });
      });
  } catch (error) {
    console.warn('[CMS] Failed to fetch published resources from Firestore, using fallback:', error);
    return getBaselineFallbackResources().filter((r) => r.published);
  }
}

/**
 * Retrieves all resources (including drafts) for the administrator dashboard.
 */
export async function getAllResourcesForAdmin(): Promise<ResourceDocument[]> {
  const db = tryGetFirebaseFirestore();
  if (db) {
    try {
      const colRef = collection(db, COLLECTION);
      const q = query(colRef, orderBy('resourceNumber', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...restoreFromFirestore(docSnap.data()),
        id: docSnap.id,
      }));
    } catch (error) {
      console.warn('[CMS] Failed to fetch resources from Firestore, falling back to baseline:', error);
      return getBaselineFallbackResources();
    }
  }

  return getBaselineFallbackResources();
}

/**
 * Retrieves a single resource by its permanent 3-digit number or canonical identifier.
 */
export async function getResourceByNumber(rawNumber: string): Promise<ResourceDocument | null> {
  const db = tryGetFirebaseFirestore();
  const trimmed = rawNumber ? String(rawNumber).trim() : '';
  if (!trimmed) return null;

  const valid = validateResourceNumber(trimmed);
  const num = valid.valid && valid.value ? valid.value : trimmed.padStart(3, '0');

  if (db) {
    try {
      // 1. Direct document lookup by number ID
      const docRef = doc(db, COLLECTION, num);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...restoreFromFirestore(snap.data()), id: snap.id };
      }

      // 2. Direct document lookup by raw identifier (if different from padded)
      if (trimmed !== num) {
        const rawDocRef = doc(db, COLLECTION, trimmed);
        const rawSnap = await getDoc(rawDocRef);
        if (rawSnap.exists()) {
          return { ...restoreFromFirestore(rawSnap.data()), id: rawSnap.id };
        }
      }

      // 3. Query by resourceNumber field
      const colRef = collection(db, COLLECTION);
      const qNum = query(colRef, where('resourceNumber', '==', num));
      const qNumSnap = await getDocs(qNum);
      if (!qNumSnap.empty && qNumSnap.docs[0]) {
        const d = qNumSnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // 4. Query by id field
      const qId = query(colRef, where('id', '==', trimmed));
      const qIdSnap = await getDocs(qId);
      if (!qIdSnap.empty && qIdSnap.docs[0]) {
        const d = qIdSnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // 5. Query by slug
      const qSlug = query(colRef, where('slug', '==', trimmed.toLowerCase()));
      const qSlugSnap = await getDocs(qSlug);
      if (!qSlugSnap.empty && qSlugSnap.docs[0]) {
        const d = qSlugSnap.docs[0];
        return { ...restoreFromFirestore(d.data()), id: d.id };
      }

      // Record does not exist in Firestore
      return null;
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        console.warn(`[CMS] Error fetching resource #${num} from Firestore:`, error);
      }
      return null;
    }
  }

  // Resilient fallback to local baseline/snapshot data only when Firestore is offline
  return findFallbackResource(num) || findFallbackResource(trimmed);
}

/**
 * Helper to get resource by ID (checks document ID directly, then delegates to getResourceByNumber).
 */
export async function getResourceById(id: string): Promise<ResourceDocument | null> {
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
      console.warn(`[CMS] Error fetching resource by ID "${trimmed}":`, error);
    }
  }

  return getResourceByNumber(trimmed);
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
    coverImage: sanitizeAssetUrl(data.coverImage, '') || undefined,
    downloadUrl: sanitizeAssetUrl(data.downloadUrl, '') || undefined,
    pdfPreviewUrl: sanitizeAssetUrl(data.pdfPreviewUrl, '') || undefined,
    docxUrl: sanitizeAssetUrl(data.docxUrl, '') || undefined,
    attachments: (data.attachments || []).filter((a) => !a.url?.trim().toLowerCase().startsWith('blob:')),
    createdAt: now,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateResource(fullDoc);

  try {
    const docRef = doc(db, COLLECTION, resourceNumber);
    await setDoc(docRef, sanitizeForFirestore(validated));
    clearLiveSyncCache('resources');
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to create resource #${resourceNumber}: ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Updates an existing resource document.
 * Safely targets the canonical database document, preserves stable ID,
 * and preserves all unedited fields (attachments, BlockNote content, SEO metadata).
 */
export async function updateResource(
  rawIdentifier: string,
  data: Partial<ResourceDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  const db = getFirebaseFirestore();

  const trimmedId = rawIdentifier ? String(rawIdentifier).trim() : '';
  if (!trimmedId) {
    throw new CmsError('Resource identifier is required for update.', 'VALIDATION_ERROR');
  }

  // Resilient lookup of the existing record
  const existing = (await getResourceByNumber(trimmedId)) || (await getResourceById(trimmedId));
  if (!existing) {
    throw new CmsNotFoundError('Resource', trimmedId);
  }

  // Canonical document ID (must stay stable)
  const canonicalDocId = existing.id || existing.resourceNumber || trimmedId;

  // Determine resourceNumber (validate if changed)
  let targetResourceNumber = existing.resourceNumber;
  if (data.resourceNumber && data.resourceNumber.trim() !== '') {
    const numValidation = validateResourceNumber(data.resourceNumber);
    if (!numValidation.valid || !numValidation.value) {
      throw new CmsError(numValidation.error || 'Invalid resource number', 'VALIDATION_ERROR');
    }
    targetResourceNumber = numValidation.value;
  }

  // If resourceNumber changed, verify no collision and migrate canonical doc ID
  const isNumberMigrating = targetResourceNumber !== canonicalDocId;
  if (isNumberMigrating) {
    const conflict = await getResourceByNumber(targetResourceNumber);
    if (conflict && conflict.id !== canonicalDocId) {
      throw new CmsConflictError(`Resource #${targetResourceNumber} already exists in Firestore.`);
    }
  }
  const finalDocId = isNumberMigrating ? targetResourceNumber : canonicalDocId;

  const now = new Date().toISOString();
  const rawAttachments = data.attachments !== undefined ? data.attachments : (existing.attachments || []);
  const merged: ResourceDocument = {
    ...existing,
    ...data,
    id: finalDocId,
    resourceNumber: targetResourceNumber,
    coverImage: sanitizeAssetUrl(
      data.coverImage !== undefined ? data.coverImage : existing.coverImage,
      ''
    ) || undefined,
    downloadUrl: sanitizeAssetUrl(
      data.downloadUrl !== undefined ? data.downloadUrl : existing.downloadUrl,
      ''
    ) || undefined,
    pdfPreviewUrl: sanitizeAssetUrl(
      data.pdfPreviewUrl !== undefined ? data.pdfPreviewUrl : existing.pdfPreviewUrl,
      ''
    ) || undefined,
    docxUrl: sanitizeAssetUrl(
      data.docxUrl !== undefined ? data.docxUrl : existing.docxUrl,
      ''
    ) || undefined,
    attachments: rawAttachments.filter((a) => !a.url?.trim().toLowerCase().startsWith('blob:')),
    blocknoteJson: data.blocknoteJson !== undefined ? data.blocknoteJson : existing.blocknoteJson,
    blocknoteHtml: data.blocknoteHtml !== undefined ? data.blocknoteHtml : existing.blocknoteHtml,
    contentHtml: data.contentHtml !== undefined ? data.contentHtml : existing.contentHtml,
    contentBlocks: data.contentBlocks !== undefined ? data.contentBlocks : (existing.contentBlocks || []),
    seo: data.seo !== undefined ? { ...(existing.seo || {}), ...data.seo } : existing.seo,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateResource(merged);

  try {
    const docRef = doc(db, COLLECTION, finalDocId);
    await setDoc(docRef, sanitizeForFirestore(validated), { merge: !isNumberMigrating });
    if (isNumberMigrating) {
      try {
        await deleteDoc(doc(db, COLLECTION, canonicalDocId));
      } catch {
        // Non-fatal if old ID did not exist
      }
    }
    clearLiveSyncCache('resources');
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to update resource #${canonicalDocId}: ${msg}`, 'WRITE_FAILED');
  }
}

/**
 * Sets the publication status of a resource (draft vs published vs archived).
 */
export async function setResourcePublishStatus(
  rawIdentifier: string,
  published: boolean,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawIdentifier,
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
  rawIdentifier: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawIdentifier,
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
  rawIdentifier: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawIdentifier,
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
  rawIdentifier: string,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<ResourceDocument> {
  return updateResource(
    rawIdentifier,
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
 * Deletes a resource document permanently.
 */
export async function deleteResource(rawIdentifier: string): Promise<void> {
  const db = getFirebaseFirestore();

  const trimmedId = rawIdentifier ? String(rawIdentifier).trim() : '';
  if (!trimmedId) {
    throw new CmsError('Resource identifier is required for delete.', 'VALIDATION_ERROR');
  }

  const existing = (await getResourceByNumber(trimmedId)) || (await getResourceById(trimmedId));
  const targetDocId = existing?.id || existing?.resourceNumber || trimmedId;

  try {
    const docRef = doc(db, COLLECTION, targetDocId);
    await deleteDoc(docRef);

    // Also delete non-padded or padded variant if different
    const padded = trimmedId.padStart(3, '0');
    if (padded !== targetDocId) {
      try {
        await deleteDoc(doc(db, COLLECTION, padded));
      } catch {}
    }

    // Invalidate client-side live sync cache
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('risepaisa_live_resources');
        sessionStorage.removeItem('risepaisa_live_timestamp');
      } catch {}
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to delete resource #${targetDocId}: ${msg}`, 'DELETE_FAILED');
  }
}
