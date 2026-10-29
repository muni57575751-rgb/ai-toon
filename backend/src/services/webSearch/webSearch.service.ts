import type { SearchResponse, SearchResultItem } from '@ai-toon/shared';

interface WikipediaPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  touched?: string;
}

interface WikipediaQueryResponse {
  query?: {
    pages?: Record<string, WikipediaPage>;
  };
}

interface DuckDuckGoTopic {
  Text?: string;
  FirstURL?: string;
  Result?: string;
}

interface DuckDuckGoResponse {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: Array<DuckDuckGoTopic & { Topics?: DuckDuckGoTopic[] }>;
}

export class WebSearchService {
  private readonly userAgent = 'AIToonEducationalApp/1.0 (https://github.com/ai-toon; contact: educational-app@example.com)';

  /**
   * Submits a live query to indexed web and educational encyclopedic sources
   */
  public async search(query: string, page: number = 1, limit: number = 8): Promise<SearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { query: '', results: [], total: 0, provider: 'AI Toon Web Index' };
    }

    const collectedResults: SearchResultItem[] = [];

    // 1. Fetch from Wikipedia & Wikimedia Foundation knowledge graph
    try {
      const wikiEndpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery
      )}&gsrlimit=15&prop=extracts|info&exintro=1&explaintext=1&exchars=400&inprop=url&format=json`;

      const wikiRes = await fetch(wikiEndpoint, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (wikiRes.ok) {
        const wikiData = (await wikiRes.json()) as WikipediaQueryResponse;
        const pages = Object.values(wikiData.query?.pages || {});

        for (const p of pages) {
          if (!p.fullurl || !p.title) continue;
          const snippet = (p.extract || '').replace(/\s+/g, ' ').trim();
          if (!snippet) continue;

          let domain = 'en.wikipedia.org';
          try {
            domain = new URL(p.fullurl).hostname;
          } catch {
            // Keep default
          }

          collectedResults.push({
            title: p.title,
            url: p.fullurl,
            snippet: snippet.slice(0, 320) + (snippet.length > 320 ? '...' : ''),
            domain,
            publishedDate: p.touched ? p.touched.split('T')[0] : undefined,
            sourceType: 'encyclopedic',
          });
        }
      }
    } catch (err) {
      console.warn(`[WebSearchService] Wikipedia search provider error for "${cleanQuery}":`, err);
    }

    // 2. Fetch from DuckDuckGo Instant Answer API for live web definition & topics
    try {
      const ddgEndpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        cleanQuery
      )}&format=json&no_html=1&skip_disambig=1`;

      const ddgRes = await fetch(ddgEndpoint, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (ddgRes.ok) {
        const ddgData = (await ddgRes.json()) as DuckDuckGoResponse;

        if (ddgData.AbstractText && ddgData.AbstractURL) {
          let domain = 'duckduckgo.com';
          try {
            domain = new URL(ddgData.AbstractURL).hostname;
          } catch {
            // default
          }

          collectedResults.unshift({
            title: ddgData.Heading || cleanQuery,
            url: ddgData.AbstractURL,
            snippet: ddgData.AbstractText.slice(0, 320),
            domain,
            sourceType: 'web',
          });
        }

        if (Array.isArray(ddgData.RelatedTopics)) {
          for (const item of ddgData.RelatedTopics) {
            const topic = item.Topics ? item.Topics[0] : item;
            if (topic?.FirstURL && topic?.Text) {
              let domain = 'web';
              try {
                domain = new URL(topic.FirstURL).hostname;
              } catch {
                // default
              }

              // Extract title before the hyphen or comma if possible
              const parts = topic.Text.split(' - ');
              const title = parts[0]?.trim() || cleanQuery;
              const snippet = parts[1]?.trim() || topic.Text;

              collectedResults.push({
                title,
                url: topic.FirstURL,
                snippet: snippet.slice(0, 280),
                domain,
                sourceType: 'web',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[WebSearchService] DuckDuckGo search provider error for "${cleanQuery}":`, err);
    }

    // 3. Deduplicate repeated and identical URLs
    const seenUrls = new Set<string>();
    const deduplicated: SearchResultItem[] = [];

    for (const item of collectedResults) {
      const norm = item.url.toLowerCase().split('#')[0].replace(/\/+$/, '');
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        deduplicated.push(item);
      }
    }

    // 4. Rank results: query keyword match in title, length of snippet, domain credibility
    const qLower = cleanQuery.toLowerCase();
    const queryTokens = qLower.split(/\s+/).filter((w) => w.length > 2);

    deduplicated.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();

      if (titleA === qLower) scoreA += 20;
      if (titleB === qLower) scoreB += 20;

      for (const tok of queryTokens) {
        if (titleA.includes(tok)) scoreA += 5;
        if (titleB.includes(tok)) scoreB += 5;
        if (a.snippet.toLowerCase().includes(tok)) scoreA += 2;
        if (b.snippet.toLowerCase().includes(tok)) scoreB += 2;
      }

      if (a.domain.includes('wikipedia') || a.domain.includes('.edu') || a.domain.includes('.org')) scoreA += 3;
      if (b.domain.includes('wikipedia') || b.domain.includes('.edu') || b.domain.includes('.org')) scoreB += 3;

      return scoreB - scoreA;
    });

    const offset = Math.max(0, (page - 1) * limit);
    const paginated = deduplicated.slice(offset, offset + limit);

    return {
      query: cleanQuery,
      results: paginated,
      total: deduplicated.length,
      provider: 'Verified Educational Search Index (Wikipedia & Web)',
    };
  }
}

export const webSearchService = new WebSearchService();
