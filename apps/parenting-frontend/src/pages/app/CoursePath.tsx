import { Fragment, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { familiesApi } from '../../lib/appApi.js';
import { toast } from 'sonner';
import { useAuth } from '../../state/auth.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { useLocale } from '../../hooks/useLocale.js';
import { useAppContext } from '../../components/app/AppContext.js';
import {
  isModuleLockedInOrderedList,
  moduleIsComplete,
  type OrderedModuleLike,
} from '../../lib/learningCourseOrder.js';

// ── Path layout ────────────────────────────────────────────────────────────────
const NODE_W = 72;
const CONTAINER_W = 288;
const ZIGZAG_ML = [108, 152, 180, 152, 108, 64, 36, 64];

const PHASE_COLORS = [
  { bg: '#52D68C', shadow: '#3d9e62', text: '#fff' },
  { bg: '#7B8FFF', shadow: '#5A6FD4', text: '#fff' },
  { bg: '#FF9600', shadow: '#c87800', text: '#fff' },
  { bg: '#C084FC', shadow: '#a362d4', text: '#fff' },
  { bg: '#FF6B6B', shadow: '#c93535', text: '#fff' },
];

const MODULE_NODE_ICONS: IconName[] = [
  'reading_ebook', 'puzzle', 'idea', 'approve', 'rating', 'biotech', 'clapperboard', 'diploma_1',
];
const MASCOT_ICONS: IconName[] = ['biomass', 'biomass', 'assistant', 'approval', 'rating'];

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface PhaseModule {
  id: string;
  title: string;
  order: number;
  completedLessons: number;
  _count: { lessons: number };
  globalIndex: number;
  phaseIndex: number;
}

interface Phase {
  id: string;
  title: string;
  order: number;
  phaseIndex: number;
  modules: PhaseModule[];
}

interface FlatLesson {
  id: string;
  title: string;
  content: string;
  order: number;
  progress: unknown[];
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'audio' | null;
}

interface EligibleChild {
  name: string;
  birthday: string;
}

type NodeState = 'completed' | 'current' | 'in_progress' | 'locked';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip "L1.0.X: " prefix from lesson titles like "L1.0.1: Circadian Hardware" */
function cleanLessonTitle(title: string): string {
  return title.replace(/^L\d+\.\d+\.\d+:\s*/, '');
}

/** Extract the first H2 subtitle from markdown content */
function extractSubtitle(content: string): string {
  const match = content.match(/^##\s+(.+)/m);
  return match ? match[1].trim() : '';
}

/** Age in months from birthday ISO string */
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

function getFlatLessonState(
  lessons: FlatLesson[],
  idx: number,
): 'done' | 'current' | 'locked' {
  if ((lessons[idx].progress?.length ?? 0) > 0) return 'done';
  for (let i = 0; i < idx; i++) {
    if ((lessons[i].progress?.length ?? 0) === 0) return 'locked';
  }
  return 'current';
}

// ── Component ──────────────────────────────────────────────────────────────────
export const CoursePath = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtl } = useLocale();
  const { toApp } = useAppBase();
  const { user } = useAuth();
  const { activeFamily } = useAppContext();

  const [phases, setPhases] = useState<Phase[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const currentNodeRef = useRef<HTMLDivElement>(null);

  // Flat-course state
  const [flatLessons, setFlatLessons] = useState<FlatLesson[]>([]);
  const [eligibleChild, setEligibleChild] = useState<EligibleChild | null>(null);


  // Detect if this is a leap course (for child context)
  const leapNumber = useMemo((): number | null => {
    if (!courseId?.startsWith('leap')) return null;
    const m = courseId.match(/^leap(\d+)/);
    return m ? parseInt(m[1]) : null;
  }, [courseId]);

  // Fetch phases + courses
  useEffect(() => {
    if (!courseId) {
      navigate(toApp('/app/learning'));
      return;
    }
    (async () => {
      try {
        const [phasesRes, coursesRes] = await Promise.all([
          api.get(`/api/learning/courses/${courseId}/phases`),
          api.get('/api/learning/courses'),
        ]);
        let gi = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enriched: Phase[] = (phasesRes.data.phases || []).map((phase: any, phaseIndex: number) => ({
          ...phase,
          phaseIndex,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modules: phase.modules.map((mod: any) => ({
            ...mod,
            globalIndex: gi++,
            phaseIndex,
          })),
        }));
        setPhases(enriched);

        const found = (coursesRes.data.courses || []).find(
          (c: { id: string; title: string }) => c.id === courseId,
        );
        if (found) setCourseTitle(found.title);

        // If flat course (1 phase, 1 module) → fetch its lessons
        const isFlat = enriched.length === 1 && enriched[0].modules.length === 1;
        if (isFlat) {
          const moduleId = enriched[0].modules[0].id;
          const lessonsRes = await api.get(`/api/learning/modules/${moduleId}/lessons`);
          setFlatLessons(lessonsRes.data.lessons ?? []);
        }
      } catch {
        toast.error('Failed to load course');
        navigate(toApp('/app/learning'));
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, navigate]);

  // Fetch child context for leap courses
  useEffect(() => {
    if (!leapNumber || !activeFamily?.id) return;
    familiesApi
      .listChildren(activeFamily.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const kids: Array<{ name: string; birthday?: string; isUnborn?: boolean }> =
          res.children ?? [];
        const ranges: Record<number, [number, number]> = { 1: [0, 3] };
        const range = ranges[leapNumber];
        if (!range) return;
        const child = kids.find((c) => {
          if (!c.birthday || c.isUnborn) return false;
          const months = ageInMonths(c.birthday);
          return months >= range[0] && months <= range[1];
        });
        if (child?.birthday) setEligibleChild({ name: child.name, birthday: child.birthday });
      })
      .catch(() => {});
  }, [leapNumber, activeFamily?.id]);

  useEffect(() => {
    if (phases.length > 0 && currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [phases]);

  const orderedMods = useMemo(
    (): OrderedModuleLike[] =>
      phases.flatMap((p) =>
        p.modules.map((m) => ({
          id: m.id,
          order: m.order,
          completedLessons: m.completedLessons,
          _count: m._count,
        })),
      ),
    [phases],
  );

  const currentGlobalIdx = useMemo(
    () => orderedMods.findIndex((m) => !moduleIsComplete(m)),
    [orderedMods],
  );

  const courseProgress = useMemo(() => {
    const total = orderedMods.reduce((s, m) => s + (m._count?.lessons ?? 0), 0);
    const done = orderedMods.reduce((s, m) => s + (m.completedLessons ?? 0), 0);
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [orderedMods]);

  const getState = useCallback(
    (mod: PhaseModule): NodeState => {
      if (moduleIsComplete(mod)) return 'completed';
      if (isModuleLockedInOrderedList(mod.id, orderedMods)) return 'locked';
      if (mod.globalIndex === currentGlobalIdx) return 'current';
      return 'in_progress';
    },
    [orderedMods, currentGlobalIdx],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F8F9FE' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  // Determine if this is a flat (single phase, single module) course
  const isFlat = phases.length === 1 && phases[0]?.modules.length === 1;
  const flatModuleId = isFlat ? phases[0].modules[0].id : null;

  // ── Shared sticky header ──────────────────────────────────────────────────────
  const Header = (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ backgroundColor: 'rgba(248,249,254,0.88)', backdropFilter: 'blur(12px)', borderColor: '#E0E7FF' }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(toApp('/app/learning'))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface"
        >
          <Icon name={uiIcons.chevronLeft} className="h-5 w-5 opacity-80 rtl:scale-x-[-1]" alt="" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-text-primary">
            {isFlat ? (eligibleChild ? t('academy.forChild', { name: eligibleChild.name }) : t('academy.scienceSeries')) : (courseTitle || t('learning.courses'))}
          </p>
          {courseProgress.total > 0 && (
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E8EDFF]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${courseProgress.pct}%`, backgroundColor: isFlat ? '#C084FC' : '#52D68C' }}
                />
              </div>
              <span className="text-[10px] font-bold text-text-tertiary">{courseProgress.pct}%</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // ── FLAT SERIES VIEW ──────────────────────────────────────────────────────────
  if (isFlat && flatModuleId) {
    const doneLessons = flatLessons.filter((l) => (l.progress?.length ?? 0) > 0).length;
    const totalLessons = flatLessons.length;
    const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
    const seriesColor = { bg: '#C084FC', shadow: '#a362d4' };
    const LESSON_ICONS: IconName[] = ['alarm_clock', 'idea', 'view_details', 'headset', 'organization'];

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FE' }}>
        {Header}

        <div className="mx-auto flex max-w-5xl gap-8 px-4 pb-28 pt-6 lg:px-6">
          <div className="flex flex-1 justify-center">
            <div className="w-full max-w-sm">
              {/* Click-away overlay */}
              {selectedModId && (
                <div className="fixed inset-0 z-40" onClick={() => setSelectedModId(null)} />
              )}

              {/* Series banner — same style as chapter banners */}
              <div
                className="relative mb-8 overflow-hidden rounded-3xl px-5 py-5"
                style={{
                  background: `linear-gradient(135deg, ${seriesColor.bg} 0%, ${seriesColor.shadow} 100%)`,
                  boxShadow: `0 12px 32px ${seriesColor.bg}30`,
                }}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 rounded-full opacity-20" style={{ width: 88, height: 88, backgroundColor: 'white' }} />
                <div className="pointer-events-none absolute -right-2 -top-2 rounded-full opacity-10" style={{ width: 56, height: 56, backgroundColor: 'white' }} />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {leapNumber != null ? t('learning.leapTitle', { number: leapNumber }) : t('academy.series')}
                    </p>
                    <p className="mt-1 text-base font-extrabold leading-snug text-white">{courseTitle}</p>
                    {eligibleChild && (
                      <p className="mt-0.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {t('academy.forChild', { name: eligibleChild.name })} · {formatAge(eligibleChild.birthday)}
                      </p>
                    )}
                  </div>
                  {doneLessons === totalLessons && totalLessons > 0 ? (
                    <div className="ml-3 flex shrink-0 flex-col items-center gap-0.5">
                      <Icon name={uiIcons.trophy} className="h-7 w-7 brightness-0 invert" alt="" />
                      <span className="text-[9px] font-black uppercase tracking-wide text-white/70">{t('common.done')}</span>
                    </div>
                  ) : (
                    <div className="ml-3 flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                      <span className="text-xs font-black tabular-nums text-white">{doneLessons}</span>
                      <span className="text-xs text-white/50">/</span>
                      <span className="text-xs font-bold tabular-nums text-white/70">{totalLessons}</span>
                    </div>
                  )}
                </div>
                {totalLessons > 0 && (
                  <div className="relative mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: 'white' }} />
                  </div>
                )}
              </div>

              {/* Lesson nodes — open on page background */}
              <div className="relative mx-auto" style={{ width: CONTAINER_W, direction: 'ltr' }}>
                {flatLessons.map((lesson, idx) => {
                  const mlRaw = ZIGZAG_ML[idx % 8];
                  const prevMlRaw = idx > 0 ? ZIGZAG_ML[(idx - 1) % 8] : mlRaw;
                  // Mirror zigzag for RTL
                  const ml = rtl ? CONTAINER_W - mlRaw - NODE_W : mlRaw;
                  const prevMl = rtl ? CONTAINER_W - prevMlRaw - NODE_W : prevMlRaw;
                  const state = getFlatLessonState(flatLessons, idx);
                  const isSelected = selectedModId === lesson.id;
                  const icon = LESSON_ICONS[idx % LESSON_ICONS.length];
                  const prevCX = prevMl + NODE_W / 2;
                  const thisCX = ml + NODE_W / 2;
                  const prevDone = idx > 0 && (flatLessons[idx - 1].progress?.length ?? 0) > 0;
                  const labelMl = ml + NODE_W / 2 - 52;

                  return (
                    <div key={lesson.id}>
                      {/* Denser connecting path */}
                      {idx > 0 && (
                        <div className="flex flex-col items-start gap-[7px] py-2.5">
                          {[0.15, 0.35, 0.5, 0.65, 0.85].map((frac) => (
                            <div
                              key={frac}
                              className="rounded-full"
                              style={{
                                width: 9,
                                height: 9,
                                marginLeft: prevCX + (thisCX - prevCX) * frac - 4.5,
                                backgroundColor: prevDone ? `${seriesColor.bg}55` : '#DDE3F0',
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Node row */}
                      <div
                        ref={state === 'current' ? currentNodeRef : null}
                        className="relative"
                        style={{ marginLeft: ml }}
                      >
                        {state === 'current' && (
                          <div
                            className="pointer-events-none absolute select-none"
                            style={rtl ? { left: -62, top: '50%', transform: 'translateY(-50%)' } : { left: NODE_W + 22, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            <Icon name="idea" className="h-10 w-10" alt="" />
                          </div>
                        )}

                        <div className="relative" style={{ width: NODE_W, height: NODE_W }}>
                          <button
                            type="button"
                            className="absolute inset-0 flex select-none items-center justify-center rounded-full text-white transition-all duration-150 active:scale-95"
                            style={{
                              backgroundColor: state === 'locked' ? '#E8EDFF' : seriesColor.bg,
                              boxShadow:
                                state === 'current'
                                  ? `0 0 0 10px ${seriesColor.bg}35`
                                  : undefined,
                              cursor: state === 'locked' ? 'default' : 'pointer',
                            }}
                            onClick={() => {
                              if (state === 'locked') {
                                toast.message(t('academy.completeEarlierLessons'));
                                return;
                              }
                              setSelectedModId(isSelected ? null : lesson.id);
                            }}
                          >
                            {state === 'done' ? (
                              <Icon name={uiIcons.check} className="h-9 w-9 brightness-0 invert" alt={t('common.done')} />
                            ) : state === 'locked' ? (
                              <Icon name={uiIcons.lock} className="h-7 w-7 opacity-55" alt={t('learning.locked')} />
                            ) : (
                              <Icon name={icon} className="h-9 w-9 brightness-0 invert" alt="" />
                            )}
                          </button>

                          {/* Popup */}
                          {isSelected && (
                            <div
                              className="absolute z-50 w-60 rounded-2xl border shadow-2xl"
                              style={{ top: NODE_W + 14, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#FFFFFF', borderColor: '#E0E7FF', direction: rtl ? 'rtl' : undefined }}
                            >
                              <div
                                className="absolute -top-2 left-1/2 -translate-x-1/2"
                                style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid #E0E7FF' }}
                              />
                              <div className="p-4">
                                {lesson.mediaType === 'image' && lesson.mediaUrl && (
                                  <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: '#E0E7FF' }}>
                                    <img src={lesson.mediaUrl} alt="" className="h-28 w-full object-cover" loading="lazy" />
                                  </div>
                                )}
                                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: seriesColor.bg }}>
                                  {t('academy.lessonN', { n: idx + 1 })}
                                </p>
                                <p className="mt-0.5 text-sm font-extrabold leading-snug text-text-primary">
                                  {cleanLessonTitle(lesson.title)}
                                </p>
                                {extractSubtitle(lesson.content) && (
                                  <p className="mt-1 text-xs italic text-[#8a9399]">{extractSubtitle(lesson.content)}</p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => navigate(toApp(`/app/learning/${flatModuleId}`))}
                                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-extrabold text-white transition-all active:translate-y-1 active:shadow-none"
                                  style={{ backgroundColor: seriesColor.bg }}
                                >
                                  {state === 'done' ? t('academy.review') : t('academy.start')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Label below node */}
                      <div className="mt-3 text-center" style={{ width: 104, marginLeft: labelMl }}>
                        <p
                          className="line-clamp-2 text-[10px] font-bold leading-tight"
                          style={{ color: state === 'locked' ? '#B0BDD6' : '#4B5563' }}
                        >
                          {cleanLessonTitle(lesson.title)}
                        </p>
                        {state === 'done' && (
                          <p className="mt-0.5 text-[9px] font-semibold" style={{ color: seriesColor.bg }}>{t('common.done')}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Series end */}
              <div className="py-16 text-center">
                {doneLessons === totalLessons && totalLessons > 0 ? (
                  <>
                    <Icon name={uiIcons.partyPopper} className="mx-auto h-14 w-14" alt="" />
                    <p className="mt-3 text-sm font-bold text-text-secondary">{t('academy.seriesComplete')}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {t('academy.scienceSeriesComplete')}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(toApp('/app/learning'))}
                      className="mt-6 text-xs font-extrabold uppercase tracking-wide text-text-secondary underline underline-offset-2 hover:text-primary-600"
                    >
                      {t('academy.backToAcademy')}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-text-tertiary">
                    {doneLessons === 0
                      ? t('academy.tapToStart')
                      : t('academy.lessonsRemaining_other', { count: totalLessons - doneLessons })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:gap-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border p-5" style={{ borderColor: '#E0E7FF', backgroundColor: '#FFFFFF' }}>
              <div className="mb-3 flex items-end justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">{t('learning.lessons')}</p>
                <span className="text-xs font-black" style={{ color: seriesColor.bg }}>{pct}%</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: '#E8EDFF' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: seriesColor.bg, transition: 'width 0.7s ease' }} />
              </div>
              <div className="space-y-2">
                {flatLessons.map((lesson, idx) => {
                  const s = getFlatLessonState(flatLessons, idx);
                  return (
                    <div key={lesson.id} className="flex items-center gap-2">
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: s === 'done' ? seriesColor.bg : s === 'current' ? seriesColor.bg + '33' : '#E8EDFF' }}
                      >
                        {s === 'done' && <Icon name={uiIcons.check} className="h-2.5 w-2.5 brightness-0 invert" alt="" />}
                      </div>
                      <span className={`truncate text-xs ${s === 'locked' ? 'text-text-tertiary' : 'text-text-secondary'}`}>
                        {cleanLessonTitle(lesson.title)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── OPEN PATH VIEW ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FE' }}>
      {Header}

      <div className="mx-auto flex max-w-5xl gap-8 px-4 pb-28 pt-6 lg:px-6">
        <div className="flex flex-1 justify-center">
          <div className="w-full max-w-sm">
            {/* Click-away overlay */}
            {selectedModId && (
              <div className="fixed inset-0 z-40" onClick={() => setSelectedModId(null)} />
            )}

            {phases.map((phase, phaseIdx) => {
              const color = PHASE_COLORS[phase.phaseIndex % PHASE_COLORS.length];
              const phaseComplete = phase.modules.every((m) => moduleIsComplete(m));
              const phaseDone = phase.modules.reduce((s, m) => s + (m.completedLessons ?? 0), 0);
              const phaseTotal = phase.modules.reduce((s, m) => s + (m._count?.lessons ?? 0), 0);
              const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;

              return (
                <div key={phase.id}>
                  {/* Between-phase path connector */}
                  {phaseIdx > 0 && (
                    <div className="relative mx-auto flex flex-col items-center gap-2.5 py-6" style={{ width: CONTAINER_W }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="rounded-full"
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#DDE3F0',
                            opacity: 0.35 + i * 0.13,
                            transform: `translateX(${Math.sin(i * 1.4) * 20}px)`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Chapter banner — floats in the path, does NOT contain nodes */}
                  <div
                    className="relative mb-8 overflow-hidden rounded-3xl px-5 py-5"
                    style={{
                      background: `linear-gradient(135deg, ${color.bg} 0%, ${color.shadow} 100%)`,
                      boxShadow: `0 12px 32px ${color.bg}30`,
                    }}
                  >
                    {/* Decorative circle top-right */}
                    <div
                      className="pointer-events-none absolute -right-6 -top-6 rounded-full opacity-20"
                      style={{ width: 88, height: 88, backgroundColor: 'white' }}
                    />
                    <div
                      className="pointer-events-none absolute -right-2 -top-2 rounded-full opacity-10"
                      style={{ width: 56, height: 56, backgroundColor: 'white' }}
                    />

                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {t('academy.chapter', { n: phaseIdx + 1 })}
                        </p>
                        <p className="mt-1 text-base font-extrabold leading-snug text-white">
                          {phase.title}
                        </p>
                      </div>
                      {phaseComplete ? (
                        <div className="ml-3 flex shrink-0 flex-col items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          <Icon name={uiIcons.trophy} className="h-7 w-7 brightness-0 invert" alt="" />
                          <span className="text-[9px] font-black uppercase tracking-wide text-white/70">{t('common.done')}</span>
                        </div>
                      ) : (
                        <div
                          className="ml-3 flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1"
                          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                        >
                          <span className="text-xs font-black tabular-nums text-white">{phaseDone}</span>
                          <span className="text-xs text-white/50">/</span>
                          <span className="text-xs font-bold tabular-nums text-white/70">{phaseTotal}</span>
                        </div>
                      )}
                    </div>

                    {phaseTotal > 0 && (
                      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${phasePct}%`, backgroundColor: 'white' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Nodes — open on the page background, no container card */}
                  <div className="relative mx-auto" style={{ width: CONTAINER_W, direction: 'ltr' }}>
                    {phase.modules.map((mod, modIdx) => {
                      const mlRaw = ZIGZAG_ML[modIdx % ZIGZAG_ML.length];
                      const prevMlRaw = modIdx > 0 ? ZIGZAG_ML[(modIdx - 1) % ZIGZAG_ML.length] : mlRaw;
                      // Mirror zigzag for RTL
                      const ml = rtl ? CONTAINER_W - mlRaw - NODE_W : mlRaw;
                      const prevMl = rtl ? CONTAINER_W - prevMlRaw - NODE_W : prevMlRaw;
                      const state = getState(mod);
                      const isSelected = selectedModId === mod.id;
                      const icon = MODULE_NODE_ICONS[mod.globalIndex % MODULE_NODE_ICONS.length];
                      const prevCX = prevMl + NODE_W / 2;
                      const thisCX = ml + NODE_W / 2;
                      const prevComplete = modIdx > 0 && moduleIsComplete(phase.modules[modIdx - 1]);
                      const modPct =
                        mod._count.lessons > 0
                          ? Math.round((mod.completedLessons / mod._count.lessons) * 100)
                          : 0;
                      // Label centered on node center
                      const labelMl = ml + NODE_W / 2 - 52;

                      return (
                        <div key={mod.id}>
                          {/* Denser connecting path between nodes */}
                          {modIdx > 0 && (
                            <div className="flex flex-col items-start gap-[7px] py-2.5">
                              {[0.15, 0.35, 0.5, 0.65, 0.85].map((frac) => (
                                <div
                                  key={frac}
                                  className="rounded-full"
                                  style={{
                                    width: 9,
                                    height: 9,
                                    marginLeft: prevCX + (thisCX - prevCX) * frac - 4.5,
                                    backgroundColor: prevComplete ? `${color.bg}55` : '#DDE3F0',
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Node row */}
                          <div
                            ref={state === 'current' ? currentNodeRef : null}
                            className="relative"
                            style={{ marginLeft: ml }}
                          >
                            {/* Mascot beside current node */}
                            {state === 'current' && (
                              <div
                                className="pointer-events-none absolute select-none"
                                style={rtl ? { left: -62, top: '50%', transform: 'translateY(-50%)' } : { left: NODE_W + 22, top: '50%', transform: 'translateY(-50%)' }}
                              >
                                <Icon
                                  name={MASCOT_ICONS[phase.phaseIndex % MASCOT_ICONS.length]}
                                  className="h-10 w-10"
                                  alt=""
                                />
                              </div>
                            )}

                            {/* Node button */}
                            <div className="relative" style={{ width: NODE_W, height: NODE_W }}>
                              <button
                                type="button"
                                className="absolute inset-0 flex select-none items-center justify-center rounded-full text-white transition-all duration-150 active:scale-95"
                                style={{
                                  backgroundColor: state === 'locked' ? '#E8EDFF' : color.bg,
                                  boxShadow:
                                    state === 'current'
                                      ? `0 0 0 10px ${color.bg}35`
                                      : undefined,
                                  cursor: state === 'locked' ? 'default' : 'pointer',
                                }}
                                onClick={() => {
                                  if (state === 'locked') {
                                    toast.message(t('academy.completeEarlierModules'));
                                    return;
                                  }
                                  setSelectedModId(isSelected ? null : mod.id);
                                }}
                              >
                                {/* Progress ring — white arc inside the button */}
                                {modPct > 0 && modPct < 100 && (
                                  <svg
                                    className="pointer-events-none absolute inset-0"
                                    viewBox={`0 0 ${NODE_W} ${NODE_W}`}
                                    fill="none"
                                  >
                                    <circle
                                      cx={NODE_W / 2}
                                      cy={NODE_W / 2}
                                      r={NODE_W / 2 - 5}
                                      stroke="rgba(255,255,255,0.22)"
                                      strokeWidth="3.5"
                                    />
                                    <circle
                                      cx={NODE_W / 2}
                                      cy={NODE_W / 2}
                                      r={NODE_W / 2 - 5}
                                      stroke="rgba(255,255,255,0.9)"
                                      strokeWidth="3.5"
                                      strokeDasharray={`${2 * Math.PI * (NODE_W / 2 - 5)}`}
                                      strokeDashoffset={`${2 * Math.PI * (NODE_W / 2 - 5) * (1 - modPct / 100)}`}
                                      strokeLinecap="round"
                                      style={{
                                        transform: 'rotate(-90deg)',
                                        transformOrigin: `${NODE_W / 2}px ${NODE_W / 2}px`,
                                      }}
                                    />
                                  </svg>
                                )}
                                {state === 'completed' ? (
                                  <Icon name={uiIcons.check} className="h-9 w-9 brightness-0 invert" alt={t('common.done')} />
                                ) : state === 'locked' ? (
                                  <Icon name={uiIcons.lock} className="h-7 w-7 opacity-55" alt={t('learning.locked')} />
                                ) : (
                                  <Icon name={icon} className="h-9 w-9 brightness-0 invert" alt="" />
                                )}
                              </button>

                              {/* Popup card */}
                              {isSelected && (
                                <div
                                  className="absolute z-50 w-60 rounded-2xl border shadow-2xl"
                                  style={{
                                    top: NODE_W + 14,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E0E7FF',
                                    direction: rtl ? 'rtl' : undefined,
                                  }}
                                >
                                  <div
                                    className="absolute -top-2 left-1/2 -translate-x-1/2"
                                    style={{
                                      width: 0, height: 0,
                                      borderLeft: '9px solid transparent',
                                      borderRight: '9px solid transparent',
                                      borderBottom: '9px solid #E0E7FF',
                                    }}
                                  />
                                  <div className="p-4">
                                    <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: color.bg }}>
                                      {t('academy.moduleN', { n: mod.globalIndex + 1 })}
                                    </p>
                                    <p className="mt-0.5 text-sm font-extrabold leading-snug text-text-primary">
                                      {mod.title}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 overflow-hidden rounded-full" style={{ height: 5, backgroundColor: '#E8EDFF' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${modPct}%`, backgroundColor: color.bg }} />
                                      </div>
                                      <span className="text-[10px] font-bold tabular-nums text-text-tertiary">
                                        {mod.completedLessons}/{mod._count.lessons}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => navigate(toApp(`/app/learning/${mod.id}`))}
                                      className="mt-3 w-full rounded-xl py-2.5 text-sm font-extrabold text-white transition-all active:translate-y-1 active:shadow-none"
                                      style={{ backgroundColor: color.bg }}
                                    >
                                      {state === 'completed' ? t('academy.review') : t('academy.start')}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Label below node — title + lesson count */}
                          <div
                            className="mt-3 text-center"
                            style={{ width: 104, marginLeft: labelMl }}
                          >
                            <p
                              className="line-clamp-2 text-[10px] font-bold leading-tight"
                              style={{ color: state === 'locked' ? '#B0BDD6' : '#4B5563' }}
                            >
                              {mod.title}
                            </p>
                            {state !== 'locked' && (
                              <p className="mt-0.5 text-[9px] font-semibold tabular-nums" style={{ color: color.bg }}>
                                {mod.completedLessons}/{mod._count.lessons} {t('learning.lessons')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase complete indicator */}
                  {phaseComplete && (
                    <div className="mx-auto mt-4 flex justify-center" style={{ width: CONTAINER_W }}>
                      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: `${color.bg}18` }}>
                        <Icon name={uiIcons.check} className="h-3 w-3" style={{ color: color.bg }} alt="" />
                        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: color.bg }}>
                          {t('academy.chapterComplete')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {phases.length === 0 && (
              <div className="mt-20 flex flex-col items-center gap-3 text-center">
                <Icon name="biomass" className="h-14 w-14" alt="" />
                <p className="text-sm font-medium text-text-secondary">{t('academy.noContentYet')}</p>
                <p className="text-xs text-text-tertiary">{t('academy.checkBackSoonExclaim')}</p>
              </div>
            )}

            <div className="py-16 text-center">
              {courseProgress.done === courseProgress.total && courseProgress.total > 0 ? (
                <>
                  <Icon name={uiIcons.partyPopper} className="h-14 w-14" alt="" />
                  <p className="mt-3 text-sm font-bold text-text-secondary">{t('academy.journeyComplete')}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{t('academy.newContentRegular')}</p>
                </>
              ) : (
                <p className="text-xs text-text-tertiary">{t('academy.keepLearning')}</p>
              )}
              <button
                type="button"
                onClick={() => navigate(toApp('/app/learning'))}
                className="mt-6 text-xs font-extrabold uppercase tracking-wide text-text-secondary underline underline-offset-2 hover:text-primary-600"
              >
                {t('academy.browseCourses')}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:gap-4 lg:sticky lg:top-20 lg:self-start">
          {courseProgress.total > 0 && (
            <div className="rounded-2xl border p-4" style={{ borderColor: '#E0E7FF', backgroundColor: '#FFFFFF' }}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">{t('academy.courseProgress')}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-black text-text-primary">{courseProgress.pct}%</span>
                <span className="text-xs text-text-secondary">{courseProgress.done}/{courseProgress.total} {t('learning.lessons')}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full" style={{ backgroundColor: '#E8EDFF' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${courseProgress.pct}%`, backgroundColor: '#52D68C', transition: 'width 0.7s ease' }}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
