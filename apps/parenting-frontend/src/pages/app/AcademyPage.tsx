import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import { clsx } from 'clsx';
import { useAuth } from '../../state/auth.js';
import { learningApi } from '../../lib/appApi.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { Icon } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { ResumeCard } from '../../components/academy/ResumeCard.js';
import { PendingPracticeCard } from '../../components/academy/PendingPracticeCard.js';
import { WeeklyRecapCard } from '../../components/academy/WeeklyRecapCard.js';

type Phase = {
  id: string;
  title?: string | null;
  description?: string | null;
};

type Course = {
  id: string;
  title?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  phases?: Phase[];
};

const LEAP_AGE_RANGES: Array<{ leap: number; min: number; max: number }> = [
  { leap: 1, min: 0, max: 3 },
  { leap: 2, min: 3, max: 6 },
  { leap: 3, min: 6, max: 9 },
  { leap: 4, min: 9, max: 12 },
  { leap: 5, min: 13, max: 18 },
  { leap: 6, min: 19, max: 24 },
  { leap: 7, min: 25, max: 30 },
  { leap: 8, min: 31, max: 36 },
  { leap: 9, min: 37, max: 42 },
  { leap: 10, min: 60, max: 84 },
  { leap: 11, min: 84, max: 108 },
  { leap: 12, min: 108, max: 132 },
  { leap: 13, min: 132, max: 156 },
  { leap: 14, min: 156, max: 216 },
  { leap: 15, min: 216, max: 300 },
];

function leapNumberFromCourse(course: Course): number | null {
  const match = /^leap(\d+)/i.exec(course.id) ?? /^leap\s+(\d+)/i.exec(course.title ?? '');
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function isLeapCourse(course: Course): boolean {
  return leapNumberFromCourse(course) !== null;
}

function ageInMonths(birthday: Date): number {
  return Math.floor((Date.now() - birthday.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function recommendedLeapNumber(children: Array<{ birthday?: string | Date | null; isUnborn?: boolean | null }>): number {
  const ages = children
    .filter((c) => !c.isUnborn && c.birthday)
    .map((c) => ageInMonths(new Date(c.birthday as string)))
    .filter((a) => Number.isFinite(a) && a >= 0);
  if (ages.length === 0) return 1;
  const youngest = Math.min(...ages);
  const exact = LEAP_AGE_RANGES.find((r) => youngest >= r.min && youngest <= r.max);
  if (exact) return exact.leap;
  if (youngest < LEAP_AGE_RANGES[0].min) return 1;
  const preceding = [...LEAP_AGE_RANGES].reverse().find((r) => youngest >= r.min);
  return preceding ? preceding.leap : LEAP_AGE_RANGES[LEAP_AGE_RANGES.length - 1].leap;
}

export const AcademyPage = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { activeFamily } = useAppContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllLeaps, setShowAllLeaps] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getCourses();
      const list = Array.isArray(data)
        ? (data as Course[])
        : Array.isArray((data as { courses?: Course[] })?.courses)
          ? ((data as { courses: Course[] }).courses)
          : [];
      setCourses(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('academy.error.loadFailed', 'Could not load courses.'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (token) loadCourses();
  }, [token, loadCourses]);

  const children = activeFamily?.children ?? [];

  const { generalCourse, leapCourses, recommendedLeap, otherCourses } = useMemo(() => {
    const leaps = courses
      .filter(isLeapCourse)
      .map((c) => ({ course: c, n: leapNumberFromCourse(c) ?? 0 }))
      .sort((a, b) => a.n - b.n);
    const nonLeaps = courses.filter((c) => !isLeapCourse(c));
    const general =
      nonLeaps.find((c) => /science of raising/i.test(c.title ?? '')) ?? nonLeaps[0] ?? null;
    const others = nonLeaps.filter((c) => c.id !== general?.id);
    const targetLeapN = recommendedLeapNumber(children);
    const rec =
      leaps.find((l) => l.n === targetLeapN)?.course ??
      leaps.find((l) => l.n >= targetLeapN)?.course ??
      leaps[0]?.course ??
      null;
    return {
      generalCourse: general,
      leapCourses: leaps.map((l) => l.course),
      recommendedLeap: rec,
      otherCourses: others,
    };
  }, [courses, children]);

  const collapsedLeaps = useMemo(
    () => leapCourses.filter((c) => c.id !== recommendedLeap?.id),
    [leapCourses, recommendedLeap],
  );

  if (!token) {
    return (
      <PageContainer>
        <PageHeader
          title={t('nav.academy', 'Academy')}
          subtitle={t(
            'academy.heroSubtitle',
            'Courses and lessons for your parenting journey.',
          )}
          iconName={appAssetIcons.academy}
        />
        <div className="rounded-2xl bg-surface-light p-6 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.signInPrompt', 'Sign in to access the Academy.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?next=/academy')}
            className="mt-3 rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110"
          >
            {t('home.nav.signIn', 'Sign in')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.academy', 'Academy')}
        subtitle={t(
          'academy.heroSubtitle',
          'Courses and lessons for your parenting journey.',
        )}
        iconName={appAssetIcons.academy}
      />

      {loading && (
        <p className="rounded-2xl bg-surface-light px-4 py-3 text-[13px] text-text-secondary">
          {t('common.loading', 'Loading...')}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.empty.title', 'No courses yet')}
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            {t(
              'academy.empty.body',
              'New material will appear here as it becomes available.',
            )}
          </p>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <>
          <WeeklyRecapCard />
          <PendingPracticeCard />
          <ResumeCard />
        </>
      )}

      {(generalCourse || recommendedLeap) && (
        <section className="mb-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            {t('academy.recommended', 'Recommended')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {generalCourse && (
              <RecommendedCard
                course={generalCourse}
                badge={t('academy.badge.foundations', 'Foundations')}
                accent="blue"
              />
            )}
            {recommendedLeap && (
              <RecommendedCard
                course={recommendedLeap}
                badge={t('academy.badge.forYourChild', 'For your child')}
                accent="pink"
              />
            )}
          </div>
        </section>
      )}

      {collapsedLeaps.length > 0 && (
        <section className="mb-6">
          <button
            type="button"
            onClick={() => setShowAllLeaps((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-brand-blue/40"
            aria-expanded={showAllLeaps}
          >
            <span className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-text-primary">
                {t('academy.allLeaps', 'All developmental leaps')}
              </span>
              <span className="rounded-full bg-surface-light px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                {collapsedLeaps.length}
              </span>
            </span>
            <Icon
              name={showAllLeaps ? uiIcons.chevronUp : uiIcons.chevronDown}
              className="h-4 w-4 object-contain opacity-60"
              alt=""
            />
          </button>
          {showAllLeaps && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {collapsedLeaps.map((course) => (
                <li key={course.id}>
                  <CompactCourseLink course={course} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {otherCourses.length > 0 && (
        <section>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            {t('academy.moreCourses', 'More courses')}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {otherCourses.map((course) => (
              <li key={course.id}>
                <CompactCourseLink course={course} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageContainer>
  );
};

type Accent = 'blue' | 'pink';

const ACCENT_STYLES: Record<Accent, { iconBg: string; badge: string; ring: string }> = {
  blue: {
    iconBg: 'bg-brand-blue/15 text-brand-blue',
    badge: 'bg-brand-blue/15 text-brand-blue',
    ring: 'hover:border-brand-blue/50',
  },
  pink: {
    iconBg: 'bg-brand-pink/15 text-brand-pink',
    badge: 'bg-brand-pink/15 text-brand-pink',
    ring: 'hover:border-brand-pink/50',
  },
};

const RecommendedCard = ({
  course,
  badge,
  accent,
}: {
  course: Course;
  badge: string;
  accent: Accent;
}) => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const styles = ACCENT_STYLES[accent];
  const phaseCount = course.phases?.length ?? 0;
  return (
    <Link
      to={`/academy/${course.id}`}
      onClick={() => posthog.capture('course_opened', { course_id: course.id, course_title: course.title, badge })}
      className={clsx(
        'group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
        styles.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
            styles.iconBg,
          )}
        >
          <Icon
            name={appAssetIcons.academy}
            className="h-6 w-6 object-contain"
            alt=""
          />
        </span>
        <div className="min-w-0 flex-1">
          <span
            className={clsx(
              'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              styles.badge,
            )}
          >
            {badge}
          </span>
          <p className="mt-1.5 text-[16px] font-extrabold leading-tight text-text-primary">
            {course.title || t('academy.untitledCourse', 'Untitled course')}
          </p>
        </div>
      </div>
      {course.description && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-snug text-text-secondary">
          {course.description}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-[12px] font-semibold text-text-secondary">
          {phaseCount > 0
            ? t('academy.phaseCount', '{{count}} phases', { count: phaseCount })
            : t('academy.start', 'Start')}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-blue group-hover:underline">
          {t('academy.start', 'Start')}
          <Icon
            name={uiIcons.chevronRight}
            className="h-3 w-3 object-contain"
            alt=""
          />
        </span>
      </div>
    </Link>
  );
};

const CompactCourseLink = ({ course }: { course: Course }) => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const phaseCount = course.phases?.length ?? 0;
  return (
    <Link
      to={`/academy/${course.id}`}
      onClick={() => posthog.capture('course_opened', { course_id: course.id, course_title: course.title })}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:border-brand-blue/40 hover:bg-surface-light"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-pink/10 text-brand-pink">
        <Icon
          name={appAssetIcons.academy}
          className="h-4 w-4 object-contain"
          alt=""
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-text-primary">
          {course.title || t('academy.untitledCourse', 'Untitled course')}
        </p>
        {phaseCount > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {t('academy.phaseCount', '{{count}} phases', { count: phaseCount })}
          </p>
        )}
      </div>
      <Icon
        name={uiIcons.chevronRight}
        className="h-4 w-4 flex-shrink-0 object-contain opacity-60"
        alt=""
      />
    </Link>
  );
};
