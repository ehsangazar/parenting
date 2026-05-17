import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Avatar } from '../../ui/Avatar.js';
import type { LeaderboardEntry } from '../../../types/leaderboard.js';
import { AVATAR_COLORS } from '../../../lib/leaderboardMock.js';
import { resolveLeaderboardEntryAvatarSrc } from '../../../lib/leaderboardAvatar.js';

type LeaderboardListProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  meSignedAvatarUrl?: string | null;
};


const ChangeIndicator = ({ change }: { change?: LeaderboardEntry['change'] }) => {
  if (change === 'up') return <ArrowUp size={11} weight="bold" className="text-[#52D68C]" />;
  if (change === 'down') return <ArrowDown size={11} weight="bold" className="text-[#FF6B6B]" />;
  if (change === 'new') return <span className="text-xs font-black text-secondary-400">NEW</span>;
  return <Minus size={11} weight="bold" className="text-text-muted" />;
};

export const LeaderboardList = ({ entries, currentUserId, meSignedAvatarUrl }: LeaderboardListProps) => (
  <div className="flex flex-col gap-1.5" role="list" aria-live="polite">
    {entries.map((entry, i) => {
      const rankColor =
        entry.rank <= 3 ? 'text-secondary-400' :
        entry.rank <= 10 ? 'text-text-secondary' :
        'text-text-muted';

      return (
        <motion.div
          key={entry.userId}
          role="listitem"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          className={clsx(
            'flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors',
            entry.isCurrentUser
              ? 'border border-[#52D68C]/20 bg-[#52D68C]/5'
              : 'hover:bg-surface',
          )}
        >
          {/* Rank */}
          <span className={clsx('w-5 shrink-0 text-center text-sm font-black', rankColor)}>
            {entry.rank}
          </span>

          {/* Avatar */}
          <Avatar
            src={resolveLeaderboardEntryAvatarSrc(entry, meSignedAvatarUrl)}
            name={entry.displayName}
            size="sm"
            color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
          />

          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className={clsx('truncate text-sm font-bold', entry.isCurrentUser ? 'text-primary-400' : 'text-white')}>
              {entry.displayName}
              {entry.isCurrentUser && <span className="ml-1 text-xs font-normal text-text-dimmed">(you)</span>}
            </span>
          </div>

          {/* Change + score */}
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <ChangeIndicator change={entry.change} />
              <span className="text-sm font-bold text-white">{entry.score.toLocaleString()}</span>
            </div>
            <span className="text-xs text-text-muted">{entry.scoreLabel}</span>
          </div>
        </motion.div>
      );
    })}
  </div>
);
