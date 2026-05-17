import clsx from 'clsx';
import type { LeaderboardScope } from '../../../types/leaderboard.js';

const TABS: { value: LeaderboardScope; label: string; emoji: string }[] = [
  { value: 'community', label: 'Community', emoji: '🌍' },
  { value: 'village', label: 'Village', emoji: '🏘️' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
];

type LeaderboardScopeTabProps = {
  value: LeaderboardScope;
  onChange: (scope: LeaderboardScope) => void;
};

export const LeaderboardScopeTab = ({ value, onChange }: LeaderboardScopeTabProps) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1">
    {TABS.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={clsx(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
          value === tab.value
            ? 'bg-primary-500 text-text-inverse'
            : 'bg-surface text-text-secondary hover:bg-surface-light',
        )}
      >
        <span>{tab.emoji}</span>
        {tab.label}
      </button>
    ))}
  </div>
);
