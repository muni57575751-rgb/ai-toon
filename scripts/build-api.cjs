const esbuild = require('esbuild');
const path = require('path');

const root = path.resolve(__dirname, '..');

console.log('[build-api] Bundling Express backend for Vercel Serverless Function...');

esbuild.buildSync({
  entryPoints: [path.resolve(root, 'backend', 'src', 'serverless.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: path.resolve(root, 'api', 'index.js'),
});

console.log('✅ [build-api] Successfully bundled api/index.js for Vercel!');
