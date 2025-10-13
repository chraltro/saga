import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const templateFile = join(rootDir, 'index.template.html');
const indexFile = join(rootDir, 'index.html');

console.log('🔧 Setting up development environment...');

if (!existsSync(indexFile) || process.argv.includes('--force')) {
  copyFileSync(templateFile, indexFile);
  console.log('✅ Created index.html from template for development');
} else {
  console.log('ℹ️  index.html already exists (use --force to overwrite)');
}

console.log('✅ Development setup complete! Run "npm run dev" to start.');
