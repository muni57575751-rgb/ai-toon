const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendDist = path.resolve(root, 'frontend', 'dist');
const outputDir = path.resolve(root, 'output');

console.log('[build-vercel] Preparing production deployment output...');

if (!fs.existsSync(frontendDist)) {
  console.error('[build-vercel] ERROR: frontend/dist not found!');
  process.exit(1);
}

// Ensure the root output directory is clean and populated with frontend build artifacts
fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(frontendDist, outputDir, { recursive: true });
console.log('✅ [build-vercel] Populated root output/ directory from frontend/dist');

// Diagnostic verification step as requested by deployment specification
console.log('--- VERCEL BUILD DIAGNOSTICS ---');
console.log('process.cwd():', process.cwd());
console.log('fs.existsSync("output"):', fs.existsSync('output'));
if (fs.existsSync('output')) {
  console.log('fs.readdirSync("output"):', fs.readdirSync('output'));
}
console.log('Root output path:', outputDir);
console.log('fs.existsSync(outputDir):', fs.existsSync(outputDir));
if (fs.existsSync(outputDir)) {
  console.log('fs.readdirSync(outputDir):', fs.readdirSync(outputDir));
}
console.log('--------------------------------');

console.log('🎉 [build-vercel] Root output/ directory verified and ready for Vercel deployment.');
