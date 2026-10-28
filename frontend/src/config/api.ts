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
