import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { Icon } from '../icons/index.js';

type HeartsDisplayProps = {
  hearts: number;
  max?: number;
  msUntilNext?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function formatCountdown(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const HeartsDisplay = ({ hearts, max = 5, msUntilNext, size = 'md', className }: HeartsDisplayProps) => {
  const [remaining, setRemaining] = useState(msUntilNext ?? null);

  useEffect(() => {
    setRemaining(msUntilNext ?? null);
    if (!msUntilNext || msUntilNext <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => (prev !== null && prev > 1000 ? prev - 1000 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [msUntilNext]);

  const iconSize = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }[size];
  const filled = Math.min(hearts, max);

  return (
    <div className={clsx('inline-flex flex-col items-center gap-0.5', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Icon
            key={i}
            name={appAssetIcons.heart}
            className={clsx(
              iconSize,
              'object-contain transition-all duration-300',
              i < filled ? 'opacity-100' : 'opacity-20 grayscale',
            )}
            alt=""
            aria-hidden
          />
        ))}
      </div>
      {hearts < max && remaining !== null && (
        <span className="text-[10px] tabular-nums text-text-tertiary">
          +1 in {formatCountdown(remaining)}
        </span>
      )}
    </div>
  );
};
