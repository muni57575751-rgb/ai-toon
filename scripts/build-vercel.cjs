const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vercelDir = path.resolve(root, '.vercel', 'output');
const staticDir = path.resolve(vercelDir, 'static');
const funcDir1 = path.resolve(vercelDir, 'functions', 'api.func');
const funcDir2 = path.resolve(vercelDir, 'functions', 'api', 'index.func');

console.log('[build-vercel] Preparing Vercel Build Output API v3...');

// 1. Clean & create output structure
fs.rmSync(vercelDir, { recursive: true, force: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(funcDir1, { recursive: true });
fs.mkdirSync(funcDir2, { recursive: true });

// 2. Copy static frontend
const frontendDist = path.resolve(root, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  fs.cpSync(frontendDist, staticDir, { recursive: true });
  console.log('[build-vercel] Copied frontend/dist -> .vercel/output/static');
} else {
  console.error('[build-vercel] ERROR: frontend/dist not found!');
  process.exit(1);
}

// 3. Copy bundled api backend
const apiBundle = path.resolve(root, 'api', 'index.js');
if (fs.existsSync(apiBundle)) {
  fs.copyFileSync(apiBundle, path.resolve(funcDir1, 'index.js'));
  fs.copyFileSync(apiBundle, path.resolve(funcDir2, 'index.js'));
  console.log('[build-vercel] Copied api/index.js -> .vercel/output/functions');
} else {
  console.error('[build-vercel] ERROR: api/index.js not found!');
  process.exit(1);
}

// 4. Write .vc-config.json for both function paths
const vcConfig = {
  runtime: 'nodejs20.x',
  handler: 'index.js',
  maxDuration: 15,
  launcherType: 'Nodejs',
  shouldAddHelpers: true,
};
fs.writeFileSync(
  path.resolve(funcDir1, '.vc-config.json'),
  JSON.stringify(vcConfig, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.resolve(funcDir2, '.vc-config.json'),
  JSON.stringify(vcConfig, null, 2),
  'utf8'
);

// 5. Write config.json with routing rules
const config = {
  version: 3,
  routes: [
    {
      src: '^/api(?:/(.*))?$',
      dest: '/api',
    },
    {
      handle: 'filesystem',
    },
    {
      src: '^/(.*)$',
      dest: '/index.html',
    },
  ],
};
fs.writeFileSync(
  path.resolve(vercelDir, 'config.json'),
  JSON.stringify(config, null, 2),
  'utf8'
);

console.log('✅ [build-vercel] Successfully generated .vercel/output for Vercel deployment!');
