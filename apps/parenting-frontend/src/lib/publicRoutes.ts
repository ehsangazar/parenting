/** Paths where we skip the branded splash and do not treat as "deep" app routes for lastPath. */
const MARKETING_PATH_EXACT = new Set([
  '/welcome',
  '/home',
  '/login',
  '/register',
  '/survey',
  '/privacy',
  '/terms',
  '/cookies',
  '/safeguarding',
  '/mission',
  '/about',
  '/features',
]);

/** Strip a supported locale prefix (e.g. /fa/about → /about, /en/home → /home). */
const LOCALE_PREFIX_RE = /^\/(en|fa)(?=\/|$)/;

function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, '') || '/';
}

export function isPublicMarketingPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (MARKETING_PATH_EXACT.has(path)) return true;
  if (path === '/articles' || path.startsWith('/articles/')) return true;
  return false;
}

/** Strip the locale segment from a pathname and return bare path + new locale prefix. */
export function switchLocalePath(pathname: string, newLocale: string): string {
  const bare = stripLocalePrefix(pathname);
  // '/' is the English home root; there is no '/:lang/' route, so map it to '/home'.
  const normalized = bare === '/' ? '/home' : bare;
  if (newLocale === 'en') return normalized;
  return `/${newLocale}${normalized}`;
}
