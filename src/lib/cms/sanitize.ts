/**
 * Firebase Firestore Data Sanitization & Cache Invalidation Utilities
 *
 * Ensures all objects written to Cloud Firestore conform to strict Firestore constraints:
 * 1. Strips all `undefined` values recursively (Firestore throws fatal exception if `undefined` is passed).
 * 2. Prevents temporary `blob:` URLs from ever being persisted in Firestore or rendered publicly.
 * 3. Schema-aware serialization eliminating unsupported nested arrays (e.g. BlockNote table cells)
 *    while preserving rich BlockNote & ContentBlock structure natively as Firestore objects/arrays.
 * 4. Pre-write Firestore payload validation catching remaining invalid structures or >1 MiB size.
 * 5. Invalidates client-side live sync caches on mutations.
 */

/**
 * Returns true if the URL is an ephemeral browser blob: URL.
 */
export function isTemporaryBlobUrl(url: unknown): boolean {
  return typeof url === 'string' && url.trim().toLowerCase().startsWith('blob:');
}

/**
 * Sanitizes an asset/image/file URL so temporary blob: URLs and executable URIs are never persisted.
 */
export function sanitizeAssetUrl(url: unknown, fallback: string = ''): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    isTemporaryBlobUrl(trimmed) ||
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html')
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Recursively removes all undefined properties (and non-finite numbers like NaN/Infinity)
 * from objects and filters undefined/non-finite elements from arrays.
 * Preserves valid values such as false, 0, empty string "", Date, and RegExp.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'number' && !Number.isFinite(obj)) {
    return undefined as unknown as T;
  }

  if (Array.isArray(obj)) {
    const cleanedItems: any[] = [];
    for (const item of obj) {
      if (item === undefined || (typeof item === 'number' && !Number.isFinite(item))) {
        continue;
      }
      const cleanItem = removeUndefinedFields(item);
      if (cleanItem !== undefined) {
        cleanedItems.push(cleanItem);
      }
    }
    return cleanedItems as unknown as T;
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
        continue;
      }
      if (typeof value === 'number' && !Number.isFinite(value)) {
        continue;
      }
      const cleanValue = removeUndefinedFields(value);
      if (cleanValue !== undefined) {
        clean[key] = cleanValue;
      }
    }
    return clean as T;
  }

  return obj;
}

/**
 * Recursively wraps any direct nested arrays (`[[...]]`) into `{ __fsNestedArray: true, items: [...] }`
 * so Firestore never receives unsupported array-of-arrays while preserving exact structure on restore.
 */
export function wrapNestedArraysForFirestore<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (Array.isArray(value)) {
    const outArr: any[] = [];
    for (const item of value) {
      if (item === undefined || (typeof item === 'number' && !Number.isFinite(item))) {
        continue;
      }
      const sanitizedItem = wrapNestedArraysForFirestore(item);
      if (sanitizedItem === undefined) continue;
      if (Array.isArray(sanitizedItem)) {
        outArr.push({
          __fsNestedArray: true,
          items: sanitizedItem,
        });
      } else {
        outArr.push(sanitizedItem);
      }
    }
    return outArr as unknown as T;
  }

  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
      continue;
    }
    if (typeof val === 'number' && !Number.isFinite(val)) {
      continue;
    }
    const cleanVal = wrapNestedArraysForFirestore(val);
    if (cleanVal !== undefined) {
      out[key] = cleanVal;
    }
  }
  return out as T;
}

/**
 * Unwraps `{ __fsNestedArray: true, items: [...] }` wrappers created during Firestore sanitization.
 */
export function unwrapNestedArraysFromFirestore<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => unwrapNestedArraysFromFirestore(item)) as unknown as T;
  }

  const record = value as Record<string, any>;
  if (record.__fsNestedArray === true && Array.isArray(record.items)) {
    return unwrapNestedArraysFromFirestore(record.items) as unknown as T;
  }

  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(record)) {
    out[key] = unwrapNestedArraysFromFirestore(val);
  }
  return out as T;
}

/**
 * Schema-aware serializer for BlockNote documents targeting Cloud Firestore.
 * Converts table cell arrays (`rows[].cells: InlineContent[][]`) into BlockNote tableCell
 * objects (`{ type: 'tableCell', content: InlineContent[], props: {...} }`) and recurses
 * through child blocks (`children`) and props so zero direct nested arrays remain.
 */
export function serializeBlocksForFirestore(rawBlocks: unknown): any {
  let blocks = rawBlocks;
  if (typeof blocks === 'string') {
    try {
      const parsed = JSON.parse(blocks);
      if (Array.isArray(parsed)) {
        blocks = parsed;
      } else {
        return rawBlocks;
      }
    } catch {
      return rawBlocks;
    }
  }

  if (!Array.isArray(blocks)) {
    return wrapNestedArraysForFirestore(removeUndefinedFields(blocks));
  }

  const convertBlock = (block: any): any => {
    if (!block || typeof block !== 'object') return block;

    const cleanBlock: Record<string, any> = {};
    for (const [k, v] of Object.entries(block)) {
      if (v !== undefined) {
        cleanBlock[k] = v;
      }
    }

    // Schema-aware conversion for BlockNote tables (`content.type === 'tableContent'` or `rows`)
    if (cleanBlock.type === 'table' && cleanBlock.content && typeof cleanBlock.content === 'object') {
      const rows = Array.isArray(cleanBlock.content.rows) ? cleanBlock.content.rows : [];
      cleanBlock.content = {
        ...cleanBlock.content,
        rows: rows.map((row: any) => {
          if (!row || typeof row !== 'object') return row;
          const cells = Array.isArray(row.cells) ? row.cells : [];
          return {
            ...row,
            cells: cells.map((cell: any) => {
              if (Array.isArray(cell)) {
                return {
                  type: 'tableCell',
                  content: wrapNestedArraysForFirestore(removeUndefinedFields(cell)),
                  props: {
                    backgroundColor: 'default',
                    textColor: 'default',
                    textAlignment: 'left',
                    colspan: 1,
                    rowspan: 1,
                  },
                };
              }
              if (cell && typeof cell === 'object') {
                return wrapNestedArraysForFirestore(removeUndefinedFields(cell));
              }
              return {
                type: 'tableCell',
                content: cell ? [{ type: 'text', text: String(cell), styles: {} }] : [],
              };
            }),
          };
        }),
      };
    } else if (cleanBlock.content !== undefined) {
      cleanBlock.content = wrapNestedArraysForFirestore(removeUndefinedFields(cleanBlock.content));
    }

    if (Array.isArray(cleanBlock.children)) {
      cleanBlock.children = cleanBlock.children.map((child: any) => convertBlock(child));
    }

    if (cleanBlock.props !== undefined) {
      cleanBlock.props = wrapNestedArraysForFirestore(removeUndefinedFields(cleanBlock.props));
    }

    return wrapNestedArraysForFirestore(removeUndefinedFields(cleanBlock));
  };

  return blocks.map((b) => convertBlock(b));
}

/**
 * Restores BlockNote blocks from Firestore (handling legacy JSON strings,
 * `{ __fsNestedArray }` wrappers, and object-wrapped table cells).
 */
export function restoreBlocksFromFirestore(rawBlocks: unknown): any {
  let blocks = rawBlocks;
  if (typeof blocks === 'string') {
    try {
      blocks = JSON.parse(blocks);
    } catch {
      return rawBlocks;
    }
  }
  return unwrapNestedArraysFromFirestore(blocks);
}

/**
 * Converts legacy `ContentBlock[]` (e.g. `type: 'table'` with `rows: string[][]`) into Firestore-safe objects.
 */
export function serializeContentBlocksForFirestore(blocks: unknown): any {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block: any) => {
    if (block && block.type === 'table' && Array.isArray(block.rows)) {
      return wrapNestedArraysForFirestore(
        removeUndefinedFields({
          ...block,
          rows: block.rows.map((row: any) => (Array.isArray(row) ? { cells: row } : row)),
        })
      );
    }
    return wrapNestedArraysForFirestore(removeUndefinedFields(block));
  });
}

/**
 * Restores legacy `ContentBlock[]` table rows back into `string[][]`.
 */
export function restoreContentBlocksFromFirestore(blocks: unknown): any {
  if (!Array.isArray(blocks)) return blocks;
  return unwrapNestedArraysFromFirestore(blocks).map((block: any) => {
    if (block && block.type === 'table' && Array.isArray(block.rows)) {
      return {
        ...block,
        rows: block.rows.map((row: any) =>
          row && typeof row === 'object' && 'cells' in row ? row.cells : row
        ),
      };
    }
    return block;
  });
}

const FIRESTORE_SAFE_BYTE_LIMIT = 980 * 1024; // Safety threshold below Firestore 1,048,576-byte limit

/**
 * Validates that a Firestore document payload contains zero `undefined` values,
 * zero direct nested arrays (`Array` inside `Array`), and fits within Firestore's 1 MiB limit.
 * Throws a clear error identifying the exact problematic field path on violation.
 */
export function validateFirestoreDocumentPayload(payload: unknown, rootPath: string = 'document'): void {
  const walk = (val: unknown, fieldPath: string) => {
    if (val === undefined) {
      throw new Error(`Invalid Firestore payload: field "${fieldPath}" is undefined.`);
    }
    if (typeof val === 'number' && !Number.isFinite(val)) {
      throw new Error(`Invalid Firestore payload: field "${fieldPath}" is non-finite (${String(val)}).`);
    }
    if (val === null || typeof val !== 'object') {
      return;
    }
    if (val instanceof Date || val instanceof RegExp) {
      return;
    }
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const item = val[i];
        const itemPath = `${fieldPath}[${i}]`;
        if (Array.isArray(item)) {
          throw new Error(
            `Invalid Firestore payload: nested array detected at "${itemPath}". Arrays cannot directly contain arrays.`
          );
        }
        walk(item, itemPath);
      }
      return;
    }
    for (const [k, v] of Object.entries(val)) {
      walk(v, `${fieldPath}.${k}`);
    }
  };

  walk(payload, rootPath);

  const jsonStr = JSON.stringify(payload);
  const byteSize =
    typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(jsonStr).length : jsonStr.length;
  if (byteSize > FIRESTORE_SAFE_BYTE_LIMIT) {
    const sizeKb = Math.round(byteSize / 1024);
    throw new Error(
      `Resource document (${sizeKb} KB) exceeds Firestore's 1 MiB limit (often caused by large inline attachments or embedded images). Remove large inline files or configure GitHub/Firebase Storage.`
    );
  }
}

/**
 * Clears client-side LiveSync sessionStorage caches after an Admin CMS mutation
 * so public pages immediately reflect updated Firestore data in the same browser session.
 */
export function clearLiveSyncCache(
  scope: 'resources' | 'journals' | 'pages' | 'settings' | 'all' = 'all'
): void {
  if (typeof window === 'undefined') return;
  try {
    if (scope === 'resources' || scope === 'all') {
      sessionStorage.removeItem('risepaisa_live_resources');
    }
    if (scope === 'journals' || scope === 'all') {
      sessionStorage.removeItem('risepaisa_live_journals');
    }
    if (scope === 'pages' || scope === 'all') {
      sessionStorage.removeItem('risepaisa_live_home');
      sessionStorage.removeItem('risepaisa_live_about');
    }
    if (scope === 'settings' || scope === 'all') {
      sessionStorage.removeItem('risepaisa_live_settings');
    }
    sessionStorage.removeItem('risepaisa_live_timestamp');
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}
