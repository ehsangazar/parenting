import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { uiIcons } from '../lib/iconSemantics.js';
import { Icon } from './icons/index.js';
import { useAuth } from '../state/auth.js';
import {
  shouldShowPushPrompt,
  markPromptDismissed,
  requestPushOptIn,
} from '../lib/pushPromptState.js';

type Context = 'calendar';

interface Props {
  context: Context;
  className?: string;
}

/**
 * Inline contextual nudge to enable push, sized to slot into an existing
 * feature page (e.g. above the Calendar upcoming list). Shares eligibility
 * + cooldown rules with the global banner so dismissing one dismisses both.
 */
export const PushPromoCard = ({ context, className }: Props) => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setVisible(user ? shouldShowPushPrompt(user.profile) : false);
  }, [user]);

  if (!visible) return null;

  const handleDismiss = () => {
    markPromptDismissed();
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

  const bodyKey: Record<Context, string> = {
    calendar: 'pushPrompt.calendarBody',
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-primary-200/70 bg-primary-50 px-4 py-3${className ? ` ${className}` : ''}`}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-fg">
        <Icon name={uiIcons.bell} className="h-5 w-5 object-contain" alt="" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-text-primary leading-tight">
          {t('pushPrompt.calendarTitle')}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
          {t(bodyKey[context])}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={working}
            className="btn-duo-green inline-flex items-center gap-1.5 !min-h-9 !rounded-full !px-3 !py-1 !text-[12px] disabled:opacity-60"
          >
            {working ? t('pushPrompt.enabling') : t('pushPrompt.enable')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={working}
            className="inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-semibold text-text-secondary hover:bg-surface transition-colors"
          >
            {t('pushPrompt.notNow')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('pushPrompt.dismissAriaLabel')}
        className="flex-shrink-0 rounded-full p-1.5 text-text-tertiary hover:bg-surface hover:text-text-secondary transition-colors"
      >
        <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
      </button>
    </div>
  );
};
