import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';

interface WikipediaSummaryResponse {
  type?: string;
  title?: string;
  displaytitle?: string;
  description?: string;
  extract?: string;
  pageid?: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}

interface WikipediaSearchResponse {
  query?: {
    search?: Array<{
      title: string;
      pageid: number;
      snippet?: string;
    }>;
  };
}

export class WikipediaImageProvider implements IImageSearchProvider {
  public readonly name = 'Wikipedia REST API';
  private readonly userAgent =
    'AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)';

  public async searchImage(
    query: string,
    options: ImageSearchOptions = {}
  ): Promise<ImageSearchResult | null> {
    const results = await this.searchImages(query, options, 1);
    return results[0] || null;
  }

  public async searchImages(
    query: string,
    options: ImageSearchOptions = {},
    limit: number = 3
  ): Promise<ImageSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const timeoutMs = options.timeoutMs ?? 7000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const minThreshold = options.minScoreThreshold ?? 25;
    const entityName = options.entityName || cleanQuery;
    const entityCategory = options.entityCategory || 'other';

    try {
      // 1. First attempt: Direct summary for entityName or cleanQuery
      const candidateTitles: string[] = [entityName, cleanQuery];

      // 2. Query search API for up to 3 candidate titles if direct summary might be ambiguous
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          cleanQuery
        )}&srlimit=${limit}&format=json`;

        const sRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (sRes.ok) {
          const sData = (await sRes.json()) as WikipediaSearchResponse;
          for (const item of sData.query?.search || []) {
            if (item.title && !candidateTitles.includes(item.title)) {
              candidateTitles.push(item.title);
            }
          }
        }
      } catch (sErr) {
        // Fall back to direct summary attempts
      }

      const results: ImageSearchResult[] = [];

      for (const pageTitle of candidateTitles) {
        if (results.length >= limit) break;

        try {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            pageTitle.replace(/ /g, '_')
          )}`;

          const res = await fetch(summaryUrl, {
            headers: {
              'User-Agent': this.userAgent,
              Accept: 'application/json',
            },
            signal: controller.signal,
          });

          if (!res.ok) continue;

          const data = (await res.json()) as WikipediaSummaryResponse;

          // Disregard disambiguation pages or entries with no thumbnail
          if (data.type === 'disambiguation') continue;
          if (!data.thumbnail?.source && !data.originalimage?.source) continue;

          const imgUrl = data.originalimage?.source || data.thumbnail?.source || '';
          const thumbUrl = data.thumbnail?.source || data.originalimage?.source || '';
          if (!imgUrl) continue;

          // Score candidate relevance
          const score = this.calculateSummaryRelevance(data, entityName, entityCategory, cleanQuery);

          if (score < minThreshold) {
            console.log(
              `[WikipediaImageProvider] Rejected candidate "${data.title}" (score ${score} < ${minThreshold})`
            );
            continue;
          }

          const pageUrl =
            data.content_urls?.desktop?.page ||
            `https://en.wikipedia.org/wiki/${encodeURIComponent((data.title || pageTitle).replace(/ /g, '_'))}`;

          results.push({
            id: `wiki_rest_${data.pageid || encodeURIComponent(data.title || pageTitle)}`,
            title: data.title || pageTitle,
            imageUrl: imgUrl,
            thumbnailUrl: thumbUrl,
            sourcePageUrl: pageUrl,
            author: 'Wikipedia / Wikimedia Commons contributors',
            license: 'Creative Commons Attribution-ShareAlike 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            attribution: `${data.title || pageTitle} (Wikipedia / Wikimedia Commons)`,
            width: data.originalimage?.width || data.thumbnail?.width,
            height: data.originalimage?.height || data.thumbnail?.height,
            sourceType: 'wikipedia',
            entityCategory,
            score,
            categories: data.description ? [data.description] : [],
          });
        } catch {
          // Continue to next candidate
        }
      }

      return results;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[WikipediaImageProvider] Search timed out after ${timeoutMs}ms for "${cleanQuery}"`);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private calculateSummaryRelevance(
    data: WikipediaSummaryResponse,
    entityName: string,
    entityCategory: string,
    query: string
  ): number {
    let score = 25; // Base score for human-curated Wikipedia lead image

    const titleLower = (data.title || '').toLowerCase();
    const entityLower = entityName.toLowerCase().trim();
    const descLower = (data.description || '').toLowerCase();
    const extractLower = (data.extract || '').toLowerCase();
    const combined = `${titleLower} ${descLower} ${extractLower}`;

    // 1. Distinctive entity title matching (Anti-hallucination / Anti-tangential guardrail)
    const entityTokens = entityLower.split(/\s+/).filter((t) => t.length > 2);
    const hasEntityTokenMatch = entityTokens.some((t) => titleLower.includes(t));

    if (titleLower === entityLower) {
      score += 35;
    } else if (titleLower.includes(entityLower) || entityLower.includes(titleLower)) {
      score += 25;
    } else if (hasEntityTokenMatch) {
      score += 15;
    } else {
      // If neither the exact entity nor any distinctive token of the entity appears in the Wikipedia article title,
      // it is a tangential or unrelated article (e.g. an adjacent village like Araveedu for Ganga Donakonda).
      // Reject by returning score 0 to prevent displaying unrelated subjects.
      return 0;
    }

    // 2. Category consistency checks & negative penalties
    switch (entityCategory) {
      case 'person': {
        // Must describe a person or living individual
        const personMarkers = [
          'cricketer',
          'politician',
          'physicist',
          'scientist',
          'actor',
          'minister',
          'president',
          'born',
          'player',
          'leader',
          'biography',
          'mathematician',
        ];
        const isPersonDesc = personMarkers.some((m) => descLower.includes(m) || extractLower.includes(m));
        if (isPersonDesc) score += 20;

        // Penalize stadiums, movies, schools named after the person
        if (
          descLower.includes('film') ||
          descLower.includes('stadium') ||
          descLower.includes('school') ||
          descLower.includes('album') ||
          descLower.includes('song')
        ) {
          score -= 40;
        }
        break;
      }

      case 'place': {
        const placeMarkers = ['village', 'town', 'city', 'district', 'temple', 'monument', 'mountain', 'river', 'india'];
        if (placeMarkers.some((m) => descLower.includes(m) || extractLower.includes(m))) {
          score += 20;
        }
        break;
      }

      case 'food': {
        const foodMarkers = ['dish', 'cuisine', 'food', 'rice', 'sweet', 'bread', 'curry', 'snack', 'beverage'];
        if (foodMarkers.some((m) => descLower.includes(m) || extractLower.includes(m))) {
          score += 25;
        }
        if (descLower.includes('film') || descLower.includes('album')) {
          score -= 40;
        }
        break;
      }

      case 'animal': {
        const animalMarkers = ['species', 'animal', 'mammal', 'bird', 'subspecies', 'fauna', 'felid', 'wildlife'];
        if (animalMarkers.some((m) => descLower.includes(m) || extractLower.includes(m))) {
          score += 25;
        }
        if (descLower.includes('team') || descLower.includes('mascot')) {
          score -= 35;
        }
        break;
      }

      case 'scientific':
      case 'technical': {
        const conceptMarkers = ['algorithm', 'process', 'diagram', 'concept', 'structure', 'biology', 'theory', 'system'];
        if (conceptMarkers.some((m) => descLower.includes(m) || extractLower.includes(m))) {
          score += 20;
        }
        break;
      }

      case 'history': {
        const historyMarkers = ['movement', 'war', 'battle', 'event', 'revolution', 'treaty', 'history', 'campaign'];
        if (historyMarkers.some((m) => descLower.includes(m) || extractLower.includes(m))) {
          score += 20;
        }
        break;
      }
    }

    return score;
  }
}

export const wikipediaProvider = new WikipediaImageProvider();
