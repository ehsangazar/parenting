import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

export type LessonCard =
  | { kind: 'media'; mediaUrl: string; mediaType?: string | null }
  | { kind: 'text'; text: string };

type LessonModalProps = {
  open: boolean;
  title: string;
  cards: LessonCard[];
  cardIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onComplete?: () => void;
  completing?: boolean;
  isComplete?: boolean;
  headerExtra?: React.ReactNode;
};

export const LessonModal = ({
  open,
  title,
  cards,
  cardIndex,
  onPrev,
  onNext,
  onClose,
  onComplete,
  completing,
  isComplete,
  headerExtra,
}: LessonModalProps) => {
  const { t } = useTranslation();
  const touchStartX = useRef<number | null>(null);
  const cardCount = cards.length;
  const onLastCard = cardCount === 0 || cardIndex >= cardCount - 1;
  const currentCard = cards[cardIndex];

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, onPrev, onNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) onNext();
    else onPrev();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="lesson-modal"
          className="fixed inset-0 z-[120] flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-modal-title"
        >
          <motion.div
            className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-3xl"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-shrink-0 items-center gap-3 border-b border-border-light px-4 py-3 sm:px-6">
              <h2
                id="lesson-modal-title"
                className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-text-primary"
              >
                {title}
              </h2>
              {headerExtra}
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-text-primary"
              >
                <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
              </button>
            </header>

            <div
              className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6"
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
                    className="m-auto w-full max-h-[60vh] rounded-xl bg-black"
                  />
                ) : currentCard.mediaType?.startsWith('image') ? (
                  <img
                    src={currentCard.mediaUrl}
                    alt=""
                    className="m-auto w-full max-h-[60vh] rounded-xl object-contain"
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
                <div className="my-auto whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary sm:text-[16px]">
                  {currentCard.text}
                </div>
              )}
            </div>

            <footer className="flex-shrink-0 border-t border-border-light px-4 py-3 sm:px-6">
              {cardCount > 1 && (
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={cardIndex === 0}
                    aria-label={t('common.previous', 'Previous')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-text-secondary hover:bg-brand-blue/10 hover:text-text-primary disabled:opacity-40"
                  >
                    <Icon
                      name={uiIcons.chevronLeft}
                      className="h-4 w-4 object-contain"
                      alt=""
                    />
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
                    onClick={onNext}
                    disabled={onLastCard}
                    aria-label={t('common.next', 'Next')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-text-secondary hover:bg-brand-blue/10 hover:text-text-primary disabled:opacity-40"
                  >
                    <Icon
                      name={uiIcons.chevronRight}
                      className="h-4 w-4 object-contain"
                      alt=""
                    />
                  </button>
                </div>
              )}

              {isComplete ? (
                <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-100 px-3 py-3 text-[14px] font-bold text-primary-fg">
                  <Icon
                    name={uiIcons.circleCheck}
                    className="h-4 w-4 object-contain"
                    alt=""
                  />
                  {t('academy.lesson.alreadyComplete', 'Completed')}
                </div>
              ) : onLastCard && onComplete ? (
                <button
                  type="button"
                  onClick={onComplete}
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
                  onClick={onNext}
                  className="w-full rounded-xl bg-brand-blue px-4 py-3 text-[14px] font-bold text-white hover:brightness-110"
                >
                  {t('academy.lesson.next', 'Next')}
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
