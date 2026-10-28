import type { Story, TopicIllustration } from '@ai-toon/shared';
import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';
import { wikimediaProvider } from './wikimedia.provider.js';
import { imageSearchCache } from './imageSearch.cache.js';
import { entityClassifier, type EntityClassification } from './entityClassifier.js';

export class ImageSearchService {
  constructor(private readonly provider: IImageSearchProvider = wikimediaProvider) {}

  /**
   * Searches for a single relevant educational image using entity-aware classification and queries
   */
  public async findEducationalImage(
    query: string,
    options: ImageSearchOptions = {}
  ): Promise<ImageSearchResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    const cacheKey = `${cleanQuery}__${options.entityCategory || 'all'}`;

    return imageSearchCache.getOrFetch(cacheKey, async () => {
      console.log(
        `[ImageSearchService] Searching image for: "${cleanQuery}" (Entity: ${options.entityCategory || 'auto'}, Name: "${options.entityName || ''}")`
      );

      const result = await this.provider.searchImage(cleanQuery, options);
      if (result) {
        console.log(
          `[ImageSearchService] Found image for "${cleanQuery}": "${result.title}" (${result.license}) [MIME: ${result.mime || 'unknown'}]`
        );
        return result;
      }

      return null;
    });
  }

  /**
   * Enhances all illustrations in an educational lesson with entity-aware authentic public media
   * Gracefully falls back to SVG illustration or unavailable state if search fails.
   */
  public async enhanceStoryIllustrations(story: Story): Promise<Story> {
    if (!Array.isArray(story.illustrations) || story.illustrations.length === 0) {
      return story;
    }

    // 1. Classify the overall story topic (e.g. Narendra Modi -> person, Vignan University -> institution)
    const classification: EntityClassification = entityClassifier.classify(story.topic);
    console.log(
      `[ImageSearchService] Classified topic "${story.topic}" as [${classification.category.toUpperCase()}] (confidence: ${classification.confidence}, entity: "${classification.entityName}")`
    );

    const searchOptions: ImageSearchOptions = {
      entityCategory: classification.category,
      entityName: classification.entityName,
      secondaryContext: classification.secondaryContext,
    };

    // 2. Enhance each illustration sequentially or in parallel
    const enhancedIllustrations: TopicIllustration[] = await Promise.all(
      story.illustrations.map(async (ill, idx) => {
        // Generate prioritized queries for this illustration
        const queries = this.buildPrioritizedQueries(story.topic, classification, ill, idx);

        let chosenResult: ImageSearchResult | null = null;
        let successfulQuery = '';

        for (const candidateQuery of queries) {
          try {
            const result = await this.findEducationalImage(candidateQuery, searchOptions);
            if (result) {
              chosenResult = result;
              successfulQuery = candidateQuery;
              break;
            }
          } catch (err) {
            console.warn(`[ImageSearchService] Query "${candidateQuery}" failed:`, err);
          }
        }

        if (chosenResult) {
          return {
            ...ill,
            searchQuery: successfulQuery || ill.searchQuery,
            imageUrl: chosenResult.imageUrl,
            thumbnailUrl: chosenResult.thumbnailUrl,
            sourcePageUrl: chosenResult.sourcePageUrl,
            author: chosenResult.author,
            license: chosenResult.license,
            licenseUrl: chosenResult.licenseUrl,
            attribution: chosenResult.attribution,
            width: chosenResult.width,
            height: chosenResult.height,
            sourceType: 'wikimedia',
          };
        }

        console.log(
          `[ImageSearchService] No verified public image found for "${story.topic}" (figure ${idx + 1}). Preserving educational SVG fallback.`
        );

        return {
          ...ill,
          searchQuery: queries[0] || ill.searchQuery,
          sourceType: 'svg_fallback',
        };
      })
    );

    return {
      ...story,
      illustrations: enhancedIllustrations,
    };
  }

  /**
   * Generates a ranked list of search queries tailored to the entity category
   */
  private buildPrioritizedQueries(
    topic: string,
    classification: EntityClassification,
    ill: TopicIllustration,
    illustrationIndex: number
  ): string[] {
    const candidateQueries: string[] = [];

    // If an explicit searchQuery was provided by AI and isn't generic, try it first
    if (ill.searchQuery && ill.searchQuery.trim().length >= 8 && !ill.searchQuery.toLowerCase().includes('undefined')) {
      candidateQueries.push(ill.searchQuery.trim());
    }

    // Generate entity-specific queries from the classifier
    const entityQueries = entityClassifier.generateQueries(classification, ill.title);
    for (const eq of entityQueries) {
      candidateQueries.push(eq);
    }

    // Add illustration-specific concept query if relevant
    const titleClean = (ill.title || '').replace(/illustration|figure|\d+/gi, '').trim();
    if (titleClean.length > 2 && classification.category !== 'person') {
      candidateQueries.push(`${classification.entityName} ${titleClean}`.trim());
    }

    // Clean up and deduplicate
    return Array.from(new Set(candidateQueries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
}

export const imageSearchService = new ImageSearchService();
