import clsx from 'clsx';

import type { IconName } from '../icons/index.js';
import { Icon } from '../icons/index.js';

import { ActionLink } from './ActionLink.js';

export type SectionHeaderProps = {
  title: string;
  action?: { label: string; to?: string; onClick?: () => void };
  iconName?: IconName;
  className?: string;
};

export const SectionHeader = ({ title, action, iconName, className }: SectionHeaderProps) => {
  return (
    <div className={clsx('mb-4 flex items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {iconName && (
          <Icon name={iconName} className="h-5 w-5 shrink-0 object-contain opacity-90" alt="" />
        )}
        <h2 className="font-heading truncate text-sm font-bold uppercase tracking-wider text-text-primary">
          {title}
        </h2>
      </div>
      {action && (
        <ActionLink to={action.to} onClick={action.onClick} className="shrink-0">
          {action.label}
        </ActionLink>
      )}
    </div>
  );
};
