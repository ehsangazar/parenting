import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { learningApi } from '../../lib/appApi.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';

type ResumeTarget = {
  courseId: string;
  courseTitle: string | null;
  moduleId: string;
  moduleTitle: string | null;
  lessonId: string;
  lessonTitle: string | null;
  lessonOrder: number;
  totalLessonsInModule: number;
  completedLessonsInModule: number;
  isFreshStart: boolean;
};

export const ResumeCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [target, setTarget] = useState<ResumeTarget | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await learningApi.getResumeTarget();
        if (!cancelled) setTarget(res.target);
      } catch {
        if (!cancelled) setTarget(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onResume = useCallback(() => {
    if (!target) return;
    navigate(`/academy/${target.courseId}?resumeLesson=${encodeURIComponent(target.lessonId)}`);
  }, [navigate, target]);

  if (loading || !target) return null;

  const total = target.totalLessonsInModule || 1;
  const done = Math.min(target.completedLessonsInModule, total);
  const pct = Math.round((done / total) * 100);
  const remaining = Math.max(0, total - done);

  return (
    <section className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {target.isFreshStart && target.completedLessonsInModule === 0
          ? t('academy.startLearning', 'Start learning')
          : t('academy.continueWhereLeft', 'Continue where you left off')}
      </p>
      <button
        type="button"
        onClick={onResume}
        className="group flex w-full items-start gap-3 rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/10 via-surface to-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-blue/60 hover:shadow-md"
      >
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/20 text-brand-blue">
          <Icon
            name={appAssetIcons.academy}
            className="h-6 w-6 object-contain"
            alt=""
          />
        </span>
        <div className="min-w-0 flex-1">
          {target.courseTitle && (
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-blue">
              {target.courseTitle}
            </p>
          )}
          <p className="mt-0.5 line-clamp-2 text-[16px] font-extrabold leading-tight text-text-primary">
            {target.lessonTitle || t('academy.untitledLesson', 'Untitled lesson')}
          </p>
          {target.moduleTitle && (
            <p className="mt-0.5 truncate text-[12px] text-text-secondary">
              {target.moduleTitle}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-light">
              <div
                className="h-full rounded-full bg-brand-blue transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-text-secondary">
              {done}/{total}
            </span>
          </div>
        </div>
        <span className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue px-3 py-1.5 text-[12px] font-extrabold text-white shadow-sm group-hover:brightness-105">
            {target.completedLessonsInModule === 0
              ? t('academy.start', 'Start')
              : remaining === 0
                ? t('academy.review', 'Review')
                : t('academy.continue', 'Continue')}
            <Icon
              name={uiIcons.chevronRight}
              className="h-3 w-3 object-contain"
              alt=""
            />
          </span>
        </span>
      </button>
    </section>
  );
};
