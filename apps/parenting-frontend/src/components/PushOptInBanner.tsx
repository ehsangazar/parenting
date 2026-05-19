import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { uiIcons } from '../lib/iconSemantics.js';
import { Icon } from './icons/index.js';
import { useAuth } from '../state/auth.js';
import {
  shouldShowPushPrompt,
  markPromptDismissed,
  markPromptHideForever,
  requestPushOptIn,
} from '../lib/pushPromptState.js';

const FIRST_VISIT_DELAY_MS = 25_000;

/**
 * Floating bottom banner that nudges logged-in users to enable push.
 * Visible only when push is supported, not already granted/denied, the user
 * hasn't dismissed it within the cooldown, and they don't already have push
 * preferences on. Defers showing for ~25s on first paint so it doesn't get
 * lost in the splash + initial chat.
 */
export const PushOptInBanner = () => {
  const { t } = useTranslation();
  const { token, user, setUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setVisible(false);
      return;
    }
    if (!shouldShowPushPrompt(user.profile)) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      // Re-check at the deferred moment in case auth state changed.
      if (shouldShowPushPrompt(user.profile)) setVisible(true);
    }, FIRST_VISIT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [token, user]);

  if (!visible) return null;

  const handleDismiss = () => {
    markPromptDismissed();
    setVisible(false);
  };

  const handleHideForever = () => {
    markPromptHideForever();
    setVisible(false);
  };

  const handleEnable = async () => {
    if (working) return;
    setWorking(true);
    try {
      const result = await requestPushOptIn(user?.profile);
      if (!result.ok) {
        if (result.reason === 'permission_denied') {
          toast.error(t('pushPrompt.permissionDenied'));
        } else if (result.reason === 'not_configured') {
          toast.error(t('pushPrompt.notConfigured'));
        } else if (result.reason === 'unsupported') {
          toast.error(t('pushPrompt.unsupported'));
        } else {
          toast.error(t('pushPrompt.genericError'));
        }
        return;
      }
      if (result.updatedUser) {
        setUser(result.updatedUser as Parameters<typeof setUser>[0]);
      }
      toast.success(t('pushPrompt.success'));
      setVisible(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className="fixed left-1/2 z-50 w-[92%] max-w-sm lg:max-w-xl -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+16px+var(--raised-cookie-banner-height,0px))]"
      role="region"
      aria-label={t('pushPrompt.ariaLabel')}
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-xl animate-slide-up">
        <div className="h-1 w-full bg-brand-blue" />
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-fg">
            <Icon name={uiIcons.bell} className="h-5 w-5 object-contain" alt="" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary leading-tight">
              {t('pushPrompt.title')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {t('pushPrompt.body')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={working}
                className="btn-duo-green inline-flex items-center gap-1.5 !min-h-9 !rounded-full !px-4 !py-1.5 !text-xs disabled:opacity-60"
              >
                {working ? t('pushPrompt.enabling') : t('pushPrompt.enable')}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={working}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold text-text-secondary hover:bg-surface-warm transition-colors"
              >
                {t('pushPrompt.notNow')}
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label={t('pushPrompt.dismissAriaLabel')}
            className="flex-shrink-0 rounded-full p-1.5 text-text-tertiary hover:bg-surface-warm hover:text-text-secondary transition-colors"
          >
            <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <button
            onClick={handleHideForever}
            className="inline-flex text-[11px] font-semibold text-text-tertiary underline underline-offset-2 hover:text-text-secondary transition-colors"
          >
            {t('pushPrompt.dontShowAgain')}
          </button>
        </div>
      </div>
    </div>
  );
};
