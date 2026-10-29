import type { ImageSearchResult } from './imageSearch.types.js';

/**
 * Extracts a normalized, lowercase canonical identifier for a Wikimedia Commons file.
 * Handles:
 * - Wikimedia page titles (e.g. "File:Narendra_Modi_2021.jpg" -> "narendra modi 2021.jpg")
 * - Direct image URLs (e.g. ".../commons/a/ab/Narendra_Modi_2021.jpg" -> "narendra modi 2021.jpg")
 * - Scaled thumbnail URLs (e.g. ".../commons/thumb/a/ab/Narendra_Modi_2021.jpg/800px-Narendra_Modi_2021.jpg" -> "narendra modi 2021.jpg")
 * - URL encoded strings (e.g. "File:Binary%20search.svg" -> "binary search.svg")
 */
export function extractCanonicalFileIdentifier(
  target: { id?: string; title?: string; imageUrl?: string; thumbnailUrl?: string } | string
): string {
  if (!target) return '';

  let raw = '';
  if (typeof target === 'string') {
    raw = target;
  } else if (target.title && target.title.toLowerCase().startsWith('file:')) {
    raw = target.title;
  } else if (target.imageUrl) {
    raw = target.imageUrl;
  } else if (target.thumbnailUrl) {
    raw = target.thumbnailUrl;
  } else if (target.title) {
    raw = target.title;
  } else if (target.id) {
    raw = target.id;
  }

  // Handle Wikimedia URL paths
  if (raw.includes('/wikipedia/commons/')) {
    const afterCommons = raw.split('/wikipedia/commons/')[1] || '';
    // If it's a thumbnail URL: thumb/a/ab/Filename.ext/800px-Filename.ext...
    if (afterCommons.startsWith('thumb/')) {
      const parts = afterCommons.split('/');
      // parts[0] = 'thumb', parts[1] = 'a', parts[2] = 'ab', parts[3] = filename
      if (parts.length >= 4) {
        raw = parts[3];
      } else {
        raw = parts[parts.length - 1];
      }
    } else {
      // Direct URL: a/ab/Filename.ext
      const parts = afterCommons.split('/');
      raw = parts[parts.length - 1];
    }
  }

  // Strip query strings or hash
  raw = raw.split('?')[0].split('#')[0];

  // Strip leading File: or File%3A
  raw = raw.replace(/^file[:%3A]+/i, '');

  // Strip leading px thumbnail prefixes if still present (e.g. "800px-Example.jpg" -> "Example.jpg")
  raw = raw.replace(/^\d+px-/i, '');

  // Decode URI components safely
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // If malformed URI, continue with raw
  }

  // Normalize underscores to spaces, lowercase, collapse whitespace
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Converts a thumbnail URL to its canonical base Wikimedia image URL
 * E.g. ".../commons/thumb/a/ab/Photo.jpg/800px-Photo.jpg" -> ".../commons/a/ab/Photo.jpg"
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  const clean = url.trim().split('?')[0].split('#')[0];

  // Check if it's a Wikimedia thumb URL
  const match = clean.match(/^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/\d+px-[^/]+$/i);
  if (match) {
    return `https://upload.wikimedia.org/wikipedia/commons/${match[1]}`;
  }

  return clean.toLowerCase();
}

/**
 * Checks whether two image results or candidate representations refer to the same underlying file
 */
export function isDuplicateImage(
  a: ImageSearchResult | { id?: string; title?: string; imageUrl?: string; thumbnailUrl?: string } | string,
  b: ImageSearchResult | { id?: string; title?: string; imageUrl?: string; thumbnailUrl?: string } | string
): boolean {
  if (!a || !b) return false;

  const idA = extractCanonicalFileIdentifier(a);
  const idB = extractCanonicalFileIdentifier(b);
  if (idA && idB && idA === idB) return true;

  if (typeof a === 'object' && typeof b === 'object') {
    if (a.id && b.id && a.id === b.id) return true;
    if (a.imageUrl && b.imageUrl && normalizeImageUrl(a.imageUrl) === normalizeImageUrl(b.imageUrl)) return true;
    if (a.thumbnailUrl && b.thumbnailUrl && normalizeImageUrl(a.thumbnailUrl) === normalizeImageUrl(b.thumbnailUrl)) return true;
  }

  return false;
}

/**
 * Filters and deduplicates a list of candidates against an existing set of used identifiers
 * and ensures no duplicates within the list itself.
 */
export function deduplicateCandidates(
  candidates: ImageSearchResult[],
  existingUsedIdentifiers: Set<string> = new Set()
): ImageSearchResult[] {
  const seenInList = new Set<string>();
  const unique: ImageSearchResult[] = [];

  for (const candidate of candidates) {
    const canonical = extractCanonicalFileIdentifier(candidate);
    const normUrl = candidate.imageUrl ? normalizeImageUrl(candidate.imageUrl) : '';

    const isUsed =
      (canonical && existingUsedIdentifiers.has(canonical)) ||
      (candidate.id && existingUsedIdentifiers.has(candidate.id)) ||
      (normUrl && existingUsedIdentifiers.has(normUrl));

    const isDuplicateInList =
      (canonical && seenInList.has(canonical)) ||
      (candidate.id && seenInList.has(candidate.id)) ||
      (normUrl && seenInList.has(normUrl));

    if (!isUsed && !isDuplicateInList) {
      if (canonical) seenInList.add(canonical);
      if (candidate.id) seenInList.add(candidate.id);
      if (normUrl) seenInList.add(normUrl);
      unique.push(candidate);
    }
  }

  return unique;
}

/**
 * Registers an image's identifiers into a tracking set
 */
export function registerUsedImage(image: ImageSearchResult, usedSet: Set<string>): void {
  const canonical = extractCanonicalFileIdentifier(image);
  if (canonical) usedSet.add(canonical);
  if (image.id) usedSet.add(image.id);
  if (image.imageUrl) usedSet.add(normalizeImageUrl(image.imageUrl));
  if (image.thumbnailUrl) usedSet.add(normalizeImageUrl(image.thumbnailUrl));
}
