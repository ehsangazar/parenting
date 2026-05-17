import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../i18n.js';

export function useLocalePath() {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.split('-')[0] ?? 'en') as AppLocale;

  const localePath = (path: string): string =>
    locale === 'en' ? path : `/${locale}${path}`;

  const homeHref = locale === 'en' ? '/' : `/${locale}/home`;

  return { localePath, homeHref, locale };
}
