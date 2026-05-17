import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe } from '@phosphor-icons/react';
import { SUPPORTED_LOCALES, type AppLocale } from '../i18n.js';
import { useAuth } from '../state/auth.js';
import { profileApi } from '../lib/appApi.js';
import { switchLocalePath } from '../lib/publicRoutes.js';

const LOCALE_META: Record<AppLocale, { flag: string; native: string; short: string }> = {
  en: { flag: '🇬🇧', native: 'English', short: 'EN' },
  fa: { flag: '🇮🇷', native: 'فارسی', short: 'FA' },
};

interface Props {
  /** 'icon' shows only the globe + short code; 'full' shows flag + native name */
  variant?: 'icon' | 'full';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'icon', className = '' }: Props) => {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (i18n.language?.split('-')[0] ?? 'en') as AppLocale;
  const meta = LOCALE_META[current] ?? LOCALE_META.en;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = async (locale: AppLocale) => {
    setOpen(false);
    if (locale === current) return;
    setSaving(true);
    try {
      await i18n.changeLanguage(locale);
      const target = switchLocalePath(location.pathname, locale);
      navigate(target, { replace: true });
      // Persist to profile if authenticated
      if (user) {
        const res = await profileApi.update({ locale });
        setUser({ ...user, ...res.user });
      }
    } catch {
      // Language still changed client-side even if save fails
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Language: ${meta.native}. Click to change.`}
        aria-expanded={open}
        disabled={saving}
        className={`flex items-center gap-1.5 rounded-xl border border-border-light bg-surface px-2.5 py-2 text-xs font-bold text-text-primary transition-colors hover:bg-surface-light disabled:opacity-50 ${open ? 'border-primary-400 bg-surface-light' : ''}`}
      >
        <Globe size={16} weight="bold" className="shrink-0 text-text-secondary" aria-hidden />
        {variant === 'full' ? (
          <>
            <span>{meta.flag}</span>
            <span className="hidden sm:inline">{meta.native}</span>
          </>
        ) : (
          <span className="tabular-nums tracking-widest">{meta.short}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border-light bg-surface shadow-lg"
          style={{ [current === 'fa' ? 'left' : 'right']: 0 }}
        >
          {SUPPORTED_LOCALES.map((locale) => {
            const m = LOCALE_META[locale] ?? { flag: '🌐', native: locale, short: locale.toUpperCase() };
            const isActive = locale === current;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-sm font-semibold transition-colors hover:bg-surface-light ${isActive ? 'bg-primary-50 text-primary-fg' : 'text-text-primary'}`}
              >
                <span className="text-base">{m.flag}</span>
                <span>{m.native}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
