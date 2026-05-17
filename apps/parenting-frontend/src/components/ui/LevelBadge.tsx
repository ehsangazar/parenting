import clsx from 'clsx';
type LevelInfo = { level: number; name: string; currentXp: number; nextLevelXp: number | null; progress: number };

type LevelBadgeProps = {
  level: LevelInfo;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showProgress?: boolean;
  className?: string;
};

export const LevelBadge = ({ level, size = 'md', showName = false, showProgress = false, className }: LevelBadgeProps) => {
  const sizeMap = {
    sm: { badge: 'h-6 px-2 text-[11px]', bar: 'h-1', name: 'text-[10px]' },
    md: { badge: 'h-7 px-2.5 text-xs', bar: 'h-1.5', name: 'text-xs' },
    lg: { badge: 'h-9 px-3 text-sm', bar: 'h-2', name: 'text-sm' },
  }[size];

  return (
    <div className={clsx('inline-flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-full border font-black tracking-tight',
          'border-primary-400/30 bg-primary-400/10 text-primary-400',
          sizeMap.badge,
        )}
      >
        <span className="font-black">Lv.{level.level}</span>
        {showName && <span className="font-semibold opacity-80">{level.name}</span>}
      </div>

      {showProgress && level.nextLevelXp !== null && (
        <div className="flex items-center gap-1.5">
          <div className={clsx('flex-1 overflow-hidden rounded-full bg-quest-track', sizeMap.bar)}>
            <div
              className={clsx('h-full rounded-full bg-primary-400 transition-all duration-500', sizeMap.bar)}
              style={{ width: `${level.progress}%` }}
            />
          </div>
          <span className={clsx('tabular-nums text-text-tertiary', sizeMap.name)}>
            {level.currentXp}/{level.nextLevelXp}
          </span>
        </div>
      )}

      {showProgress && level.nextLevelXp === null && (
        <span className={clsx('font-bold text-secondary-400', sizeMap.name)}>Max Level 🏆</span>
      )}
    </div>
  );
};
