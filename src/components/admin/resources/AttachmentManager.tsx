import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Loader2,
  RefreshCw,
  Link as LinkIcon,
  Info,
} from 'lucide-react';
import type { CmsAttachment } from '../../../types/cms/resource.ts';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { isTemporaryBlobUrl } from '../../../lib/cms/sanitize.ts';

interface AttachmentManagerProps {
  resourceNumber: string;
  attachments: CmsAttachment[];
  onChange: (attachments: CmsAttachment[]) => void;
  isDevPreview?: boolean;
}

const SUPPORTED_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'xlsx',
  'xls',
  'csv',
  'pptx',
  'ppt',
  'zip',
  'png',
  'jpg',
  'jpeg',
  'webp',
];

const LOCAL_DOWNLOAD_PRESETS = [
  {
    name: 'Starter Personal Budget Framework (PDF)',
    fileName: 'resource-001-starter-personal-budget-framework.pdf',
    url: '/downloads/resource-001-starter-personal-budget-framework.pdf',
    format: 'PDF Document',
    fileExtension: 'pdf',
    fileSize: '486 KB',
  },
  {
    name: 'Starter Personal Budget Framework (DOCX)',
    fileName: 'resource-001-starter-personal-budget-framework.docx',
    url: '/downloads/resource-001-starter-personal-budget-framework.docx',
    format: 'Word Document',
    fileExtension: 'docx',
    fileSize: '36 KB',
  },
  {
    name: 'Starter Budget Model (CSV)',
    fileName: 'starter-budget-model-001.csv',
    url: '/downloads/starter-budget-model-001.csv',
    format: 'CSV Data File',
    fileExtension: 'csv',
    fileSize: '1 KB',
  },
  {
    name: 'Nepal Banking Account Checklist (PDF)',
    fileName: 'resource-002-nepal-banking-account-checklist.pdf',
    url: '/downloads/resource-002-nepal-banking-account-checklist.pdf',
    format: 'PDF Document',
    fileExtension: 'pdf',
    fileSize: '442 KB',
  },
  {
    name: 'Nepal Banking Account Checklist (DOCX)',
    fileName: 'resource-002-nepal-banking-account-checklist.docx',
    url: '/downloads/resource-002-nepal-banking-account-checklist.docx',
    format: 'Word Document',
    fileExtension: 'docx',
    fileSize: '40 KB',
  },
  {
    name: 'Student Productivity Semester Tracker (PDF)',
    fileName: 'resource-003-student-productivity-semester-tracker.pdf',
    url: '/downloads/resource-003-student-productivity-semester-tracker.pdf',
    format: 'PDF Document',
    fileExtension: 'pdf',
    fileSize: '462 KB',
  },
  {
    name: 'Student Productivity Semester Tracker (DOCX)',
    fileName: 'resource-003-student-productivity-semester-tracker.docx',
    url: '/downloads/resource-003-student-productivity-semester-tracker.docx',
    format: 'Word Document',
    fileExtension: 'docx',
    fileSize: '38 KB',
  },
];

const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMG_SIZE = 10 * 1024 * 1024; // 10MB
// Firestore document limit is 1 MiB; ~600 KB binary becomes ~800 KB base64 safely under 1 MiB.
const MAX_INLINE_FIRESTORE_BYTES = 600 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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
      return 'Presentation (PPTX)';
    case 'zip':
      return 'ZIP Archive';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return 'Image Asset';
    default:
      return `${ext.toUpperCase()} File`;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode file as Data URI.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file bytes.'));
    reader.readAsDataURL(file);
  });
}

async function uploadToGitHubDownloadsIfConfigured(
  file: File,
  resourceNumber: string
): Promise<{ url: string; storagePath: string } | null> {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('admin_gh_dispatch_token')?.trim();
  if (!token) return null;

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const repoFileName = `resource-${resourceNumber}-${cleanFileName}`;
  const repoPath = `public/downloads/${repoFileName}`;
  const apiUrl = `https://api.github.com/repos/meAakashDas/this-is-this/contents/${repoPath}`;

  // Check if file exists to get sha for update
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

  const dataUrl = await fileToDataUrl(file);
  const base64Content = dataUrl.split(',')[1] || '';

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore(resources): upload attachment ${repoFileName} for resource #${resourceNumber}`,
      content: base64Content,
      branch: 'main',
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub upload failed (${putRes.status})`);
  }

  return {
    url: `/downloads/${repoFileName}`,
    storagePath: `github:${repoPath}`,
  };
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  resourceNumber,
  attachments,
  onChange,
  isDevPreview = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Manual link / external URL form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkSize, setLinkSize] = useState('');
  const [linkPreviewable, setLinkPreviewable] = useState(true);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return `File type .${ext} is not supported. Permitted: ${SUPPORTED_EXTENSIONS.join(', ')}`;
    }

    const isImg = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
    const maxSize = isImg ? MAX_IMG_SIZE : MAX_DOC_SIZE;
    if (file.size > maxSize) {
      return `File size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(maxSize)}`;
    }

    return null;
  };

  /**
   * Resolves a genuine permanent URL for an uploaded file:
   * 1. Attempts Firebase Storage if provisioned.
   * 2. Falls back to GitHub Repository (`public/downloads/`) if GitHub token is configured.
   * 3. Falls back to permanent inline Base64 Data URI in Firestore for files <= 600 KB.
   * 4. Rejects larger files with a clear error instead of storing fake paths or blob: URLs.
   */
  const uploadFilePermanently = async (
    file: File
  ): Promise<{ url: string; storagePath?: string; notice?: string }> => {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/resources/${resourceNumber}/${cleanFileName}`;

    if (isDevPreview) {
      if (file.size <= MAX_INLINE_FIRESTORE_BYTES) {
        const dataUrl = await fileToDataUrl(file);
        return {
          url: dataUrl,
          notice: `Dev Mode: "${file.name}" (${formatBytes(file.size)}) encoded as a permanent Data URI for local preview.`,
        };
      }
      throw new Error(
        `Dev Preview cannot inline files larger than ${formatBytes(MAX_INLINE_FIRESTORE_BYTES)} without Firebase Storage.`
      );
    }

    // 1. Attempt Firebase Storage
    const storage = tryGetFirebaseStorage();
    if (storage) {
      try {
        setUploadProgress(40);
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file, {
          contentType: file.type || 'application/octet-stream',
        });
        const publicUrl = await getDownloadURL(fileRef);
        setUploadProgress(100);
        return { url: publicUrl, storagePath };
      } catch (storageErr) {
        console.warn('[AttachmentManager] Firebase Storage unavailable, checking permanent alternatives:', storageErr);
      }
    }

    // 2. Attempt GitHub Repository static downloads upload (if PAT configured in Publishing)
    let ghFailureReason: string | null = null;
    try {
      const ghResult = await uploadToGitHubDownloadsIfConfigured(file, resourceNumber);
      if (ghResult) {
        return {
          url: ghResult.url,
          storagePath: ghResult.storagePath,
          notice: `Firebase Storage is unavailable on Spark plan. "${file.name}" was committed directly to ${ghResult.storagePath} and will be live at ${ghResult.url} once deployment finishes.`,
        };
      }
    } catch (ghErr: any) {
      ghFailureReason = ghErr?.message || 'GitHub upload failed';
      console.warn('[AttachmentManager] GitHub upload failed:', ghErr);
    }

    // 3. Permanent inline Data URI in Firestore (files <= 600 KB)
    if (file.size <= MAX_INLINE_FIRESTORE_BYTES) {
      setUploadProgress(80);
      const dataUrl = await fileToDataUrl(file);
      setUploadProgress(100);
      return {
        url: dataUrl,
        notice: ghFailureReason
          ? `GitHub upload failed (${ghFailureReason}). "${file.name}" (${formatBytes(file.size)}) was instead stored as a permanent inline Data URI in Cloud Firestore.`
          : `Firebase Storage is not provisioned on the Spark plan. "${file.name}" (${formatBytes(file.size)}) was encoded as a permanent inline Data URI and will persist directly in Cloud Firestore.`,
      };
    }

    // 4. Reject rather than storing a fake link or blob: URL
    throw new Error(
      ghFailureReason
        ? `Cannot store "${file.name}" (${formatBytes(file.size)}): GitHub upload failed (${ghFailureReason}), Firebase Storage is not provisioned on the free Spark plan, and the file exceeds Firestore's ${formatBytes(MAX_INLINE_FIRESTORE_BYTES)} inline limit.`
        : `Cannot store "${file.name}" (${formatBytes(file.size)}): Firebase Storage is not provisioned on the free Spark plan and the file exceeds Firestore's ${formatBytes(MAX_INLINE_FIRESTORE_BYTES)} inline limit. Use "Add Link / External URL" to attach a permanent external URL (e.g. Google Drive / GitHub Release) or configure a GitHub token in Publishing.`
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploadNotice(null);

    const newAttachments: CmsAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const err = validateFile(file);
      if (err) {
        setUploadError(err);
        setUploadProgress(null);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = ext === 'pdf';

      try {
        setUploadProgress(15);
        const result = await uploadFilePermanently(file);
        if (result.notice) {
          setUploadNotice(result.notice);
        }

        const att: CmsAttachment = {
          id: `att-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
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
        };
        newAttachments.push(att);
      } catch (uploadErr: any) {
        setUploadError(uploadErr?.message || `Failed to upload "${file.name}".`);
        setUploadProgress(null);
        if (newAttachments.length > 0) {
          onChange([...attachments, ...newAttachments]);
        }
        return;
      }
    }

    setUploadProgress(null);
    onChange([...attachments, ...newAttachments]);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingIndex === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const err = validateFile(file);
    if (err) {
      setUploadError(err);
      setReplacingIndex(null);
      return;
    }

    setUploadError(null);
    setUploadNotice(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const oldAtt = attachments[replacingIndex];

    try {
      setUploadProgress(20);
      const result = await uploadFilePermanently(file);
      if (result.notice) {
        setUploadNotice(result.notice);
      }

      if (
        !isDevPreview &&
        oldAtt.storagePath &&
        !oldAtt.storagePath.startsWith('github:') &&
        oldAtt.storagePath !== result.storagePath
      ) {
        try {
          const storage = tryGetFirebaseStorage();
          if (storage) {
            await deleteObject(ref(storage, oldAtt.storagePath));
          }
        } catch (delErr) {
          console.warn('Failed to clean up obsolete storage object:', delErr);
        }
      }

      const updated = [...attachments];
      updated[replacingIndex] = {
        ...oldAtt,
        fileName: file.name,
        format: getFormatName(ext),
        fileSize: formatBytes(file.size),
        url: result.url,
        storagePath: result.storagePath,
        fileExtension: ext,
        mimeType: file.type || '',
        isPreviewable: isPdf,
        uploadedAt: new Date().toISOString(),
      };
      onChange(updated);
    } catch (replaceErr: any) {
      setUploadError(replaceErr?.message || `Failed to replace "${oldAtt.name}".`);
    } finally {
      setUploadProgress(null);
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleAddManualLink = async () => {
    setUploadError(null);
    setUploadNotice(null);

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      setUploadError('Please provide a file path or permanent URL.');
      return;
    }
    if (isTemporaryBlobUrl(trimmedUrl) || trimmedUrl.toLowerCase().startsWith('javascript:')) {
      setUploadError('Temporary blob: or unsafe URLs are not permitted.');
      return;
    }

    const isLocalPath = trimmedUrl.startsWith('/');
    if (!isLocalPath) {
      try {
        const parsed = new URL(trimmedUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setUploadError('External links must use https:// or http://.');
          return;
        }
      } catch {
        setUploadError('Please enter a valid root path (/downloads/...) or full URL (https://...).');
        return;
      }
    } else if (typeof window !== 'undefined' && !isDevPreview) {
      try {
        const check = await fetch(trimmedUrl, { method: 'HEAD' });
        if (!check.ok) {
          setUploadNotice(
            `Note: "${trimmedUrl}" returned HTTP ${check.status} on this server. Make sure the file exists in "public/downloads/" before deploying.`
          );
        }
      } catch {
        // Non-fatal check
      }
    }

    const cleanSegment = trimmedUrl.split('?')[0].split('#')[0];
    const fileName = cleanSegment.split('/').pop() || 'external-resource';
    const extMatch = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    const ext = extMatch || (trimmedUrl.startsWith('http') ? 'link' : 'pdf');
    const isPdf = ext === 'pdf';

    const newAtt: CmsAttachment = {
      id: `att-${Date.now()}`,
      name: linkName.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      fileName,
      format: ext === 'link' ? 'External Link' : getFormatName(ext),
      fileSize: linkSize.trim() || (ext === 'link' ? 'External' : 'Standard'),
      url: trimmedUrl,
      description: linkDescription.trim() || undefined,
      fileExtension: ext,
      isPreviewable: isPdf && linkPreviewable,
      order: attachments.length + 1,
      visible: true,
      uploadedAt: new Date().toISOString(),
    };

    onChange([...attachments, newAtt]);
    setLinkName('');
    setLinkUrl('');
    setLinkDescription('');
    setLinkSize('');
    setShowLinkForm(false);
  };

  const handleApplyPreset = (preset: (typeof LOCAL_DOWNLOAD_PRESETS)[0]) => {
    setLinkName(preset.name);
    setLinkUrl(preset.url);
    setLinkSize(preset.fileSize);
    setLinkPreviewable(preset.fileExtension === 'pdf');
  };

  const handleUpdate = (index: number, field: keyof CmsAttachment, value: any) => {
    if (field === 'url' && isTemporaryBlobUrl(value)) {
      setUploadError('Temporary blob: URLs cannot be saved.');
      return;
    }
    const updated = [...attachments];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleToggleVisible = (index: number) => {
    const updated = [...attachments];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...attachments];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((a, i) => {
      a.order = i + 1;
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === attachments.length - 1) return;
    const updated = [...attachments];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((a, i) => {
      a.order = i + 1;
    });
    onChange(updated);
  };

  const handleDelete = async (index: number) => {
    const target = attachments[index];
    if (confirm(`Remove attachment "${target.name}"?`)) {
      if (!isDevPreview && target.storagePath && !target.storagePath.startsWith('github:')) {
        try {
          const storage = tryGetFirebaseStorage();
          if (storage) {
            await deleteObject(ref(storage, target.storagePath));
          }
        } catch (delErr) {
          console.warn('Storage delete warning (non-fatal):', delErr);
        }
      }

      const updated = attachments.filter((_, i) => i !== index);
      updated.forEach((a, i) => {
        a.order = i + 1;
      });
      onChange(updated);
    }
  };

  const getFormatIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
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
      case 'webp':
        return <Image className="w-4 h-4 text-sky-500" />;
      case 'link':
        return <LinkIcon className="w-4 h-4 text-primary" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for Replace */}
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={handleReplaceFile}
        accept={SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
      />

      {/* Hidden file input for Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept={SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
      />

      {/* Header, counter and Add Link Button */}
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 m-0">
          <UploadCloud className="w-4 h-4 text-primary" />
          Downloadable Educational Attachments
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{showLinkForm ? 'Hide Link Form' : 'Add Link / Local File'}</span>
          </button>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Add Link / Local Asset Form */}
      {showLinkForm && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                Link Permanent File or External Download URL
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Link static files from <code className="font-mono text-[10px]">/downloads/</code> or external URLs (Google Drive, GitHub Releases, Notion, etc.).
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Available Local Downloads:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LOCAL_DOWNLOAD_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2 py-1 text-[11px] font-mono rounded-md border border-border bg-background hover:bg-secondary text-foreground transition-colors text-left truncate max-w-xs cursor-pointer"
                  title={preset.name}
                >
                  {preset.fileName}
                </button>
              ))}
            </div>
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Attachment Title *</label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Starter Budget Framework"
                className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">File Path / URL *</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/downloads/resource-001-starter-personal-budget-framework.pdf or https://..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Description (optional)</label>
              <input
                type="text"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                placeholder="Brief note about this file"
                className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">File Size Label</label>
              <input
                type="text"
                value={linkSize}
                onChange={(e) => setLinkSize(e.target.value)}
                placeholder="e.g. 486 KB"
                className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkPreviewable}
                  onChange={(e) => setLinkPreviewable(e.target.checked)}
                  className="rounded-sm border-input text-primary focus:ring-primary/20"
                />
                <span>Allow In-Browser PDF Preview</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLinkForm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddManualLink}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Add Attachment
            </button>
          </div>
        </div>
      )}

      {/* Upload Drag & Drop Zone */}
      <div
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
        className={`p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border/80 hover:border-border hover:bg-card/40'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Click to select files or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, DOCX, XLSX, CSV, PPTX, ZIP, PNG, JPG (up to 600KB inline in Firestore on Spark plan, or larger via Storage / GitHub / External URL)
            </p>
          </div>
          {isDevPreview && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Dev Mode: Permanent inline Data URI preview
            </span>
          )}
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-card">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Processing attachment...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Informative Notice */}
      {uploadNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span className="leading-relaxed">{uploadNotice}</span>
        </div>
      )}

      {/* Error alert */}
      {uploadError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{uploadError}</span>
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-3">
        {attachments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No downloadable attachments linked yet.</p>
          </div>
        ) : (
          attachments.map((att, index) => (
            <div
              key={att.id || index}
              className={`attachment-item p-4 rounded-xl border transition-all ${
                att.visible
                  ? 'border-border bg-card shadow-xs'
                  : 'border-border/60 bg-muted/30 opacity-60'
              }`}
            >
              {/* Item Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    {getFormatIcon(att.fileExtension)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {att.name || att.fileName}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground shrink-0">
                        {att.fileExtension.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {att.fileSize}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono truncate block">
                      {att.fileName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <a
                    href={att.url}
                    download={att.fileName || att.name}
                    target={att.url.startsWith('data:') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Download & Verify File"
                    aria-label={`Download and verify ${att.fileName}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingIndex(index);
                      replaceInputRef.current?.click();
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title="Replace with new file"
                    aria-label={`Replace ${att.fileName}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(index)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title={att.visible ? 'Hide from public site' : 'Show on public site'}
                    aria-label={att.visible ? 'Hide attachment' : 'Show attachment'}
                  >
                    {att.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-destructive" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                    title="Move Up"
                    aria-label="Move attachment up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === attachments.length - 1}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                    title="Move Down"
                    aria-label="Move attachment down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors ml-1 cursor-pointer"
                    title="Delete Attachment"
                    aria-label="Delete attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable metadata fields & URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Display Label *</label>
                  <input
                    type="text"
                    value={att.name}
                    onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Starter Budget Guide"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">File Path / URL *</label>
                  <input
                    type="text"
                    value={att.url.startsWith('data:') ? `[Inline Data URI — ${att.fileSize}]` : att.url}
                    readOnly={att.url.startsWith('data:')}
                    onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="/downloads/file.pdf"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                  <input
                    type="text"
                    value={att.description || ''}
                    onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="Brief note"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-4 mt-2.5 pt-2 text-xs text-muted-foreground flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={att.isPreviewable}
                    onChange={(e) => handleUpdate(index, 'isPreviewable', e.target.checked)}
                    className="rounded-sm border-input text-primary focus:ring-primary/20"
                  />
                  <span>Allow In-Browser PDF Preview</span>
                </label>
                {att.url.startsWith('data:') && (
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    Stored permanently inline in Firestore
                  </span>
                )}
                {att.storagePath && (
                  <span className="font-mono text-[11px] opacity-60 truncate max-w-xs" title={att.storagePath}>
                    Storage: {att.storagePath}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
