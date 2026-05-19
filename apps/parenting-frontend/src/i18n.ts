import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fa from './locales/fa.json';

export const SUPPORTED_LOCALES = ['en', 'fa'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const RTL_LOCALES: AppLocale[] = ['fa'];

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale as AppLocale);
}

// eslint-disable-next-line import/no-named-as-default-member -- .use is a method on the i18n instance, not the named `use` export
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    // Strip region subtags: "fa-IR" → "fa", "en-GB" → "en"
    load: 'languageOnly',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // Order: localStorage → navigator language → default
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // Strip region from detected language code
      convertDetectedLanguage: (lng: string) => lng.split('-')[0],
    },
  });

export default i18n;
