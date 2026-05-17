import { Link } from 'react-router-dom';
import type { LeaderboardScope } from '../../../types/leaderboard.js';
import { useAppBase } from '../../../hooks/useAppBase.js';

type EmptyReason = 'solo' | 'not-joined' | 'opted-out' | 'generic';

type LeaderboardEmptyStateProps = {
  scope: LeaderboardScope;
  reason: EmptyReason;
  onOptIn?: () => void;
};

export const LeaderboardEmptyState = ({ scope, reason, onOptIn }: LeaderboardEmptyStateProps) => {
  const { toApp } = useAppBase();
  if (scope === 'family' && reason === 'solo') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#E0E7FF] bg-surface-light px-6 py-10 text-center">
        <div className="text-4xl">👨‍👩‍👧</div>
        <div>
          <p className="font-bold text-white">It&apos;s just you here!</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Invite your co-parent or partner to unlock a family leaderboard.
          </p>
        </div>
        <Link
          to={toApp('/app/family')}
          className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-text-inverse transition-opacity hover:opacity-90"
        >
          Invite co-parent
        </Link>
      </div>
    );
  }

  if (scope === 'village' && reason === 'not-joined') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#E0E7FF] bg-surface-light px-6 py-10 text-center">
        <div className="text-4xl">🏘️</div>
        <div>
          <p className="font-bold text-white">Your village is warming up</p>
          <p className="mt-1 text-sm text-text-tertiary">
            The village leaderboard shows parents at the same stage as you. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  if (scope === 'community' && reason === 'opted-out') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#E0E7FF] bg-surface-light px-6 py-10 text-center">
        <div className="text-4xl">🔒</div>
        <div>
          <p className="font-bold text-white">You&apos;re private right now</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Only your first name and avatar are shown to others. Opt in to see how you compare.
          </p>
        </div>
        {onOptIn && (
          <button
            onClick={onOptIn}
            className="rounded-xl bg-[#7B8FFF] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Show me on the leaderboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#E0E7FF] bg-surface-light px-6 py-10 text-center">
      <div className="text-4xl">📊</div>
      <div>
        <p className="font-bold text-white">Nothing to show yet</p>
        <p className="mt-1 text-sm text-text-tertiary">Keep learning and check back soon!</p>
      </div>
    </div>
  );
};
