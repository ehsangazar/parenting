import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.js';
import { api } from '../../lib/api.js';
import { leaderboardApi } from '../../lib/appApi.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { TwoColumnLayout } from '../../components/app/TwoColumnLayout.js';
import { DuoCard } from '../../components/ui/DuoCard.js';
import { LeaderboardPodium } from '../../components/app/leaderboard/LeaderboardPodium.js';
import { LeaderboardList } from '../../components/app/leaderboard/LeaderboardList.js';
import { LeaderboardMyRankCard } from '../../components/app/leaderboard/LeaderboardMyRankCard.js';
import { LeaderboardEmptyState } from '../../components/app/leaderboard/LeaderboardEmptyState.js';
import { LeaderboardSkeleton } from '../../components/app/leaderboard/LeaderboardSkeleton.js';
import type {
  LeaderboardScope,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardResponse,
} from '../../types/leaderboard.js';

type ViewPreset = {
  id: string;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
};

/** Default: weekly XP across the community — one dropdown changes scope, metric, and period */
const VIEW_PRESETS: ViewPreset[] = [
  { id: 'c-xp-week', scope: 'community', metric: 'xp', period: 'week' },
  { id: 'c-streak-week', scope: 'community', metric: 'streak', period: 'week' },
  { id: 'c-learning-week', scope: 'community', metric: 'learning', period: 'week' },
  { id: 'c-community-week', scope: 'community', metric: 'community', period: 'week' },
  { id: 'c-xp-month', scope: 'community', metric: 'xp', period: 'month' },
  { id: 'c-xp-all', scope: 'community', metric: 'xp', period: 'alltime' },
  { id: 'v-xp-week', scope: 'village', metric: 'xp', period: 'week' },
  { id: 'f-xp-week', scope: 'family', metric: 'xp', period: 'week' },
  { id: 'f-streak-week', scope: 'family', metric: 'streak', period: 'week' },
];

export const LeaderboardPage = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const currentUserId = user?.id ?? '';
  const meSignedAvatarUrl = user?.profile?.avatarUrl ?? null;

  useEffect(() => {
    if (!useAuth.getState().token) return;
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser({ ...res.data.user, gamification: res.data.gamification });
      })
      .catch(() => {});
  }, [setUser]);

  const [scope, setScope] = useState<LeaderboardScope>('community');
  const [metric, setMetric] = useState<LeaderboardMetric>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPresetId = useMemo(() => {
    const match = VIEW_PRESETS.find((p) => p.scope === scope && p.metric === metric && p.period === period);
    return match?.id ?? VIEW_PRESETS[0].id;
  }, [scope, metric, period]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    leaderboardApi
      .getLeaderboard({ scope, metric, period })
      .then(setData)
      .catch(() => setError(t('leaderboardPage.loadError')))
      .finally(() => setLoading(false));
  }, [scope, metric, period, t]);

  const handlePresetChange = (presetId: string) => {
    const p = VIEW_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setScope(p.scope);
    setMetric(p.metric);
    setPeriod(p.period);
  };

  // When period is alltime, community metric doesn't make sense
  useEffect(() => {
    if (period === 'alltime' && metric === 'community') {
      setMetric('xp');
    }
  }, [period, metric]);

  const handleOptIn = async () => {
    try {
      await leaderboardApi.updatePrivacy(true);
      setLoading(true);
      const fresh = await leaderboardApi.getLeaderboard({ scope, metric, period });
      setData(fresh);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const podiumEntries = data?.entries.slice(0, 3) ?? [];
  const listEntries = data?.entries.slice(3) ?? [];

  const getEmptyReason = () => {
    if (!data) return 'generic';
    if (scope === 'community' && !data.userOptedIn) return 'opted-out';
    if (scope === 'family' && data.totalParticipants <= 1) return 'solo';
    if (scope === 'village' && data.entries.length === 0) return 'not-joined';
    return 'generic';
  };

  const isEmpty = !loading && data && data.entries.length === 0;

  const sidebar = (
    <div className="flex flex-col gap-4">
      {data?.currentUser && !loading && (
        <LeaderboardMyRankCard
          entry={data.currentUser}
          totalParticipants={data.totalParticipants}
          meSignedAvatarUrl={meSignedAvatarUrl}
        />
      )}

      <DuoCard variant="stat">
        <p className="text-xs font-bold uppercase tracking-wider text-text-dimmed">{t('leaderboardPage.howItWorks')}</p>
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          <p>🏆 <strong className="text-white">XP</strong> — {t('leaderboardPage.howXp')}</p>
          <p>🔥 <strong className="text-white">{t('topNav.streak')}</strong> — {t('leaderboardPage.howStreak')}</p>
          <p>📚 <strong className="text-white">{t('nav.learning')}</strong> — {t('leaderboardPage.howLearning')}</p>
          <p>💬 <strong className="text-white">{t('nav.community')}</strong> — {t('leaderboardPage.howCommunity')}</p>
        </div>
        <p className="mt-3 text-xs text-text-muted">{t('leaderboardPage.resetNote')}</p>
      </DuoCard>

      <DuoCard variant="stat" className="border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-text-dimmed">{t('leaderboardPage.privacyTitle')}</p>
        <p className="mt-2 text-sm text-text-secondary">
          {t('leaderboardPage.privacyBody')}
        </p>
      </DuoCard>
    </div>
  );

  const mainContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="leaderboard-view" className="sr-only">
          {t('leaderboardPage.viewSelectLabel')}
        </label>
        <select
          id="leaderboard-view"
          value={selectedPresetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="min-w-[min(100%,20rem)] flex-1 rounded-xl border-2 border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          {VIEW_PRESETS.map((p) => {
            const disabled = p.period === 'alltime' && p.metric === 'community';
            return (
              <option key={p.id} value={p.id} disabled={disabled}>
                {t(`leaderboardPage.preset_${p.id}`)}
              </option>
            );
          })}
        </select>
      </div>

      {loading ? (
        <LeaderboardSkeleton />
      ) : error ? (
        <div className="rounded-2xl border-2 border-error/20 bg-error/10 p-6 text-center">
          <p className="text-sm text-error">{error}</p>
        </div>
      ) : isEmpty ? (
        <LeaderboardEmptyState
          scope={scope}
          reason={getEmptyReason()}
          onOptIn={handleOptIn}
        />
      ) : (
        <>
          {podiumEntries.length >= 3 && (
            <LeaderboardPodium
              entries={podiumEntries}
              currentUserId={currentUserId}
              meSignedAvatarUrl={meSignedAvatarUrl}
            />
          )}

          {listEntries.length > 0 && (
            <div className="mt-2">
              <LeaderboardList
                entries={listEntries}
                currentUserId={currentUserId}
                meSignedAvatarUrl={meSignedAvatarUrl}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('leaderboardPage.title')}
        subtitle={t('page.leaderboardSubtitle')}
      />

      <TwoColumnLayout sidebar={sidebar}>
        {mainContent}
      </TwoColumnLayout>
    </PageContainer>
  );
};
