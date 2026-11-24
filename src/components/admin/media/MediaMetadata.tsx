import React from 'react';
import { FileImage, Maximize2, HardDrive } from 'lucide-react';

export interface ImageMetaInfo {
  name?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

interface MediaMetadataProps {
  metadata: ImageMetaInfo;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export const MediaMetadata: React.FC<MediaMetadataProps> = ({ metadata }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground bg-secondary/50 border border-border/80 px-3 py-1.5 rounded-lg">
      {metadata.name && (
        <span className="inline-flex items-center gap-1 truncate max-w-[200px]" title={metadata.name}>
          <FileImage className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate">{metadata.name}</span>
        </span>
      )}

      {metadata.width && metadata.height && (
        <span className="inline-flex items-center gap-1">
          <Maximize2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <span>{metadata.width} × {metadata.height}px</span>
        </span>
      )}

      {metadata.sizeBytes !== undefined && (
        <span className="inline-flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-muted-foreground shrink-0" />
          <span>{formatBytes(metadata.sizeBytes)}</span>
        </span>
      )}

      {metadata.mimeType && (
        <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px]">
          {metadata.mimeType}
        </span>
      )}
    </div>
  );
};
