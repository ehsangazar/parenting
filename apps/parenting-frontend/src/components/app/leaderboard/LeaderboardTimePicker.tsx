import clsx from 'clsx';
import type { LeaderboardPeriod } from '../../../types/leaderboard.js';

const OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'alltime', label: 'All Time' },
];

type LeaderboardTimePickerProps = {
  value: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
};

export const LeaderboardTimePicker = ({ value, onChange }: LeaderboardTimePickerProps) => (
  <div className="inline-flex rounded-xl border border-[#E0E7FF] bg-surface-light p-0.5">
    {OPTIONS.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
          value === opt.value
            ? 'bg-surface text-white shadow-sm'
            : 'text-text-tertiary hover:text-text-secondary',
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
