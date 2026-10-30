import type { IImageSearchProvider, ImageSearchOptions, ImageSearchResult } from './imageSearch.types.js';
import { extractCanonicalFileIdentifier, deduplicateCandidates } from './imageDeduplicator.js';

interface WikimediaPage {
  pageid: number;
  ns: number;
  title: string;
  categories?: Array<{
    ns?: number;
    title: string;
  }>;
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

export interface CandidateEvaluation {
  result: ImageSearchResult;
  score: number;
  rejectionReason?: string;
}

export class WikimediaImageProvider implements IImageSearchProvider {
  public readonly name = 'Wikimedia Commons API';
  private readonly userAgent =
    'AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)';

  public static readonly DEFAULT_MIN_SCORE_THRESHOLD = 25;

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

    const minScoreThreshold =
      typeof options.minScoreThreshold === 'number'
        ? options.minScoreThreshold
        : WikimediaImageProvider.DEFAULT_MIN_SCORE_THRESHOLD;

    try {
      // Wikimedia Commons API generator search in File namespace (ns=6) excluding raw document files
      const searchQuery = `${cleanQuery} -filetype:pdf -filetype:djvu`;
      const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        searchQuery
      )}&gsrnamespace=6&gsrlimit=20&prop=categories|imageinfo&cllimit=30&iiprop=url|size|extmetadata|mime&iiurlwidth=800&format=json`;

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

      const acceptedCandidates: Array<{ result: ImageSearchResult; score: number }> = [];
      const rejectedCandidates: Array<{ title: string; score: number; reason: string }> = [];

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

        if (!isSupportedImage) {
          rejectedCandidates.push({ title: page.title, score: 0, reason: `UNSUPPORTED_MEDIA_TYPE (${mime})` });
          continue;
        }

        // 2. Reject tiny icon thumbnails
        if ((info.width && info.width < 180) || (info.height && info.height < 140)) {
          rejectedCandidates.push({
            title: page.title,
            score: 0,
            reason: `IMAGE_TOO_SMALL (${info.width}x${info.height})`,
          });
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

        // 4. Extract Wikimedia Category taxonomy
        const categories = (page.categories || []).map((c) =>
          c.title.replace(/^Category:/i, '').trim()
        );

        // 5. Score relevance based on entity-aware criteria and category taxonomy
        const evaluation = this.calculateRelevance(
          page.title,
          description,
          categories,
          queryTokens,
          entityCategory,
          entityName,
          entityTokens,
          options.secondaryContext,
          mime,
          info.width,
          info.height
        );

        const score = evaluation.score;

        // Reject candidates that fail minimum relevance threshold
        if (score < minScoreThreshold) {
          const reason = evaluation.rejectionReason || `SCORE_BELOW_THRESHOLD (${score} < ${minScoreThreshold})`;
          rejectedCandidates.push({ title: page.title, score, reason });
          continue;
        }

        const cleanTitle = page.title
          .replace(/^File:/i, '')
          .replace(/\.[^.]+$/, '')
          .replace(/_/g, ' ')
          .trim();

        const canonicalSourceUrl =
          info.descriptionurl ||
          `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;

        acceptedCandidates.push({
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
            score,
            categories,
          },
        });
      }

      if (rejectedCandidates.length > 0) {
        console.log(
          `[WikimediaProvider] Evaluated ${pages.length} images for "${cleanQuery}": ${acceptedCandidates.length} accepted, ${rejectedCandidates.length} rejected.`
        );
        for (const rej of rejectedCandidates.slice(0, 3)) {
          console.log(`  - [REJECTED] "${rej.title}": ${rej.reason} (score: ${rej.score})`);
        }
      }

      if (acceptedCandidates.length === 0) {
        return [];
      }

      // Sort by relevance score descending
      acceptedCandidates.sort((a, b) => b.score - a.score);

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
        acceptedCandidates.map((c) => c.result),
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
      'overview',
      'detailed',
    ]);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  public calculateRelevance(
    title: string,
    description: string,
    categories: string[],
    queryTokens: string[],
    entityCategory: string,
    entityName: string,
    entityTokens: string[],
    secondaryContext?: string,
    mime?: string,
    width?: number,
    height?: number
  ): { score: number; rejectionReason?: string } {
    const lowerTitle = title.toLowerCase();
    const lowerCategories = categories.map((c) => c.toLowerCase());
    const categoriesJoined = lowerCategories.join(' ');
    const combined = `${lowerTitle} ${description.toLowerCase()} ${categoriesJoined}`;

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

      if (lowerEntity.includes('narendra modi') || lowerEntity.includes('modi')) {
        const hasModiMatch = lowerTitle.includes('modi') || combined.includes('modi');
        if (!hasModiMatch) {
          return { score: 0, rejectionReason: 'MISSING_DISTINCTIVE_TOKEN (modi)' };
        }
      } else if (lowerEntity.includes('einstein')) {
        const hasEinsteinMatch = lowerTitle.includes('einstein') || combined.includes('einstein');
        if (!hasEinsteinMatch) {
          return { score: 0, rejectionReason: 'MISSING_DISTINCTIVE_TOKEN (einstein)' };
        }
      } else if (lowerEntity.includes('dhoni')) {
        const hasDhoniMatch = lowerTitle.includes('dhoni') || combined.includes('dhoni');
        if (!hasDhoniMatch) {
          return { score: 0, rejectionReason: 'MISSING_DISTINCTIVE_TOKEN (dhoni)' };
        }
      } else if (lowerEntity.includes('vignan')) {
        const hasVignanMatch = lowerTitle.includes('vignan') || combined.includes('vignan');
        if (!hasVignanMatch) {
          return { score: 0, rejectionReason: 'MISSING_DISTINCTIVE_TOKEN (vignan)' };
        }
      } else {
        const hasDistinctiveMatch =
          (lowerEntity.length > 3 && combined.includes(lowerEntity)) ||
          (distinctiveTokens.length > 0 && distinctiveTokens.some((token) => combined.includes(token)));

        if (distinctiveTokens.length > 0 && !hasDistinctiveMatch) {
          return { score: 0, rejectionReason: `MISSING_DISTINCTIVE_TOKEN (${distinctiveTokens.join(',')})` };
        }
      }
    }

    let score = 0;

    // 2. Query token overlap in Title, Description, and Categories
    for (const token of queryTokens) {
      if (lowerTitle.includes(token)) {
        score += 5;
      } else if (categoriesJoined.includes(token)) {
        score += 4;
      } else if (combined.includes(token)) {
        score += 2;
      }
    }

    // 3. Exact entity name matching in Title and Categories
    if (entityName) {
      const lowerEntity = entityName.toLowerCase().trim();
      const cleanLowerTitle = lowerTitle.replace(/^file:/i, '').trim();

      // Strong priority boost if file title STARTS with the entity name (canonical primary subject photo)
      if (cleanLowerTitle.startsWith(lowerEntity)) {
        score += 35;
      } else if (lowerTitle.includes(lowerEntity)) {
        score += 25;
      } else if (categoriesJoined.includes(lowerEntity)) {
        score += 20;
      } else if (combined.includes(lowerEntity)) {
        score += 10;
      }
    }

    // 4. Secondary context match (e.g. "Vadlamudi" for Vignan, "Prakasam" for Donakonda, "Agra" for Taj Mahal)
    if (secondaryContext) {
      const secTokens = this.tokenize(secondaryContext);
      for (const st of secTokens) {
        if (lowerTitle.includes(st)) {
          score += 15;
        } else if (categoriesJoined.includes(st)) {
          score += 12;
        } else if (combined.includes(st)) {
          score += 8;
        }
      }
    }

    // 5. Global Noise & Negative Filters (Stamps, Coins, Caricatures, Banknotes, Book covers)
    const isExplicitStampQuery = queryTokens.includes('stamp');
    const isExplicitCoinQuery = queryTokens.includes('coin') || queryTokens.includes('currency');

    if (!isExplicitStampQuery) {
      if (
        lowerTitle.includes('stamp') ||
        lowerTitle.includes('postage') ||
        categoriesJoined.includes('postage stamps') ||
        categoriesJoined.includes('stamps of')
      ) {
        score -= 35;
      }
    }

    if (!isExplicitCoinQuery) {
      if (
        lowerTitle.includes('coin') ||
        lowerTitle.includes('banknote') ||
        lowerTitle.includes('currency') ||
        categoriesJoined.includes('coins of') ||
        categoriesJoined.includes('banknotes')
      ) {
        score -= 35;
      }
    }

    // Penalize caricatures and satirical drawings for real people, places, and food
    if (
      entityCategory === 'person' ||
      entityCategory === 'place' ||
      entityCategory === 'food' ||
      entityCategory === 'animal'
    ) {
      if (
        combined.includes('caricature') ||
        combined.includes('satire') ||
        combined.includes('graffiti') ||
        combined.includes('parody') ||
        combined.includes('editorial cartoon')
      ) {
        score -= 35;
      }
    }

    // Penalize book covers, PDF scans, and title pages
    if (
      lowerTitle.includes('book cover') ||
      lowerTitle.includes('title page') ||
      combined.includes('cover of the book') ||
      combined.includes('manuscript scan')
    ) {
      score -= 25;
    }

    // 6. Category-Specific Ranking Logic
    switch (entityCategory) {
      case 'person': {
        // Prioritize actual photographic portraits and official photos
        if (isPhoto) score += 14;
        if (isSvg) score -= 15; // Strongly avoid SVG icons for real people

        if (lowerTitle.includes('portrait')) score += 15;
        if (lowerTitle.includes('official')) score += 12;
        if (lowerTitle.includes('photograph') || lowerTitle.includes('photo')) score += 10;
        if (lowerTitle.includes('prime minister') || lowerTitle.includes('president')) score += 6;

        // Penalize movie promotions, promotional events, trailers, or actors promoting movies about this person
        if (
          lowerTitle.includes('promot') ||
          lowerTitle.includes('at premiere') ||
          lowerTitle.includes('trailer') ||
          lowerTitle.includes('teaser') ||
          lowerTitle.includes('screening of') ||
          lowerTitle.includes('film') ||
          lowerTitle.includes('movie')
        ) {
          score -= 40;
        }

        // Penalize signatures, autographs, plaques, tomb markers
        if (
          lowerTitle.includes('signature') ||
          lowerTitle.includes('autograph') ||
          lowerTitle.includes('tomb') ||
          lowerTitle.includes('grave')
        ) {
          score -= 35;
        }

        // Boost speech and public appearance photos
        if (lowerTitle.includes('address') || lowerTitle.includes('speech') || lowerTitle.includes('meeting')) {
          score += 8;
        }

        // Boost category match: e.g. "Category:Narendra Modi" or "Category:Albert Einstein"
        if (entityName && categories.some((c) => c.toLowerCase().includes(entityName.toLowerCase()))) {
          score += 20;
        }

        // Penalize stadiums, schools, bridges named after the person
        if (
          lowerTitle.includes('stadium') ||
          lowerTitle.includes('high school') ||
          lowerTitle.includes('university') ||
          lowerTitle.includes('hospital') ||
          categoriesJoined.includes('stadiums') ||
          categoriesJoined.includes('schools in')
        ) {
          score -= 35;
        }
        break;
      }

      case 'institution': {
        if (isPhoto) score += 8;
        if (lowerTitle.includes('building') || lowerTitle.includes('campus')) score += 14;
        if (lowerTitle.includes('university') || lowerTitle.includes('college')) score += 8;
        if (lowerTitle.includes('entrance') || lowerTitle.includes('gate') || lowerTitle.includes('library')) score += 10;
        if (lowerTitle.includes('vadlamudi')) score += 15;
        if (lowerTitle.includes('logo')) score += 5;
        if (isSvg && lowerTitle.includes('diagram')) score -= 12;
        break;
      }

      case 'place': {
        if (isPhoto) score += 12;
        if (lowerTitle.includes('landmark') || lowerTitle.includes('monument')) score += 12;
        if (lowerTitle.includes('view') || lowerTitle.includes('architecture') || lowerTitle.includes('temple')) score += 10;
        if (lowerTitle.includes('railway station') || lowerTitle.includes('station')) score += 10;
        if (categoriesJoined.includes('railway station') || categoriesJoined.includes('villages in') || categoriesJoined.includes('towns in')) {
          score += 15;
        }
        if (isSvg && !lowerTitle.includes('map')) score -= 10;
        break;
      }

      case 'scientific': {
        // Prioritize diagrams, labeled illustrations, and anatomical models
        if (combined.includes('diagram')) score += 20;
        if (combined.includes('labeled') || combined.includes('anatomy')) score += 15;
        if (combined.includes('scheme') || combined.includes('schematic')) score += 10;
        if (combined.includes('cycle') || combined.includes('process')) score += 10;
        if (combined.includes('blood flow')) score += 12;
        if (combined.includes('chloroplast') || combined.includes('photosynthesis')) score += 12;
        if (categoriesJoined.includes('diagrams') || categoriesJoined.includes('photosynthesis')) score += 15;
        if (isSvg) score += 12; // Crisp vector diagrams are prime for science
        break;
      }

      case 'technical': {
        // Prioritize algorithmic diagrams, flowcharts, architectures
        if (combined.includes('diagram')) score += 20;
        if (combined.includes('tree') || combined.includes('array') || combined.includes('search')) score += 12;
        if (combined.includes('neural network') || combined.includes('architecture') || combined.includes('model')) score += 12;
        if (combined.includes('flowchart') || combined.includes('algorithm') || combined.includes('structure')) score += 10;
        if (categoriesJoined.includes('algorithm') || categoriesJoined.includes('data structures')) score += 15;
        if (isSvg) score += 12;
        break;
      }

      case 'food': {
        if (isPhoto) score += 14;
        if (lowerTitle.includes('food') || lowerTitle.includes('dish') || lowerTitle.includes('recipe')) score += 14;
        if (lowerTitle.includes('cuisine') || lowerTitle.includes('plate') || lowerTitle.includes('sweet') || lowerTitle.includes('dum')) score += 10;
        if (categoriesJoined.includes('cuisine') || categoriesJoined.includes('dishes') || categoriesJoined.includes('food')) score += 15;
        if (isSvg) score -= 12;
        break;
      }

      case 'animal': {
        if (isPhoto) score += 14;
        if (lowerTitle.includes('wildlife') || lowerTitle.includes('animal') || lowerTitle.includes('species')) score += 14;
        if (lowerTitle.includes('nature') || lowerTitle.includes('wild') || lowerTitle.includes('bird')) score += 10;
        if (categoriesJoined.includes('fauna') || categoriesJoined.includes('animals') || categoriesJoined.includes('species')) score += 15;
        if (isSvg) score -= 10;
        break;
      }

      case 'history': {
        if (isPhoto) score += 10;
        if (lowerTitle.includes('historical') || lowerTitle.includes('archive') || lowerTitle.includes('vintage')) score += 14;
        if (lowerTitle.includes('monument') || lowerTitle.includes('painting') || lowerTitle.includes('movement') || lowerTitle.includes('march')) score += 12;
        if (categoriesJoined.includes('history') || categoriesJoined.includes('movement')) score += 15;
        break;
      }

      default: {
        if (combined.includes('diagram') || combined.includes('illustration')) score += 6;
        break;
      }
    }

    // 7. Image Dimensions: Reward high-res, legible images
    if (width && width >= 600) score += 3;
    if (height && height >= 400) score += 3;

    return { score };
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
