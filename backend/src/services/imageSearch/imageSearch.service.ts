import type { Story, TopicIllustration } from '@ai-toon/shared';
import type { IImageSearchProvider, ImageSearchResult } from './imageSearch.types.js';
import { wikimediaProvider } from './wikimedia.provider.js';
import { imageSearchCache } from './imageSearch.cache.js';

export class ImageSearchService {
  constructor(private readonly provider: IImageSearchProvider = wikimediaProvider) {}

  /**
   * Searches for a single relevant educational image with caching and query simplification fallback
   */
  public async findEducationalImage(query: string): Promise<ImageSearchResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    return imageSearchCache.getOrFetch(cleanQuery, async (normalizedQuery) => {
      // 1. Try primary query
      console.log(`[ImageSearchService] Searching image for: "${normalizedQuery}"`);
      const result = await this.provider.searchImage(normalizedQuery, 8000);
      if (result) {
        console.log(`[ImageSearchService] Found image for "${normalizedQuery}": "${result.title}" (${result.license})`);
        return result;
      }

      // 2. If primary query had many terms and returned nothing, try simplified concept queries
      const tokens = normalizedQuery.split(' ').filter((w) => w.length > 2);
      if (tokens.length > 2) {
        const fallbacks = [
          `${tokens.slice(0, 2).join(' ')} diagram`,
          `${tokens[0]} diagram`,
        ];

        for (const fbQuery of fallbacks) {
          if (fbQuery === normalizedQuery) continue;
          console.log(`[ImageSearchService] Retrying with core query: "${fbQuery}"`);
          const fbResult = await this.provider.searchImage(fbQuery, 6000);
          if (fbResult) {
            console.log(`[ImageSearchService] Found image on fallback query: "${fbResult.title}" (${fbResult.license})`);
            return fbResult;
          }
        }
      }

      console.log(`[ImageSearchService] No suitable image found for "${normalizedQuery}". Will use SVG fallback.`);
      return null;
    });
  }

  /**
   * Enhances all illustrations in an educational lesson with authentic public diagrams
   * Gracefully falls back to SVG illustration if search fails or returns null.
   */
  public async enhanceStoryIllustrations(story: Story): Promise<Story> {
    if (!Array.isArray(story.illustrations) || story.illustrations.length === 0) {
      return story;
    }

    const enhancedIllustrations: TopicIllustration[] = await Promise.all(
      story.illustrations.map(async (ill) => {
        // Build specific query if not provided
        const query = this.buildSearchQuery(story.topic, ill);

        try {
          const imageResult = await this.findEducationalImage(query);

          if (imageResult) {
            return {
              ...ill,
              searchQuery: query,
              imageUrl: imageResult.imageUrl,
              thumbnailUrl: imageResult.thumbnailUrl,
              sourcePageUrl: imageResult.sourcePageUrl,
              author: imageResult.author,
              license: imageResult.license,
              licenseUrl: imageResult.licenseUrl,
              attribution: imageResult.attribution,
              width: imageResult.width,
              height: imageResult.height,
              sourceType: 'wikimedia',
            };
          }
        } catch (err) {
          console.warn(`[ImageSearchService] Error searching image for "${query}":`, err);
        }

        // Fallback: keep existing illustration with SVG fallback
        return {
          ...ill,
          searchQuery: query,
          sourceType: 'svg_fallback',
        };
      })
    );

    return {
      ...story,
      illustrations: enhancedIllustrations,
    };
  }

  private buildSearchQuery(topic: string, ill: TopicIllustration): string {
    if (ill.searchQuery && ill.searchQuery.trim().length >= 8) {
      return ill.searchQuery.trim();
    }

    // Extract core words from illustration title and description
    const titleClean = (ill.title || '').replace(/illustration|figure|\d+/gi, '').trim();
    const descClean = (ill.description || '').slice(0, 60);

    return `${topic} ${titleClean} ${descClean} diagram`
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const imageSearchService = new ImageSearchService();
