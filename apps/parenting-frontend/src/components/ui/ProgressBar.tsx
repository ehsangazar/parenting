import { clsx } from 'clsx';
import { RoughProgress } from '../rough/index.js';

export type ProgressBarProps = {
  value: number;
  max?: number;
  current?: number;
  color?: 'green' | 'yellow' | 'blue' | 'quest';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  /** Kept for API compat; rough progress doesn't animate the fill. */
  animated?: boolean;
  className?: string;
};

const COLOR_HEX: Record<NonNullable<ProgressBarProps['color']>, string> = {
  green: '#2F7D6A',
  yellow: '#D87749',
  blue: '#4A8AB4',
  quest: '#2F7D6A',
};

export const ProgressBar = ({
  value,
  max,
  current,
  color = 'green',
  showLabel,
  size = 'md',
  className,
}: ProgressBarProps) => {
  const pct = Math.min(100, Math.max(0, value));
  const label =
    showLabel && current !== undefined && max !== undefined ? `${current} / ${max}` : null;

  return (
    <div className={clsx('w-full', className)}>
      <RoughProgress
        value={pct}
        color={COLOR_HEX[color]}
        height={size === 'sm' ? 10 : 14}
        seedKey={`${color}-${size}`}
      />
      {label && (
        <p className="mt-1 text-xs font-semibold text-text-tertiary">{label}</p>
      )}
    </div>
  );
};
