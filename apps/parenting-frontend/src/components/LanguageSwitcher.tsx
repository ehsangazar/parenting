import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { SUPPORTED_LOCALES, type AppLocale } from '../i18n.js';
import { useAuth } from '../state/auth.js';
import { profileApi } from '../lib/appApi.js';
import { switchLocalePath } from '../lib/publicRoutes.js';

const LOCALE_META: Record<AppLocale, { flag: string; native: string; short: string }> = {
  en: { flag: '🇬🇧', native: 'English', short: 'EN' },
  fa: { flag: '🇮🇷', native: 'فارسی', short: 'FA' },
};

interface Props {
  /** 'icon' renders compact flag+short pills; 'full' renders flag+native name pills. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Inline language selector. Renders one button per supported locale so all
 * choices are always visible — no dropdown click-to-open that can be missed
 * or get clipped by overflow ancestors.
 */
export const LanguageSwitcher = ({ variant = 'full', className = '' }: Props) => {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState<AppLocale | null>(null);

  const current = (i18n.language?.split('-')[0] ?? 'en') as AppLocale;

  const handleSelect = async (locale: AppLocale) => {
    if (locale === current || saving) return;
    setSaving(locale);
    try {
      await i18n.changeLanguage(locale);
      const target = switchLocalePath(location.pathname, locale);
      navigate(target, { replace: true });
      if (user) {
        const res = await profileApi.update({ locale });
        setUser({ ...user, ...res.user });
      }
    } catch {
      // Language switched client-side even if profile save fails.
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={className}>
      <p className="mb-1.5 px-1 text-[12px] font-bold uppercase tracking-wider text-text-secondary">
        {t('settings.language', 'Language')}
      </p>
      <div data-rough-skip="true" className="flex gap-1 rounded-xl border border-border bg-surface-light p-1">
        {SUPPORTED_LOCALES.map((locale) => {
          const meta = LOCALE_META[locale] ?? { flag: '🌐', native: locale, short: locale.toUpperCase() };
          const isActive = locale === current;
          const isSaving = saving === locale;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              aria-pressed={isActive}
              disabled={isSaving}
              data-rough-skip="true"
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-bold transition-all min-h-[36px]',
                isActive
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <span aria-hidden="true">{meta.flag}</span>
              <span>{variant === 'full' ? meta.native : meta.short}</span>
              {isSaving && (
                <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-text-secondary/40 border-t-text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
