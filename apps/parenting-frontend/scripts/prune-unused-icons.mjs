/**
 * Finds icon keys in iconMap.ts that never appear as a quoted string in src/
 * (excluding iconMap.ts). Prints count and optionally deletes matching SVGs.
 * Run: node scripts/prune-unused-icons.mjs --delete
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'src/components/icons/iconMap.ts');
const SRC = path.join(ROOT, 'src');
const SCRIPTS = path.join(ROOT, 'scripts');
const ASSETS = path.join(ROOT, 'src/components/icons/assets');

function walkTsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkTsFiles(p, acc);
    else if (/\.(tsx?|jsx?|mdx)$/.test(e.name) && !p.endsWith('iconMap.ts')) acc.push(p);
  }
  return acc;
}

function walkScripts(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkScripts(p, acc);
    else if (/\.mjs$/.test(e.name) && !p.includes('prune-unused-icons')) acc.push(p);
  }
  return acc;
}

const mapContent = fs.readFileSync(MAP_PATH, 'utf8');
const keys = [...mapContent.matchAll(/  '([^']+)':/g)].map((m) => m[1]);
const files = [...walkTsFiles(SRC), ...walkScripts(SCRIPTS)];
/** Full file contents for scanning (iconMap excluded). */
const blob = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const unused = [];
for (const key of keys) {
  const q1 = `'${key}'`;
  const q2 = `"${key}"`;
  if (!blob.includes(q1) && !blob.includes(q2)) {
    unused.push(key);
  }
}

console.log(`Total icon keys: ${keys.length}`);
console.log(`Unused (no quoted icon key in src): ${unused.length}`);

const doDelete = process.argv.includes('--delete');
if (doDelete && unused.length > 0) {
  let deleted = 0;
  for (const key of unused) {
    const file = path.join(ASSETS, `${key}.svg`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      deleted++;
    }
  }
  console.log(`Deleted ${deleted} SVG files. Run: node scripts/generate-icon-map.mjs`);
} else if (unused.length > 0) {
  console.log('Sample unused keys:', unused.slice(0, 15).join(', '));
}
