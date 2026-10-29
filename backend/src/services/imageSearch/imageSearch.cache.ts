import type { ImageSearchResult, ImageSearchOptions } from './imageSearch.types.js';

interface CacheEntry {
  result: ImageSearchResult | null;
  candidates: ImageSearchResult[];
  expiresAt: number;
}

export class ImageSearchCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<ImageSearchResult | null>>();
  private inFlightCandidates = new Map<string, Promise<ImageSearchResult[]>>();
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlHours: number = 24) {
    this.defaultTtlMs = ttlHours * 60 * 60 * 1000;
  }

  public normalizeKey(query: string, options?: ImageSearchOptions): string {
    const cleanQuery = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cat = options?.entityCategory ? `__${options.entityCategory}` : '';
    const ent = options?.entityName ? `__${options.entityName.toLowerCase().trim()}` : '';
    return `${cleanQuery}${cat}${ent}`;
  }

  public get(query: string, options?: ImageSearchOptions): ImageSearchResult | null | undefined {
    const key = this.normalizeKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.result;
  }

  public getCandidates(query: string, options?: ImageSearchOptions): ImageSearchResult[] | undefined {
    const key = this.normalizeKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.candidates;
  }

  public set(query: string, result: ImageSearchResult | null, options?: ImageSearchOptions, ttlMs?: number): void {
    const key = this.normalizeKey(query, options);
    this.cache.set(key, {
      result,
      candidates: result ? [result] : [],
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  public setCandidates(
    query: string,
    candidates: ImageSearchResult[],
    options?: ImageSearchOptions,
    ttlMs?: number
  ): void {
    const key = this.normalizeKey(query, options);
    this.cache.set(key, {
      result: candidates[0] || null,
      candidates,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  public async getOrFetch(
    query: string,
    fetchFn: (normalizedQuery: string) => Promise<ImageSearchResult | null>,
    options?: ImageSearchOptions
  ): Promise<ImageSearchResult | null> {
    const key = this.normalizeKey(query, options);
    const cached = this.get(query, options);
    if (cached !== undefined) {
      return cached;
    }

    // Deduplicate in-flight requests for the exact same query
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetchFn(key);
        this.set(query, result, options);
        return result;
      } catch (err) {
        // Do not cache fatal errors for long, but cache null for 5 minutes to prevent hammering
        this.set(query, null, options, 5 * 60 * 1000);
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  public async getOrFetchCandidates(
    query: string,
    fetchFn: (normalizedQuery: string) => Promise<ImageSearchResult[]>,
    options?: ImageSearchOptions
  ): Promise<ImageSearchResult[]> {
    const key = this.normalizeKey(query, options);
    const cached = this.getCandidates(query, options);
    if (cached !== undefined) {
      return cached;
    }

    const existingPromise = this.inFlightCandidates.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = (async () => {
      try {
        const candidates = await fetchFn(key);
        this.setCandidates(query, candidates, options);
        return candidates;
      } catch (err) {
        this.setCandidates(query, [], options, 5 * 60 * 1000);
        throw err;
      } finally {
        this.inFlightCandidates.delete(key);
      }
    })();

    this.inFlightCandidates.set(key, fetchPromise);
    return fetchPromise;
  }

  public getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const rate = total === 0 ? '0%' : `${Math.round((this.hits / total) * 100)}%`;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: rate,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.inFlightCandidates.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const imageSearchCache = new ImageSearchCache(24);
