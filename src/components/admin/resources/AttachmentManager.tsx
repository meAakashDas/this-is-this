import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { CmsAttachment } from '../../../types/cms/resource.ts';
import {
  uploadBinaryPermanently,
  deleteStoredBinarySafely,
  formatFileSizeBytes as formatBytes,
} from '../../../lib/cms/storageUpload.ts';

interface AttachmentManagerProps {
  resourceNumber: string;
  attachments: CmsAttachment[];
  stagedIds?: Set<string>;
  documentContentBytes?: number;
  onChange: (attachments: CmsAttachment[], meta?: { attachmentsMutated?: boolean; stagedAttachmentId?: string }) => void;
  onQueueBinaryCleanup?: (storagePath: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  isDevPreview?: boolean;
}

const SUPPORTED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'ppt',
  'pptx',
  'zip',
  'png',
  'jpg',
  'jpeg',
];

const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_IMG_SIZE = 10 * 1024 * 1024; // 10 MB

function getFormatName(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'PDF Document';
    case 'docx':
    case 'doc':
      return 'Word Document';
    case 'xlsx':
    case 'xls':
      return 'Excel Spreadsheet';
    case 'csv':
      return 'CSV Data File';
    case 'pptx':
    case 'ppt':
      return 'Presentation';
    case 'zip':
      return 'ZIP Archive';
    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'Image Asset';
    default:
      return `${ext.toUpperCase()} File`;
  }
}

function estimateInlineDataUriBytes(attachmentsList: CmsAttachment[]): number {
  let total = 0;
  for (const att of attachmentsList) {
    if (att.url?.startsWith('data:')) {
      total += att.url.length;
    }
  }
  return total;
}

/**
 * Safely deletes a stored binary from Firebase Storage or GitHub (after Firestore write succeeds).
 */
export async function cleanupObsoleteAttachmentBinary(storagePath: string): Promise<void> {
  return deleteStoredBinarySafely(storagePath);
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  resourceNumber,
  attachments,
  stagedIds,
  documentContentBytes = 0,
  onChange,
  onQueueBinaryCleanup,
  onUploadingChange,
  isDevPreview = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string>('');

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type ".${ext}". Allowed: PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, ZIP, PNG, JPG.`;
    }
    const isImg = ['png', 'jpg', 'jpeg'].includes(ext);
    const maxSize = isImg ? MAX_IMG_SIZE : MAX_DOC_SIZE;
    if (file.size > maxSize) {
      return `File "${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(maxSize)} limit.`;
    }
    return null;
  };

  /**
   * Permanently stores an uploaded file without ever using blob: URLs or fake paths:
   * 1. Attempts Firebase Storage (fail-fast 4s timeout if unprovisioned).
   * 2. Falls back to GitHub Repository (`public/downloads/`) if GitHub token is configured in Publishing.
   * 3. Falls back to permanent inline Base64 Data URI in Firestore (<= 600 KB per file).
   * 4. Rejects larger files cleanly with a descriptive error.
   */
  const uploadFilePermanently = async (
    file: File,
    existingPool: CmsAttachment[]
  ): Promise<{ url: string; storagePath?: string }> => {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const duplicateExists = existingPool.some(
      (a) =>
        a.fileName === file.name ||
        (a.storagePath && a.storagePath.endsWith(`-${cleanFileName}`))
    );
    const uniqueSuffix = duplicateExists ? `-${Date.now().toString(36)}` : '';
    const dotIdx = cleanFileName.lastIndexOf('.');
    const disambiguatedName =
      uniqueSuffix && dotIdx > 0
        ? `${cleanFileName.slice(0, dotIdx)}${uniqueSuffix}${cleanFileName.slice(dotIdx)}`
        : `${cleanFileName}${uniqueSuffix}`;
    const repoFileName = `resource-${resourceNumber}-${disambiguatedName}`;
    const storagePath = `uploads/resources/${resourceNumber}/${Date.now()}-${cleanFileName}`;
    const existingInlineBytes =
      estimateInlineDataUriBytes(existingPool) + documentContentBytes;

    return uploadBinaryPermanently({
      fileName: file.name,
      repoFileName,
      storagePath,
      mimeType: file.type || 'application/octet-stream',
      byteSize: file.size,
      file,
      existingInlineBytes,
      isDevPreview,
      commitMessage: `chore(resources): upload ${repoFileName} for resource #${resourceNumber}`,
      onProgress: (pct) => setUploadProgress(pct),
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (uploadingRef.current) {
      setUploadError('Please wait for the active file upload to finish.');
      return;
    }
    setUploadError(null);
    setUploadSuccess(null);

    // Pre-validate all selected files before starting any uploads
    for (let i = 0; i < files.length; i++) {
      const validationErr = validateFile(files[i]);
      if (validationErr) {
        setUploadError(validationErr);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    uploadingRef.current = true;
    onUploadingChange?.(true);
    const addedAttachments: CmsAttachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isPdf = ext === 'pdf';

        setProcessingFileName(file.name);
        setUploadProgress(10);

        const result = await uploadFilePermanently(file, [...attachments, ...addedAttachments]);

        addedAttachments.push({
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || file.name,
          fileName: file.name,
          format: getFormatName(ext),
          fileSize: formatBytes(file.size),
          url: result.url,
          storagePath: result.storagePath,
          fileExtension: ext,
          mimeType: file.type || '',
          isPreviewable: isPdf,
          order: attachments.length + i + 1,
          visible: true,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (addedAttachments.length > 0) {
        const updatedList = [...attachments, ...addedAttachments];
        const stagedId = addedAttachments.map((a) => a.id).join(',');
        onChange(updatedList, { attachmentsMutated: true, stagedAttachmentId: stagedId });
        setUploadSuccess(
          addedAttachments.length === 1
            ? `Added "${addedAttachments[0].fileName}" (${addedAttachments[0].fileSize}) — staged locally. Click Save Draft or Publish/Update to save.`
            : `Added ${addedAttachments.length} files — staged locally. Click Save Draft or Publish/Update to save.`
        );
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process uploaded file.');
      if (addedAttachments.length > 0) {
        const stagedId = addedAttachments.map((a) => a.id).join(',');
        onChange([...attachments, ...addedAttachments], {
          attachmentsMutated: true,
          stagedAttachmentId: stagedId,
        });
      }
    } finally {
      uploadingRef.current = false;
      onUploadingChange?.(false);
      setUploadProgress(null);
      setProcessingFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = replacingIndex;
    const files = e.target.files;
    if (idx === null || !files || files.length === 0) {
      setReplacingIndex(null);
      return;
    }
    if (uploadingRef.current) {
      setUploadError('Please wait for the active file upload to finish.');
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    const file = files[0];
    const validationErr = validateFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);

    const oldAtt = attachments[idx];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';

    uploadingRef.current = true;
    onUploadingChange?.(true);

    try {
      setProcessingFileName(file.name);
      setUploadProgress(15);

      const remainingPool = attachments.filter((_, i) => i !== idx);
      const result = await uploadFilePermanently(file, remainingPool);

      if (oldAtt.storagePath && oldAtt.storagePath !== result.storagePath && onQueueBinaryCleanup) {
        onQueueBinaryCleanup(oldAtt.storagePath);
      }

      const updated = [...attachments];
      updated[idx] = {
        ...oldAtt,
        name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || oldAtt.name,
        fileName: file.name,
        format: getFormatName(ext),
        fileSize: formatBytes(file.size),
        url: result.url,
        storagePath: result.storagePath,
        fileExtension: ext,
        mimeType: file.type || '',
        isPreviewable: isPdf,
        visible: true,
        uploadedAt: new Date().toISOString(),
      };

      onChange(updated, { attachmentsMutated: true, stagedAttachmentId: oldAtt.id });
      setUploadSuccess(
        `Replaced "${oldAtt.fileName || oldAtt.name}" with "${file.name}" (${formatBytes(file.size)}) — staged locally. Click Save Draft or Publish/Update to save changes.`
      );
    } catch (replaceErr: any) {
      setUploadError(replaceErr?.message || `Failed to replace "${oldAtt.name}".`);
    } finally {
      uploadingRef.current = false;
      onUploadingChange?.(false);
      setUploadProgress(null);
      setProcessingFileName('');
      setReplacingIndex(null);
      if (replaceInputRef.current) {
        replaceInputRef.current.value = '';
      }
    }
  };

  const handleRename = (index: number, newDisplayName: string) => {
    const updated = [...attachments];
    updated[index] = { ...updated[index], name: newDisplayName };
    onChange(updated, { attachmentsMutated: false });
  };

  const handleDelete = (index: number) => {
    const target = attachments[index];
    if (!target) return;

    setUploadError(null);

    if (target.storagePath && onQueueBinaryCleanup) {
      onQueueBinaryCleanup(target.storagePath);
    }

    const updated = attachments
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, order: idx + 1 }));

    onChange(updated, { attachmentsMutated: true });
    setUploadSuccess(
      `Removed "${target.name || target.fileName}". Click Save Draft or Publish/Update to permanently save removal.`
    );
  };

  const getFormatIcon = (ext: string) => {
    switch ((ext || '').toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case 'zip':
        return <FileArchive className="w-4 h-4 text-amber-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <Image className="w-4 h-4 text-sky-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={handleReplaceFile}
        accept={SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept={SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
      />

      {/* Drag & Drop Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-7 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border/80 hover:border-border hover:bg-card/40'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-primary">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground m-0">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1 m-0">
              PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, ZIP, PNG, JPG
            </p>
          </div>
        </div>
      </div>

      {/* Actual Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-card">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
              <span>Uploading {processingFileName || 'file'}...</span>
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Clear Success Feedback */}
      {uploadSuccess && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{uploadSuccess}</span>
        </div>
      )}

      {/* Clear Error Feedback */}
      {uploadError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{uploadError}</span>
        </div>
      )}

      {/* Uploaded Files List */}
      <div className="space-y-2.5">
        {attachments.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-7 h-7 mx-auto mb-1.5 opacity-40" />
            <p className="text-xs m-0">No downloadable files attached yet.</p>
          </div>
        ) : (
          attachments.map((att, index) => (
            <div
              key={att.id || index}
              data-attachment-id={att.id}
              className="attachment-item p-4 rounded-xl border border-border bg-card shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                    {getFormatIcon(att.fileExtension)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border bg-secondary text-foreground shrink-0">
                        {(att.fileExtension || 'FILE').toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {att.fileName || att.name}
                      </span>
                      {att.fileSize && (
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          • {att.fileSize}
                        </span>
                      )}
                      {stagedIds?.has(att.id) ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">
                          Staged (unsaved)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <a
                    href={att.url}
                    download={att.fileName || att.name}
                    target={att.url.startsWith('http') ? '_blank' : undefined}
                    rel={att.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors no-underline"
                    aria-label={`Download ${att.fileName || att.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    disabled={uploadProgress !== null}
                    onClick={() => {
                      setReplacingIndex(index);
                      replaceInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={`Replace ${att.fileName || att.name}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    disabled={uploadProgress !== null}
                    onClick={() => handleDelete(index)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-xs font-medium text-destructive transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={`Delete ${att.fileName || att.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Editable Display Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground block">
                  File Display Name
                </label>
                <input
                  type="text"
                  value={att.name}
                  onChange={(e) => handleRename(index, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter file display name"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
