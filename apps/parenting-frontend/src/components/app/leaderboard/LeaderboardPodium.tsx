import { motion } from 'framer-motion';
import { Crown, Medal } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Avatar } from '../../ui/Avatar.js';
import type { LeaderboardEntry } from '../../../types/leaderboard.js';
import { AVATAR_COLORS } from '../../../lib/leaderboardMock.js';
import { resolveLeaderboardEntryAvatarSrc } from '../../../lib/leaderboardAvatar.js';

type LeaderboardPodiumProps = {
  entries: LeaderboardEntry[];
  currentUserId: string;
  /** Signed URL from `/api/auth/me` — leaderboard entries may carry unsigned S3 URLs; use this for the current user. */
  meSignedAvatarUrl?: string | null;
};

const PODIUM_CONFIG = [
  { rank: 2, height: 'h-28', borderColor: 'border-slate-400/40', medalColor: 'text-slate-400', bgColor: 'bg-slate-400/5' },
  { rank: 1, height: 'h-36', borderColor: 'border-[#FF9F51]/60', medalColor: 'text-[#FF9F51]', bgColor: 'bg-[#FF9F51]/5' },
  { rank: 3, height: 'h-24', borderColor: 'border-[#CD7F32]/40', medalColor: 'text-[#CD7F32]', bgColor: 'bg-[#CD7F32]/5' },
];

export const LeaderboardPodium = ({
  entries,
  currentUserId,
  meSignedAvatarUrl,
}: LeaderboardPodiumProps) => {
  const getEntry = (rank: number) => entries.find((e) => e.rank === rank);

  return (
    <div className="flex items-end justify-center gap-3 px-4 pt-6">
      {PODIUM_CONFIG.map((config, i) => {
        const entry = getEntry(config.rank);
        if (!entry) return <div key={config.rank} className={clsx('w-24', config.height)} />;

        return (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={clsx(
              'flex flex-col items-center justify-end rounded-2xl border-2 px-3 pb-3 pt-4',
              'w-24 sm:w-28',
              config.height,
              config.borderColor,
              config.bgColor,
              entry.isCurrentUser && 'ring-2 ring-[#52D68C]/60',
            )}
          >
            {config.rank === 1 && (
              <Crown size={18} weight="fill" className="mb-1 text-[#FF9F51]" />
            )}
            {config.rank === 2 && (
              <Medal size={16} weight="fill" className="mb-1 text-text-secondary" />
            )}
            {config.rank === 3 && (
              <Medal size={16} weight="fill" className="mb-1 text-[#CD7F32]" />
            )}

            <Avatar
              src={resolveLeaderboardEntryAvatarSrc(entry, meSignedAvatarUrl)}
              name={entry.displayName}
              size={config.rank === 1 ? 'lg' : 'md'}
              color={AVATAR_COLORS[entry.rank - 1]}
              className={clsx(entry.isCurrentUser && 'ring-2 ring-[#52D68C]')}
            />

            <p className="mt-2 w-full truncate text-center text-xs font-bold text-white">
              {entry.displayName}
            </p>
            <p className={clsx('mt-1.5 text-sm font-black', config.medalColor)}>
              {entry.score.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-tertiary">{entry.scoreLabel}</p>
          </motion.div>
        );
      })}
    </div>
  );
};
