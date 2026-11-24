import React, { useState } from 'react';
import { Eye, Trash2, RefreshCw } from 'lucide-react';
import { MediaMetadata, type ImageMetaInfo } from './MediaMetadata.tsx';

interface ImagePreviewProps {
  src: string;
  alt: string;
  metadata?: ImageMetaInfo;
  isTemporary?: boolean;
  onRemove?: () => void;
  onReplace?: () => void;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt,
  metadata,
  isTemporary = false,
  onRemove,
  onReplace,
  className = '',
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative group rounded-2xl border border-border bg-card overflow-hidden p-3 flex flex-col sm:flex-row items-center gap-4">
        {/* Thumbnail View */}
        <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-secondary border border-border">
          <img
            src={src}
            alt={alt || 'Profile Preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback
              (e.currentTarget as HTMLImageElement).src = '/images/aakash-das.webp';
            }}
          />
          {isTemporary && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-amber-500/90 text-white">
              Preview
            </span>
          )}
        </div>

        {/* Details & Actions */}
        <div className="flex-1 w-full space-y-2.5 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-foreground truncate max-w-sm">
              {metadata?.name || src.split('/').pop() || 'profile-image.webp'}
            </div>
            <div className="text-[11px] text-muted-foreground truncate" title={alt}>
              Alt: {alt || 'No alternative text provided'}
            </div>
          </div>

          {metadata && <MediaMetadata metadata={metadata} />}

          {/* Action buttons */}
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span>Zoom</span>
            </button>

            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                <span>Replace</span>
              </button>
            )}

            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 cursor-default">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto max-h-[70vh] rounded-xl object-contain bg-secondary"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{alt}</span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="text-foreground hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
