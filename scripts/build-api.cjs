const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const apiDir = path.resolve(root, 'api');

console.log('[build-api] Bundling Express backend for Vercel Serverless Function...');

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// 1. Bundle backend into api/index.js
esbuild.buildSync({
  entryPoints: [path.resolve(root, 'backend', 'src', 'serverless.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: path.resolve(apiDir, 'index.js'),
});
console.log('✅ [build-api] Successfully bundled api/index.js for Vercel!');

// 2. Generate api/[...path].js catch-all router for /api/* subroutes
const catchAllContent = `import handler from './index.js';

export default function pathHandler(req, res) {
  if (req.query && req.query.path) {
    const segments = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : String(req.query.path);
    const qIdx = req.url ? req.url.indexOf('?') : -1;
    const qStr = qIdx !== -1 ? req.url.slice(qIdx) : '';
    req.url = \`/api/\${segments.replace(/^\\/+/, '')}\${qStr}\`;
  }
  return handler(req, res);
}
`;
fs.writeFileSync(path.resolve(apiDir, '[...path].js'), catchAllContent, 'utf-8');
console.log('✅ [build-api] Configured dynamic catch-all serverless function api/[...path].js');

// 3. Generate api/health.js for fast direct health checks
const healthContent = `export { default } from './index.js';\n`;
fs.writeFileSync(path.resolve(apiDir, 'health.js'), healthContent, 'utf-8');
console.log('✅ [build-api] Configured dedicated health endpoint api/health.js');

// 4. Ensure api/package.json exists with type module
const pkgContent = JSON.stringify(
  {
    name: 'ai-toon-api',
    version: '0.1.0',
    type: 'module',
    main: 'index.js',
  },
  null,
  2
);
fs.writeFileSync(path.resolve(apiDir, 'package.json'), pkgContent, 'utf-8');
console.log('🎉 [build-api] Serverless functions directory fully configured.');
