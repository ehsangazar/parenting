import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

/**
 * Wraps a feature page (Insights, Academy, Settings) so it has a consistent
 * header inside the ChatShell with a back-to-chat affordance.
 */
export const FeaturePageFrame = ({ title, children }: { title: string; children: ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t('chatShell.backToChat', 'Back to chat')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
        >
          <Icon name={uiIcons.chevronLeft} className="h-5 w-5 object-contain" alt="" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};
