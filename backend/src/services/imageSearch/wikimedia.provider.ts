import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';
import { extractCanonicalFileIdentifier, deduplicateCandidates } from './imageDeduplicator.js';

interface WikimediaPage {
  pageid: number;
  ns: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    descriptionurl?: string;
    descriptionshorturl?: string;
    width: number;
    height: number;
    size: number;
    mime: string;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
      License?: { value?: string };
      LicenseUrl?: { value?: string };
      Credit?: { value?: string };
      UsageTerms?: { value?: string };
      ImageDescription?: { value?: string };
    };
  }>;
}

interface WikimediaApiResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

export class WikimediaImageProvider implements IImageSearchProvider {
  public readonly name = 'Wikimedia Commons API';
  private readonly userAgent = 'AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)';

  public async searchImages(
    query: string,
    options: ImageSearchOptions = {},
    limit: number = 10
  ): Promise<ImageSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const timeoutMs = options.timeoutMs ?? 8000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Wikimedia Commons API generator search in File namespace (ns=6) excluding raw document files
      const searchQuery = `${cleanQuery} -filetype:pdf -filetype:djvu`;
      const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        searchQuery
      )}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=800&format=json`;

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`[WikimediaProvider] HTTP ${res.status} response for query "${cleanQuery}"`);
        return [];
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        console.warn(`[WikimediaProvider] Non-JSON response for query "${cleanQuery}": ${contentType}`);
        return [];
      }

      let data: WikimediaApiResponse;
      try {
        data = (await res.json()) as WikimediaApiResponse;
      } catch (parseErr) {
        console.warn(`[WikimediaProvider] Failed to parse JSON response for "${cleanQuery}":`, parseErr);
        return [];
      }

      const pages = Object.values(data.query?.pages || {});
      if (pages.length === 0) {
        return [];
      }

      const candidates: Array<{ result: ImageSearchResult; score: number }> = [];
      const queryTokens = this.tokenize(cleanQuery);
      const entityCategory = options.entityCategory || 'other';
      const entityName = options.entityName || '';
      const entityTokens = entityName ? this.tokenize(entityName) : [];

      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;

        // 1. Verify valid image MIME type & exclude document/raw media containers
        const mime = (info.mime || '').toLowerCase();
        const lowerTitle = page.title.toLowerCase();
        const isSupportedImage =
          (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/svg+xml' || mime === 'image/webp') &&
          !lowerTitle.endsWith('.pdf') &&
          !lowerTitle.endsWith('.djvu') &&
          !lowerTitle.endsWith('.tif') &&
          !lowerTitle.endsWith('.tiff');

        if (!isSupportedImage) continue;

        // 2. Reject tiny icon thumbnails
        if ((info.width && info.width < 180) || (info.height && info.height < 140)) {
          continue;
        }

        // 3. Extract license and author metadata
        const ext = info.extmetadata || {};
        const rawArtist = ext.Artist?.value || '';
        const author = this.cleanHtml(rawArtist) || 'Wikimedia Commons contributor';
        const license = ext.LicenseShortName?.value || ext.License?.value || 'Open License';
        const licenseUrl = ext.LicenseUrl?.value;
        const attribution = this.cleanHtml(ext.Credit?.value || ext.UsageTerms?.value) || author;
        const description = this.cleanHtml(ext.ImageDescription?.value) || '';

        // 4. Score relevance based on entity-aware criteria
        const score = this.calculateRelevance(
          page.title,
          description,
          queryTokens,
          entityCategory,
          entityName,
          entityTokens,
          options.secondaryContext,
          mime,
          info.width,
          info.height
        );

        // Discard candidates that fail minimum relevance threshold
        if (score <= 0) continue;

        const cleanTitle = page.title
          .replace(/^File:/i, '')
          .replace(/\.[^.]+$/, '')
          .replace(/_/g, ' ')
          .trim();

        const canonicalSourceUrl =
          info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;

        candidates.push({
          score,
          result: {
            id: `wiki_${page.pageid}`,
            title: cleanTitle,
            imageUrl: info.thumburl || info.url,
            thumbnailUrl: info.thumburl || info.url,
            sourcePageUrl: canonicalSourceUrl,
            author,
            license,
            licenseUrl,
            attribution,
            width: info.width,
            height: info.height,
            mime: info.mime,
            sourceType: 'wikimedia',
            entityCategory,
          },
        });
      }

      if (candidates.length === 0) {
        return [];
      }

      // Sort by relevance score descending
      candidates.sort((a, b) => b.score - a.score);

      // Exclude passed identifiers and deduplicate within candidate list
      const excludedSet = new Set<string>();
      if (options.excludeIdentifiers && Array.isArray(options.excludeIdentifiers)) {
        for (const id of options.excludeIdentifiers) {
          const canonical = extractCanonicalFileIdentifier(id);
          if (canonical) excludedSet.add(canonical);
          excludedSet.add(id);
        }
      }

      const deduplicated = deduplicateCandidates(
        candidates.map((c) => c.result),
        excludedSet
      );

      return deduplicated.slice(0, limit);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[WikimediaProvider] Image search timed out after ${timeoutMs}ms for query "${cleanQuery}"`);
      } else {
        console.warn(`[WikimediaProvider] Image search failed for query "${cleanQuery}":`, err);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  public async searchImage(
    query: string,
    options: ImageSearchOptions = {}
  ): Promise<ImageSearchResult | null> {
    const results = await this.searchImages(query, options, 1);
    return results[0] || null;
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'into',
      'that',
      'this',
      'how',
      'does',
      'work',
      'what',
      'file',
      'image',
      'photo',
    ]);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  private calculateRelevance(
    title: string,
    description: string,
    queryTokens: string[],
    entityCategory: string,
    entityName: string,
    entityTokens: string[],
    secondaryContext?: string,
    mime?: string,
    width?: number,
    height?: number
  ): number {
    const combined = `${title} ${description}`.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const isPhoto = mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
    const isSvg = mime === 'image/svg+xml';

    // 1. Mandatory Identity Check for Named Entities (People & Institutions)
    const genericInstitutionWords = new Set([
      'university',
      'college',
      'institute',
      'institution',
      'school',
      'academy',
      'foundation',
      'corporation',
      'company',
      'ltd',
      'inc',
      'org',
      'organization',
      'hospital',
      'center',
      'centre',
      'department',
    ]);

    const genericPersonWords = new Set([
      'shri',
      'mr',
      'mrs',
      'ms',
      'dr',
      'prof',
      'professor',
      'sir',
      'lord',
      'president',
      'minister',
      'prime',
      'pm',
      'king',
      'queen',
      'leader',
      'politician',
    ]);

    if (entityCategory === 'person' || entityCategory === 'institution') {
      const lowerEntity = entityName.toLowerCase().trim();
      const genericSet = entityCategory === 'institution' ? genericInstitutionWords : genericPersonWords;
      const distinctiveTokens = entityTokens.filter((t) => !genericSet.has(t));

      // For Narendra Modi, distinctive tokens MUST include 'modi' (and ideally 'narendra')
      if (lowerEntity.includes('narendra modi') || lowerEntity.includes('modi')) {
        const hasModiMatch = lowerTitle.includes('modi') || combined.includes('modi');
        if (!hasModiMatch) {
          return 0; // Exclude unrelated politicians completely
        }
      } else if (lowerEntity.includes('vignan')) {
        // For Vignan University, title/description MUST include 'vignan'
        const hasVignanMatch = lowerTitle.includes('vignan') || combined.includes('vignan');
        if (!hasVignanMatch) {
          return 0; // Exclude unrelated universities completely
        }
      } else {
        // General distinctive tokens check
        const hasDistinctiveMatch =
          (lowerEntity.length > 3 && combined.includes(lowerEntity)) ||
          (distinctiveTokens.length > 0 && distinctiveTokens.some((token) => combined.includes(token)));

        if (distinctiveTokens.length > 0 && !hasDistinctiveMatch) {
          return 0; // Exclude unrelated pictures that only match generic keywords like "university"
        }
      }
    }

    let score = 0;

    // 2. Query token overlap
    for (const token of queryTokens) {
      if (lowerTitle.includes(token)) {
        score += 4;
      } else if (combined.includes(token)) {
        score += 2;
      }
    }

    // 3. Exact entity name match in title
    if (entityName) {
      const lowerEntity = entityName.toLowerCase().trim();
      if (lowerTitle.includes(lowerEntity)) {
        score += 20;
      } else if (combined.includes(lowerEntity)) {
        score += 10;
      }
    }

    // 4. Secondary context match (e.g. "Vadlamudi" for Vignan University)
    if (secondaryContext) {
      const secTokens = this.tokenize(secondaryContext);
      for (const st of secTokens) {
        if (combined.includes(st)) {
          score += 12;
        }
      }
    }

    // 5. Category-Specific Ranking Logic
    switch (entityCategory) {
      case 'person': {
        // Prioritize actual photographic portraits and official photos
        if (isPhoto) score += 12;
        if (isSvg) score -= 8; // Avoid SVG icons for real people

        if (lowerTitle.includes('portrait')) score += 12;
        if (lowerTitle.includes('official')) score += 10;
        if (lowerTitle.includes('photograph') || lowerTitle.includes('photo')) score += 8;
        if (lowerTitle.includes('prime minister') || lowerTitle.includes('president')) score += 6;

        // Boost authentic distinct photo tags
        if (lowerTitle.includes('address') || lowerTitle.includes('speech') || lowerTitle.includes('meeting')) {
          score += 6;
        }

        // Penalize caricatures, stamps, satirical drawings when photos are expected
        if (combined.includes('caricature') || combined.includes('satire') || combined.includes('graffiti') || combined.includes('parody')) {
          score -= 20;
        }
        break;
      }

      case 'institution': {
        // Prioritize campus, buildings, and official grounds
        if (isPhoto) score += 8;
        if (lowerTitle.includes('building') || lowerTitle.includes('campus')) score += 14;
        if (lowerTitle.includes('university') || lowerTitle.includes('college')) score += 6;
        if (lowerTitle.includes('entrance') || lowerTitle.includes('gate') || lowerTitle.includes('library')) score += 10;
        if (lowerTitle.includes('vadlamudi')) score += 15;
        if (lowerTitle.includes('logo')) score += 5;

        // Penalize generic conceptual diagrams
        if (isSvg && lowerTitle.includes('diagram')) score -= 10;
        break;
      }

      case 'place': {
        if (isPhoto) score += 8;
        if (lowerTitle.includes('landmark') || lowerTitle.includes('monument')) score += 10;
        if (lowerTitle.includes('view') || lowerTitle.includes('architecture')) score += 8;
        break;
      }

      case 'scientific': {
        // Prioritize diagrams, labeled illustrations, and anatomical models
        if (combined.includes('diagram')) score += 16;
        if (combined.includes('labeled') || combined.includes('anatomy')) score += 12;
        if (combined.includes('scheme') || combined.includes('schematic')) score += 8;
        if (combined.includes('cycle') || combined.includes('process')) score += 8;
        if (combined.includes('blood flow')) score += 10;
        if (combined.includes('chloroplast') || combined.includes('photosynthesis')) score += 10;
        if (isSvg) score += 8; // Crisp vector diagrams are excellent for science
        break;
      }

      case 'technical': {
        // Prioritize algorithmic diagrams, flowcharts, architectures
        if (combined.includes('diagram')) score += 16;
        if (combined.includes('tree') || combined.includes('array') || combined.includes('search')) score += 10;
        if (combined.includes('neural network') || combined.includes('architecture') || combined.includes('model')) score += 10;
        if (combined.includes('flowchart') || combined.includes('algorithm') || combined.includes('structure')) score += 8;
        if (isSvg) score += 8;
        break;
      }

      default: {
        if (combined.includes('diagram') || combined.includes('illustration')) score += 4;
        break;
      }
    }

    // 6. Image Dimensions: Reward high-res, legible images
    if (width && width >= 600) score += 2;
    if (height && height >= 400) score += 2;

    return score;
  }

  private cleanHtml(html?: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

export const wikimediaProvider = new WikimediaImageProvider();
