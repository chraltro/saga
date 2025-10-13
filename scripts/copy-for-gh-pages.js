import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to recursively copy directory
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying build files for GitHub Pages deployment...');

const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

try {
  // Copy index.html from dist to root
  copyFileSync(join(distDir, 'index.html'), join(rootDir, 'index.html'));
  console.log('✓ Copied index.html to root');

  // Copy assets directory from dist to root
  const distAssetsDir = join(distDir, 'assets');
  const rootAssetsDir = join(rootDir, 'assets');

  copyDir(distAssetsDir, rootAssetsDir);
  console.log('✓ Copied assets directory to root');

  console.log('✅ GitHub Pages files ready!');
  console.log('⚠️  Note: Root index.html now has production paths. Run "git restore index.html" to revert for dev.');
} catch (error) {
  console.error('❌ Error copying files:', error);
  process.exit(1);
}
