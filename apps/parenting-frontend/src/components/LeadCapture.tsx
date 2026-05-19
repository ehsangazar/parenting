import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePostHog } from '@posthog/react';

import { uiIcons } from '../lib/iconSemantics.js';
import { Icon } from './icons/index.js';
import { api } from '../lib/api.js';

interface LeadCaptureProps {
  resourceId: string;
  title?: string;
  description?: string;
  ctaText?: string;
  className?: string;
}

export const LeadCapture: React.FC<LeadCaptureProps> = ({
  resourceId,
  title,
  description,
  ctaText,
  className = "",
}) => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const resolvedTitle = title ?? t('leadCapture.defaultTitle');
  const resolvedDescription = description ?? t('leadCapture.defaultDescription');
  const resolvedCta = ctaText ?? t('leadCapture.defaultCta');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;

    setStatus('loading');
    try {
      await api.post('/api/marketing/leads', {
        email: email.trim(),
        resourceId,
        metadata: {
          source: window.location.pathname,
          userAgent: navigator.userAgent,
        },
      });
      posthog.capture('lead_captured', { resource_id: resourceId, source: window.location.pathname });
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error('Lead capture failed:', err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={`py-4 text-center animate-fade-up ${className}`}>
        <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-border bg-surface px-6 py-4 shadow-lg">
          <Icon name={uiIcons.checkOk} className="h-6 w-6 object-contain flex-shrink-0" alt="" />
          <div className="text-left">
            <p className="text-sm font-bold text-primary-fg">{t('leadCapture.guideSent')}</p>
            <p className="text-xs text-text-secondary">{t('leadCapture.guideSentSub')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-2xl ${className}`}>
      {resolvedTitle && <h2 className="mb-3 font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">{resolvedTitle}</h2>}
      {resolvedDescription && <p className="mx-auto mb-7 max-w-2xl text-base leading-relaxed text-text-secondary">{resolvedDescription}</p>}

      <form
        onSubmit={handleSubmit}
        className="rounded-[30px] border-2 border-border bg-surface/95 p-2 shadow-lg backdrop-blur-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name={uiIcons.mail} className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 object-contain flex-shrink-0 opacity-70" alt="" />
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="h-12 w-full rounded-full border-2 border-border bg-surface pl-11 pr-4 text-sm text-text-primary transition-all placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-duo-green inline-flex h-12 min-w-[208px] items-center justify-center gap-2 rounded-full !min-h-12 px-6 text-sm !normal-case !tracking-normal"
          >
            {status === 'loading' ? (
              <Icon name={uiIcons.loader} className="h-4 w-4 animate-spin object-contain" alt="" />
            ) : (
              <>
                {resolvedCta} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain" alt="" />
              </>
            )}
          </button>
        </div>
      </form>

      {status === 'error' && (
        <p className="mt-3 text-xs font-medium text-error animate-shake">
          {t('leadCapture.error')}
        </p>
      )}
    </div>
  );
};
