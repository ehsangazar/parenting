import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../i18n.js';

/**
 * Legacy `/app/...` paths map to the chat-first routes. Kept pages still
 * call `toApp('/app/learning/...')` etc.; this lets them keep working without
 * a sweep of every usage site.
 */
function mapLegacyAppPath(path: string): string {
  if (!path.startsWith('/app')) return path;
  if (path === '/app/settings') return '/settings';
  if (path === '/app/family' || path === '/app/community') return '/settings';
  return '/';
}

export function useAppBase() {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.split('-')[0] ?? 'en') as AppLocale;

  const appBase = locale === 'en' ? '/' : `/${locale}`;

  const toApp = (path: string): string => {
    const mapped = mapLegacyAppPath(path);
    if (locale === 'en') return mapped;
    return mapped === '/' ? `/${locale}` : `/${locale}${mapped}`;
  };

  return { appBase, toApp, locale };
}
