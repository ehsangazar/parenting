import clsx from 'clsx';
import { Star, Fire, GraduationCap, Users, type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { LeaderboardMetric } from '../../../types/leaderboard.js';

const OPTIONS: {
  value: LeaderboardMetric;
  labelKey: string;
  Icon: PhosphorIcon;
  color: string;
  activeColor: string;
}[] = [
  { value: 'xp', labelKey: 'leaderboardMetric.xp', Icon: Star, color: 'text-text-tertiary', activeColor: 'text-gamification-xp' },
  { value: 'streak', labelKey: 'leaderboardMetric.streak', Icon: Fire, color: 'text-text-tertiary', activeColor: 'text-gamification-streak' },
  { value: 'learning', labelKey: 'leaderboardMetric.learning', Icon: GraduationCap, color: 'text-text-tertiary', activeColor: 'text-[#7B8FFF]' },
  { value: 'community', labelKey: 'leaderboardMetric.community', Icon: Users, color: 'text-text-tertiary', activeColor: 'text-[#C084FC]' },
];

type LeaderboardMetricSelectorProps = {
  value: LeaderboardMetric;
  onChange: (metric: LeaderboardMetric) => void;
  disabledMetrics?: LeaderboardMetric[];
};

export const LeaderboardMetricSelector = ({
  value,
  onChange,
  disabledMetrics = [],
}: LeaderboardMetricSelectorProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        const isDisabled = disabledMetrics.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => !isDisabled && onChange(opt.value)}
            disabled={isDisabled}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors',
              isActive
                ? clsx('bg-surface ring-1 ring-[#E0E7FF]', opt.activeColor)
                : 'bg-surface text-text-secondary hover:bg-surface-light',
              isDisabled && 'cursor-not-allowed opacity-40',
            )}
          >
            <opt.Icon size={12} weight={isActive ? 'fill' : 'regular'} className={isActive ? opt.activeColor : opt.color} />
            {t(opt.labelKey)}
            {isActive && (
              <span className={clsx('h-1.5 w-1.5 rounded-full', {
                'bg-gamification-xp': opt.value === 'xp',
                'bg-gamification-streak': opt.value === 'streak',
                'bg-[#7B8FFF]': opt.value === 'learning',
                'bg-[#C084FC]': opt.value === 'community',
              })} />
            )}
          </button>
        );
      })}
    </div>
  );
};
