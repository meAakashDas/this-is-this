import { tryGetFirebaseStorage } from '../firebase/index.ts';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from 'firebase/storage';

const STORAGE_TIMEOUT_MS = 4000;
export const MAX_INLINE_FIRESTORE_BYTES = 450 * 1024;
export const MAX_DOCUMENT_JSON_BUDGET_BYTES = 920 * 1024;

// Session cache so unprovisioned Spark-plan Storage is not retried repeatedly
let firebaseStorageUnavailable = false;

export function isFirebaseStorageUnavailableInSession(): boolean {
  return firebaseStorageUnavailable;
}

export function resetFirebaseStorageSessionFlagForTests(): void {
  firebaseStorageUnavailable = false;
}

export function formatFileSizeBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function bytesToDataUri(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (typeof Blob !== 'undefined' && typeof FileReader !== 'undefined') {
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: mimeType || 'application/octet-stream',
    });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to encode binary as Data URI.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read binary payload.'));
      reader.readAsDataURL(blob);
    });
  }

  // Node / SSR fallback
  const b64 = Buffer.from(bytes).toString('base64');
  return `data:${mimeType || 'application/octet-stream'};base64,${b64}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Failed to read "${file.name}" as permanent Data URI.`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

async function uploadToFirebaseStorageFast(
  storage: FirebaseStorage,
  storagePath: string,
  payload: Blob | Uint8Array | File,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, payload, {
      contentType: contentType || 'application/octet-stream',
    });

    let settled = false;
    let timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        task.cancel();
      } catch {
        // ignore cancel errors
      }
      firebaseStorageUnavailable = true;
      reject(new Error('Firebase Storage timed out / unavailable on this project.'));
    }, STORAGE_TIMEOUT_MS);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          task.cancel();
        } catch {
          // ignore cancel errors
        }
        firebaseStorageUnavailable = true;
        reject(new Error('Firebase Storage stalled / unavailable on this project.'));
      }, STORAGE_TIMEOUT_MS);
    };

    task.on(
      'state_changed',
      (snap) => {
        if (settled) return;
        if (snap.bytesTransferred > 0) {
          resetTimer();
        }
        const pct =
          snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 85) : 25;
        onProgress?.(Math.max(15, pct));
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        firebaseStorageUnavailable = true;
        reject(err);
      },
      async () => {
        if (settled) return;
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          settled = true;
          resolve(url);
        } catch (err) {
          settled = true;
          firebaseStorageUnavailable = true;
          reject(err);
        }
      }
    );
  });
}

async function uploadToGitHubRepoIfConfigured(
  repoFileName: string,
  base64Content: string,
  commitMessage: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; storagePath: string } | null> {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('admin_gh_dispatch_token')?.trim();
  if (!token) return null;

  onProgress?.(40);
  const repoPath = `public/downloads/${repoFileName}`;
  const apiUrl = `https://api.github.com/repos/meAakashDas/this-is-this/contents/${repoPath}`;

  let existingSha: string | undefined;
  try {
    const checkRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (checkRes.ok) {
      const existingJson = await checkRes.json();
      existingSha = existingJson.sha;
    }
  } catch {
    // ignore check error
  }

  onProgress?.(65);
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: base64Content,
      branch: 'main',
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub upload failed (${putRes.status})`);
  }

  onProgress?.(100);
  return {
    url: `/downloads/${repoFileName}`,
    storagePath: `github:${repoPath}`,
  };
}

export interface PermanentUploadOptions {
  fileName: string;
  repoFileName: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  file?: File;
  bytes?: Uint8Array;
  existingInlineBytes?: number;
  isDevPreview?: boolean;
  commitMessage: string;
  onProgress?: (pct: number) => void;
}

export interface PermanentUploadResult {
  url: string;
  storagePath?: string;
  storageMode: 'firebase-storage' | 'github-pages' | 'firestore-inline' | 'dev-preview';
}

/**
 * Uploads any binary permanently via:
 * 1. Firebase Storage (when provisioned/reachable, e.g. Blaze or Emulator),
 * 2. GitHub Repository (`public/downloads/`) when PAT is configured in session,
 * 3. Validated inline Base64 Data URI in Firestore within strict < 1 MiB safety budget.
 */
export async function uploadBinaryPermanently(
  opts: PermanentUploadOptions
): Promise<PermanentUploadResult> {
  const {
    fileName,
    repoFileName,
    storagePath,
    mimeType,
    byteSize,
    file,
    bytes,
    existingInlineBytes = 0,
    isDevPreview = false,
    commitMessage,
    onProgress,
  } = opts;

  const getDataUrl = async (): Promise<string> => {
    if (file) return fileToDataUrl(file);
    if (bytes) return bytesToDataUri(bytes, mimeType);
    throw new Error(`No binary payload supplied for "${fileName}".`);
  };

  if (isDevPreview) {
    if (byteSize <= MAX_INLINE_FIRESTORE_BYTES) {
      onProgress?.(65);
      const dataUrl = await getDataUrl();
      onProgress?.(100);
      return { url: dataUrl, storageMode: 'dev-preview' };
    }
    throw new Error(
      `Cannot store "${fileName}" (${formatFileSizeBytes(byteSize)}) in local preview: exceeds ${formatFileSizeBytes(MAX_INLINE_FIRESTORE_BYTES)} inline limit.`
    );
  }

  // 1. Firebase Storage (fail-fast 4s timeout when Spark plan disables Storage)
  const storage = !firebaseStorageUnavailable ? tryGetFirebaseStorage() : null;
  if (storage) {
    try {
      onProgress?.(20);
      const payload = file || bytes!;
      const publicUrl = await uploadToFirebaseStorageFast(
        storage,
        storagePath,
        payload,
        mimeType,
        onProgress
      );
      onProgress?.(100);
      return { url: publicUrl, storagePath, storageMode: 'firebase-storage' };
    } catch (storageErr) {
      console.warn('[StorageUpload] Firebase Storage unavailable, trying fallback:', storageErr);
    }
  }

  // 2. GitHub Repository (`public/downloads/`) when PAT is configured in Publishing
  let ghFailureReason: string | null = null;
  try {
    const token =
      typeof window !== 'undefined' ? sessionStorage.getItem('admin_gh_dispatch_token')?.trim() : '';
    if (token) {
      const dataUrl = await getDataUrl();
      const base64Content = dataUrl.split(',')[1] || '';
      const ghResult = await uploadToGitHubRepoIfConfigured(
        repoFileName,
        base64Content,
        commitMessage,
        onProgress
      );
      if (ghResult) {
        return {
          url: ghResult.url,
          storagePath: ghResult.storagePath,
          storageMode: 'github-pages',
        };
      }
    }
  } catch (ghErr: any) {
    ghFailureReason = ghErr?.message || 'GitHub upload failed';
    console.warn('[StorageUpload] GitHub upload failed:', ghErr);
  }

  // 3. Permanent compact inline Data URI within Firestore's 1 MiB hard limit
  if (byteSize <= MAX_INLINE_FIRESTORE_BYTES) {
    onProgress?.(70);
    const dataUrl = await getDataUrl();
    const projectedBytes = existingInlineBytes + dataUrl.length;
    if (projectedBytes > MAX_DOCUMENT_JSON_BUDGET_BYTES) {
      throw new Error(
        `Storing "${fileName}" would exceed Cloud Firestore's 1 MiB document size limit (${formatFileSizeBytes(projectedBytes)} / 920 KB budget). Remove unused inline attachments or enable Firebase Storage / GitHub upload token.`
      );
    }
    onProgress?.(100);
    return { url: dataUrl, storageMode: 'firestore-inline' };
  }

  // 4. Reject oversized inline writes honestly
  throw new Error(
    ghFailureReason
      ? `Cannot store "${fileName}" (${formatFileSizeBytes(byteSize)}): GitHub upload failed (${ghFailureReason}), Firebase Storage is disabled on Spark plan, and the file exceeds Firestore's ${formatFileSizeBytes(MAX_INLINE_FIRESTORE_BYTES)} inline limit.`
      : `Cannot store "${fileName}" (${formatFileSizeBytes(byteSize)}): Firebase Storage is not provisioned on the free Spark plan and the file exceeds Firestore's ${formatFileSizeBytes(MAX_INLINE_FIRESTORE_BYTES)} inline limit. Configure a GitHub token in Publishing to store larger files.`
  );
}

/**
 * Safely deletes an obsolete binary from Firebase Storage or GitHub (only called AFTER Firestore commit).
 */
export async function deleteStoredBinarySafely(storagePath: string): Promise<void> {
  if (!storagePath) return;

  if (storagePath.startsWith('github:')) {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('admin_gh_dispatch_token')?.trim();
    if (!token) return;
    const repoPath = storagePath.replace(/^github:/, '');
    const apiUrl = `https://api.github.com/repos/meAakashDas/this-is-this/contents/${repoPath}`;
    try {
      const checkRes = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!checkRes.ok) return;
      const existingJson = await checkRes.json();
      if (!existingJson?.sha) return;
      await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `chore(resources): remove obsolete binary ${repoPath}`,
          sha: existingJson.sha,
          branch: 'main',
        }),
      });
    } catch {
      // Non-fatal cleanup error
    }
    return;
  }

  if (firebaseStorageUnavailable) return;
  const storage = tryGetFirebaseStorage();
  if (!storage) return;
  try {
    await Promise.race([
      deleteObject(ref(storage, storagePath)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), STORAGE_TIMEOUT_MS)),
    ]);
  } catch {
    firebaseStorageUnavailable = true;
  }
}
