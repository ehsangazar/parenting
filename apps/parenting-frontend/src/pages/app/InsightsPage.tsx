import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { insightsApi } from '../../lib/appApi';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { TwoColumnLayout } from '../../components/app/TwoColumnLayout.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { DuoCard } from '../../components/ui/DuoCard.js';
import { ProgressBar } from '../../components/ui/ProgressBar.js';
import { SectionHeader } from '../../components/ui/SectionHeader.js';
import { Skeleton } from '../../components/ui/Skeleton.js';

interface InsightsSummary {
  streak: { current: number; lastActiveDate: string | null };
  points: { total: number; daily: number; gems: number };
  learning: {
    completedModules: number;
    inProgressModules: number;
    totalModules: number;
    categoryProgress: { label: string; pct: number }[];
    recentActivity: { day: string; value: number }[];
  };
  village: { postsThisMonth: number; commentsPosted: number; reactionsReceived: number };
  moments: { totalMoments: number; recentMoments: number };
  upcomingEvents: number;
  children: number;
}

const StatCard = ({
  iconName,
  label,
  value,
  sub,
  color,
}: {
  iconName: IconName;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) => (
  <DuoCard variant="stat">
    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
      <Icon name={iconName} className="h-5 w-5 object-contain" alt="" />
    </div>
    <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary">{label}</p>
    <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-text-tertiary">{sub}</p>}
  </DuoCard>
);

const barColors: Array<'green' | 'yellow' | 'blue'> = ['green', 'yellow', 'blue', 'green', 'yellow', 'blue'];

export const InsightsPage = () => {
  const { t } = useTranslation();
  const { toApp } = useAppBase();
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    insightsApi
      .getSummary()
      .then((res) => setData(res))
      .catch(() => setError(t('insightsPage.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const activityMax = data
    ? Math.max(...data.learning.recentActivity.map((a) => a.value), 1)
    : 1;

  const villageContributions = data
    ? data.village.postsThisMonth + data.village.commentsPosted
    : 0;

  const sidebar = (
    <>
      <DuoCard variant="stat">
        <SectionHeader title={t('insightsPage.villageActivity')} />
        {loading ? (
          <div className="space-y-3">
            <Skeleton variant="rect" height="48px" />
            <Skeleton variant="rect" height="48px" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            {(
              [
                { label: t('insightsPage.postsThisMonth'), value: data.village.postsThisMonth, iconName: 'comments' },
                { label: t('insightsPage.commentsPosted'), value: data.village.commentsPosted, iconName: 'checkmark' },
                { label: t('insightsPage.reactionsReceived'), value: data.village.reactionsReceived, iconName: 'like' },
              ] as const satisfies ReadonlyArray<{ label: string; value: number; iconName: IconName }>
            ).map(({ label, value, iconName }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-card-border bg-surface-light px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Icon name={iconName} className="h-4 w-4 object-contain" alt="" />
                  <span className="text-sm text-text-secondary">{label}</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </DuoCard>

      <DuoCard variant="stat">
        <SectionHeader title={t('insightsPage.atAGlance')} />
        {loading ? (
          <div className="space-y-3">
            <Skeleton variant="rect" height="48px" />
            <Skeleton variant="rect" height="48px" />
          </div>
        ) : data ? (
          <>
            <div className="space-y-3">
              {(
                [
                  { label: t('insightsPage.childrenTracked'), value: data.children, iconName: 'contacts' },
                  { label: t('insightsPage.eventsNext14'), value: data.upcomingEvents, iconName: 'calendar' },
                  { label: t('insightsPage.learningModulesAvailable'), value: data.learning.totalModules, iconName: 'reading_ebook' },
                ] as const satisfies ReadonlyArray<{ label: string; value: number; iconName: IconName }>
              ).map(({ label, value, iconName }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-card-border bg-surface-light px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Icon name={iconName} className="h-4 w-4 object-contain" alt="" />
                    <span className="text-sm text-text-secondary">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-text-primary">{value}</span>
                </div>
              ))}
            </div>
            {data.upcomingEvents > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2.5">
                <Icon name={appAssetIcons.calendar} className="h-4 w-4 shrink-0 object-contain" alt="" />
                <p className="text-xs text-primary-fg">
                  <strong>{t('insightsPage.upcomingEventsCount', { count: data.upcomingEvents })}</strong>{' '}
                  {t('insightsPage.inNext14Days')}
                </p>
              </div>
            )}
          </>
        ) : null}
      </DuoCard>
    </>
  );

  return (
    <PageContainer verticalSpacing="normal">
      <PageHeader
        title={t('nav.insights')}
        subtitle={t('page.insightsSubtitle')}
        iconName={appAssetIcons.insights}
      >
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-sm">
          <Icon name={appAssetIcons.calendar} className="h-3.5 w-3.5 object-contain opacity-80" alt="" />
          {t('page.insightsLast30Days')}
        </div>
      </PageHeader>

      {error && !loading && (
        <div className="mb-4 rounded-2xl border border-error/30 bg-error/10 p-5 text-center text-sm text-error">
          {error}
        </div>
      )}

      <TwoColumnLayout sidebar={sidebar}>
        <div className="space-y-6">
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" />)
            ) : data ? (
              <>
                <StatCard
                  iconName={appAssetIcons.streak}
                  label={t('insightsPage.statCurrentStreak')}
                  value={t('insightsPage.streakDuration', { count: data.streak.current })}
                  sub={data.streak.current === 0 ? t('insightsPage.streakStartHint') : t('insightsPage.streakKeepGoing')}
                  color="bg-orange-100"
                />
                <StatCard
                  iconName={appAssetIcons.paths}
                  label={t('insightsPage.statModulesDone')}
                  value={`${data.learning.completedModules}`}
                  sub={t('insightsPage.statModulesSub', { count: data.learning.inProgressModules })}
                  color="bg-primary-100"
                />
                <StatCard
                  iconName={appAssetIcons.moments}
                  label={t('moments.title')}
                  value={`${data.moments.recentMoments}`}
                  sub={t('insightsPage.statMomentsTotal', { count: data.moments.totalMoments })}
                  color="bg-green-100"
                />
                <StatCard
                  iconName={appAssetIcons.gems}
                  label={t('insightsPage.villageContributions')}
                  value={`${villageContributions}`}
                  sub={t('insightsPage.postsAndComments')}
                  color="bg-brand-blue/15"
                />
              </>
            ) : null}
          </div>

          {/* Weekly activity chart */}
          <DuoCard variant="default">
            <div className="mb-5 flex items-center gap-2">
              <Icon name={appAssetIcons.weeklyActivity} className="h-4 w-4 object-contain opacity-90" alt="" />
              <h2 className="text-sm font-semibold text-text-primary">{t('insightsPage.weeklyActivity')}</h2>
              <span className="ml-auto text-xs text-text-tertiary">{t('insightsPage.lessonsPerDay')}</span>
            </div>
            {loading ? (
              <div className="flex h-28 animate-pulse items-end gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-lg bg-surface-light" style={{ height: `${20 + i * 8}px` }} />
                    <div className="h-2 w-4 rounded bg-surface-light" />
                  </div>
                ))}
              </div>
            ) : data ? (
              <div className="flex h-28 items-end gap-2">
                {data.learning.recentActivity.map(({ day, value }) => (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-col justify-end" style={{ height: '80px' }}>
                      <div
                        className={clsx(
                          'w-full rounded-t-lg transition-colors',
                          value > 0 ? 'bg-primary-300 hover:bg-primary-400' : 'bg-surface-light',
                        )}
                        style={{
                          height: `${value === 0 ? 4 : Math.max((value / activityMax) * 80, 8)}px`,
                        }}
                        title={t('insightsPage.lessonsCount', { count: value })}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-tertiary">{day}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </DuoCard>

          {/* Phase progress */}
          <DuoCard variant="default">
            <div className="mb-5 flex items-center gap-2">
              <Icon name={appAssetIcons.phaseProgress} className="h-4 w-4 object-contain opacity-90" alt="" />
              <h2 className="text-sm font-semibold text-text-primary">{t('insightsPage.phaseProgress')}</h2>
              {data && (
                <span className="ml-auto text-xs text-text-tertiary">
                  {t('insightsPage.modulesCompletedLine', {
                    done: data.learning.completedModules,
                    total: data.learning.totalModules,
                  })}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="mb-1.5 flex justify-between">
                      <div className="h-3 w-28 rounded bg-surface-light" />
                      <div className="h-3 w-8 rounded bg-surface-light" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-light" />
                  </div>
                ))}
              </div>
            ) : data && data.learning.categoryProgress.length > 0 ? (
              <div className="space-y-4">
                {data.learning.categoryProgress.map(({ label, pct }, idx) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium capitalize text-text-secondary">{label}</span>
                      <span className="text-xs font-bold text-text-primary">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={barColors[idx % barColors.length]} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-text-tertiary">
                {t('insightsPage.noLearningModules')}{' '}
                <Link to={toApp('/app/resources')} className="font-semibold text-brand-blue">
                  {t('insightsPage.resourcesTab')}
                </Link>
                {t('insightsPage.noLearningSuffix')}
              </p>
            )}
            <p className="mt-4 text-xs leading-relaxed text-text-tertiary">
              {t('insightsPage.phaseProgressFootnote')}
            </p>
          </DuoCard>

          <p className="pb-4 text-center text-xs text-text-tertiary lg:hidden">
            {t('insightsPage.footerNote')}
          </p>
        </div>
      </TwoColumnLayout>

      <p className="hidden pb-4 text-center text-xs text-text-tertiary lg:block">
        {t('insightsPage.footerNote')}
      </p>
    </PageContainer>
  );
};
