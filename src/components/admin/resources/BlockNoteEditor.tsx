import React, { useState, useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { tryGetFirebaseStorage } from '../../../lib/firebase/index.ts';
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

  // Initialize BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: validInitialContent,
    uploadFile: async (file: File) => {
      try {
        if (!isDevPreview) {
          const storage = tryGetFirebaseStorage();
          if (storage) {
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const prefix = uploadPrefix || `uploads/resources/${resourceNumber}`;
            const storagePath = `${prefix}/images/${Date.now()}-${cleanName}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
          }
        }
      } catch (err) {
        console.warn('[BlockNote] Storage upload skipped/failed on Spark plan, converting to Data URL:', err);
      }
      try {
        const compressed = await compressImageFile(file, 1200, 1200, 0.85);
        return compressed.dataUrl;
      } catch {
        return URL.createObjectURL(file);
      }
    },
  });

  // Listen to document changes and notify parent (skip initial setup dispatch)
  const isInitialMount = React.useRef(true);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editor) return;
    return editor.onChange(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
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
