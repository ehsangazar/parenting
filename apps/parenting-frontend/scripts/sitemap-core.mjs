/** Same default as `src/lib/api.ts` when VITE_API_URL is unset. */
export const DEFAULT_API_URL = 'http://localhost:4000';

/** Canonical public origin used in production builds. */
export const PRODUCTION_SITE_BASE = 'https://raised.info';

const PAGE_SIZE = 100;

const staticRoutes = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/home', changefreq: 'monthly', priority: 0.9 },
  { path: '/mission', changefreq: 'monthly', priority: 0.8 },
  { path: '/articles', changefreq: 'weekly', priority: 0.9 },
  { path: '/survey', changefreq: 'yearly', priority: 0.5 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },
  { path: '/cookies', changefreq: 'yearly', priority: 0.3 },
  { path: '/safeguarding', changefreq: 'yearly', priority: 0.3 },
];

const normalizeBase = (url) => url.replace(/\/+$/, '');

const xmlEscape = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const formatLastmod = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const fetchArticlePage = async (apiBaseUrl, offset) => {
  const url = new URL('/api/articles/public', normalizeBase(apiBaseUrl));
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch articles (${response.status}) from ${url.toString()}`);
  }
  return response.json();
};

const fetchAllArticles = async (apiBaseUrl) => {
  const articles = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const data = await fetchArticlePage(apiBaseUrl, offset);
    const pageArticles = Array.isArray(data?.articles) ? data.articles : [];
    total = Number.isFinite(data?.total) ? data.total : offset + pageArticles.length;
    articles.push(...pageArticles);
    offset += PAGE_SIZE;
    if (pageArticles.length === 0) {
      break;
    }
  }

  return articles.filter((article) => article?.slug && article?.published !== false);
};

const buildUrlEntry = ({ loc, changefreq, priority, lastmod }) => {
  const lines = [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
  ];

  if (lastmod) {
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
  }
  if (changefreq) {
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
  }
  if (priority !== undefined && priority !== null) {
    lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
  }

  lines.push('  </url>');
  return lines.join('\n');
};

/**
 * @param {{ siteBaseUrl: string; apiBaseUrl: string; onArticlesFetchError?: (err: unknown) => void }} opts
 * @returns {Promise<string>}
 */
export async function buildSitemapXml({ siteBaseUrl, apiBaseUrl, onArticlesFetchError }) {
  const base = normalizeBase(siteBaseUrl);
  const entries = [];

  staticRoutes.forEach((route) => {
    entries.push(
      buildUrlEntry({
        loc: `${base}${route.path}`,
        changefreq: route.changefreq,
        priority: route.priority,
      }),
    );
  });

  let articles = [];
  try {
    articles = await fetchAllArticles(apiBaseUrl);
  } catch (error) {
    if (onArticlesFetchError) onArticlesFetchError(error);
    else {
      console.warn(
        'Sitemap: could not fetch articles (API unreachable?). Emitting static URLs only.',
        error?.message || error,
      );
    }
  }

  articles.forEach((article) => {
    entries.push(
      buildUrlEntry({
        loc: `${base}/articles/${article.slug}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: formatLastmod(article.updatedAt),
      }),
    );
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>',
    '',
  ].join('\n');
}
