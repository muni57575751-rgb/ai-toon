/**
 * Global API configuration.
 * Uses VITE_API_BASE_URL if configured (e.g. https://your-backend.onrender.com/api),
 * otherwise defaults to '/api' for same-domain or Vite proxy development.
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
