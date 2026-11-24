import React from 'react';
import { Loader2 } from 'lucide-react';

interface UploadProgressProps {
  progress: number; // 0 to 100
  statusText?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  statusText = 'Uploading image...',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="w-full space-y-2 py-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>{statusText}</span>
        </span>
        <span>{percentage}%</span>
      </div>

      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-200 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
