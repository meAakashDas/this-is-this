import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, FileImage, Check, Link as LinkIcon, Info } from 'lucide-react';
import { UploadProgress } from './UploadProgress.tsx';
import type { ImageMetaInfo } from './MediaMetadata.tsx';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface ImageUploaderProps {
  currentImageUrl?: string;
  currentAlt?: string;
  isDevPreview?: boolean;
  storagePathPrefix?: string; // default: 'uploads/profile'
  onImageSelected: (url: string, metadata: ImageMetaInfo, isTemporary: boolean) => void;
  className?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const COMMON_IMAGE_PRESETS = [
  { label: 'Profile WebP', path: '/images/aakash-das.webp' },
  { label: 'Profile JPG', path: '/images/aakash-das.jpg' },
  { label: 'Full Portrait', path: '/images/aakash-das-full.jpg' },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  isDevPreview = false,
  storagePathPrefix = 'uploads/profile',
  onImageSelected,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'path'>('upload');
  const [manualPath, setManualPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setNotice(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Only WebP, JPEG, and PNG images are supported.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Profile images must be 10MB or smaller.');
      return;
    }

    // Extract dimensions via Image object
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
    });

    const metadata: ImageMetaInfo = {
      name: file.name,
      sizeBytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: file.type,
    };

    // Development Preview Mode: immediate local preview without Firebase Storage upload
    if (isDevPreview) {
      onImageSelected(objectUrl, metadata, true);
      return;
    }

    // Authenticated Mode: On Spark plan, Firebase Storage is not provisioned
    const storage = tryGetFirebaseStorage();
    if (!storage) {
      onImageSelected(objectUrl, metadata, true);
      setNotice(
        `Firebase Storage is disabled on the free Spark plan. Place this image into "public/images/" and select it via "Enter Path or URL" (e.g. /images/${file.name}) to persist. A local preview has been applied.`
      );
      return;
    }

    try {
      setUploadProgress(0);
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, `${storagePathPrefix}/${safeName}`);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (uploadErr) => {
          console.warn('[Storage Upload Warning on Spark plan]', uploadErr);
          setUploadProgress(null);
          // Friendly fallback for Spark plan
          onImageSelected(objectUrl, metadata, true);
          setNotice(
            `Firebase Storage is not enabled on the free Spark plan. Place "${file.name}" in "public/images/" and enter its path (/images/${file.name}) under "Enter Path or URL". Loaded as a local preview.`
          );
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadProgress(null);
          onImageSelected(downloadUrl, metadata, false);
        }
      );
    } catch (err) {
      setUploadProgress(null);
      // Fallback without throwing uncaught exceptions
      onImageSelected(objectUrl, metadata, true);
      setNotice(
        `Firebase Storage is disabled on the Spark plan. Place this file in "public/images/" to persist. Local preview loaded.`
      );
    }
  };

  const handleApplyManualPath = (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) {
      setError('Please provide a valid image path or URL.');
      return;
    }
    setError(null);
    setNotice(null);

    const name = trimmed.split('/').pop() || 'image.webp';
    const metadata: ImageMetaInfo = {
      name,
      sizeBytes: 0,
      width: 0,
      height: 0,
      mimeType: 'image/webp',
    };
    onImageSelected(trimmed, metadata, false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Mode Switch Tabs */}
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border/60 max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-background text-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('path')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'path'
              ? 'bg-background text-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Enter Path / URL</span>
        </button>
      </div>

      {activeTab === 'upload' ? (
        /* Drag & Drop Zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border/80 hover:border-foreground/40 bg-secondary/30 hover:bg-secondary/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-foreground shadow-2xs">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">
                Click to select or drag & drop image
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                WebP, PNG, or JPEG (Max 10MB)
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Path or Local Asset Selector */
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block">
              Asset Path or External URL
            </label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enter a local asset path (e.g. <code className="font-mono text-[10px]">/images/aakash-das.webp</code>) or a direct image URL.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="/images/aakash-das.webp"
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleApplyManualPath(manualPath)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
            >
              Apply Image
            </button>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-border/50">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
              Available Local Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.path}
                  type="button"
                  onClick={() => {
                    setManualPath(preset.path);
                    handleApplyManualPath(preset.path);
                  }}
                  className="px-2 py-1 text-[11px] font-mono rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <UploadProgress progress={uploadProgress} statusText="Processing image..." />
      )}

      {/* Friendly Spark Plan Notice */}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span className="leading-relaxed">{notice}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
};
