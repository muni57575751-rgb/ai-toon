import type { Story, TopicIllustration, KeyPoint, LocationDetails } from '@ai-toon/shared';
import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';
import { wikimediaProvider } from './wikimedia.provider.js';
import { wikipediaProvider } from './wikipedia.provider.js';
import { imageSearchCache } from './imageSearch.cache.js';
import { entityClassifier, type EntityClassification } from './entityClassifier.js';
import {
  extractCanonicalFileIdentifier,
  normalizeImageUrl,
  deduplicateCandidates,
  registerUsedImage,
} from './imageDeduplicator.js';

export class ImageSearchService {
  constructor(
    private readonly primaryProvider: IImageSearchProvider = wikimediaProvider,
    private readonly secondaryProvider: IImageSearchProvider = wikipediaProvider
  ) {}

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

        if (typeof this.primaryProvider.searchImages === 'function') {
          return await this.primaryProvider.searchImages(cleanQuery, options, limit);
        }

        const single = await this.primaryProvider.searchImage(cleanQuery, options);
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

        const result = await this.primaryProvider.searchImage(cleanQuery, options);
        if (result) {
          console.log(
            `[ImageSearchService] Found primary image for "${cleanQuery}": "${result.title}" (${result.license}) [Score: ${result.score || 'N/A'}]`
          );
          return result;
        }

        if (options.allowFallbackProvider !== false) {
          const secondary = await this.secondaryProvider.searchImage(cleanQuery, options);
          if (secondary) {
            console.log(
              `[ImageSearchService] Found secondary image for "${cleanQuery}": "${secondary.title}" (${secondary.license}) [Score: ${secondary.score || 'N/A'}]`
            );
            return secondary;
          }
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
   * 2. Strict minimum relevance threshold: never forces an unrelated image.
   * 3. Distinct candidate selection for different concepts/slots.
   * 4. Multi-candidate caching and fallback URLs for frontend retry.
   * 5. Graceful SVG fallback if fewer than 2 distinct suitable images exist above threshold.
   */
  public async enhanceStoryIllustrations(story: Story): Promise<Story> {
    if (!Array.isArray(story.illustrations) || story.illustrations.length === 0) {
      return story;
    }

    // 1. Classify the overall story topic
    let classification: EntityClassification = entityClassifier.classify(story.topic);

    // If story already carries semantic category from Gemini / GeoDetection, harmonize it:
    if (story.topicCategory) {
      const topCat = story.topicCategory;
      if (topCat === 'PERSON') {
        classification = { category: 'person', confidence: 0.98, entityName: story.topic };
      } else if (topCat === 'GEOGRAPHICAL_PLACE' || topCat === 'PLACE') {
        classification = {
          category: 'place',
          confidence: 0.98,
          entityName: story.locationDetails?.placeName || story.topic,
        };
      } else if (topCat === 'INSTITUTION') {
        classification = { category: 'institution', confidence: 0.95, entityName: story.topic };
      } else if (topCat === 'SCIENCE' || topCat === 'SCIENCE_CONCEPT') {
        classification = { category: 'scientific', confidence: 0.95, entityName: story.topic };
      } else if (topCat === 'TECHNOLOGY' || topCat === 'TECHNOLOGY_CONCEPT') {
        classification = { category: 'technical', confidence: 0.95, entityName: story.topic };
      } else if (topCat === 'FOOD') {
        classification = { category: 'food', confidence: 0.95, entityName: story.topic };
      } else if (topCat === 'ANIMAL') {
        classification = { category: 'animal', confidence: 0.95, entityName: story.topic };
      } else if (topCat === 'HISTORY' || topCat === 'HISTORICAL_EVENT') {
        classification = { category: 'history', confidence: 0.95, entityName: story.topic };
      }
    }

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
        minScoreThreshold: 25,
      };

      let chosenCandidate: ImageSearchResult | null = null;
      let successfulQuery = '';
      const backupCandidateUrls: string[] = [];

      // 1. Try prioritized queries against Primary Provider (Wikimedia Commons API)
      for (const candidateQuery of queries) {
        try {
          const candidates = await this.findEducationalCandidates(candidateQuery, searchOptions, 6);

          // Deduplicate candidate list against already used images
          const unusedCandidates = deduplicateCandidates(candidates, usedIdentifiers);

          if (unusedCandidates.length > 0) {
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
        } catch (err) {
          console.warn(`[ImageSearchService] Primary query "${candidateQuery}" failed:`, err);
        }
      }

      // 2. If no candidate met threshold from Wikimedia Commons, consult Secondary Provider (Wikipedia REST API)
      if (!chosenCandidate) {
        try {
          const targetTerm = searchOptions.entityName || queries[0] || story.topic;
          console.log(
            `[ImageSearchService] Consulting secondary provider (Wikipedia REST API) for "${targetTerm}" (slot ${idx + 1})...`
          );
          const wikiCandidates = await this.secondaryProvider.searchImages!(
            targetTerm,
            searchOptions,
            2
          );

          const unusedWiki = deduplicateCandidates(wikiCandidates, usedIdentifiers);
          if (unusedWiki.length > 0) {
            chosenCandidate = unusedWiki[0];
            successfulQuery = targetTerm;
            registerUsedImage(chosenCandidate, usedIdentifiers);
            console.log(
              `[ImageSearchService] Found verified secondary image for "${story.topic}": "${chosenCandidate.title}"`
            );
          }
        } catch (wikiErr) {
          console.warn('[ImageSearchService] Secondary provider error:', wikiErr);
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
          sourceType: chosenCandidate.sourceType || 'wikimedia',
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

    // 1. If explicit, high-quality searchQuery was generated by Gemini AI, place it at top priority
    if (ill.searchQuery && ill.searchQuery.trim().length >= 6 && !ill.searchQuery.toLowerCase().includes('undefined')) {
      candidateQueries.push(ill.searchQuery.trim());
    }

    // Geographical entity query specialization (photograph priority & regional context)
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

    // Concept hint from title and paired key point
    const titleHint = (ill.title || '').replace(/illustration|figure|\d+/gi, '').trim();
    const headingHint = pairedKeyPoint?.heading ? pairedKeyPoint.heading.trim() : '';
    const extraHint = titleHint || headingHint;

    // Queries tailored by entityClassifier with slotIndex differentiation
    const entityQueries = entityClassifier.generateQueries(classification, extraHint, illustrationIndex);
    for (const eq of entityQueries) {
      candidateQueries.push(eq);
    }

    // Category-specific precision combinations
    if (classification.category === 'scientific' || classification.category === 'technical') {
      if (titleHint.length > 2) {
        candidateQueries.push(`${classification.entityName} ${titleHint} diagram`);
      }
      if (headingHint.length > 2 && headingHint !== titleHint) {
        candidateQueries.push(`${classification.entityName} ${headingHint} diagram`);
      }
    } else if (classification.category === 'food') {
      candidateQueries.push(`${classification.entityName} authentic food photograph`);
      candidateQueries.push(`${classification.entityName} dish`);
    } else if (classification.category === 'animal') {
      candidateQueries.push(`${classification.entityName} wildlife photograph`);
      candidateQueries.push(`${classification.entityName} animal species`);
    } else if (classification.category === 'history') {
      candidateQueries.push(`${classification.entityName} historical photograph`);
      candidateQueries.push(`${classification.entityName} archival artwork`);
    }

    // Clean up, normalize and deduplicate queries
    return Array.from(new Set(candidateQueries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
}

export const imageSearchService = new ImageSearchService();
