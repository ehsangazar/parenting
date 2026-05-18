import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icons/index.js';
import type { IconName } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { SEO } from '../components/SEO.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

export const FeaturesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocalePath();

  const FEATURES: { icon: IconName; titleKey: string; bodyKey: string; detailKey: string }[] = [
    { icon: 'idea',          titleKey: 'home.features.f1Title', bodyKey: 'home.features.f1Body', detailKey: 'featuresPage.f1Detail' },
    { icon: 'calendar',      titleKey: 'home.features.f2Title', bodyKey: 'home.features.f2Body', detailKey: 'featuresPage.f2Detail' },
    { icon: 'reading_ebook', titleKey: 'home.features.f3Title', bodyKey: 'home.features.f3Body', detailKey: 'featuresPage.f3Detail' },
    { icon: 'camera',        titleKey: 'home.features.f4Title', bodyKey: 'home.features.f4Body', detailKey: 'featuresPage.f4Detail' },
    { icon: 'organization',  titleKey: 'home.features.f5Title', bodyKey: 'home.features.f5Body', detailKey: 'featuresPage.f5Detail' },
    { icon: 'like',          titleKey: 'home.features.f6Title', bodyKey: 'home.features.f6Body', detailKey: 'featuresPage.f6Detail' },
  ];

  const TRUST = [
    { icon: uiIcons.sparkles, labelKey: 'featuresPage.trustT1Label', bodyKey: 'featuresPage.trustT1Body' },
    { icon: uiIcons.shield,   labelKey: 'featuresPage.trustT2Label', bodyKey: 'featuresPage.trustT2Body' },
    { icon: uiIcons.users,    labelKey: 'featuresPage.trustT3Label', bodyKey: 'featuresPage.trustT3Body' },
  ];

  return (
    <>
      <SEO
        title={t('featuresPage.seoTitle')}
        description={t('featuresPage.seoDescription')}
        canonical="/features"
      />

      <div>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-background pb-24 pt-16">
          <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-secondary-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-3xl px-6 text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              <Icon name={uiIcons.sparkles} className="h-3.5 w-3.5" alt="" /> {t('featuresPage.heroBadge')}
            </span>

            <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              {t('featuresPage.heroH1')}{' '}
              <span className="text-primary-600">{t('featuresPage.heroH1Highlight')}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-text-secondary">
              {t('featuresPage.heroDescription')}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(localePath('/register'))}
                className="btn-duo-green-pill-lg"
              >
                {t('featuresPage.heroGetStarted')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
              </button>
              <button
                type="button"
                onClick={() => navigate(localePath('/mission'))}
                className="btn-duo-outline-pill-lg"
              >
                {t('featuresPage.heroLearnMission')}
              </button>
            </div>
          </div>
        </section>

        {/* ===== FEATURE CARDS ===== */}
        <section className="bg-surface py-12">
          <div className="mx-auto max-w-3xl px-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {FEATURES.map(({ icon, titleKey, bodyKey, detailKey }) => (
                <div
                  key={titleKey}
                  className="card-hover rounded-3xl border border-border-light bg-background p-8 shadow-sm"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                    <Icon name={icon} className="h-8 w-8 text-primary-600" alt="" aria-hidden />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-text-primary">
                    {t(titleKey)}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-primary-600">
                    {t(bodyKey)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {t(detailKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TRUST PILLARS ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('featuresPage.trustEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('featuresPage.trustHeading')}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {TRUST.map(({ icon, labelKey, bodyKey }) => (
                <div
                  key={labelKey}
                  className="card-hover rounded-3xl border border-border-light bg-surface p-6 shadow-sm text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
                    <Icon name={icon} className="h-6 w-6 text-primary-700" alt="" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{t(labelKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6">
            <div className="overflow-hidden rounded-[32px] bg-primary-fg p-10 text-center shadow-xl ring-1 ring-white/10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Icon name={uiIcons.sparkles} className="h-8 w-8 text-white" aria-hidden />
              </div>
              <h2 className="font-display text-3xl font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
                {t('featuresPage.ctaHeading')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/90 leading-relaxed">
                {t('featuresPage.ctaBody')}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(localePath('/register'))}
                  className="btn-duo-sky inline-flex items-center gap-2 !min-h-12 !rounded-full !px-8 !py-3 !text-sm"
                >
                  {t('featuresPage.ctaGetStarted')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 brightness-0 invert" alt="" />
                </button>
                <a
                  href="mailto:partnerships@raised.app"
                  className="rounded-full border border-white/40 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {t('featuresPage.ctaPartner')}
                </a>
              </div>
              <p className="mt-4 text-xs font-medium text-white/75">{t('featuresPage.ctaNoCard')}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
