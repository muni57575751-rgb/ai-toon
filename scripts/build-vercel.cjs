const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendDist = path.resolve(root, 'frontend', 'dist');

console.log('[build-vercel] Preparing production deployment outputs...');

if (!fs.existsSync(frontendDist)) {
  console.error('[build-vercel] ERROR: frontend/dist not found!');
  process.exit(1);
}

// 1. Output to root output/ (Matches Vercel outputDirectory: "output")
const outputDir = path.resolve(root, 'output');
fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(frontendDist, outputDir, { recursive: true });
console.log('✅ [build-vercel] Populated root output/ directory');

// 2. Output to root dist/ (Matches Vercel default "dist" if selected)
const distDir = path.resolve(root, 'dist');
fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(frontendDist, distDir, { recursive: true });
console.log('✅ [build-vercel] Populated root dist/ directory');

// 3. Output to .vercel/output for Build Output API v3 compatibility
const vercelDir = path.resolve(root, '.vercel', 'output');
const staticDir = path.resolve(vercelDir, 'static');
const functionsDir = path.resolve(vercelDir, 'functions');

fs.rmSync(vercelDir, { recursive: true, force: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(functionsDir, { recursive: true });

fs.cpSync(frontendDist, staticDir, { recursive: true });
console.log('✅ [build-vercel] Populated .vercel/output/static');

const apiBundle = path.resolve(root, 'api', 'index.js');
if (fs.existsSync(apiBundle)) {
  const funcApiDir = path.resolve(functionsDir, 'api.func');
  const vcConfig = {
    runtime: 'nodejs20.x',
    handler: 'index.js',
    maxDuration: 60,
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
  };

  fs.mkdirSync(funcApiDir, { recursive: true });
  fs.copyFileSync(apiBundle, path.resolve(funcApiDir, 'index.js'));
  fs.writeFileSync(
    path.resolve(funcApiDir, '.vc-config.json'),
    JSON.stringify(vcConfig, null, 2),
    'utf8'
  );
  console.log('✅ [build-vercel] Deployed standalone bundle to .vercel/output/functions/api.func');
}

const config = {
  version: 3,
  routes: [
    {
      handle: 'filesystem',
    },
    {
      src: '^/health$',
      dest: '/api',
    },
    {
      src: '^/api(?:/.*)?$',
      dest: '/api',
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

console.log('🎉 [build-vercel] All output directories (output/, dist/, frontend/dist, .vercel/output) prepared successfully!');
