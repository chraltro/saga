import { copyFileSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync, unlinkSync } from 'fs';
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
  // Copy index.html from dist to root and inject Firebase SDK
  let indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

  // Inject Firebase SDK after the <!-- Firebase SDK --> comment
  const firebaseScript = `<script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
    import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
    import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

    window.__firebaseImports = {
      initializeApp,
      getAuth,
      GoogleAuthProvider,
      signInWithPopup,
      getFirestore,
      doc,
      getDoc,
      setDoc
    };
  </script>`;

  indexHtml = indexHtml.replace('  <!-- Firebase SDK -->', `  <!-- Firebase SDK -->\n${firebaseScript}`);
  writeFileSync(join(rootDir, 'index.html'), indexHtml);
  console.log('✓ Copied index.html to root with Firebase SDK');

  // Copy assets directory from dist to root (clean first to remove old builds)
  const distAssetsDir = join(distDir, 'assets');
  const rootAssetsDir = join(rootDir, 'assets');

  // Clean old assets
  if (existsSync(rootAssetsDir)) {
    const oldAssets = readdirSync(rootAssetsDir);
    for (const file of oldAssets) {
      const filePath = join(rootAssetsDir, file);
      if (statSync(filePath).isFile()) {
        unlinkSync(filePath);
      }
    }
  }

  copyDir(distAssetsDir, rootAssetsDir);
  console.log('✓ Copied assets directory to root (old assets cleaned)');

  // Copy shared directory from dist to root (Firebase files, etc.)
  const distSharedDir = join(distDir, 'shared');
  const rootSharedDir = join(rootDir, 'shared');

  if (existsSync(distSharedDir)) {
    copyDir(distSharedDir, rootSharedDir);
    console.log('✓ Copied shared directory to root');
  }

  console.log('✅ GitHub Pages files ready!');
  console.log('⚠️  Note: Root index.html now has production paths. Run "git restore index.html" to revert for dev.');
} catch (error) {
  console.error('❌ Error copying files:', error);
  process.exit(1);
}
