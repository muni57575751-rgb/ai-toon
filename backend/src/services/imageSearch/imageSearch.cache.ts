import type { ImageSearchResult } from './imageSearch.types.js';

interface CacheEntry {
  result: ImageSearchResult | null;
  expiresAt: number;
}

export class ImageSearchCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<ImageSearchResult | null>>();
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlHours: number = 24) {
    this.defaultTtlMs = ttlHours * 60 * 60 * 1000;
  }

  public normalizeKey(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public get(query: string): ImageSearchResult | null | undefined {
    const key = this.normalizeKey(query);
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

  public set(query: string, result: ImageSearchResult | null, ttlMs?: number): void {
    const key = this.normalizeKey(query);
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  public async getOrFetch(
    query: string,
    fetchFn: (normalizedQuery: string) => Promise<ImageSearchResult | null>
  ): Promise<ImageSearchResult | null> {
    const key = this.normalizeKey(query);
    const cached = this.get(key);
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
        this.set(key, result);
        return result;
      } catch (err) {
        // Do not cache fatal errors for long, but cache null for 5 minutes to prevent hammering
        this.set(key, null, 5 * 60 * 1000);
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
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
    this.hits = 0;
    this.misses = 0;
  }
}

export const imageSearchCache = new ImageSearchCache(24);
