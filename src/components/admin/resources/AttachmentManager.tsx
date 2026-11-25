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
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  Info,
} from 'lucide-react';
import type { CmsAttachment } from '../../../types/cms/resource.ts';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

  // Manual link form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
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
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = ext === 'pdf';
      const objectUrl = URL.createObjectURL(file);

      if (isDevPreview) {
        // Local simulation with Object URL
        const att: CmsAttachment = {
          id: `att-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          fileName: file.name,
          format: getFormatName(ext),
          fileSize: formatBytes(file.size),
          url: objectUrl,
          fileExtension: ext,
          mimeType: file.type || '',
          isPreviewable: isPdf,
          order: attachments.length + i + 1,
          visible: true,
          uploadedAt: new Date().toISOString(),
        };
        newAttachments.push(att);
      } else {
        // Authenticated: check if Firebase Storage is available
        const storage = tryGetFirebaseStorage();
        if (!storage) {
          // On Spark plan without Storage, load as session preview and inform user
          const permanentPath = `/downloads/${file.name}`;
          const att: CmsAttachment = {
            id: `att-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            fileName: file.name,
            format: getFormatName(ext),
            fileSize: formatBytes(file.size),
            url: permanentPath,
            fileExtension: ext,
            mimeType: file.type || '',
            isPreviewable: isPdf,
            order: attachments.length + i + 1,
            visible: true,
            uploadedAt: new Date().toISOString(),
          };
          newAttachments.push(att);
          setUploadNotice(
            `Firebase Storage is disabled on the free Spark plan. Linked permanently to "${permanentPath}". Place "${file.name}" in "public/downloads/" before committing.`
          );
          continue;
        }

        try {
          setUploadProgress(20);
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `uploads/resources/${resourceNumber}/${cleanFileName}`;
          const fileRef = ref(storage, storagePath);

          setUploadProgress(60);
          await uploadBytes(fileRef, file, { contentType: file.type });
          const publicUrl = await getDownloadURL(fileRef);
          setUploadProgress(100);

          const att: CmsAttachment = {
            id: `att-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            fileName: file.name,
            format: getFormatName(ext),
            fileSize: formatBytes(file.size),
            url: publicUrl,
            storagePath,
            fileExtension: ext,
            mimeType: file.type || '',
            isPreviewable: isPdf,
            order: attachments.length + i + 1,
            visible: true,
            uploadedAt: new Date().toISOString(),
          };
          newAttachments.push(att);
        } catch (uploadErr: any) {
          console.warn('[Storage upload warning on Spark plan]:', uploadErr);
          // Graceful fallback without crashing
          const permanentPath = `/downloads/${file.name}`;
          const att: CmsAttachment = {
            id: `att-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            fileName: file.name,
            format: getFormatName(ext),
            fileSize: formatBytes(file.size),
            url: permanentPath,
            fileExtension: ext,
            mimeType: file.type || '',
            isPreviewable: isPdf,
            order: attachments.length + i + 1,
            visible: true,
            uploadedAt: new Date().toISOString(),
          };
          newAttachments.push(att);
          setUploadNotice(
            `Firebase Storage is not enabled on the Spark plan. Linked permanently to "${permanentPath}". Place "${file.name}" into "public/downloads/".`
          );
        }
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
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const oldAtt = attachments[replacingIndex];
    const objectUrl = URL.createObjectURL(file);

    if (isDevPreview) {
      const updated = [...attachments];
      updated[replacingIndex] = {
        ...oldAtt,
        fileName: file.name,
        format: getFormatName(ext),
        fileSize: formatBytes(file.size),
        url: objectUrl,
        fileExtension: ext,
        mimeType: file.type || '',
        isPreviewable: isPdf,
        uploadedAt: new Date().toISOString(),
      };
      onChange(updated);
    } else {
      const storage = tryGetFirebaseStorage();
      if (!storage) {
        const permanentPath = `/downloads/${file.name}`;
        const updated = [...attachments];
        updated[replacingIndex] = {
          ...oldAtt,
          fileName: file.name,
          format: getFormatName(ext),
          fileSize: formatBytes(file.size),
          url: permanentPath,
          fileExtension: ext,
          mimeType: file.type || '',
          isPreviewable: isPdf,
          uploadedAt: new Date().toISOString(),
        };
        onChange(updated);
        setUploadNotice(
          `Firebase Storage is disabled on Spark plan. Linked permanently to "${permanentPath}". Place "${file.name}" into "public/downloads/".`
        );
      } else {
        try {
          setUploadProgress(30);
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `uploads/resources/${resourceNumber}/${cleanFileName}`;
          const fileRef = ref(storage, storagePath);

          setUploadProgress(60);
          await uploadBytes(fileRef, file, { contentType: file.type });
          const publicUrl = await getDownloadURL(fileRef);

          if (oldAtt.storagePath && oldAtt.storagePath !== storagePath) {
            try {
              await deleteObject(ref(storage, oldAtt.storagePath));
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
            url: publicUrl,
            storagePath,
            fileExtension: ext,
            mimeType: file.type || '',
            isPreviewable: isPdf,
            uploadedAt: new Date().toISOString(),
          };
          setUploadProgress(100);
          onChange(updated);
        } catch (replaceErr: any) {
          console.warn('[Replace file warning on Spark plan]:', replaceErr);
          const permanentPath = `/downloads/${file.name}`;
          const updated = [...attachments];
          updated[replacingIndex] = {
            ...oldAtt,
            fileName: file.name,
            format: getFormatName(ext),
            fileSize: formatBytes(file.size),
            url: permanentPath,
            fileExtension: ext,
            mimeType: file.type || '',
            isPreviewable: isPdf,
            uploadedAt: new Date().toISOString(),
          };
          onChange(updated);
          setUploadNotice(
            `Firebase Storage is not enabled on Spark plan. Linked permanently to "${permanentPath}". Place "${file.name}" in "public/downloads/".`
          );
        } finally {
          setUploadProgress(null);
        }
      }
    }

    setReplacingIndex(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handleAddManualLink = () => {
    if (!linkUrl.trim()) {
      setUploadError('Please provide a file URL or path.');
      return;
    }

    const trimmedUrl = linkUrl.trim();
    const fileName = trimmedUrl.split('/').pop() || 'document.pdf';
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
    const isPdf = ext === 'pdf';

    const newAtt: CmsAttachment = {
      id: `att-${Date.now()}`,
      name: linkName.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      fileName,
      format: getFormatName(ext),
      fileSize: linkSize.trim() || '450 KB',
      url: trimmedUrl,
      fileExtension: ext,
      isPreviewable: isPdf && linkPreviewable,
      order: attachments.length + 1,
      visible: true,
      uploadedAt: new Date().toISOString(),
    };

    onChange([...attachments, newAtt]);
    setLinkName('');
    setLinkUrl('');
    setLinkSize('');
    setShowLinkForm(false);
    setUploadNotice(null);
    setUploadError(null);
  };

  const handleApplyPreset = (preset: (typeof LOCAL_DOWNLOAD_PRESETS)[0]) => {
    setLinkName(preset.name);
    setLinkUrl(preset.url);
    setLinkSize(preset.fileSize);
    setLinkPreviewable(preset.fileExtension === 'pdf');
  };

  const handleUpdate = (index: number, field: keyof CmsAttachment, value: any) => {
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
      if (!isDevPreview && target.storagePath) {
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

      {/* Header, counter and Add Local Button */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
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
            <span>{showLinkForm ? 'Hide Local Asset Form' : 'Link Local File / Path'}</span>
          </button>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Dedicated Spark Plan Link Form */}
      {showLinkForm && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                Link Existing File (Spark Plan Compatible)
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Since Firebase Storage is disabled on the Spark plan, attachments are hosted from{' '}
                <code className="font-mono text-[10px]">public/downloads/</code>.
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
                placeholder="/downloads/resource-001-starter-personal-budget-framework.pdf"
                className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-primary"
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
            <div className="flex items-center gap-2 pt-6">
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
              PDF, DOCX, XLSX, CSV, PPTX, ZIP, PNG, JPG (up to 50MB per document, 10MB per image)
            </p>
          </div>
          {isDevPreview && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Dev Mode: Simulated instant local uploads
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

      {/* Informative Spark Plan Notice */}
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
        <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
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
                    download
                    target="_blank"
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
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Replace with new file"
                    aria-label={`Replace ${att.fileName}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(index)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
                    value={att.url}
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
              <div className="flex items-center gap-4 mt-2.5 pt-2 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={att.isPreviewable}
                    onChange={(e) => handleUpdate(index, 'isPreviewable', e.target.checked)}
                    className="rounded-sm border-input text-primary focus:ring-primary/20"
                  />
                  <span>Allow In-Browser PDF Preview</span>
                </label>
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
