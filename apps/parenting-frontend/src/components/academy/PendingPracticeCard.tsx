import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { learningApi } from '../../lib/appApi.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { notifyGamificationChange } from '../app/BalancePills.js';

type Pending = Awaited<ReturnType<typeof learningApi.getPendingPractices>>['practices'][number];
type Outcome = 'worked' | 'mixed' | 'didnt_work';

const OUTCOME_STYLES: Record<Outcome, string> = {
  worked: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
  mixed: 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  didnt_work: 'border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20',
};

type PendingPracticeCardProps = {
  // IDs handled elsewhere on the page (e.g. by TodayCard) so we don't double-render them.
  hidePracticeIds?: string[];
};

export const PendingPracticeCard = ({ hidePracticeIds }: PendingPracticeCardProps = {}) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [practices, setPractices] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftOutcome, setDraftOutcome] = useState<Outcome | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);

  const focusId = searchParams.get('reflect');

  const reload = useCallback(async () => {
    try {
      const res = await learningApi.getPendingPractices();
      setPractices(res.practices);
    } catch {
      setPractices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!focusId || practices.length === 0) return;
    const hit = practices.find((p) => p.id === focusId);
    if (hit) {
      setExpandedId(hit.id);
      setDraftOutcome(null);
      setDraftNote('');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('reflect');
          return next;
        },
        { replace: true },
      );
    }
  }, [focusId, practices, setSearchParams]);

  const submitOutcome = async (id: string, outcome: Outcome, note: string) => {
    setSaving(true);
    try {
      await learningApi.reflectPractice(id, {
        outcome,
        note: note.trim() || undefined,
      });
      toast.success(
        t('academy.practice.reflectionSaved', 'Reflection saved. Nice work showing up.'),
      );
      notifyGamificationChange();
      setExpandedId(null);
      setDraftOutcome(null);
      setDraftNote('');
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.practice.reflectFailed', 'Could not save your reflection.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const dismiss = async (id: string) => {
    try {
      await learningApi.dismissPractice(id);
      setPractices((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('academy.practice.dismissFailed', 'Could not dismiss.'),
      );
    }
  };

  const hideSet = new Set(hidePracticeIds ?? []);
  const visible = practices.filter((p) => !hideSet.has(p.id));

  if (loading || visible.length === 0) return null;

  return (
    <section className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {t('academy.practice.heading', 'How did it go?')}
      </p>
      <ul className="space-y-3">
        {visible.map((p) => {
          const expanded = expandedId === p.id;
          const childPart = p.childName ? ` ${t('academy.practice.with', 'with')} ${p.childName}` : '';
          return (
            <li
              key={p.id}
              className="rounded-2xl border border-brand-pink/30 bg-gradient-to-br from-brand-pink/10 via-surface to-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink">
                  <Icon name={uiIcons.sparkles} className="h-5 w-5 object-contain" alt="" />
                </span>
                <div className="min-w-0 flex-1">
                  {p.lessonTitle && (
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-pink">
                      {p.lessonTitle}
                    </p>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-[15px] font-extrabold leading-snug text-text-primary">
                    {p.technique}
                  </p>
                  {(p.childName || p.overdueHours > 0) && (
                    <p className="mt-0.5 text-[12px] text-text-secondary">
                      {childPart.trim()}
                      {p.overdueHours > 0 && (
                        <span className="ml-1 text-amber-600">
                          {t('academy.practice.overdue', '{{h}}h ago', { h: p.overdueHours })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(p.id)}
                  aria-label={t('academy.practice.dismiss', 'Dismiss')}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-text-primary"
                >
                  <Icon name={uiIcons.close} className="h-3 w-3 object-contain" alt="" />
                </button>
              </div>

              {!expanded && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(['worked', 'mixed', 'didnt_work'] as Outcome[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        setExpandedId(p.id);
                        setDraftOutcome(o);
                        setDraftNote('');
                      }}
                      className={clsx(
                        'rounded-xl border px-2 py-2 text-[12px] font-extrabold transition-colors',
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
              )}

              {expanded && draftOutcome && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold',
                        OUTCOME_STYLES[draftOutcome],
                      )}
                    >
                      {draftOutcome === 'worked'
                        ? t('academy.practice.worked', 'Worked')
                        : draftOutcome === 'mixed'
                          ? t('academy.practice.mixed', 'Mixed')
                          : t('academy.practice.didntWork', "Didn't work")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(null);
                        setDraftOutcome(null);
                      }}
                      className="text-[12px] font-semibold text-text-secondary hover:text-text-primary"
                    >
                      {t('common.change', 'Change')}
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value.slice(0, 500))}
                    placeholder={t(
                      'academy.practice.notePlaceholder',
                      'Optional: one sentence on what happened',
                    )}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[13px] leading-snug text-text-primary focus:border-brand-blue focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => submitOutcome(p.id, draftOutcome, draftNote)}
                      disabled={saving}
                      className="rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-extrabold text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {saving
                        ? t('common.saving', 'Saving...')
                        : t('academy.practice.saveReflection', 'Save reflection')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
