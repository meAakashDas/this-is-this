/**
 * Shared Resource Number Search & Lookup Helpers
 * Normalizes user queries (with or without leading zeros) and resolves published
 * resources using their real document identifier/route instead of assuming
 * display numbers equal Firestore document IDs.
 */

import { validateAndFormatResourceNumber } from './resourceValidation.ts';

export interface SearchableResourceEntry {
  id?: string;
  resourceNumber?: string | number | null;
  title?: string;
  slug?: string;
  published?: boolean;
  status?: string;
}

export interface NormalizedSearchNumber {
  valid: boolean;
  formatted?: string;
  numericValue?: number;
  error?: string;
}

export function normalizeResourceNumberString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const num = parseInt(trimmed, 10);
  if (!Number.isFinite(num) || num <= 0) return trimmed;
  return String(num).length < 3 ? String(num).padStart(3, '0') : String(num);
}

export function normalizeSearchNumber(rawInput: string): NormalizedSearchNumber {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter a resource number (e.g. 001).',
    };
  }

  // Strip excessive leading zeroes cleanly when validating integer bounds (e.g. "0006" -> "6" -> "006")
  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Resource numbers must be positive integers (1 or greater, e.g. 001).',
    };
  }

  const numericValue = parseInt(trimmed, 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return {
      valid: false,
      error: 'Resource numbers must be positive integers (1 or greater, e.g. 001).',
    };
  }

  const canonicalRaw = String(numericValue);
  const validation = validateAndFormatResourceNumber(canonicalRaw);
  if (!validation.valid || !validation.resourceNumber) {
    return {
      valid: false,
      error: validation.error || 'Please enter a valid resource number (e.g. 001).',
    };
  }

  return {
    valid: true,
    formatted: validation.resourceNumber,
    numericValue,
  };
}

export function isPublishedResourceEntry(entry: SearchableResourceEntry | null | undefined): boolean {
  if (!entry || typeof entry !== 'object') return false;
  return (
    entry.published === true &&
    entry.status !== 'draft' &&
    entry.status !== 'archived'
  );
}

export function getResourcePublicUrl(entry: SearchableResourceEntry): string {
  const routeId = String(entry.id || normalizeResourceNumberString(entry.resourceNumber)).trim();
  return `/resources/${encodeURIComponent(routeId)}`;
}

export function findPublishedResourceByNumber<T extends SearchableResourceEntry>(
  resources: T[],
  rawInput: string
): { resource: T; url: string; formattedNumber: string } | null {
  const parsed = normalizeSearchNumber(rawInput);
  if (!parsed.valid || !parsed.formatted || !parsed.numericValue) {
    return null;
  }

  const publishedPool = resources.filter(isPublishedResourceEntry);

  // 1. Prefer exact padded string match
  let match = publishedPool.find(
    (item) => normalizeResourceNumberString(item.resourceNumber) === parsed.formatted
  );

  // 2. Fallback to numeric integer match (handles numeric Firestore fields or unpadded numbers)
  if (!match) {
    match = publishedPool.find((item) => {
      const rawNum = String(item.resourceNumber ?? '').trim();
      return /^\d+$/.test(rawNum) && parseInt(rawNum, 10) === parsed.numericValue;
    });
  }

  if (!match) return null;

  return {
    resource: match,
    url: getResourcePublicUrl(match),
    formattedNumber: normalizeResourceNumberString(match.resourceNumber) || parsed.formatted,
  };
}
