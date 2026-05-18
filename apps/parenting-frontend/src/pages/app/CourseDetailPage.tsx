import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useAuth } from '../../state/auth.js';
import { learningApi } from '../../lib/appApi.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { Icon } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import {
  LessonModal,
  type LessonCard,
} from '../../components/academy/LessonModal.js';
import { ModuleLessonsModal } from '../../components/academy/ModuleLessonsModal.js';

type ModuleSummary = {
  id: string;
  title?: string | null;
  description?: string | null;
  order?: number;
  completedLessons?: number;
  _count?: { lessons?: number } | null;
};

type Phase = {
  id: string;
  title?: string | null;
  description?: string | null;
  order?: number;
  modules?: ModuleSummary[];
};

type Lesson = {
  id: string;
  title?: string | null;
  content?: string | null;
  order?: number;
  mediaUrl?: string | null;
  mediaType?: string | null;
  progress?: { completedAt?: string | null }[];
};

type ModuleState = 'complete' | 'current' | 'locked' | 'available';

function buildLessonCards(lesson: {
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): LessonCard[] {
  const cards: LessonCard[] = [];
  if (lesson.mediaUrl) {
    cards.push({ kind: 'media', mediaUrl: lesson.mediaUrl, mediaType: lesson.mediaType });
  }
  const raw = (lesson.content ?? '').trim();
  if (raw) {
    const explicit = raw.split(/\n\s*---+\s*\n/);
    const chunks = explicit.length > 1 ? explicit : raw.split(/\n\s*\n+/);
    for (const chunk of chunks) {
      const text = chunk.trim();
      if (text) cards.push({ kind: 'text', text });
    }
  }
  return cards;
}

function moduleTotalLessons(mod: ModuleSummary): number | null {
  const count = mod._count?.lessons;
  return typeof count === 'number' ? count : null;
}

function moduleStateFor(
  mod: ModuleSummary,
  prevComplete: boolean,
): ModuleState {
  const total = moduleTotalLessons(mod);
  const done = mod.completedLessons ?? 0;
  if (total !== null && total > 0 && done >= total) return 'complete';
  if (!prevComplete) return 'locked';
  return done > 0 ? 'current' : 'available';
}

const NODE_OFFSETS = [0, 56, 28, -28, -56, -28, 28];

export const CourseDetailPage = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeModule, setActiveModule] = useState<ModuleSummary | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const cards = useMemo<LessonCard[]>(
    () => (activeLesson ? buildLessonCards(activeLesson) : []),
    [activeLesson],
  );
  const cardCount = cards.length;

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCardIndex((i) => Math.min(Math.max(0, cardCount - 1), i + 1));
  }, [cardCount]);

  const loadPhases = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getCourseModules(courseId);
      const list = Array.isArray(data)
        ? (data as Phase[])
        : Array.isArray((data as { phases?: Phase[] })?.phases)
          ? ((data as { phases: Phase[] }).phases)
          : [];
      setPhases(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('academy.error.loadFailed', 'Could not load course.'),
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, t]);

  useEffect(() => {
    if (token) loadPhases();
  }, [token, loadPhases]);

  const openModule = useCallback(
    async (mod: ModuleSummary) => {
      if (!courseId) return;
      setActiveModule(mod);
      setActiveLesson(null);
      setLessons([]);
      setLessonsError(null);
      setLessonsLoading(true);
      try {
        const data = await learningApi.getLessons(courseId, mod.id);
        const list = Array.isArray(data)
          ? (data as Lesson[])
          : Array.isArray((data as { lessons?: Lesson[] })?.lessons)
            ? ((data as { lessons: Lesson[] }).lessons)
            : [];
        setLessons(list);
      } catch (err) {
        setLessonsError(
          err instanceof Error
            ? err.message
            : t('academy.error.lessonsLoadFailed', 'Could not load lessons.'),
        );
      } finally {
        setLessonsLoading(false);
      }
    },
    [courseId, t],
  );

  const closeAll = useCallback(() => {
    setActiveModule(null);
    setActiveLesson(null);
    setLessons([]);
    setLessonsError(null);
    setCardIndex(0);
  }, []);

  const isLessonComplete = (lesson: Lesson) =>
    Array.isArray(lesson.progress) && lesson.progress.length > 0;

  const openLesson = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson);
    setCardIndex(0);
  }, []);

  const handleSelectLessonId = useCallback(
    (lessonId: string) => {
      const lesson = lessons.find((l) => l.id === lessonId);
      if (lesson) openLesson(lesson);
    },
    [lessons, openLesson],
  );

  const handleComplete = useCallback(async () => {
    if (!courseId || !activeModule || !activeLesson) return;
    setCompleting(true);
    try {
      const result = await learningApi.completeLesson(
        courseId,
        activeModule.id,
        activeLesson.id,
      );
      const coins = (result as { coinsAwarded?: number })?.coinsAwarded ?? 0;
      toast.success(
        coins > 0
          ? t('academy.lesson.completedWithCoins', 'Lesson complete! +{{coins}} coins', { coins })
          : t('academy.lesson.completed', 'Lesson complete!'),
      );
      const completedAt = new Date().toISOString();
      setLessons((prev) =>
        prev.map((l) =>
          l.id === activeLesson.id ? { ...l, progress: [{ completedAt }] } : l,
        ),
      );
      setActiveLesson((prev) =>
        prev ? { ...prev, progress: [{ completedAt }] } : prev,
      );
      setPhases((prev) =>
        prev.map((p) => ({
          ...p,
          modules: p.modules?.map((m) =>
            m.id === activeModule.id
              ? { ...m, completedLessons: (m.completedLessons ?? 0) + 1 }
              : m,
          ),
        })),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.lesson.completeFailed', 'Could not mark complete.'),
      );
    } finally {
      setCompleting(false);
    }
  }, [activeLesson, activeModule, courseId, t]);

  if (!token) {
    return (
      <PageContainer>
        <div className="rounded-2xl bg-surface-light p-6 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.signInPrompt', 'Sign in to access the Academy.')}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/login?next=/academy/${courseId ?? ''}`)}
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
      <header className="mb-4">
        <Link
          to="/academy"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-text-secondary hover:text-text-primary"
        >
          <Icon
            name={uiIcons.chevronLeft}
            className="h-3 w-3 object-contain"
            alt=""
          />
          {t('academy.backToCourses', 'Back to courses')}
        </Link>
      </header>

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

      {!loading && !error && phases.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.course.empty', 'No content yet for this course.')}
          </p>
        </div>
      )}

      <div className="mx-auto w-full max-w-md">
        <div className="space-y-8">
          {phases.map((phase, phaseIndex) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              phaseIndex={phaseIndex}
              onSelectModule={openModule}
              activeModuleId={activeModule?.id ?? null}
            />
          ))}
        </div>
      </div>

      <ModuleLessonsModal
        open={!!activeModule && !activeLesson}
        title={activeModule?.title || t('academy.untitledModule', 'Untitled module')}
        description={activeModule?.description ?? null}
        loading={lessonsLoading}
        error={lessonsError}
        lessons={lessons.map((l) => ({
          id: l.id,
          title: l.title,
          isComplete: isLessonComplete(l),
        }))}
        onSelect={handleSelectLessonId}
        onClose={closeAll}
      />

      <LessonModal
        open={!!activeLesson}
        title={activeLesson?.title || t('academy.untitledLesson', 'Untitled lesson')}
        cards={cards}
        cardIndex={cardIndex}
        onPrev={goPrev}
        onNext={goNext}
        onClose={() => setActiveLesson(null)}
        onComplete={handleComplete}
        completing={completing}
        isComplete={activeLesson ? isLessonComplete(activeLesson) : false}
        headerExtra={
          <button
            type="button"
            onClick={() => setActiveLesson(null)}
            className="hidden text-[12px] font-semibold text-text-secondary hover:text-text-primary sm:inline-flex sm:items-center sm:gap-1"
          >
            <Icon
              name={uiIcons.chevronLeft}
              className="h-3 w-3 object-contain"
              alt=""
            />
            {t('academy.backToLessons', 'Lessons')}
          </button>
        }
      />
    </PageContainer>
  );
};

type PhaseSectionProps = {
  phase: Phase;
  phaseIndex: number;
  onSelectModule: (mod: ModuleSummary) => void;
  activeModuleId: string | null;
};

const PhaseSection = ({
  phase,
  phaseIndex,
  onSelectModule,
  activeModuleId,
}: PhaseSectionProps) => {
  const { t } = useTranslation();
  const modules = phase.modules ?? [];

  let prevComplete = true;
  const moduleStates: ModuleState[] = modules.map((mod) => {
    const state = moduleStateFor(mod, prevComplete);
    prevComplete = state === 'complete';
    return state;
  });
  const firstCurrentIdx = moduleStates.findIndex((s) => s === 'current' || s === 'available');

  return (
    <section>
      <header className="mb-4 flex items-start gap-3 rounded-2xl bg-brand-blue/5 px-4 py-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/20 text-brand-blue">
          <Icon
            name={appAssetIcons.phaseProgress}
            className="h-5 w-5 object-contain"
            alt=""
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
            {t('academy.chapter', 'Chapter {{n}}', { n: phaseIndex + 1 })}
          </p>
          <h2 className="text-[16px] font-extrabold leading-tight text-text-primary">
            {phase.title || t('academy.untitledPhase', 'Untitled phase')}
          </h2>
          {phase.description && (
            <p className="mt-1 text-[12px] leading-snug text-text-secondary">
              {phase.description}
            </p>
          )}
        </div>
      </header>

      {modules.length === 0 ? (
        <p className="rounded-xl bg-surface-light px-3 py-2 text-[12px] text-text-secondary">
          {t('academy.phase.noModules', 'No modules in this phase yet.')}
        </p>
      ) : (
        <ol className="flex flex-col items-center gap-5 py-2">
          {modules.map((mod, i) => {
            const state = moduleStates[i];
            const isNext = i === firstCurrentIdx;
            const offset = NODE_OFFSETS[i % NODE_OFFSETS.length];
            return (
              <li
                key={mod.id}
                className="flex w-full justify-center"
                style={{ transform: `translateX(${offset}px)` }}
              >
                <ModuleNode
                  mod={mod}
                  index={i}
                  state={state}
                  isNext={isNext}
                  isActive={activeModuleId === mod.id}
                  onClick={() => onSelectModule(mod)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

type ModuleNodeProps = {
  mod: ModuleSummary;
  index: number;
  state: ModuleState;
  isNext: boolean;
  isActive: boolean;
  onClick: () => void;
};

const STATE_BUTTON_CLASS: Record<ModuleState, string> = {
  complete:
    'bg-primary-500 text-text-inverse border-primary-700 shadow-[0_6px_0_0_rgba(0,0,0,0.18)] hover:brightness-105',
  current:
    'bg-brand-blue text-white border-brand-blue shadow-[0_6px_0_0_rgba(0,0,0,0.18)] hover:brightness-105',
  available:
    'bg-surface text-brand-blue border-brand-blue/40 shadow-[0_6px_0_0_rgba(0,0,0,0.10)] hover:bg-brand-blue/10',
  locked:
    'bg-surface-light text-text-secondary/60 border-border shadow-[0_4px_0_0_rgba(0,0,0,0.08)] cursor-not-allowed',
};

const ModuleNode = ({ mod, index, state, isNext, isActive, onClick }: ModuleNodeProps) => {
  const { t } = useTranslation();
  const total = moduleTotalLessons(mod);
  const done = mod.completedLessons ?? 0;
  const isLocked = state === 'locked';

  return (
    <div className="flex flex-col items-center gap-2">
      {isNext && state !== 'locked' && (
        <span className="inline-flex animate-bounce items-center rounded-full bg-brand-blue px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
          {t('academy.start', 'Start')}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={isLocked}
        aria-label={mod.title || t('academy.untitledModule', 'Untitled module')}
        aria-current={isActive ? 'true' : undefined}
        className={clsx(
          'group relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all active:translate-y-0.5 active:shadow-none',
          STATE_BUTTON_CLASS[state],
          isActive && 'ring-4 ring-brand-blue/30',
        )}
      >
        {state === 'complete' ? (
          <Icon
            name={uiIcons.circleCheck}
            className="h-9 w-9 object-contain"
            alt=""
          />
        ) : isLocked ? (
          <Icon
            name={uiIcons.lock}
            className="h-7 w-7 object-contain opacity-70"
            alt=""
          />
        ) : (
          <Icon
            name={appAssetIcons.courseB}
            className="h-9 w-9 object-contain"
            alt=""
          />
        )}
        <span className="absolute -bottom-1 -right-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-surface bg-surface px-1 text-[10px] font-extrabold text-text-primary shadow-sm">
          {index + 1}
        </span>
      </button>
      <div className="max-w-[180px] text-center">
        <p className="text-[12px] font-bold leading-tight text-text-primary line-clamp-2">
          {mod.title || t('academy.untitledModule', 'Untitled module')}
        </p>
        {total !== null && total > 0 && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
            {done}/{total} {t('academy.lessons', 'lessons')}
          </p>
        )}
      </div>
    </div>
  );
};
