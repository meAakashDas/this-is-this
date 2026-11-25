import React, { useState, useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
import { isFirebaseStorageUnavailableInSession } from '../../../lib/cms/storageUpload.ts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateBlockId, blockNoteInlineToPlainText } from '../../../utils/blockNoteMigration.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';

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

  // Initialize BlockNote editor
  const editor = useCreateBlockNote({
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
    <div className="blocknote-canvas-container w-full min-h-[520px] rounded-xl border border-border bg-card text-card-foreground shadow-xs focus-within:border-border-strong transition-all overflow-hidden flex flex-col">
      <div className="blocknote-canvas-header notion-toolbar px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground">Document Canvas</span>
        <span className="text-[11px] font-mono opacity-70">Type / for commands</span>
      </div>
      <div className="blocknote-editor-wrapper notion-prose p-2 sm:p-6 flex-1">
        <BlockNoteView
          editor={editor}
          theme={theme}
          className="notion-style-editor apple-editorial-typography min-h-[440px]"
        />
      </div>
    </div>
  );
};
