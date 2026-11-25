/**
 * Firebase Firestore Data Sanitization & Cache Invalidation Utilities
 *
 * Ensures all objects written to Cloud Firestore conform to strict Firestore constraints:
 * 1. Strips all `undefined` values recursively (Firestore throws fatal exception if `undefined` is passed).
 * 2. Prevents temporary `blob:` URLs from ever being persisted in Firestore or rendered publicly.
 * 3. Invalidates client-side live sync caches on mutations.
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
 * Recursively removes all undefined properties from an object or array.
 * Preserves Date, RegExp, and primitive values.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = removeUndefinedFields(value);
      }
    }
    return clean as T;
  }

  return obj;
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
