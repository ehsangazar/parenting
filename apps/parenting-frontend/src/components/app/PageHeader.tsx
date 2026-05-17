import React from 'react';

import { Icon, type IconName } from '../icons/index.js';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Override icon visibility. When omitted, icon shows if `iconName` is set. */
  showIcon?: boolean;
  /** Raster asset from `src/components/icons/assets`. */
  iconName?: IconName;
  children?: React.ReactNode;
  className?: string;
};

export const PageHeader = ({
  title,
  subtitle,
  showIcon: showIconProp,
  iconName,
  children,
  className = '',
}: PageHeaderProps) => {
  const showLeading = showIconProp !== undefined ? showIconProp : Boolean(iconName);

  return (
    <header className={`mb-6 flex flex-row flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {showLeading && iconName && (
          <div className="mt-1 shrink-0">
            <Icon name={iconName} className="h-8 w-8 object-contain sm:h-10 sm:w-10" alt="" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm font-medium text-text-secondary sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center">{children}</div>}
    </header>
  );
};
