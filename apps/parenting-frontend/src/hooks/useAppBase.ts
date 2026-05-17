import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../i18n.js';

export function useAppBase() {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.split('-')[0] ?? 'en') as AppLocale;

  const appBase = locale === 'en' ? '/app' : `/${locale}/app`;

  const toApp = (path: string): string =>
    locale === 'en' ? path : `/${locale}${path}`;

  return { appBase, toApp, locale };
}
