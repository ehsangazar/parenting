import clsx from 'clsx';
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react';
import { DuoCard } from '../../ui/DuoCard.js';
import { Avatar } from '../../ui/Avatar.js';
import type { LeaderboardEntry } from '../../../types/leaderboard.js';
import { resolveMyRankAvatarSrc } from '../../../lib/leaderboardAvatar.js';
import { AVATAR_COLORS } from '../../../lib/leaderboardMock.js';

type LeaderboardMyRankCardProps = {
  entry: LeaderboardEntry;
  totalParticipants: number;
  className?: string;
  meSignedAvatarUrl?: string | null;
};

const ChangeIcon = ({ change }: { change?: LeaderboardEntry['change'] }) => {
  if (change === 'up') return <ArrowUp size={12} weight="bold" className="text-[#52D68C]" />;
  if (change === 'down') return <ArrowDown size={12} weight="bold" className="text-[#FF6B6B]" />;
  if (change === 'new') return <span className="text-[10px] font-black text-[#FF9F51]">NEW</span>;
  return <Minus size={12} weight="bold" className="text-text-tertiary" />;
};

export const LeaderboardMyRankCard = ({
  entry,
  totalParticipants,
  className,
  meSignedAvatarUrl,
}: LeaderboardMyRankCardProps) => {
  const rankOrdinal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
  const avatarSrc = resolveMyRankAvatarSrc(meSignedAvatarUrl, entry.avatarUrl);

  return (
    <DuoCard variant="stat" className={clsx('border-[#52D68C]/30', className)}>
      <div className="flex items-center gap-3">
        <Avatar
          src={avatarSrc}
          name={entry.displayName}
          size="md"
          color={AVATAR_COLORS[0]}
        />
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#52D68C]">Your rank</p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black text-white">{rankOrdinal}</span>
            <span className="flex items-center gap-0.5">
              <ChangeIcon change={entry.change} />
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            {entry.score.toLocaleString()} {entry.scoreLabel} · out of {totalParticipants.toLocaleString()} parents
          </p>
        </div>
      </div>
    </DuoCard>
  );
};
