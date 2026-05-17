import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { familiesApi } from '../../lib/appApi.js';
import { toast } from 'sonner';
import { Icon } from '../../components/icons/index.js';
import { LazyImage } from '../../components/ui/LazyImage.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { useAppContext } from '../../components/app/AppContext.js';
import {
  getFirstActionableModuleId,
  type OrderedModuleLike,
} from '../../lib/learningCourseOrder.js';

const HUB_BG = '#F8F9FE';
const CARD_BORDER = '#E0E7FF';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoursePhase {
  id: string;
  title: string;
  _count: { modules: number };
}

interface LearningCourse {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  phases: CoursePhase[];
}

interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
}

interface Child {
  id: string;
  name: string;
  birthday?: string;
  isUnborn?: boolean;
}

interface LeapSummary {
  leapNumber: number;
  eligible: boolean;
  ageRange: [number, number] | null;
  foundation: { moduleId: string | null; total: number; completed: number };
  playbooks: { total: number; tried: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ageInMonths(birthday: string): number {
  return Math.floor(
    (Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
}

function formatAge(birthday: string): string {
  const months = ageInMonths(birthday);
  if (months < 1) return 'newborn';
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years} year${years !== 1 ? 's' : ''}`;
}

function formatAgeMonths(m: number): string {
  if (m < 24) return `${m}mo`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}

function formatAgeRange(min: number, max: number): string {
  return `${formatAgeMonths(min)} – ${formatAgeMonths(max)}`;
}

function getGlobalContinueModuleId(
  courseList: LearningCourse[],
  modules: OrderedModuleLike[],
): string | null {
  for (const c of courseList) {
    const id = getFirstActionableModuleId(modules, c.id);
    if (id) return id;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const LearningPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toApp } = useAppBase();
  const { activeFamily } = useAppContext();

  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({});
  const [allModules, setAllModules] = useState<OrderedModuleLike[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [leapSummary, setLeapSummary] = useState<LeapSummary | null>(null);
  const [nextLessonTitle, setNextLessonTitle] = useState<string | null>(null);
  const [nextLessonMediaUrl, setNextLessonMediaUrl] = useState<string | null>(null);
  const [nextLessonMediaType, setNextLessonMediaType] = useState<
    'image' | 'video' | 'audio' | null
  >(null);

  const continueModuleId = useMemo(
    () => getGlobalContinueModuleId(courses, allModules),
    [courses, allModules],
  );

  const continueCourseId = useMemo(() => {
    if (!continueModuleId) return null;
    const mod = allModules.find((m) => m.id === continueModuleId);
    return mod?.phase?.course?.id ?? null;
  }, [continueModuleId, allModules]);

  // For a given course, find the first child whose age falls within the module's age range
  const eligibleChildByCourse = useMemo(() => {
    const map: Record<string, Child | null> = {};
    for (const course of courses) {
      const mod = allModules.find((m) => m.phase?.course?.id === course.id);
      const min = mod?.minAgeMonths;
      const max = mod?.maxAgeMonths;
      if (min == null || max == null) { map[course.id] = null; continue; }
      map[course.id] =
        children.find((c) => {
          if (!c.birthday || c.isUnborn) return false;
          const months = ageInMonths(c.birthday);
          return months >= min && months <= max;
        }) ?? null;
    }
    return map;
  }, [courses, allModules, children]);

  // Fetch courses + modules
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const [coursesRes, modulesRes, nextLessonRes] = await Promise.all([
          api.get('/api/learning/courses'),
          api.get('/api/learning/modules'),
          api.get('/api/learning/next-lesson').catch(() => null),
        ]);
        const nl = nextLessonRes?.data?.lesson;
        if (nl?.title) {
          setNextLessonTitle(nl.title);
          setNextLessonMediaUrl(nl.mediaUrl ?? null);
          setNextLessonMediaType(nl.mediaType ?? null);
        } else {
          setNextLessonTitle(null);
          setNextLessonMediaUrl(null);
          setNextLessonMediaType(null);
        }
        const loadedCourses: LearningCourse[] = coursesRes.data.courses || [];
        setCourses(loadedCourses);

        const rawMods = (modulesRes.data.modules as OrderedModuleLike[]) ?? [];
        setAllModules(rawMods);

        const progressByCourse: Record<string, CourseProgress> = {};
        rawMods.forEach((mod) => {
          const courseId = mod.phase?.course?.id;
          if (!courseId) return;
          const totalLessons = mod._count?.lessons ?? 0;
          const completedLessons = mod.completedLessons ?? 0;
          if (!progressByCourse[courseId]) {
            progressByCourse[courseId] = { totalLessons: 0, completedLessons: 0 };
          }
          progressByCourse[courseId].totalLessons += totalLessons;
          progressByCourse[courseId].completedLessons += completedLessons;
        });
        setCourseProgress(progressByCourse);
      } catch {
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch children + leap summary when family is ready
  useEffect(() => {
    if (!activeFamily?.id) return;
    familiesApi
      .listChildren(activeFamily.id)
      .then((res: { children?: Child[] }) => setChildren(res.children ?? []))
      .catch(() => {});
    api
      .get('/api/leaps/1/summary')
      .then((res) => setLeapSummary(res.data))
      .catch(() => {});
  }, [activeFamily?.id]);

  if (loading) {
    return (
      <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
        <div className="mx-auto max-w-2xl animate-pulse px-4 pb-16 pt-8 lg:px-6">
          <div className="h-40 rounded-2xl bg-surface-light/30" />
          <div className="mt-6 h-32 rounded-2xl bg-surface-light/30" />
        </div>
      </div>
    );
  }

  // Split courses: age-gated leap courses vs. general courses
  const leapCourses = courses.filter((c) => c.id.startsWith('leap'));
  const generalCourses = courses.filter((c) => !c.id.startsWith('leap'));

  // Recommendations: age-matched leap + first general course
  const recommendedLeap = leapCourses.find((c) => eligibleChildByCourse[c.id] !== null) ?? null;
  const recommendedGeneral = generalCourses[0] ?? null;
  const hasRecommendations = recommendedLeap !== null || recommendedGeneral !== null;
  const recommendedItems = [recommendedLeap, recommendedGeneral].filter(Boolean);

  // Leaps section excludes the one already shown in Recommended
  const leapsToShow = recommendedLeap
    ? leapCourses.filter((c) => c.id !== recommendedLeap.id)
    : leapCourses;

  return (
    <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 lg:px-6 lg:pb-16 lg:pt-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-text-primary">{t('academy.title')}</h1>
        </div>

        {/* Primary CTA */}
        {continueModuleId && (
          <section className="mb-10">
            <div
              className="flex items-center gap-4 rounded-2xl border bg-surface p-4 sm:p-5"
              style={{ borderColor: CARD_BORDER }}
            >
              {nextLessonMediaType === 'image' && nextLessonMediaUrl ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-surface-warm" style={{ borderColor: CARD_BORDER }}>
                  <img
                    src={nextLessonMediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-400/15">
                  <Icon name={uiIcons.play} className="h-5 w-5 object-contain" alt="" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{t('academy.upNext')}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                  {nextLessonTitle ?? t('learning.continueLesson')}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    continueCourseId
                      ? `/app/learning/course/${continueCourseId}`
                      : `/app/learning/${continueModuleId}`,
                  )
                }
                className="shrink-0 rounded-xl bg-primary-400 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
              >
                {t('learning.continue')}
              </button>
            </div>
          </section>
        )}

        {/* ── Recommended ─────────────────────────────────────────────────── */}
        {hasRecommendations && (
          <section className="mb-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
              {t('academy.recommended')}
            </h2>
            <div className={`grid gap-3 ${recommendedItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {recommendedItems.map((course) => {
                if (!course) return null;
                const isLeap = course.id.startsWith('leap');
                const courseMod = allModules.find((m) => m.phase?.course?.id === course.id);
                const minAge = courseMod?.minAgeMonths;
                const maxAge = courseMod?.maxAgeMonths;
                const ageLabel =
                  isLeap && minAge != null && maxAge != null
                    ? formatAgeRange(minAge, maxAge)
                    : null;
                const eligible = isLeap ? (eligibleChildByCourse[course.id] ?? null) : null;
                const progress = courseProgress[course.id] ?? { totalLessons: 0, completedLessons: 0 };
                const pct =
                  progress.totalLessons > 0
                    ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
                    : 0;
                return (
                  <button
                    key={`rec-${course.id}`}
                    type="button"
                    onClick={() => navigate(toApp(`/app/learning/course/${course.id}`))}
                    className="flex w-full flex-col overflow-hidden rounded-2xl border bg-surface text-start shadow-sm transition-all hover:shadow-md active:opacity-70"
                    style={{ borderColor: CARD_BORDER }}
                  >
                    {course.coverImageUrl && (
                      <div className="aspect-[16/9] w-full overflow-hidden">
                        <LazyImage
                          src={course.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 px-4 py-3.5">
                      <div className="flex min-h-[22px] flex-wrap items-center gap-1.5">
                        {ageLabel && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: '#C084FC22', color: '#C084FC' }}
                          >
                            {ageLabel}
                          </span>
                        )}
                        {eligible && (
                          <span className="truncate text-[10px] text-text-secondary">
                            {eligible.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold leading-snug text-text-primary">
                        {course.title}
                      </p>
                      {progress.totalLessons > 0 && (
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-quest-track">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: '#C084FC' }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-text-secondary">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Leaps ───────────────────────────────────────────────────────── */}
        {leapsToShow.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
              {t('academy.leaps')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {leapsToShow.map((course) => {
                const courseMod = allModules.find((m) => m.phase?.course?.id === course.id);
                const minAge = courseMod?.minAgeMonths;
                const maxAge = courseMod?.maxAgeMonths;
                const ageLabel =
                  minAge != null && maxAge != null ? formatAgeRange(minAge, maxAge) : null;
                const eligible = eligibleChildByCourse[course.id] ?? null;
                const progress = courseProgress[course.id] ?? {
                  totalLessons: 0,
                  completedLessons: 0,
                };
                const pct =
                  progress.totalLessons > 0
                    ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
                    : 0;

                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate(toApp(`/app/learning/course/${course.id}`))}
                    className="flex w-full flex-col overflow-hidden rounded-2xl border bg-surface text-start shadow-sm transition-all hover:shadow-md active:opacity-70"
                    style={{ borderColor: CARD_BORDER }}
                  >
                    {course.coverImageUrl && (
                      <div className="aspect-[16/9] w-full overflow-hidden">
                        <LazyImage
                          src={course.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 px-4 py-3.5">
                      <div className="flex min-h-[22px] flex-wrap items-center gap-1.5">
                        {ageLabel && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: '#C084FC22', color: '#C084FC' }}
                          >
                            {ageLabel}
                          </span>
                        )}
                        {eligible && (
                          <span className="truncate text-[10px] text-text-secondary">
                            {eligible.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold leading-snug text-text-primary">
                        {course.title}
                      </p>
                      {progress.totalLessons > 0 && (
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-quest-track">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: '#C084FC' }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-text-secondary">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── General courses ─────────────────────────────────────────────── */}
        {generalCourses.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
              {leapCourses.length > 0 ? t('academy.allCourses') : t('academy.yourCourses')}
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {generalCourses.map((course) => {
                const progress = courseProgress[course.id] ?? { totalLessons: 0, completedLessons: 0 };
                const progressPct =
                  progress.totalLessons > 0
                    ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
                    : 0;

                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => navigate(toApp(`/app/learning/course/${course.id}`))}
                      className="flex w-full flex-col overflow-hidden rounded-2xl border bg-surface text-start shadow-sm transition-all hover:shadow-md active:opacity-70"
                      style={{ borderColor: CARD_BORDER }}
                    >
                      {course.coverImageUrl && (
                        <div className="aspect-[16/9] w-full overflow-hidden">
                          <LazyImage
                            src={course.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            containerClassName="w-full h-full"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 px-4 py-3.5">
                        <p className="text-sm font-semibold leading-snug text-text-primary">{course.title}</p>
                        {progress.totalLessons > 0 && (
                          <div className="mt-0.5 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-quest-track">
                              <div
                                className="h-full rounded-full bg-primary-400 transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] tabular-nums text-text-secondary">{progressPct}%</span>
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Empty state — no courses at all */}
        {courses.length === 0 && (
          <section>
            <div
              className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center"
              style={{ borderColor: CARD_BORDER, backgroundColor: '#FFFFFF' }}
            >
              <Icon name={appAssetIcons.paths} className="mb-2 h-9 w-9 object-contain opacity-50" alt="" />
              <p className="text-sm font-medium text-text-secondary">{t('academy.noCourses')}</p>
              <p className="mt-1 text-xs text-text-tertiary">{t('academy.checkBackSoon')}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
