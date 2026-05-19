import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { learningApi } from '../../lib/appApi.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type Recap = Awaited<ReturnType<typeof learningApi.getPracticeRecap>>['recap'];
type Entry = Recap['entries'][number];

// Local-time Monday-week-start, so dismissals roll over each week without
// needing a server-side "seenAt" column. ISO weeks (Mon-Sun) match how
// parents think about "this week."
function weekStartKey(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day + 6) % 7; // back to Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

const DISMISS_KEY_PREFIX = 'weekly-recap-dismissed:';

export const WeeklyRecapCard = () => {
  const { t } = useTranslation();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = useMemo(() => `${DISMISS_KEY_PREFIX}${weekStartKey()}`, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(dismissKey) === '1') {
        setDismissed(true);
      }
    } catch {
      // Private mode or storage disabled; treat as not dismissed.
    }
  }, [dismissKey]);

  useEffect(() => {
    if (dismissed) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await learningApi.getPracticeRecap(7);
        if (alive) setRecap(res.recap);
      } catch {
        if (alive) setRecap(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dismissed]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, '1');
    } catch {
      // Ignore; still hide for this session.
    }
    setDismissed(true);
  };

  if (loading || dismissed || !recap) return null;

  const hasActivity = recap.pledgesMade > 0 || recap.reflectionsLogged > 0;
  if (!hasActivity) return null;

  const wins = recap.entries.filter((e) => e.outcome === 'worked').slice(0, 3);
  const headline = buildHeadline(recap, t);

  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/10 via-surface to-surface p-4">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
            <Icon name={uiIcons.sparkles} className="h-5 w-5 object-contain" alt="" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
              {t('academy.recap.kicker', 'Your week in practice')}
            </p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-snug text-text-primary">
              {headline}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('academy.recap.hide', 'Hide for this week')}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-text-primary"
          >
            <Icon name={uiIcons.close} className="h-3 w-3 object-contain" alt="" />
          </button>
        </header>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Stat
            label={t('academy.recap.tried', 'Tried')}
            value={recap.pledgesMade}
            tone="blue"
          />
          {recap.outcomes.worked > 0 && (
            <Stat
              label={t('academy.recap.worked', 'Worked')}
              value={recap.outcomes.worked}
              tone="emerald"
            />
          )}
          {recap.outcomes.mixed > 0 && (
            <Stat
              label={t('academy.recap.mixed', 'Mixed')}
              value={recap.outcomes.mixed}
              tone="amber"
            />
          )}
          {recap.outcomes.didnt_work > 0 && (
            <Stat
              label={t('academy.recap.didntWork', "Didn't work")}
              value={recap.outcomes.didnt_work}
              tone="rose"
            />
          )}
        </div>

        {wins.length > 0 && (
          <ul className="mt-3 space-y-2">
            {wins.map((w) => (
              <WinRow key={w.practiceId} entry={w} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

type Tone = 'blue' | 'emerald' | 'amber' | 'rose';
const TONE_STYLES: Record<Tone, string> = {
  blue: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
};

const Stat = ({ label, value, tone }: { label: string; value: number; tone: Tone }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold',
      TONE_STYLES[tone],
    )}
  >
    <span className="tabular-nums">{value}</span>
    <span className="opacity-80">{label}</span>
  </span>
);

const WinRow = ({ entry }: { entry: Entry }) => {
  const { t } = useTranslation();
  const childPart = entry.childName ? ` ${t('academy.recap.with', 'with')} ${entry.childName}` : '';
  return (
    <li className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
        {t('academy.recap.win', 'Worked')}
        {childPart && <span className="ml-1 text-text-secondary">{childPart.trim()}</span>}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-text-primary">
        {entry.technique}
      </p>
      {entry.lessonTitle && (
        <p className="mt-0.5 truncate text-[11px] text-text-secondary">
          {entry.lessonTitle}
        </p>
      )}
    </li>
  );
};

function buildHeadline(
  recap: Recap,
  t: (key: string, fallback: string, vars?: Record<string, unknown>) => string,
): string {
  const { pledgesMade, outcomes } = recap;
  if (outcomes.worked > 0) {
    return t('academy.recap.headlineWorked', '{{n}} thing that worked this week', {
      n: outcomes.worked,
    });
  }
  if (recap.reflectionsLogged > 0) {
    return t('academy.recap.headlineReflected', '{{n}} reflections this week', {
      n: recap.reflectionsLogged,
    });
  }
  return t('academy.recap.headlinePledged', "{{n}} things you said you'd try", {
    n: pledgesMade,
  });
}
