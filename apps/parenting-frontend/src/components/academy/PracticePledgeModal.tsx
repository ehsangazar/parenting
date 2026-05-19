import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { learningApi } from '../../lib/appApi.js';
import { useAppContext } from '../app/AppContext.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { notifyGamificationChange } from '../app/BalancePills.js';

type PracticePledgeModalProps = {
  open: boolean;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onPledged?: () => void;
};

export const PracticePledgeModal = ({
  open,
  lessonId,
  lessonTitle,
  onClose,
  onPledged,
}: PracticePledgeModalProps) => {
  const { t } = useTranslation();
  const { activeFamily } = useAppContext();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [technique, setTechnique] = useState('');
  const [childId, setChildId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const children = (activeFamily?.children ?? []).filter(
    (c) => !c.isUnborn && c.name,
  );

  useEffect(() => {
    if (!open) return;
    setTechnique('');
    setChildId(children.length === 1 ? children[0].id ?? '' : '');
    const handle = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // children list identity changes on every render; we only want to seed on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const trimmed = technique.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await learningApi.pledgePractice(lessonId, {
        technique: trimmed,
        childId: childId || null,
      });
      toast.success(
        t(
          'academy.practice.pledged',
          "Pledge saved. We'll check in tomorrow to see how it went.",
        ),
      );
      notifyGamificationChange();
      onPledged?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.practice.pledgeFailed', 'Could not save your pledge.'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="practice-pledge-modal"
          className="fixed inset-0 z-[130] flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="practice-pledge-title"
        >
          <motion.div
            className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-3xl"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-shrink-0 items-start gap-3 border-b border-border-light px-5 py-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <Icon
                  name={uiIcons.sparkles}
                  className="h-5 w-5 object-contain"
                  alt=""
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-pink">
                  {t('academy.practice.tryIt', 'Try it this week')}
                </p>
                <h2
                  id="practice-pledge-title"
                  className="mt-0.5 text-[17px] font-extrabold leading-tight text-text-primary"
                >
                  {lessonTitle}
                </h2>
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

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                {t(
                  'academy.practice.pledgeIntro',
                  'Reading is the easy part. Pick one specific thing to try with your child in the next day or two. We will check in.',
                )}
              </p>

              <label className="mt-4 block text-[13px] font-bold text-text-primary">
                {t('academy.practice.techniqueLabel', 'What will you try?')}
              </label>
              <textarea
                ref={inputRef}
                value={technique}
                onChange={(e) => setTechnique(e.target.value.slice(0, 280))}
                placeholder={t(
                  'academy.practice.techniquePlaceholder',
                  "e.g. Two-step warning before bath time + a cuddle if she resists",
                )}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-surface-light px-3 py-2 text-[14px] leading-relaxed text-text-primary focus:border-brand-blue focus:outline-none"
              />
              <p className="mt-1 text-right text-[11px] text-text-secondary">
                {technique.length}/280
              </p>

              {children.length > 1 && (
                <>
                  <label className="mt-3 block text-[13px] font-bold text-text-primary">
                    {t('academy.practice.childLabel', 'With which child?')}
                  </label>
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface-light px-3 py-2 text-[14px] text-text-primary focus:border-brand-blue focus:outline-none"
                  >
                    <option value="">
                      {t('academy.practice.childUnspecified', 'Not specific to one child')}
                    </option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-light px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="text-[13px] font-semibold text-text-secondary hover:text-text-primary"
              >
                {t('academy.practice.skip', 'Skip for now')}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !technique.trim()}
                className="rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-extrabold text-white hover:brightness-110 disabled:opacity-50"
              >
                {saving
                  ? t('common.saving', 'Saving...')
                  : t('academy.practice.pledgeButton', "I'll try this")}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
