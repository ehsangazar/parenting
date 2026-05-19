import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

/**
 * Wraps a feature page so it has a consistent page header (back-to-chat,
 * title, optional description, optional action buttons). Pages should not
 * render their own H1 inside; the frame owns page identity.
 */
export const FeaturePageFrame = ({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t('chatShell.backToChat', 'Back to chat')}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
        >
          <Icon name={uiIcons.chevronLeft} className="h-5 w-5 object-contain" alt="" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold leading-tight text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-[13px] text-text-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};
