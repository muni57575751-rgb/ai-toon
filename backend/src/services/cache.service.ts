import type { Story, StoryGenerationRequest } from '@ai-toon/shared';
import { config } from '../config/env.js';

interface CacheEntry {
  story: Story;
  expiresAt: number;
}

export class StoryCacheService {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  /**
   * Generates a normalized cache key based on topic, language, tone, and difficulty
   */
  public generateKey(req: StoryGenerationRequest): string {
    const normTopic = req.topic.trim().toLowerCase().replace(/\s+/g, '_');
    const lang = req.language || 'en';
    const tone = req.tone || 'funny';
    const diff = req.difficulty || 'intermediate';
    return `story_${normTopic}_${lang}_${tone}_${diff}`;
  }

  public get(key: string): Story | null {
    if (!config.storyCacheEnabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Return clone with isCached marked as true
    return {
      ...entry.story,
      isCached: true,
    };
  }

  public set(key: string, story: Story, ttlMs: number = config.storyCacheTtlMs): void {
    if (!config.storyCacheEnabled) {
      return;
    }

    // Evict oldest entries if cache grows past 200 items to protect memory
    if (this.cache.size >= 200) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      story,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? `${Math.round((this.hits / total) * 100)}%` : '0%';
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const storyCache = new StoryCacheService();
