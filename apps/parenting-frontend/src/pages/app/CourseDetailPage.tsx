import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useAuth } from '../../state/auth.js';
import { learningApi } from '../../lib/appApi.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { Drawer } from '../../components/Drawer.js';
import { Icon } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type LessonCard =
  | { kind: 'media'; mediaUrl: string; mediaType?: string | null }
  | { kind: 'text'; text: string };

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

type ModuleSummary = {
  id: string;
  title?: string | null;
  description?: string | null;
  order?: number;
  locked?: boolean;
  completedLessons?: number;
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
  const touchStartX = useRef<number | null>(null);

  const cards = useMemo<LessonCard[]>(
    () => (activeLesson ? buildLessonCards(activeLesson) : []),
    [activeLesson],
  );
  const cardCount = cards.length;
  const onLastCard = cardCount === 0 || cardIndex >= cardCount - 1;
  const currentCard = cards[cardIndex];

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCardIndex((i) => Math.min(Math.max(0, cardCount - 1), i + 1));
  }, [cardCount]);

  useEffect(() => {
    if (!activeLesson) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeLesson, goPrev, goNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  };

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

  const closeDrawer = useCallback(() => {
    setActiveModule(null);
    setActiveLesson(null);
    setLessons([]);
    setLessonsError(null);
  }, []);

  const isLessonComplete = (lesson: Lesson) =>
    Array.isArray(lesson.progress) && lesson.progress.length > 0;

  const openLesson = useCallback((lesson: Lesson) => {
    setActiveLesson(lesson);
    setCardIndex(0);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!courseId || !activeModule || !activeLesson) return;
    setCompleting(true);
    try {
      const result = await learningApi.completeLesson(
        courseId,
        activeModule.id,
        activeLesson.id,
      );
      const coins =
        (result as { coinsAwarded?: number })?.coinsAwarded ?? 0;
      toast.success(
        coins > 0
          ? t('academy.lesson.completedWithCoins', 'Lesson complete! +{{coins}} coins', { coins })
          : t('academy.lesson.completed', 'Lesson complete!'),
      );
      setLessons((prev) =>
        prev.map((l) =>
          l.id === activeLesson.id
            ? { ...l, progress: [{ completedAt: new Date().toISOString() }] }
            : l,
        ),
      );
      setActiveLesson((prev) =>
        prev ? { ...prev, progress: [{ completedAt: new Date().toISOString() }] } : prev,
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
      <header className="mb-3">
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

      <div className="space-y-4">
        {phases.map((phase) => (
          <section
            key={phase.id}
            className="rounded-2xl border border-border bg-surface px-4 py-4"
          >
            <header className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
                <Icon
                  name={appAssetIcons.phaseProgress}
                  className="h-4 w-4 object-contain"
                  alt=""
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-extrabold text-text-primary">
                  {phase.title || t('academy.untitledPhase', 'Untitled phase')}
                </h2>
                {phase.description && (
                  <p className="mt-1 text-[12px] text-text-secondary leading-snug">
                    {phase.description}
                  </p>
                )}
              </div>
            </header>

            {(!phase.modules || phase.modules.length === 0) && (
              <p className="rounded-xl bg-surface-light px-3 py-2 text-[12px] text-text-secondary">
                {t('academy.phase.noModules', 'No modules in this phase yet.')}
              </p>
            )}

            <ul className="space-y-2">
              {phase.modules?.map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => openModule(mod)}
                    disabled={mod.locked}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                      mod.locked
                        ? 'cursor-not-allowed bg-surface-light opacity-60'
                        : 'bg-surface-light hover:bg-brand-blue/10',
                    )}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary">
                      <Icon
                        name={mod.locked ? uiIcons.lock : appAssetIcons.courseB}
                        className="h-4 w-4 object-contain"
                        alt=""
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-text-primary">
                        {mod.title || t('academy.untitledModule', 'Untitled module')}
                      </p>
                      {mod.description && (
                        <p className="mt-0.5 text-[12px] text-text-secondary leading-snug">
                          {mod.description}
                        </p>
                      )}
                      {typeof mod.completedLessons === 'number' && mod.completedLessons > 0 && (
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-green">
                          {t('academy.module.completedCount', '{{count}} lessons complete', { count: mod.completedLessons })}
                        </p>
                      )}
                    </div>
                    <Icon
                      name={uiIcons.chevronRight}
                      className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-60"
                      alt=""
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Drawer
        open={!!activeModule}
        onClose={closeDrawer}
        title={
          activeLesson
            ? activeLesson.title || t('academy.untitledLesson', 'Untitled lesson')
            : activeModule?.title || t('academy.untitledModule', 'Untitled module')
        }
      >
        {activeLesson ? (
          <div className="flex h-full flex-col">
            <button
              type="button"
              onClick={() => setActiveLesson(null)}
              className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-text-secondary hover:text-text-primary"
            >
              <Icon
                name={uiIcons.chevronLeft}
                className="h-3 w-3 object-contain"
                alt=""
              />
              {t('academy.backToLessons', 'Back to lessons')}
            </button>

            <div
              className="flex min-h-[260px] flex-1 flex-col rounded-2xl border border-border bg-surface-light p-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {!currentCard && (
                <p className="m-auto text-[13px] text-text-secondary">
                  {t('academy.lesson.noContent', 'This lesson has no written content.')}
                </p>
              )}

              {currentCard?.kind === 'media' && (
                currentCard.mediaType?.startsWith('video') ? (
                  <video
                    src={currentCard.mediaUrl}
                    controls
                    className="m-auto w-full rounded-xl bg-black"
                  />
                ) : currentCard.mediaType?.startsWith('image') ? (
                  <img
                    src={currentCard.mediaUrl}
                    alt=""
                    className="m-auto w-full rounded-xl"
                  />
                ) : (
                  <a
                    href={currentCard.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="m-auto inline-flex items-center gap-1 text-[14px] font-semibold text-brand-blue hover:underline"
                  >
                    <Icon name={uiIcons.externalLink} className="h-3 w-3" alt="" />
                    {t('academy.lesson.openMedia', 'Open media')}
                  </a>
                )
              )}

              {currentCard?.kind === 'text' && (
                <div className="my-auto whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
                  {currentCard.text}
                </div>
              )}
            </div>

            {cardCount > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={cardIndex === 0}
                  aria-label={t('common.previous', 'Previous')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-text-secondary hover:bg-brand-blue/10 hover:text-text-primary disabled:opacity-40"
                >
                  <Icon name={uiIcons.chevronLeft} className="h-4 w-4 object-contain" alt="" />
                </button>
                <div className="flex items-center gap-1.5">
                  {cards.map((_, i) => (
                    <span
                      key={i}
                      className={clsx(
                        'h-1.5 rounded-full transition-all',
                        i === cardIndex
                          ? 'w-6 bg-brand-blue'
                          : 'w-1.5 bg-text-secondary/30',
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={onLastCard}
                  aria-label={t('common.next', 'Next')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-text-secondary hover:bg-brand-blue/10 hover:text-text-primary disabled:opacity-40"
                >
                  <Icon name={uiIcons.chevronRight} className="h-4 w-4 object-contain" alt="" />
                </button>
              </div>
            )}

            <div className="mt-4">
              {isLessonComplete(activeLesson) ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-brand-green/15 px-3 py-2 text-[13px] font-bold text-brand-green">
                  <Icon name={uiIcons.circleCheck} className="h-4 w-4 object-contain" alt="" />
                  {t('academy.lesson.alreadyComplete', 'Completed')}
                </div>
              ) : onLastCard ? (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full rounded-xl bg-brand-blue px-4 py-3 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-60"
                >
                  {completing
                    ? t('common.saving', 'Saving...')
                    : t('academy.lesson.markComplete', 'Mark as complete')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="w-full rounded-xl bg-brand-blue px-4 py-3 text-[14px] font-bold text-white hover:brightness-110"
                >
                  {t('academy.lesson.next', 'Next')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeModule?.description && (
              <p className="text-[13px] text-text-secondary leading-snug">
                {activeModule.description}
              </p>
            )}

            {lessonsLoading && (
              <p className="rounded-xl bg-surface-light px-3 py-2 text-[13px] text-text-secondary">
                {t('common.loading', 'Loading...')}
              </p>
            )}
            {lessonsError && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-500">
                {lessonsError}
              </p>
            )}

            {!lessonsLoading && !lessonsError && lessons.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[13px] text-text-secondary">
                {t('academy.module.noLessons', 'No lessons yet.')}
              </p>
            )}

            <ul className="space-y-2">
              {lessons.map((lesson) => {
                const done = isLessonComplete(lesson);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => openLesson(lesson)}
                      className="flex w-full items-start gap-3 rounded-xl bg-surface-light px-3 py-3 text-left transition-colors hover:bg-brand-blue/10"
                    >
                      <span
                        className={clsx(
                          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                          done
                            ? 'bg-brand-green/20 text-brand-green'
                            : 'bg-surface text-text-secondary',
                        )}
                      >
                        <Icon
                          name={done ? uiIcons.circleCheck : uiIcons.play}
                          className="h-4 w-4 object-contain"
                          alt=""
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-text-primary">
                          {lesson.title || t('academy.untitledLesson', 'Untitled lesson')}
                        </p>
                        {done && (
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-green">
                            {t('academy.lesson.alreadyComplete', 'Completed')}
                          </p>
                        )}
                      </div>
                      <Icon
                        name={uiIcons.chevronRight}
                        className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-60"
                        alt=""
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};
