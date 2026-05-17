import fs from 'node:fs';
import path from 'node:path';
import {
  buildSitemapXml,
  DEFAULT_API_URL,
  PRODUCTION_SITE_BASE,
} from './sitemap-core.mjs';

/**
 * Load `.env` from cwd so `npm run build` sees VITE_API_URL (Vite inlines env for the
 * client bundle, but this Node step does not inherit Vite's loader).
 */
function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFromFile();

/**
 * Public site origin is not the API host: raised.info serves only the SPA (no /api proxy).
 * Never fall back to PRODUCTION_SITE_BASE for article fetches.
 */
const API_BASE_URL = process.env.VITE_API_URL || DEFAULT_API_URL;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const OUTPUT_PATH = path.join(DIST_DIR, 'sitemap.xml');

const generateSitemap = async () => {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ directory not found. Run the Vite build before generating the sitemap.');
  }

  const xml = await buildSitemapXml({
    siteBaseUrl: PRODUCTION_SITE_BASE,
    apiBaseUrl: API_BASE_URL,
  });

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  const urlEntries = (xml.match(/<url>/g) || []).length;
  console.log(`Sitemap generated: ${OUTPUT_PATH}`);
  console.log(`Included ${urlEntries} URL entries.`);
};

generateSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exitCode = 1;
});
