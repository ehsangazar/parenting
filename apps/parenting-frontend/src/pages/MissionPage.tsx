import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { PublicSiteHeader } from '../components/PublicSiteHeader.js';
import { PublicFooter } from '../components/PublicFooter.js';
import { SEO } from '../components/SEO.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

const STAT_KEYS = ['stat1', 'stat2', 'stat3', 'stat4'] as const;
const STAT_ICONS = [uiIcons.sparkles, uiIcons.globe, uiIcons.users, uiIcons.heart] as const;

const HOW_STEPS = [
  { step: '01', key: 'step1' as const, color: 'bg-primary-50 border-primary-200', numColor: 'text-primary-500' },
  { step: '02', key: 'step2' as const, color: 'bg-secondary-50 border-secondary-200', numColor: 'text-secondary-600' },
  { step: '03', key: 'step3' as const, color: 'bg-primary-50 border-primary-200', numColor: 'text-primary-500' },
];

const COUNTRY_KEYS = [
  { flag: '🇳🇬', key: 'nigeria' },
  { flag: '🇵🇰', key: 'pakistan' },
  { flag: '🇰🇪', key: 'kenya' },
  { flag: '🇧🇩', key: 'bangladesh' },
  { flag: '🇮🇳', key: 'india' },
  { flag: '🇬🇭', key: 'ghana' },
  { flag: '🇺🇬', key: 'uganda' },
  { flag: '🇹🇿', key: 'tanzania' },
  { flag: '🇪🇹', key: 'ethiopia' },
  { flag: '🇿🇦', key: 'southAfrica' },
  { flag: '🇵🇭', key: 'philippines' },
  { flag: '🇮🇩', key: 'indonesia' },
] as const;

const FREE_KEYS = ['free1', 'free2', 'free3'] as const;
const FREE_ICONS = [uiIcons.sparkles, uiIcons.bookOpen, uiIcons.users] as const;

export const MissionPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocalePath();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SEO
        title={t('missionPage.seoTitle')}
        description={t('missionPage.seoDescription')}
        canonical="/mission"
      />
      <PublicSiteHeader />

      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-background pb-20 pt-16">
          <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-secondary-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-6 text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              <Icon name={uiIcons.globe} className="h-3.5 w-3.5" alt="" /> {t('missionPage.heroBadge')}
            </span>

            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-text-primary md:text-5xl lg:text-6xl">
              {t('missionPage.heroH1Before')}{' '}
              <span className="text-primary-600">{t('missionPage.heroH1Highlight')}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
              {t('missionPage.heroLead')}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(localePath('/register'))}
                className="btn-duo-green-pill-lg"
              >
                {t('missionPage.heroCtaJoin')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
              </button>
              <a
                href="mailto:partnerships@raised.app"
                className="btn-duo-outline-pill-lg inline-flex items-center justify-center no-underline"
              >
                {t('missionPage.heroCtaPartner')}
              </a>
            </div>

            <div className="mt-14 overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/images/mission-hero.png"
                alt="Diverse families from around the world — the Raised for All mission"
                className="w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* ===== THE PROBLEM ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('missionPage.problemEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-text-primary md:text-4xl">
                {t('missionPage.problemHeading')}
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {STAT_KEYS.map((statKey, i) => (
                <div
                  key={statKey}
                  className="card-hover rounded-3xl border border-border-light bg-surface p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 mb-4">
                    <Icon name={STAT_ICONS[i]} className="h-6 w-6" alt="" />
                  </div>
                  <p className="text-4xl font-bold text-primary-600">{t(`missionPage.${statKey}Value`)}</p>
                  <p className="mt-2 text-text-primary font-medium leading-snug">{t(`missionPage.${statKey}Label`)}</p>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {t('missionPage.statSciencePrefix')} {t(`missionPage.${statKey}Source`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('missionPage.modelEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-text-primary md:text-4xl">
                {t('missionPage.modelHeading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('missionPage.modelLead')}
              </p>
            </div>

            <div className="space-y-4">
              {HOW_STEPS.map(({ step, key, color, numColor }) => (
                <div key={step} className={`rounded-3xl border p-6 ${color}`}>
                  <div className="flex items-start gap-5">
                    <span className={`text-4xl font-black ${numColor} flex-shrink-0 leading-none`}>
                      {step}
                    </span>
                    <div>
                      <h3 className="font-semibold text-text-primary">{t(`missionPage.${key}Title`)}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{t(`missionPage.${key}Body`)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COUNTRIES ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
              {t('missionPage.reachEyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-text-primary md:text-4xl">
              {t('missionPage.reachHeading')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
              {t('missionPage.reachLead')}
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {COUNTRY_KEYS.map(({ flag, key }) => (
                <div
                  key={key}
                  className="card-hover flex flex-col items-center gap-2 rounded-2xl border border-border-light bg-surface p-4 shadow-sm"
                >
                  <span className="text-3xl">{flag}</span>
                  <span className="text-xs font-medium text-text-secondary">{t(`missionPage.countries.${key}`)}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-light p-4">
                <Icon name={uiIcons.mapPin} className="h-7 w-7 opacity-70" alt="" />
                <span className="text-xs font-medium text-text-tertiary">{t('missionPage.countriesMore')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHAT THEY GET ===== */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('missionPage.freeEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-text-primary md:text-4xl">
                {t('missionPage.freeHeading')}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FREE_KEYS.map((freeKey, i) => (
                <div
                  key={freeKey}
                  className="card-hover rounded-3xl border border-primary-200 bg-surface p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
                    <Icon name={FREE_ICONS[i]} className="h-6 w-6" alt="" />
                  </div>
                  <h3 className="mt-4 font-semibold text-text-primary">{t(`missionPage.${freeKey}Title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(`missionPage.${freeKey}Body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="overflow-hidden rounded-[32px] bg-primary-700 p-10 shadow-xl text-center ring-1 ring-white/10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Icon name={uiIcons.heart} className="h-8 w-8 text-white" aria-hidden />
              </div>
              <h2 className="font-display text-3xl font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
                {t('missionPage.bottomCtaTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/95 leading-relaxed">
                {t('missionPage.bottomCtaBody')}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(localePath('/register'))}
                  className="btn-duo-sky inline-flex items-center gap-2 !min-h-12 !rounded-full !px-8 !py-3 !text-sm"
                >
                  {t('missionPage.bottomCtaPrimary')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 brightness-0 invert" alt="" />
                </button>
                <a
                  href="mailto:partnerships@raised.app"
                  className="rounded-full border border-white/40 bg-white/5 px-8 py-3 text-sm font-semibold text-white hover:bg-white/15 transition"
                >
                  {t('missionPage.bottomCtaPartner')}
                </a>
              </div>
              <p className="mt-4 text-xs font-medium text-white/85">{t('missionPage.bottomCtaNoCard')}</p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
