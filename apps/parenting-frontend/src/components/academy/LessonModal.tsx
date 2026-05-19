import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

// Lazy + fade-in image with a shimmer placeholder so lesson cards stop
// painting top-to-bottom as bytes arrive. Caller picks the wrapper sizing
// via `wrapperClassName` (aspect-video for markdown, contained for media).
type LazyImageProps = {
  src: string;
  alt?: string;
  wrapperClassName: string;
  imgClassName?: string;
  fit?: 'cover' | 'contain';
};
const LazyImage = ({ src, alt, wrapperClassName, imgClassName, fit = 'cover' }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={clsx(
        'relative isolate overflow-hidden bg-surface-light',
        wrapperClassName,
      )}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-light via-surface to-surface-light" />
      )}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={clsx(
          'relative h-full w-full transition-opacity duration-500 ease-out',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  );
};

const IMAGE_HREF_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i;

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
            className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:h-[85vh] sm:w-full sm:max-w-2xl sm:rounded-3xl"
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
                  <LazyImage
                    src={currentCard.mediaUrl}
                    alt=""
                    fit="contain"
                    wrapperClassName="m-auto w-full max-h-[60vh] min-h-[40vh] rounded-xl"
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
                <div className="my-auto w-full">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="my-4 text-[17px] leading-relaxed text-text-primary first:mt-0 last:mb-0 sm:text-[18px] sm:leading-[1.7]">
                          {children}
                        </p>
                      ),
                      h1: ({ children }) => (
                        <h3 className="mb-3 mt-5 text-[24px] font-extrabold leading-tight text-text-primary first:mt-0 sm:text-[26px]">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="mb-3 mt-5 text-[22px] font-extrabold leading-tight text-text-primary first:mt-0 sm:text-[24px]">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="mb-2 mt-4 text-[19px] font-extrabold leading-tight text-text-primary first:mt-0 sm:text-[20px]">
                          {children}
                        </h4>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-4 list-disc space-y-2 pl-6 text-[17px] leading-relaxed text-text-primary sm:text-[18px] sm:leading-[1.7]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-4 list-decimal space-y-2 pl-6 text-[17px] leading-relaxed text-text-primary sm:text-[18px] sm:leading-[1.7]">
                          {children}
                        </ol>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-text-primary">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic">{children}</em>,
                      blockquote: ({ children }) => (
                        <blockquote className="my-4 border-l-4 border-brand-blue/40 bg-brand-blue/5 px-4 py-3 text-[16px] italic leading-relaxed text-text-secondary sm:text-[17px]">
                          {children}
                        </blockquote>
                      ),
                      img: ({ src, alt }) =>
                        src ? (
                          <figure className="my-4 first:mt-0 last:mb-0">
                            <LazyImage
                              src={src}
                              alt={alt || ''}
                              wrapperClassName="aspect-video w-full rounded-2xl"
                            />
                            {alt && (
                              <figcaption className="mt-2 text-center text-[13px] italic leading-snug text-text-secondary sm:text-[14px]">
                                {alt}
                              </figcaption>
                            )}
                          </figure>
                        ) : null,
                      a: ({ href, children, ...rest }) => {
                        if (href && IMAGE_HREF_RE.test(href)) {
                          const caption =
                            typeof children === 'string'
                              ? children
                              : Array.isArray(children)
                                ? children
                                    .map((c) => (typeof c === 'string' ? c : ''))
                                    .join('')
                                : '';
                          return (
                            <figure className="my-4 first:mt-0 last:mb-0">
                              <LazyImage
                                src={href}
                                alt={caption}
                                wrapperClassName="aspect-video w-full rounded-2xl"
                              />
                              {caption && (
                                <figcaption className="mt-2 text-center text-[13px] italic leading-snug text-text-secondary sm:text-[14px]">
                                  {caption}
                                </figcaption>
                              )}
                            </figure>
                          );
                        }
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-brand-blue underline-offset-2 hover:underline"
                            {...rest}
                          >
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {currentCard.text}
                  </ReactMarkdown>
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
