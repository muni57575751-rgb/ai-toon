const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vercelDir = path.resolve(root, '.vercel', 'output');
const staticDir = path.resolve(vercelDir, 'static');
const functionsDir = path.resolve(vercelDir, 'functions');

console.log('[build-vercel] Preparing Vercel Build Output API v3...');

// 1. Clean & create output structure
fs.rmSync(vercelDir, { recursive: true, force: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(functionsDir, { recursive: true });

// 2. Copy static frontend
const frontendDist = path.resolve(root, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  fs.cpSync(frontendDist, staticDir, { recursive: true });
  console.log('[build-vercel] Copied frontend/dist -> .vercel/output/static');
} else {
  console.error('[build-vercel] ERROR: frontend/dist not found!');
  process.exit(1);
}

// 3. Copy bundled api backend to all function targets
const apiBundle = path.resolve(root, 'api', 'index.js');
if (!fs.existsSync(apiBundle)) {
  console.error('[build-vercel] ERROR: api/index.js not found!');
  process.exit(1);
}

const targetFuncDirs = [
  path.resolve(functionsDir, 'api.func'),
  path.resolve(functionsDir, 'api', 'health.func'),
  path.resolve(functionsDir, 'api', '[...path].func'),
  path.resolve(functionsDir, 'api', 'auth.func'),
  path.resolve(functionsDir, 'api', 'auth', '[...path].func'),
  path.resolve(functionsDir, 'api', 'stories.func'),
  path.resolve(functionsDir, 'api', 'stories', '[...path].func'),
  path.resolve(functionsDir, 'api', 'admin.func'),
  path.resolve(functionsDir, 'api', 'admin', '[...path].func'),
  path.resolve(functionsDir, 'api', 'members.func'),
  path.resolve(functionsDir, 'api', 'members', '[...path].func'),
  path.resolve(functionsDir, 'api', 'search.func'),
  path.resolve(functionsDir, 'api', 'index.func'),
];

const vcConfig = {
  runtime: 'nodejs20.x',
  handler: 'index.js',
  maxDuration: 15,
  launcherType: 'Nodejs',
  shouldAddHelpers: true,
};

for (const dir of targetFuncDirs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(apiBundle, path.resolve(dir, 'index.js'));
  fs.writeFileSync(
    path.resolve(dir, '.vc-config.json'),
    JSON.stringify(vcConfig, null, 2),
    'utf8'
  );
}
console.log(`[build-vercel] Deployed standalone bundle across ${targetFuncDirs.length} function endpoints`);

// 4. Write config.json with routing rules
const config = {
  version: 3,
  routes: [
    {
      handle: 'filesystem',
    },
    {
      src: '^/api/?$',
      dest: '/api',
    },
    {
      src: '^/api/(.*)$',
      dest: '/api?__url=/api/$1',
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
