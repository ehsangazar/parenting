import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { toast } from 'sonner';
import { uiIcons } from '../../lib/iconSemantics.js';
import { Icon } from '../../components/icons/index.js';

const HUB_BG = '#F8F9FE';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E0E7FF';

interface LeapSummary {
  leapNumber: number;
  eligible: boolean;
  ageRange: [number, number] | null;
  foundation: {
    moduleId: string | null;
    total: number;
    completed: number;
  };
  playbooks: {
    total: number;
    tried: number;
  };
}

const LEAP_META: Record<number, { labelKey: string; ageLabelKey: string; descriptionKey: string; color: string }> = {
  1: {
    labelKey: 'leaps.leap1Label',
    ageLabelKey: 'leaps.leap1AgeLabel',
    descriptionKey: 'leaps.leap1Description',
    color: '#C084FC',
  },
};

export const LeapHubPage = () => {
  const { t } = useTranslation();
  const { leapNumber } = useParams<{ leapNumber: string }>();
  const leap = parseInt(leapNumber ?? '1', 10);
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const [summary, setSummary] = useState<LeapSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const rawMeta = LEAP_META[leap];
  const meta = rawMeta ? {
    label: t(rawMeta.labelKey),
    ageLabel: t(rawMeta.ageLabelKey),
    description: t(rawMeta.descriptionKey),
    color: rawMeta.color,
  } : undefined;

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get(`/api/leaps/${leap}/summary`);
        setSummary(res.data);
      } catch {
        toast.error(t('leaps.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [leap]);

  if (loading) {
    return (
      <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
        <div className="mx-auto max-w-2xl animate-pulse px-4 pb-16 pt-8 lg:px-6">
          <div className="mb-4 h-8 w-40 rounded-lg bg-surface-light/30" />
          <div className="h-44 rounded-2xl bg-surface-light/30" />
          <div className="mt-4 h-36 rounded-2xl bg-surface-light/30" />
          <div className="mt-4 h-36 rounded-2xl bg-surface-light/30" />
        </div>
      </div>
    );
  }

  if (!summary || !meta) {
    return (
      <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
        <div className="mx-auto max-w-2xl px-4 pt-12 text-center">
          <p className="text-[#8a9399]">{t('leaps.notFound')}</p>
        </div>
      </div>
    );
  }

  const { foundation, playbooks } = summary;
  const foundationPct = foundation.total > 0 ? Math.round((foundation.completed / foundation.total) * 100) : 0;

  const LEAP_BANNER: Record<number, string> = {
    1: '/images/leap1-banner.png',
  };
  const bannerSrc = LEAP_BANNER[leap];

  return (
    <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 lg:px-6 lg:pb-16 lg:pt-8">

        {/* Banner image */}
        {bannerSrc && (
          <div className="mb-6 overflow-hidden rounded-2xl shadow-sm">
            <img
              src={bannerSrc}
              alt={`Leap ${leap} — developmental milestone`}
              className="w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8a9399]">
              {t('leaps.developmentalLeaps')}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">{meta.label}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
            >
              {meta.ageLabel}
            </span>
          </div>
          <p className="mt-3 text-sm text-[#8a9399]">{meta.description}</p>
        </div>

        {/* Ineligible gate */}
        {!summary.eligible && (
          <div
            className="mb-6 rounded-2xl border px-5 py-4"
            style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}
          >
            <p className="text-sm font-semibold text-text-secondary">
              {t('leaps.ineligibleMessage', { ageLabel: meta.ageLabel })}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {t('leaps.ineligibleHint')}
            </p>
          </div>
        )}

        {/* Foundation card */}
        <section className="mb-4">
          <button
            type="button"
            disabled={!summary.eligible || !foundation.moduleId}
            onClick={() => {
              if (foundation.moduleId) navigate(toApp(`/app/learning/${foundation.moduleId}`));
            }}
            className="relative flex w-full flex-col rounded-2xl border p-5 text-left transition-colors hover:bg-[#243545] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C084FC]/15">
                <span className="text-2xl" aria-hidden>🧬</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">{t('leaps.theScience')}</h2>
                <p className="mt-0.5 text-xs text-[#8a9399]">
                  {t('leaps.scienceLessonsSubtitle')}
                </p>
              </div>
              <Icon
                name={uiIcons.arrowRight}
                className="mt-0.5 h-5 w-5 shrink-0 object-contain opacity-50"
                alt=""
                aria-hidden
              />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-[#8a9399]">
                <span>
                  {t('leaps.lessonsProgress', { completed: foundation.completed, total: foundation.total })}
                </span>
                <span className="font-semibold" style={{ color: '#C084FC' }}>
                  {foundationPct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8EDFF]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${foundationPct}%`, backgroundColor: '#C084FC' }}
                />
              </div>
            </div>
          </button>
        </section>

        {/* Playbooks card — hidden for now */}
        {false && <section>
          <button
            type="button"
            disabled={!summary!.eligible}
            onClick={() => navigate(toApp(`/app/leaps/${leap}/playbooks`))}
            className="relative flex w-full flex-col rounded-2xl border p-5 text-left transition-colors hover:bg-[#243545] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7B8FFF]/15">
                <span className="text-2xl" aria-hidden>🎯</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">The Plays</h2>
                <p className="mt-0.5 text-xs text-[#8a9399]">
                  {playbooks.total} activities — pick any, try today, come back anytime
                </p>
              </div>
              <Icon
                name={uiIcons.arrowRight}
                className="mt-0.5 h-5 w-5 shrink-0 object-contain opacity-50"
                alt=""
                aria-hidden
              />
            </div>

            {/* Progress */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-[#8a9399]">
              <span>No set order — explore freely</span>
              <span className="font-bold text-[#7B8FFF]">
                {playbooks.tried} tried
              </span>
            </div>

            {/* Dot progress */}
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from({ length: Math.min(playbooks.total, 36) }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: i < playbooks.tried ? '#7B8FFF' : '#E8EDFF',
                  }}
                />
              ))}
            </div>
          </button>
        </section>}
      </div>
    </div>
  );
};
