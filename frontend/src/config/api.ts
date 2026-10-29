/**
 * Global API configuration.
 * Uses VITE_API_BASE_URL if configured as a valid HTTP/HTTPS URL or relative path (e.g. https://your-backend.onrender.com/api),
 * otherwise defaults to '/api'.
 * Rejects database URIs (e.g. postgresql://...) to prevent browser fetch exceptions.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw || typeof raw !== 'string') {
    return '/api';
  }

  const trimmed = raw.trim();
  // Valid URLs must begin with http://, https://, or a relative path /
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed.replace(/\/$/, '');
  }

  console.warn(
    `[AI Toon] VITE_API_BASE_URL is not an HTTP/HTTPS endpoint. Defaulting to '/api'.`
  );
  return '/api';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

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
