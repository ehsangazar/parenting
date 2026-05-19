import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { uiIcons } from '../lib/iconSemantics.js';
import { Icon } from './icons/index.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HIDE_FOREVER_KEY = 'raised_install_banner_hide_forever';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function getBrowserName() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('samsungbrowser')) return 'Samsung Internet';
  if (ua.includes('firefox') || ua.includes('fxios')) return 'Firefox';
  if (ua.includes('crios') || ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  return 'your browser';
}

function isIOSSafari() {
  const ua = navigator.userAgent.toLowerCase();
  return isIOS() && ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios') && !ua.includes('opios');
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const InstallBanner = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const browserName = getBrowserName();
  const iosSafari = isIOSSafari();

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (!isMobileDevice()) return;
    if (localStorage.getItem(HIDE_FOREVER_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS()) setShowIOS(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
  };

  const hideForever = () => {
    localStorage.setItem(HIDE_FOREVER_KEY, '1');
    dismiss();
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setDeferredPrompt(null); setShowAndroid(false); }
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div
      className="fixed left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 top-[calc(env(safe-area-inset-top)+8px)] lg:top-auto lg:bottom-[calc(24px+var(--raised-cookie-banner-height,0px)+8px)]"
      role="banner"
      aria-label="Install Raised app"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-xl animate-slide-up">
        <div className="h-1 w-full bg-primary-400" />
        <div className="flex items-start gap-3 p-4">
          <img src="/logo.jpg" alt="Raised" className="h-12 w-12 flex-shrink-0 rounded-xl object-contain shadow-sm" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary leading-tight">{t('installBanner.title')}</p>

            {showAndroid && (
              <>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {t('installBanner.androidDescription', { browser: browserName })}
                </p>
                <p className="mt-0.5 text-[11px] text-text-tertiary">
                  {t('installBanner.androidMenuHint')}
                </p>
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  className="btn-duo-green mt-2.5 inline-flex items-center gap-1.5 !min-h-9 !rounded-full !px-4 !py-1.5 !text-xs"
                >
                  <Icon name={uiIcons.download} className="h-3.5 w-3.5 object-contain" alt="" /> {t('installBanner.installButton')}
                </button>
              </>
            )}

            {showIOS && (
              <>
                {iosSafari ? (
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {t('installBanner.iosSafariInstructions')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {t('installBanner.iosOtherInstructions', { browser: browserName })}
                  </p>
                )}
              </>
            )}
          </div>

          <button onClick={dismiss} aria-label="Dismiss"
            className="flex-shrink-0 rounded-full p-1.5 text-text-tertiary hover:bg-surface-warm hover:text-text-secondary transition-colors">
            <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <button
            onClick={hideForever}
            className="inline-flex text-[11px] font-semibold text-text-tertiary underline underline-offset-2 hover:text-text-secondary transition-colors"
          >
            {t('installBanner.dontShowAgain')}
          </button>
        </div>
      </div>
    </div>
  );
};
