import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL, SUPPORTED_LOCALES, type AppLocale } from '../i18n.js';

/**
 * Syncs the active i18next language with the HTML dir/lang attributes
 * and exposes helpers for locale-aware rendering.
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const locale = i18n.language as AppLocale;
  const rtl = isRTL(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    // Switch to Persian font when in RTL mode
    if (rtl) {
      document.documentElement.classList.add('font-persian');
    } else {
      document.documentElement.classList.remove('font-persian');
    }
  }, [locale, rtl]);

  function changeLocale(newLocale: AppLocale) {
    i18n.changeLanguage(newLocale);
  }

  return { locale, rtl, changeLocale, supportedLocales: SUPPORTED_LOCALES };
}
