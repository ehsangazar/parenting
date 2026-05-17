import clsx from 'clsx';

export type ProgressBarProps = {
  value: number;
  max?: number;
  current?: number;
  color?: 'green' | 'yellow' | 'blue' | 'quest';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  /** Adds a moving light sweep to make in-progress bars feel alive. */
  animated?: boolean;
  className?: string;
};

const fillColor: Record<NonNullable<ProgressBarProps['color']>, string> = {
  green: '!bg-primary-400',
  yellow: '!bg-secondary-400',
  blue: '!bg-brand-blue',
  quest: '!bg-quest-fill',
};

export const ProgressBar = ({
  value,
  max,
  current,
  color = 'green',
  showLabel,
  size = 'md',
  animated = false,
  className,
}: ProgressBarProps) => {
  const pct = Math.min(100, Math.max(0, value));
  const label =
    showLabel && current !== undefined && max !== undefined ? `${current} / ${max}` : null;
  const isActive = animated && pct > 0 && pct < 100;

  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('duo-progress-track', size === 'sm' && '!h-2')}>
        <div
          className={clsx('duo-progress-fill', fillColor[color], isActive && 'duo-progress-fill--active')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && (
        <p className="mt-1 text-xs font-semibold text-text-tertiary">{label}</p>
      )}
    </div>
  );
};
