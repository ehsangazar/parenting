import { clsx } from 'clsx';

import type { AnyIconName } from '../icons/index.js';
import { Icon } from '../icons/index.js';

export type StatPillProps = {
  iconName?: AnyIconName;
  value: number | string;
  label?: string;
  showLabel?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export const StatPill = ({
  iconName,
  value,
  label,
  showLabel = false,
  active = true,
  onClick,
  className,
}: StatPillProps) => {
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {iconName ? (
          <Icon
            name={iconName}
            className={clsx(
              'h-5 w-5 object-contain',
              active ? '' : 'opacity-40 grayscale',
            )}
            alt=""
          />
        ) : null}
      </div>
      <div className="flex flex-col items-start leading-none">
        <span
          className={clsx(
            'font-game text-sm font-bold tabular-nums',
            active ? 'text-text-primary' : 'text-text-tertiary',
          )}
        >
          {value}
        </span>
        {showLabel && label && (
          <span className="font-game mt-0.5 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {label}
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-surface-light/80',
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={clsx('inline-flex items-center gap-2 rounded-xl px-2 py-1', className)}
      title={label}
      aria-label={label}
    >
      {content}
    </div>
  );
};
