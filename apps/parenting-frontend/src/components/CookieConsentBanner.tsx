import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { uiIcons } from '../lib/iconSemantics.js';
import { Icon } from './icons/index.js';

type ConsentState = {
  essential: true;
  analytics: boolean;
};

const CONSENT_KEY = 'cookie_consent';

export const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay so it doesn't jar on first paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const setOffset = () => {
      if (!visible || !bannerRef.current) {
        root.style.setProperty('--raised-cookie-banner-height', '0px');
        return;
      }
      const height = bannerRef.current.getBoundingClientRect().height;
      root.style.setProperty('--raised-cookie-banner-height', `${Math.ceil(height)}px`);
    };

    setOffset();

    let resizeObserver: ResizeObserver | null = null;
    if (visible && bannerRef.current) {
      resizeObserver = new ResizeObserver(() => setOffset());
      resizeObserver.observe(bannerRef.current);
    }

    window.addEventListener('resize', setOffset);
    return () => {
      window.removeEventListener('resize', setOffset);
      resizeObserver?.disconnect();
      root.style.setProperty('--raised-cookie-banner-height', '0px');
    };
  }, [visible, expanded]);

  const save = (consent: ConsentState) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    if (consent.analytics) {
      (window as Window & { __initGTM__?: () => void }).__initGTM__?.();
    }
    setVisible(false);
  };

  const acceptAll = () => save({ essential: true, analytics: true });
  const rejectNonEssential = () => save({ essential: true, analytics: false });
  const savePreferences = () => save({ essential: true, analytics: analyticsEnabled });

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      ref={bannerRef}
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-border-light bg-surface shadow-xl backdrop-blur-lg overflow-hidden">
          {/* Main bar */}
          <div className="flex items-start gap-4 p-4 sm:p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <Icon name={uiIcons.cookie} className="h-5 w-5 object-contain flex-shrink-0" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary text-sm">
                {t('cookieBanner.title')}
              </p>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                {t('cookieBanner.description')}{' '}
                <Link to="/cookies" className="text-brand-blue underline underline-offset-2">
                  {t('cookieBanner.cookiePolicyLink')}
                </Link>
              </p>
            </div>
            <button
              onClick={rejectNonEssential}
              className="flex-shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-light hover:text-text-secondary transition-colors"
              aria-label="Reject non-essential cookies and dismiss"
            >
              <Icon name={uiIcons.close} className="h-4 w-4 flex-shrink-0 object-contain" alt="" />
            </button>
          </div>

          {/* Expandable preferences */}
          {expanded && (
            <div className="border-t border-border-light bg-background px-5 py-4 space-y-3 animate-fade-in">
              {/* Essential */}
              <div className="flex items-center justify-between rounded-xl border border-border-light p-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name={uiIcons.lock} className="h-4 w-4 object-contain" alt="" />
                    {t('cookieBanner.essential')}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {t('cookieBanner.essentialDescription')}
                  </p>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                  <Icon name={uiIcons.check} className="h-3.5 w-3.5 object-contain brightness-0 invert" alt="" />
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between rounded-xl border border-border-light p-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name={uiIcons.layoutDashboard} className="h-4 w-4 object-contain" alt="" />
                    {t('cookieBanner.analytics')}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {t('cookieBanner.analyticsDescription')}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={analyticsEnabled}
                  aria-label="Toggle analytics cookies"
                  onClick={() => setAnalyticsEnabled((v) => !v)}
                  className={`toggle-switch ${analyticsEnabled ? 'bg-primary-500' : 'bg-border-dark'} border-0 p-0 min-h-0`}
                  data-on={analyticsEnabled}
                  style={{ minHeight: 'unset', padding: 0 }}
                >
                  <span className="toggle-switch-thumb" />
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border-light bg-background px-5 py-3">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="btn-duo-ghost inline-flex items-center gap-1 !min-h-9 !rounded-full !px-3 !py-1.5 !text-xs !font-semibold !normal-case !tracking-normal"
            >
              {expanded ? (
                <Icon name={uiIcons.chevronUp} className="h-3 w-3 flex-shrink-0 object-contain" alt="" />
              ) : (
                <Icon name={uiIcons.chevronDown} className="h-3 w-3 flex-shrink-0 object-contain" alt="" />
              )}
              {expanded ? t('cookieBanner.hideOptions') : t('cookieBanner.managePreferences')}
            </button>

            {expanded && (
              <button
                type="button"
                onClick={savePreferences}
                className="btn-duo-outline inline-flex !min-h-9 !rounded-full !border-primary-300 !bg-primary-50 !px-4 !py-1.5 !text-xs !font-semibold !normal-case !tracking-normal hover:!bg-primary-100"
              >
                {t('cookieBanner.savePreferences')}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="btn-duo-ghost inline-flex !min-h-9 !rounded-full !px-4 !py-1.5 !text-xs !font-semibold !normal-case !tracking-normal"
              >
                {t('cookieBanner.essentialOnly')}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="btn-duo-green inline-flex !min-h-9 !rounded-full !px-4 !py-1.5 !text-xs"
              >
                {t('cookieBanner.acceptAll')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
