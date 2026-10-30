import handler from './index.js';

export default function pathHandler(req, res) {
  if (req.query && req.query.path) {
    const segments = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : String(req.query.path);
    const qIdx = req.url ? req.url.indexOf('?') : -1;
    const qStr = qIdx !== -1 ? req.url.slice(qIdx) : '';
    req.url = `/api/${segments.replace(/^\/+/, '')}${qStr}`;
  }
  return handler(req, res);
}
