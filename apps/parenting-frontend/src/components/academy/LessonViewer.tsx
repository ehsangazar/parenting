import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { learningApi } from '../../lib/appApi.js';
import { LessonModal } from './LessonModal.js';
import { PracticePledgeModal } from './PracticePledgeModal.js';
import { notifyGamificationChange } from '../app/BalancePills.js';
import { buildLessonCards } from './buildLessonCards.js';

type LessonViewerProps = {
  open: boolean;
  courseId: string;
  moduleId: string;
  lessonId: string;
  /** Optional initial title for the modal header while content loads. */
  initialTitle?: string;
  /** True if the user has already completed this lesson (skip pledge prompt). */
  initiallyCompleted?: boolean;
  onClose: () => void;
};

type FetchedLesson = {
  id: string;
  title?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  progress?: { completedAt?: string | null }[];
};

export const LessonViewer = ({
  open,
  courseId,
  moduleId,
  lessonId,
  initialTitle,
  initiallyCompleted,
  onClose,
}: LessonViewerProps) => {
  const { t } = useTranslation();
  const [lesson, setLesson] = useState<FetchedLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completedLocally, setCompletedLocally] = useState(false);
  const [pledgeFor, setPledgeFor] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setCardIndex(0);
    setCompletedLocally(false);
    (async () => {
      try {
        const res = (await learningApi.getLesson(courseId, moduleId, lessonId)) as
          | FetchedLesson
          | { lesson: FetchedLesson };
        const data = 'lesson' in res && res.lesson ? res.lesson : (res as FetchedLesson);
        if (alive) setLesson(data);
      } catch (err) {
        if (alive) {
          toast.error(
            err instanceof Error
              ? err.message
              : t('academy.lesson.loadFailed', 'Could not load the lesson.'),
          );
          onClose();
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, courseId, moduleId, lessonId, onClose, t]);

  const cards = useMemo(() => (lesson ? buildLessonCards(lesson) : []), [lesson]);
  const title = lesson?.title || initialTitle || t('academy.untitledLesson', 'Untitled lesson');
  const isComplete =
    completedLocally ||
    !!initiallyCompleted ||
    (lesson?.progress?.some((p) => p?.completedAt) ?? false);

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCardIndex((i) => Math.min(cards.length - 1, i + 1));
  }, [cards.length]);

  const handleComplete = useCallback(async () => {
    if (!lesson) return;
    setCompleting(true);
    try {
      const result = await learningApi.completeLesson(courseId, moduleId, lesson.id);
      const coins = (result as { coinsAwarded?: number })?.coinsAwarded ?? 0;
      const insight = (result as { insightAwarded?: number })?.insightAwarded ?? 0;
      toast.success(
        insight > 0
          ? t(
              'academy.lesson.completedWithInsight',
              'Lesson complete! +{{insight}} Insight, +{{coins}} coins',
              { insight, coins },
            )
          : coins > 0
            ? t('academy.lesson.completedWithCoins', 'Lesson complete! +{{coins}} coins', { coins })
            : t('academy.lesson.completed', 'Lesson complete!'),
      );
      notifyGamificationChange();
      setCompletedLocally(true);
      setPledgeFor({
        id: lesson.id,
        title: lesson.title || t('academy.untitledLesson', 'Untitled lesson'),
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.lesson.completeFailed', 'Could not mark complete.'),
      );
    } finally {
      setCompleting(false);
    }
  }, [courseId, lesson, moduleId, t]);

  if (!open) return null;

  return (
    <>
      <LessonModal
        open={open && !pledgeFor}
        title={title}
        cards={cards}
        cardIndex={cardIndex}
        onPrev={goPrev}
        onNext={goNext}
        onClose={onClose}
        onComplete={handleComplete}
        completing={completing || loading}
        isComplete={isComplete}
      />
      {pledgeFor && (
        <PracticePledgeModal
          open={!!pledgeFor}
          lessonId={pledgeFor.id}
          lessonTitle={pledgeFor.title}
          onClose={() => {
            setPledgeFor(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
