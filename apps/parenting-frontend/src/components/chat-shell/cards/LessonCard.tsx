import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { LessonViewer } from '../../academy/LessonViewer.js';
import type { LessonCardData } from './types.js';

type Props = {
  data: LessonCardData;
};

export function LessonCard({ data }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full rounded-2xl border border-brand-pink/30 bg-gradient-to-br from-brand-pink/10 via-surface to-surface p-3.5 text-left transition-all hover:border-brand-pink/60 hover:shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink group-hover:bg-brand-pink/30 transition-colors">
            <Icon name={uiIcons.sparkles} className="h-5 w-5 object-contain" alt="" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-pink">
              <span>{t('chat.lessonCard.tag', 'Lesson')}</span>
              <span aria-hidden className="opacity-50">·</span>
              <span>
                {t('chat.lessonCard.readingMinutes', '{{m}} min', {
                  m: data.readingMinutes,
                })}
              </span>
              {data.isCompleted && (
                <>
                  <span aria-hidden className="opacity-50">·</span>
                  <span className="text-primary-600">
                    {t('chat.lessonCard.completed', 'Completed')}
                  </span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[15px] font-bold leading-tight text-text-primary group-hover:text-brand-pink transition-colors">
              {data.title}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-text-secondary">
              {data.courseTitle}
              {data.moduleTitle ? ` · ${data.moduleTitle}` : ''}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-pink/15 px-2.5 py-1 text-[11px] font-extrabold text-brand-pink">
              <Icon name={uiIcons.bookOpen} className="h-3 w-3 object-contain" alt="" />
              {t('chat.lessonCard.start', 'Start lesson')}
            </div>
          </div>
          <Icon
            name={uiIcons.chevronRight}
            className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-50 transition-transform group-hover:translate-x-0.5"
            alt=""
          />
        </div>
      </button>

      <LessonViewer
        open={open}
        courseId={data.courseId}
        moduleId={data.moduleId}
        lessonId={data.lessonId}
        initialTitle={data.title}
        initiallyCompleted={data.isCompleted}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
