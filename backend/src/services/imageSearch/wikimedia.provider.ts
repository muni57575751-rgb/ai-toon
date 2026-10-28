import type { IImageSearchProvider, ImageSearchResult } from './imageSearch.types.js';

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

  public async searchImage(query: string, timeoutMs: number = 8000): Promise<ImageSearchResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Wikimedia Commons API generator search in File namespace (ns=6) excluding document containers
      const searchQuery = `${cleanQuery} -filetype:pdf -filetype:djvu`;
      const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        searchQuery
      )}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=800&format=json`;

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`[WikimediaProvider] HTTP ${res.status} error for query "${cleanQuery}"`);
        return null;
      }

      const data = (await res.json()) as WikimediaApiResponse;
      const pages = Object.values(data.query?.pages || {});

      if (pages.length === 0) {
        return null;
      }

      const candidates: Array<{ result: ImageSearchResult; score: number }> = [];
      const queryTokens = this.tokenize(cleanQuery);

      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;

        // 1. Verify valid image MIME type & exclude document/media containers
        const mime = (info.mime || '').toLowerCase();
        const lowerTitle = page.title.toLowerCase();
        const isSupportedImage =
          (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/svg+xml' || mime === 'image/webp') &&
          !lowerTitle.endsWith('.pdf') &&
          !lowerTitle.endsWith('.djvu') &&
          !lowerTitle.endsWith('.tif') &&
          !lowerTitle.endsWith('.tiff');

        if (!isSupportedImage) continue;

        // 2. Reject tiny icon thumbnails when suitable diagrams are required
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

        // 4. Score relevance based on educational diagram keywords
        const score = this.calculateRelevance(page.title, description, queryTokens);

        // Discard candidates that have no semantic overlap with query
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
          },
        });
      }

      if (candidates.length === 0) {
        return null;
      }

      // Sort by relevance score descending
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].result;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[WikimediaProvider] Image search timed out after ${timeoutMs}ms for query "${cleanQuery}"`);
      } else {
        console.warn(`[WikimediaProvider] Image search failed for query "${cleanQuery}":`, err);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'how', 'does', 'work', 'what']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  private calculateRelevance(title: string, description: string, queryTokens: string[]): number {
    const combined = `${title} ${description}`.toLowerCase();
    let score = 0;

    for (const token of queryTokens) {
      if (combined.includes(token)) {
        score += 3;
      }
    }

    // Boost diagram, schematic, and educational illustrations
    if (combined.includes('diagram')) score += 4;
    if (combined.includes('scheme') || combined.includes('schematic')) score += 3;
    if (combined.includes('chart') || combined.includes('illustration')) score += 2;
    if (combined.includes('labeled') || combined.includes('anatomy') || combined.includes('cycle')) score += 2;

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
