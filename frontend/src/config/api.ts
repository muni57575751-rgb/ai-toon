/**
 * Global API configuration.
 * Resolves the backend API base URL using VITE_API_BASE_URL when provided,
 * or defaults to relative '/api' which works seamlessly with Vite dev proxy, preview proxy, and production serverless rewrites.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw || typeof raw !== 'string') {
    return '/api';
  }

  const trimmed = raw.trim();

  // If a database connection string was accidentally pasted, reject it with a warning and use '/api'
  if (
    trimmed.startsWith('postgresql://') ||
    trimmed.startsWith('postgres://') ||
    trimmed.startsWith('mysql://') ||
    trimmed.startsWith('mongodb://')
  ) {
    console.warn(
      `[AI Toon] VITE_API_BASE_URL is a database connection string, not an HTTP API endpoint. Defaulting to '/api'.`
    );
    return '/api';
  }

  // In production builds, ignore localhost or local dev addresses and use same-origin /api
  if (import.meta.env.PROD && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1'))) {
    console.warn(
      `[AI Toon] VITE_API_BASE_URL points to localhost in a production build. Falling back to same-origin '/api'.`
    );
    return '/api';
  }

  // If an absolute HTTP/HTTPS URL was provided (e.g. http://localhost:5000 or https://api.example.com):
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const clean = trimmed.replace(/\/+$/, '');
    // Ensure all backend routes mounted under /api resolve properly
    if (clean.endsWith('/api')) {
      return clean;
    }
    return `${clean}/api`;
  }

  // If a relative path was provided (e.g. /api):
  if (trimmed.startsWith('/')) {
    const clean = trimmed.replace(/\/+$/, '');
    return clean || '/api';
  }

  return '/api';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

/**
 * Returns the backend root origin (without /api) for direct health checks or diagnostics.
 * E.g. "http://localhost:5000/api" -> "http://localhost:5000"
 * E.g. "/api" -> window.location.origin
 */
export function getBackendOrigin(): string {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL.replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.DEV ? 'http://localhost:5000' : '';
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
