/**
 * Firebase Firestore Data Sanitization Utilities
 *
 * Ensures all objects written to Cloud Firestore conform to strict Firestore constraints:
 * 1. Strips all `undefined` values recursively (Firestore throws fatal exception if `undefined` is passed).
 * 2. Normalizes nested arrays and structures.
 */

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
