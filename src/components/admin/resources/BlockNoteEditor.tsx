import React, { useState, useEffect, useMemo } from 'react';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  createVideoBlockConfig,
  videoParse,
} from '@blocknote/core';
import { FilePanelExtension } from '@blocknote/core/extensions';
import {
  createReactBlockSpec,
  FileBlockWrapper,
  VideoPreview,
  VideoToExternalHTML,
  useCreateBlockNote,
  useExtension,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
import { isFirebaseStorageUnavailableInSession } from '../../../lib/cms/storageUpload.ts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateBlockId, blockNoteInlineToPlainText } from '../../../utils/blockNoteMigration.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';
import { extractVideoBlockInfo } from '../../../utils/youtube.ts';

function isDirectVideoFileUrl(rawUrl: string): boolean {
  const lower = String(rawUrl || '').trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith('blob:') || lower.startsWith('data:video/')) {
    return true;
  }
  try {
    const parsed = new URL(lower);
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|$)/i.test(parsed.pathname);
  } catch {
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(lower);
  }
}

const AdminVideoBlockContent: React.FC<any> = (props) => {
  const { block, editor } = props;
  const filePanel = useExtension(FilePanelExtension);
  const rawUrl = String(block?.props?.url || '').trim();
  const parsedVideo = extractVideoBlockInfo(block);

  const handleReplaceUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editor?.isEditable && filePanel) {
      editor.transact(() => filePanel.showMenu(block.id));
    }
  };

  if (parsedVideo?.kind === 'youtube') {
    const previewWidthStyle = block?.props?.previewWidth
      ? { width: `${block.props.previewWidth}px`, maxWidth: '100%' }
      : { width: '100%', maxWidth: '720px' };

    return (
      <div
        className="admin-youtube-video-card rounded-xl border border-border bg-card overflow-hidden shadow-xs"
        style={previewWidthStyle}
        contentEditable={false}
        draggable={false}
        data-video-kind="youtube"
        data-video-id={parsedVideo.videoId}
      >
        {parsedVideo.title && (
          <div className="px-3 py-2 border-b border-border/60 bg-muted/30 text-xs font-semibold text-foreground truncate">
            {parsedVideo.title}
          </div>
        )}
        <div
          className="relative w-full bg-black"
          style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}
        >
          <iframe
            src={parsedVideo.embedUrl}
            title={parsedVideo.title || 'Embedded YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-muted/20 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="truncate font-mono max-w-[65%]" title={parsedVideo.originalUrl}>
            YouTube &bull; {parsedVideo.videoId}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={parsedVideo.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="underline hover:text-foreground transition-colors"
            >
              Open URL
            </a>
            {editor?.isEditable && filePanel && (
              <button
                type="button"
                onClick={handleReplaceUrl}
                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Replace URL
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isDirectVideoFileUrl(rawUrl)) {
    return <VideoPreview {...props} />;
  }

  const isInvalid = !parsedVideo;
  return (
    <div
      className="admin-video-fallback-card w-full max-w-[720px] rounded-xl border border-border bg-muted/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
      contentEditable={false}
      draggable={false}
      data-video-kind={isInvalid ? 'invalid' : 'external'}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-semibold text-foreground">
          {isInvalid
            ? 'Invalid or unsupported video URL'
            : parsedVideo.title || 'External video link'}
        </div>
        <div className="text-[11px] text-muted-foreground break-all">
          {isInvalid
            ? 'Replace with a valid YouTube link or direct video URL.'
            : parsedVideo.originalUrl}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isInvalid && (
          <a
            href={parsedVideo.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded border border-border bg-background hover:bg-muted text-foreground underline transition-colors"
          >
            Open URL
          </a>
        )}
        {editor?.isEditable && filePanel && (
          <button
            type="button"
            onClick={handleReplaceUrl}
            className="px-2.5 py-1 rounded border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
          >
            Replace URL
          </button>
        )}
      </div>
    </div>
  );
};

const YouTubeAwareVideoBlock = createReactBlockSpec(
  createVideoBlockConfig,
  (options) => ({
    meta: { fileBlockAccept: ['video/*'] },
    render: (props: any) => (
      <FileBlockWrapper
        {...props}
        buttonIcon={
          <span className="text-muted-foreground font-mono text-xs" aria-hidden="true">
            &#9654;
          </span>
        }
      >
        <AdminVideoBlockContent {...props} />
      </FileBlockWrapper>
    ),
    parse: videoParse(options),
    toExternalHTML: VideoToExternalHTML as any,
    runsBefore: ['file'],
  })
);

const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    video: YouTubeAwareVideoBlock(),
  },
});

const VALID_BLOCKNOTE_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
  'quote',
  'divider',
]);

function sanitizeBlocksForBlockNote(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') return b;
    const lowerType = String(b.type || '').toLowerCase();
    if (lowerType === 'youtube' || lowerType === 'youtubeembed' || lowerType === 'embed') {
      const url =
        b.props?.url ||
        b.props?.src ||
        b.props?.href ||
        b.url ||
        b.src ||
        (b.props?.videoId ? `https://www.youtube.com/watch?v=${b.props.videoId}` : '') ||
        (b.videoId ? `https://www.youtube.com/watch?v=${b.videoId}` : '');
      return {
        id: b.id || generateBlockId(),
        type: 'video',
        props: {
          textAlignment: 'left',
          backgroundColor: 'default',
          name: b.props?.title || b.props?.name || b.title || '',
          url: String(url || ''),
          caption: b.props?.caption || b.caption || '',
          showPreview: true,
        },
        children: Array.isArray(b.children) ? b.children : [],
      };
    }
    if (!VALID_BLOCKNOTE_TYPES.has(b.type)) {
      const text = blockNoteInlineToPlainText(b.content);
      const title = b.props?.title ? `[${b.props.title}] ` : '';
      return {
        id: b.id || generateBlockId(),
        type: 'quote',
        props: { textAlignment: 'left' },
        content: [
          ...(title ? [{ type: 'text', text: title, styles: { bold: true } }] : []),
          { type: 'text', text: text || '', styles: {} },
        ],
        children: [],
      };
    }
    return b;
  });
}

interface BlockNoteEditorProps {
  initialBlocks?: any[];
  onChange: (blocks: any[]) => void;
  resourceNumber?: string;
  uploadPrefix?: string;
  isDevPreview?: boolean;
}

export const BlockNoteEditor: React.FC<BlockNoteEditorProps> = ({
  initialBlocks,
  onChange,
  resourceNumber = 'general',
  uploadPrefix,
  isDevPreview = false,
}) => {
  // Theme sync with dark/light mode
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');

      const observer = new MutationObserver(() => {
        const dark = document.documentElement.classList.contains('dark');
        setTheme(dark ? 'dark' : 'light');
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }
  }, []);

  // Filter and sanitize initialBlocks
  const validInitialContent = useMemo(() => {
    if (Array.isArray(initialBlocks) && initialBlocks.length > 0) {
      return sanitizeBlocksForBlockNote(initialBlocks);
    }
    return undefined;
  }, []);

  // Cache unprovisioned Spark-plan storage state so inline image insertion is instant
  const storageDisabledRef = React.useRef(false);

  // Initialize BlockNote editor with YouTube-aware video block renderer
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: validInitialContent,
    uploadFile: async (file: File) => {
      try {
        if (!isDevPreview && !storageDisabledRef.current && !isFirebaseStorageUnavailableInSession()) {
          const storage = tryGetFirebaseStorage();
          if (storage) {
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const prefix = uploadPrefix || `uploads/resources/${resourceNumber}`;
            const storagePath = `${prefix}/images/${Date.now()}-${cleanName}`;
            const fileRef = ref(storage, storagePath);
            await Promise.race([
              uploadBytes(fileRef, file),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Storage upload timeout')), 4000)
              ),
            ]);
            return await getDownloadURL(fileRef);
          }
        }
      } catch (err) {
        storageDisabledRef.current = true;
        console.warn('[BlockNote] Storage upload unavailable on Spark plan, embedding Data URL:', err);
      }
      const compressed = await compressImageFile(file, 1200, 1200, 0.85);
      return compressed.dataUrl;
    },
  });

  // Listen to document changes and notify parent only when blocks actually change
  const lastSerializedRef = React.useRef<string>(
    JSON.stringify(validInitialContent || [])
  );
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editor) return;
    return editor.onChange(() => {
      const serialized = JSON.stringify(editor.document);
      if (serialized === lastSerializedRef.current) {
        return;
      }
      lastSerializedRef.current = serialized;
      onChangeRef.current(editor.document);
    });
  }, [editor]);

  return (
    <div className="blocknote-canvas-container w-full min-h-[380px] sm:min-h-[520px] rounded-xl border border-border bg-card text-card-foreground shadow-xs focus-within:border-border-strong transition-all overflow-hidden flex flex-col">
      <div className="blocknote-canvas-header notion-toolbar px-3 sm:px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground">Document Canvas</span>
        <span className="text-[11px] font-mono opacity-70">Type / for commands</span>
      </div>
      <div className="blocknote-editor-wrapper notion-prose p-2 sm:p-6 flex-1 min-w-0 max-w-full overflow-x-auto">
        <BlockNoteView
          editor={editor}
          theme={theme}
          className="notion-style-editor apple-editorial-typography min-h-[320px] sm:min-h-[440px]"
        />
      </div>
    </div>
  );
};
