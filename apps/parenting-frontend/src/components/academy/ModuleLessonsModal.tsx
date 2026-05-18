import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type LessonSummary = {
  id: string;
  title?: string | null;
  isComplete?: boolean;
};

type ModuleLessonsModalProps = {
  open: boolean;
  title: string;
  description?: string | null;
  loading?: boolean;
  error?: string | null;
  lessons: LessonSummary[];
  onSelect: (lessonId: string) => void;
  onClose: () => void;
};

export const ModuleLessonsModal = ({
  open,
  title,
  description,
  loading,
  error,
  lessons,
  onSelect,
  onClose,
}: ModuleLessonsModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="module-lessons-modal"
          className="fixed inset-0 z-[110] flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-lessons-title"
        >
          <motion.div
            className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-3xl"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-shrink-0 items-start gap-3 border-b border-border-light px-4 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <h2
                  id="module-lessons-title"
                  className="text-[16px] font-extrabold text-text-primary"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-[12px] leading-snug text-text-secondary">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-text-primary"
              >
                <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {loading && (
                <p className="rounded-xl bg-surface-light px-3 py-2 text-[13px] text-text-secondary">
                  {t('common.loading', 'Loading...')}
                </p>
              )}
              {error && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-500">
                  {error}
                </p>
              )}
              {!loading && !error && lessons.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[13px] text-text-secondary">
                  {t('academy.module.noLessons', 'No lessons yet.')}
                </p>
              )}

              <ul className="space-y-2">
                {lessons.map((lesson, i) => {
                  const done = !!lesson.isComplete;
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(lesson.id)}
                        className="flex w-full items-start gap-3 rounded-xl bg-surface-light px-3 py-3 text-left transition-colors hover:bg-brand-blue/10"
                      >
                        <span
                          className={clsx(
                            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-bold',
                            done
                              ? 'bg-primary-200 text-primary-fg'
                              : 'bg-surface text-text-secondary',
                          )}
                        >
                          {done ? (
                            <Icon
                              name={uiIcons.circleCheck}
                              className="h-4 w-4 object-contain"
                              alt=""
                            />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-bold text-text-primary">
                            {lesson.title || t('academy.untitledLesson', 'Untitled lesson')}
                          </p>
                          {done && (
                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-fg">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
