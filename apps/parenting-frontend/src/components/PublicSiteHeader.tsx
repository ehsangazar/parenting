import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogoBrand } from './ui/LogoBrand.js';
import { Icon } from './icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';

/** Sticky marketing header: matches the home page (logo, nav, language, mobile drawer, auth CTAs). */
export const PublicSiteHeader = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localePath, homeHref } = useLocalePath();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border-light bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <LogoBrand href={homeHref} tagline={t('common.taglineScience')} size="hero" className="max-w-[min(100%,calc(100vw-11rem))] sm:max-w-none" />

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Primary">
            {([
              { to: localePath('/features'), label: t('home.nav.features') },
              { to: localePath('/about'), label: t('home.nav.about') },
              { to: localePath('/articles'), label: t('home.nav.articles') },
              { to: localePath('/mission'), label: t('home.nav.mission') },
            ] as const).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative py-1 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-primary-700 after:transition-transform ${
                    isActive
                      ? 'text-text-primary font-semibold after:scale-x-100'
                      : 'text-text-secondary after:scale-x-0 hover:text-text-primary hover:after:scale-x-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-light text-text-secondary transition-colors hover:border-primary-200 hover:text-text-primary md:hidden"
              aria-expanded={menuOpen}
              aria-controls="public-site-mobile-nav"
              aria-label={menuOpen ? t('home.nav.closeMenu') : t('home.nav.openMenu')}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <Icon name={uiIcons.close} className="h-5 w-5 object-contain" alt="" />
              ) : (
                <Icon name={uiIcons.menu} className="h-5 w-5 object-contain" alt="" />
              )}
            </button>
            <LanguageSwitcher className="hidden md:block" />
            <button type="button" onClick={() => navigate(localePath('/login'))} className="btn-duo-outline-pill hidden md:inline-flex">
              {t('home.nav.signIn')}
            </button>
            <button type="button" onClick={() => navigate(localePath('/register'))} className="btn-duo-green-pill">
              {t('home.nav.getStarted')} <Icon name={uiIcons.arrowRight} className="h-3.5 w-3.5 object-contain inline" alt="" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm md:hidden"
            aria-label={t('home.nav.closeMenu')}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="public-site-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed right-0 top-0 z-[110] flex h-full w-[min(100%,22rem)] flex-col gap-1 border-l border-border-light bg-surface py-6 pl-6 pr-6 shadow-xl md:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <LogoBrand href={homeHref} tagline={t('common.taglineScience')} size="hero" className="min-w-0 flex-1 pr-2" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-light text-text-secondary transition-colors hover:text-text-primary"
                aria-label={t('home.nav.closeMenu')}
              >
                <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
              </button>
            </div>

            {([
              { to: localePath('/features'), label: t('home.nav.features') },
              { to: localePath('/about'), label: t('home.nav.about') },
              { to: localePath('/articles'), label: t('home.nav.articles') },
              { to: localePath('/mission'), label: t('home.nav.mission') },
            ] as const).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-50 font-semibold text-primary-fg'
                      : 'font-medium text-text-secondary hover:bg-surface-light hover:text-text-primary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="mt-4 space-y-2 border-t border-border-light pt-4">
              <LanguageSwitcher variant="full" className="w-full" />
              <button
                type="button"
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-light hover:text-text-primary"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(localePath('/login'));
                }}
              >
                {t('home.nav.signIn')}
              </button>
              <button
                type="button"
                className="btn-duo-green-pill w-full"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(localePath('/register'));
                }}
              >
                {t('home.nav.getStarted')} <Icon name={uiIcons.arrowRight} className="h-3.5 w-3.5 object-contain inline" alt="" />
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
};
