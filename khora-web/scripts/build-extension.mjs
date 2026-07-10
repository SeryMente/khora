import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webRoot = path.join(__dirname, '..');
const extensionDir = path.join(webRoot, 'extension', 'harmonia');
const downloadsDir = path.join(webRoot, 'public', 'downloads');
const manifestPath = path.join(extensionDir, 'manifest.json');

// 1. Read version from manifest.json
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found at ${manifestPath}`);
  process.exit(1);
}

const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);
const version = manifest.version;

if (!version) {
  console.error('Version not found in manifest.json');
  process.exit(1);
}

console.log(`Building extension zip for version ${version}...`);

// 2. Clear old harmonia-v*.zip from downloads dir
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const files = fs.readdirSync(downloadsDir);
for (const file of files) {
  if (file.startsWith('harmonia-v') && file.endsWith('.zip')) {
    const oldZipPath = path.join(downloadsDir, file);
    console.log(`Removing old zip: ${file}`);
    fs.unlinkSync(oldZipPath);
  }
}

// 3. Create new zip with "harmonia/" root folder
const zip = new AdmZip();
const newZipName = `harmonia-v${version}.zip`;
const newZipPath = path.join(downloadsDir, newZipName);

// Add local folder recursively, placing it inside 'harmonia' folder in zip
zip.addLocalFolder(extensionDir, 'harmonia');

zip.writeZip(newZipPath);

console.log(`Successfully created ${newZipPath}`);
