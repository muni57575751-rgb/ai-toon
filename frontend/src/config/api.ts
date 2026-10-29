/**
 * Global API configuration.
 * Uses VITE_API_BASE_URL if configured as a valid HTTP/HTTPS URL,
 * otherwise targets the live Express backend deployment when running on Vercel client domains,
 * or defaults to '/api' for local development.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(/\/$/, '');
    }
  }

  // When loaded on ai-toon-x9li.vercel.app or other preview Vercel domains, route to live Express backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.vercel.app') &&
    !window.location.hostname.includes('6w2r')
  ) {
    return 'https://ai-toon-6w2r.vercel.app/api';
  }

  return '/api';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

// Safe global fetch wrapper to ensure Vercel serverless routing resiliency
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Direct relative /api requests on preview domains to the live backend instance
    if (url.startsWith('/api') && API_BASE_URL.startsWith('http')) {
      url = `${API_BASE_URL}${url.slice(4)}`;
    }

    let res = await nativeFetch(url, init);

    // If serverless route returns 404 (due to Vercel edge rewrite propagation), retry with __url query
    if (res.status === 404) {
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.pathname.startsWith('/api') && !parsed.searchParams.has('__url')) {
          const fallbackUrl = `${parsed.origin}/api?__url=${encodeURIComponent(parsed.pathname + parsed.search)}`;
          const fallbackRes = await nativeFetch(fallbackUrl, init);
          if (fallbackRes.status !== 404) {
            return fallbackRes;
          }
        }
      } catch {
        // Fallback gracefully on parsing errors
      }
    }

    return res;
  };
}

/**
 * Safely parses a fetch Response as JSON without throwing `Unexpected end of JSON input`.
 * Handles empty bodies, HTML error pages, and non-JSON payloads gracefully.
 */
export async function safeJsonParse<T = any>(
  res: Response,
  fallbackMessage: string = 'Server response was empty or malformed.'
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return {
        ok: false,
        status: res.status,
        error: res.ok ? fallbackMessage : `Server returned status ${res.status} with empty response.`,
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Body is not JSON (e.g. HTML 404/500/405 page or plain text)
      const cleanSnippet = text.startsWith('<')
        ? `Server returned HTTP ${res.status}`
        : text.slice(0, 150);
      return {
        ok: false,
        status: res.status,
        error: cleanSnippet || `Server returned invalid JSON (HTTP ${res.status}).`,
      };
    }

    if (!res.ok) {
      const errMsg =
        json?.error?.message ||
        json?.message ||
        `Request failed with status ${res.status}.`;
      return { ok: false, status: res.status, data: json, error: errMsg };
    }

    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return {
      ok: false,
      status: res.status,
      error: err instanceof Error ? err.message : fallbackMessage,
    };
  }
}
