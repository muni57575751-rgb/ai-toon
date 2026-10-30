import type { Story, TopicIllustration, KeyPoint, LocationDetails } from '@ai-toon/shared';
import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';
import { wikimediaProvider } from './wikimedia.provider.js';
import { imageSearchCache } from './imageSearch.cache.js';
import { entityClassifier, type EntityClassification } from './entityClassifier.js';
import {
  extractCanonicalFileIdentifier,
  normalizeImageUrl,
  deduplicateCandidates,
  registerUsedImage,
} from './imageDeduplicator.js';

export class ImageSearchService {
  constructor(private readonly provider: IImageSearchProvider = wikimediaProvider) {}

  /**
   * Retrieves a ranked list of candidate images for a query, using cache and in-flight deduplication
   */
  public async findEducationalCandidates(
    query: string,
    options: ImageSearchOptions = {},
    limit: number = 8
  ): Promise<ImageSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const cacheKey = `${cleanQuery}__candidates__${options.entityCategory || 'all'}`;

    return imageSearchCache.getOrFetchCandidates(
      cacheKey,
      async () => {
        console.log(
          `[ImageSearchService] Fetching candidates for: "${cleanQuery}" (Entity: ${options.entityCategory || 'auto'}, Name: "${options.entityName || ''}")`
        );

        if (typeof this.provider.searchImages === 'function') {
          return await this.provider.searchImages(cleanQuery, options, limit);
        }

        const single = await this.provider.searchImage(cleanQuery, options);
        return single ? [single] : [];
      },
      options
    );
  }

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

    return imageSearchCache.getOrFetch(
      cacheKey,
      async () => {
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
      },
      options
    );
  }

  /**
   * Enhances all illustrations in an educational lesson with entity-aware authentic public media.
   * Guarantees:
   * 1. No duplicate images within the lesson (canonical identifier, page ID, and normalized URL tracking).
   * 2. Distinct candidate selection for different concepts/slots.
   * 3. Graceful SVG fallback if fewer than 2 distinct suitable images exist without duplicating or choosing unrelated images.
   * 4. Multi-candidate caching and fallback URLs for frontend retry.
   */
  public async enhanceStoryIllustrations(story: Story): Promise<Story> {
    if (!Array.isArray(story.illustrations) || story.illustrations.length === 0) {
      return story;
    }

    // 1. Classify the overall story topic
    const classification: EntityClassification = entityClassifier.classify(story.topic);
    console.log(
      `[ImageSearchService] Classified topic "${story.topic}" as [${classification.category.toUpperCase()}] (confidence: ${classification.confidence}, entity: "${classification.entityName}")`
    );

    // Track used identifiers across all illustration slots in this lesson to eliminate duplicates
    const usedIdentifiers = new Set<string>();
    const enhancedIllustrations: TopicIllustration[] = [];

    // Process illustrations sequentially to coordinate slot-based distinct selection
    for (let idx = 0; idx < story.illustrations.length; idx++) {
      const ill = story.illustrations[idx];

      // Find paired educational key point if available
      const pairedKeyPoint = this.findPairedKeyPoint(story.keyPoints, ill, idx);

      // Build slot-specific prioritized queries
      const queries = this.buildPrioritizedQueries(
        story.topic,
        classification,
        ill,
        idx,
        pairedKeyPoint,
        story.locationDetails
      );

      const isGeoStory = Boolean(story.requiresMap && story.locationDetails?.isLocation);
      const searchOptions: ImageSearchOptions = {
        entityCategory: isGeoStory ? 'place' : classification.category,
        entityName: (isGeoStory && story.locationDetails?.placeName) || classification.entityName,
        secondaryContext:
          (isGeoStory && (story.locationDetails?.district || story.locationDetails?.state)) ||
          classification.secondaryContext,
        excludeIdentifiers: Array.from(usedIdentifiers),
      };

      let chosenCandidate: ImageSearchResult | null = null;
      let successfulQuery = '';
      const backupCandidateUrls: string[] = [];

      // Try queries until suitable unused candidates are discovered
      for (const candidateQuery of queries) {
        try {
          const candidates = await this.findEducationalCandidates(candidateQuery, searchOptions, 6);

          // Deduplicate candidate list against already used images
          const unusedCandidates = deduplicateCandidates(candidates, usedIdentifiers);

          if (unusedCandidates.length > 0) {
            if (!chosenCandidate) {
              chosenCandidate = unusedCandidates[0];
              successfulQuery = candidateQuery;
              // Register chosen image in used set immediately
              registerUsedImage(chosenCandidate, usedIdentifiers);

              // Collect backup alternative URLs for this concept
              for (let cIdx = 1; cIdx < unusedCandidates.length; cIdx++) {
                const alt = unusedCandidates[cIdx];
                const altUrl = alt.thumbnailUrl || alt.imageUrl;
                if (altUrl && !backupCandidateUrls.includes(altUrl)) {
                  backupCandidateUrls.push(altUrl);
                }
              }
              break;
            }
          }
        } catch (err) {
          console.warn(`[ImageSearchService] Query "${candidateQuery}" failed:`, err);
        }
      }

      if (chosenCandidate) {
        enhancedIllustrations.push({
          ...ill,
          searchQuery: successfulQuery || ill.searchQuery,
          imageUrl: chosenCandidate.imageUrl,
          thumbnailUrl: chosenCandidate.thumbnailUrl,
          sourcePageUrl: chosenCandidate.sourcePageUrl,
          author: chosenCandidate.author,
          license: chosenCandidate.license,
          licenseUrl: chosenCandidate.licenseUrl,
          attribution: chosenCandidate.attribution,
          width: chosenCandidate.width,
          height: chosenCandidate.height,
          sourceType: 'wikimedia',
          alternativeUrls: backupCandidateUrls.slice(0, 3),
        });
      } else {
        console.log(
          `[ImageSearchService] No distinct verified public image found for "${story.topic}" (slot ${idx + 1}). Using topic-specific SVG fallback.`
        );

        enhancedIllustrations.push({
          ...ill,
          searchQuery: queries[0] || ill.searchQuery,
          imageUrl: undefined,
          thumbnailUrl: undefined,
          sourceType: 'svg_fallback',
          alternativeUrls: [],
        });
      }
    }

    return {
      ...story,
      illustrations: enhancedIllustrations,
    };
  }

  /**
   * Matches an illustration to its corresponding educational key point
   */
  private findPairedKeyPoint(
    keyPoints: KeyPoint[] | undefined,
    ill: TopicIllustration,
    idx: number
  ): KeyPoint | undefined {
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) return undefined;

    if (typeof ill.positionIndex === 'number') {
      const match = keyPoints.find((kp) => kp.pointNumber === ill.positionIndex);
      if (match) return match;
    }

    // Default to point at corresponding index
    return keyPoints[idx] || keyPoints[0];
  }

  /**
   * Generates a ranked list of search queries tailored to the entity category, illustration slot, and concept
   */
  private buildPrioritizedQueries(
    topic: string,
    classification: EntityClassification,
    ill: TopicIllustration,
    illustrationIndex: number,
    pairedKeyPoint?: KeyPoint,
    locationDetails?: LocationDetails
  ): string[] {
    const candidateQueries: string[] = [];

    // Geographical entity query specialization (Phase 7: photograph priority & regional context)
    if (locationDetails && locationDetails.isLocation && locationDetails.requiresMap !== false) {
      const place = locationDetails.placeName;
      const district = locationDetails.district ? ` ${locationDetails.district}` : '';
      const state = locationDetails.state ? ` ${locationDetails.state}` : '';

      candidateQueries.push(`${place}${district}${state} photograph`.trim());
      candidateQueries.push(`${place}${state} landmark`.trim());
      candidateQueries.push(`${place} ${locationDetails.category}`.trim());
      candidateQueries.push(`${place} view`.trim());
      candidateQueries.push(place);
    }

    // 1. Concept hint from title and paired key point
    const titleHint = (ill.title || '').replace(/illustration|figure|\d+/gi, '').trim();
    const headingHint = pairedKeyPoint?.heading ? pairedKeyPoint.heading.trim() : '';
    const extraHint = titleHint || headingHint;

    // 2. Query tailored by entityClassifier with slotIndex differentiation
    const entityQueries = entityClassifier.generateQueries(classification, extraHint, illustrationIndex);
    for (const eq of entityQueries) {
      candidateQueries.push(eq);
    }

    // 3. If explicit searchQuery was provided by AI and isn't generic, include it
    if (ill.searchQuery && ill.searchQuery.trim().length >= 8 && !ill.searchQuery.toLowerCase().includes('undefined')) {
      candidateQueries.push(ill.searchQuery.trim());
    }

    // 4. For technical & scientific concepts, add focused combinations of entityName + concept
    if (classification.category === 'scientific' || classification.category === 'technical') {
      if (titleHint.length > 2) {
        candidateQueries.push(`${classification.entityName} ${titleHint} diagram`);
      }
      if (headingHint.length > 2 && headingHint !== titleHint) {
        candidateQueries.push(`${classification.entityName} ${headingHint} diagram`);
      }
    }

    // Clean up, normalize and deduplicate queries
    return Array.from(new Set(candidateQueries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
}

export const imageSearchService = new ImageSearchService();
