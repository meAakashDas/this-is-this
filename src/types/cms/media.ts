/**
 * Media Asset and Storage Migration Manifest Types
 */

export type UploadStatus = 'local-only' | 'staged' | 'uploaded' | 'verified' | 'failed';

export interface MediaAssetManifestEntry {
  id: string;
  localPath: string; // e.g. "public/downloads/starter-budget-template-001.pdf"
  targetStoragePath: string; // e.g. "uploads/resources/001/starter-budget-template-001.pdf"
  referencingDocument: string; // e.g. "resources/001", "siteSettings/general", "pages/home"
  fileType: string; // MIME type e.g. "application/pdf"
  extension: string; // e.g. "pdf", "docx", "webp", "jpg"
  sizeBytes: number;
  sizeFormatted: string; // e.g. "142 KB"
  uploadStatus: UploadStatus;
  notes?: string;
}

export interface MediaStorageManifest {
  version: string;
  generatedAt: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  assets: MediaAssetManifestEntry[];
}
