import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { learningApi } from '../../lib/appApi.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { notifyGamificationChange } from '../app/BalancePills.js';

type Today = NonNullable<Awaited<ReturnType<typeof learningApi.getToday>>['today']>;
type Outcome = 'worked' | 'mixed' | 'didnt_work';

type TodayCardProps = {
  // Lets AcademyPage know which pending practice (if any) is being handled
  // by Today, so PendingPracticeCard can hide that one to avoid duplication.
  onReflectPracticeChange?: (practiceId: string | null) => void;
};

const DAY_DISMISS_KEY_PREFIX = 'today-card-dismissed:';
const OUTCOME_STYLES: Record<Outcome, string> = {
  worked: 'border-primary-200 bg-primary-50 text-primary-fg hover:bg-primary-100',
  mixed: 'border-secondary-100 bg-secondary-50 text-secondary-fg hover:bg-secondary-100',
  didnt_work: 'border-error/30 bg-error/10 text-error hover:bg-error/20',
};

function dayKey(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export const TodayCard = ({ onReflectPracticeChange }: TodayCardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = `${DAY_DISMISS_KEY_PREFIX}${dayKey()}`;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(dismissKey) === '1') {
        setDismissed(true);
      }
    } catch {
      // Storage unavailable; treat as not dismissed.
    }
  }, [dismissKey]);

  const reload = useCallback(async () => {
    try {
      const res = await learningApi.getToday();
      setToday(res.today);
    } catch {
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed) {
      setLoading(false);
      return;
    }
    reload();
  }, [reload, dismissed]);

  // Tell parent which pending practice (if any) is occupying Today so it can
  // suppress duplication in PendingPracticeCard.
  useEffect(() => {
    if (!onReflectPracticeChange) return;
    if (!dismissed && today?.kind === 'reflect') {
      onReflectPracticeChange(today.practiceId);
    } else {
      onReflectPracticeChange(null);
    }
  }, [today, dismissed, onReflectPracticeChange]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, '1');
    } catch {
      // Ignore; still hide for the session.
    }
    setDismissed(true);
  };

  const submitReflection = async (practiceId: string, outcome: Outcome) => {
    setBusy(true);
    try {
      await learningApi.reflectPractice(practiceId, { outcome });
      toast.success(
        t('academy.today.reflectionSaved', 'Reflection saved. Nice work showing up.'),
      );
      notifyGamificationChange();
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.today.reflectFailed', 'Could not save your reflection.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const repledge = async (lessonId: string, technique: string, childId: string | null) => {
    setBusy(true);
    try {
      await learningApi.pledgePractice(lessonId, { technique, childId });
      toast.success(
        t('academy.today.repledgeSaved', 'Pledged again for today. Good luck.'),
      );
      notifyGamificationChange();
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.today.repledgeFailed', 'Could not pledge again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const openLesson = (courseId: string, lessonId: string) => {
    navigate(`/academy/${courseId}?resumeLesson=${encodeURIComponent(lessonId)}`);
  };

  if (loading || dismissed || !today) return null;

  const dateLabel = formatTodayLabel(new Date(), i18n.language);

  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-brand-pink/30 bg-gradient-to-br from-brand-pink/10 via-surface to-surface p-4">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink">
            <Icon name={appAssetIcons.academy} className="h-5 w-5 object-contain" alt="" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-brand-pink">
              {t('academy.today.kicker', 'Today')}
              <span className="ml-2 font-semibold text-text-secondary">
                {dateLabel}
              </span>
            </p>
            <p className="mt-0.5 text-[16px] font-extrabold leading-snug text-text-primary">
              {headlineFor(today, t)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('academy.today.hide', 'Hide for today')}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-text-primary"
          >
            <Icon name={uiIcons.close} className="h-3 w-3 object-contain" alt="" />
          </button>
        </header>

        {today.kind === 'reflect' && (
          <ReflectBody
            today={today}
            busy={busy}
            onSubmit={(o) => submitReflection(today.practiceId, o)}
            onOpenLesson={() =>
              today.courseId && openLesson(today.courseId, today.lessonId)
            }
            t={t}
          />
        )}

        {today.kind === 'repeat' && (
          <RepeatBody
            today={today}
            busy={busy}
            onRepledge={() =>
              repledge(today.lessonId, today.technique, today.childId)
            }
            onOpenLesson={() =>
              today.courseId && openLesson(today.courseId, today.lessonId)
            }
            t={t}
          />
        )}

        {today.kind === 'resume' && (
          <ResumeBody
            today={today}
            onOpen={() => openLesson(today.courseId, today.lessonId)}
            t={t}
          />
        )}
      </div>
    </section>
  );
};

type Tt = (key: string, fallback: string, vars?: Record<string, unknown>) => string;

function headlineFor(today: Today, t: Tt): string {
  if (today.kind === 'reflect') {
    const child = today.childName;
    return child
      ? t('academy.today.reflectHeadlineWithChild', 'How did it go with {{child}}?', {
          child,
        })
      : t('academy.today.reflectHeadline', 'How did yesterday go?');
  }
  if (today.kind === 'repeat') {
    const child = today.childName;
    return child
      ? t('academy.today.repeatHeadlineWithChild', 'Try it again with {{child}} today?', {
          child,
        })
      : t('academy.today.repeatHeadline', 'Try it again today?');
  }
  return today.isFreshStart
    ? t('academy.today.resumeStartHeadline', 'Start your first 2-minute lesson')
    : t('academy.today.resumeHeadline', "Today's next lesson");
}

const ReflectBody = ({
  today,
  busy,
  onSubmit,
  onOpenLesson,
  t,
}: {
  today: Extract<Today, { kind: 'reflect' }>;
  busy: boolean;
  onSubmit: (o: Outcome) => void;
  onOpenLesson: () => void;
  t: Tt;
}) => (
  <div className="mt-3 space-y-3">
    {today.lessonTitle && (
      <p className="text-[13px] font-semibold text-text-secondary">
        {today.lessonTitle}
      </p>
    )}
    <p className="line-clamp-3 rounded-xl bg-surface-light px-3 py-2 text-[14px] font-semibold leading-snug text-text-primary">
      &ldquo;{today.technique}&rdquo;
    </p>
    <div className="grid grid-cols-3 gap-2">
      {(['worked', 'mixed', 'didnt_work'] as Outcome[]).map((o) => (
        <button
          key={o}
          type="button"
          disabled={busy}
          onClick={() => onSubmit(o)}
          className={clsx(
            'rounded-xl border px-2 py-2 text-[12px] font-extrabold transition-colors disabled:opacity-50',
            OUTCOME_STYLES[o],
          )}
        >
          {o === 'worked'
            ? t('academy.practice.worked', 'Worked')
            : o === 'mixed'
              ? t('academy.practice.mixed', 'Mixed')
              : t('academy.practice.didntWork', "Didn't work")}
        </button>
      ))}
    </div>
    {today.courseId && (
      <button
        type="button"
        onClick={onOpenLesson}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline"
      >
        {t('academy.today.revisitLesson', 'Revisit the lesson')}
        <Icon name={uiIcons.chevronRight} className="h-3 w-3 object-contain" alt="" />
      </button>
    )}
  </div>
);

const RepeatBody = ({
  today,
  busy,
  onRepledge,
  onOpenLesson,
  t,
}: {
  today: Extract<Today, { kind: 'repeat' }>;
  busy: boolean;
  onRepledge: () => void;
  onOpenLesson: () => void;
  t: Tt;
}) => (
  <div className="mt-3 space-y-3">
    {today.lessonTitle && (
      <p className="text-[13px] font-semibold text-text-secondary">
        {today.lessonTitle}
      </p>
    )}
    <p className="line-clamp-3 rounded-xl bg-primary-50 px-3 py-2 text-[14px] font-semibold leading-snug text-text-primary">
      &ldquo;{today.technique}&rdquo;
    </p>
    <p className="text-[12px] text-text-secondary">
      {t(
        'academy.today.repeatHint',
        'This one worked last time. Repeating it builds the habit faster than starting fresh.',
      )}
    </p>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onRepledge}
        className="rounded-xl bg-brand-pink px-3 py-2 text-[13px] font-extrabold text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy
          ? t('common.saving', 'Saving...')
          : t('academy.today.pledgeAgain', 'Pledge it again')}
      </button>
      {today.courseId && (
        <button
          type="button"
          onClick={onOpenLesson}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline"
        >
          {t('academy.today.openLesson', 'Open the lesson')}
          <Icon name={uiIcons.chevronRight} className="h-3 w-3 object-contain" alt="" />
        </button>
      )}
    </div>
  </div>
);

const ResumeBody = ({
  today,
  onOpen,
  t,
}: {
  today: Extract<Today, { kind: 'resume' }>;
  onOpen: () => void;
  t: Tt;
}) => (
  <div className="mt-3 space-y-3">
    {today.lessonTitle && (
      <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-text-primary">
        {today.lessonTitle}
      </p>
    )}
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-extrabold text-white hover:brightness-110"
    >
      {today.isFreshStart
        ? t('academy.today.startLesson', 'Start lesson')
        : t('academy.today.openLesson', 'Open the lesson')}
      <Icon name={uiIcons.chevronRight} className="h-3 w-3 object-contain" alt="" />
    </button>
  </div>
);

function formatTodayLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale || 'en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}
