import { createApp } from './app.js';

const app = createApp();

export default function handler(req: any, res: any) {
  // If invoked via Vercel dynamic catch-all route [...path], reconstruct original req.url
  if (req.query && req.query.path) {
    const segments = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : String(req.query.path);
    const qIdx = req.url ? req.url.indexOf('?') : -1;
    const qStr = qIdx !== -1 ? req.url.slice(qIdx) : '';
    req.url = `/api/${segments.replace(/^\/+/, '')}${qStr}`;
  }
  return app(req, res);
}
