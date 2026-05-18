import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { SEO } from '../components/SEO.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

export const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { localePath } = useLocalePath();

  const BELIEFS = [
    { icon: uiIcons.sparkles, title: t('aboutPage.belief1Title'), body: t('aboutPage.belief1Body') },
    { icon: uiIcons.globe,    title: t('aboutPage.belief2Title'), body: t('aboutPage.belief2Body') },
    { icon: uiIcons.heart,    title: t('aboutPage.belief3Title'), body: t('aboutPage.belief3Body') },
    { icon: uiIcons.users,    title: t('aboutPage.belief4Title'), body: t('aboutPage.belief4Body') },
  ];

  const PILLARS = [
    { emoji: '🤖', title: t('aboutPage.pillar1Title'), body: t('aboutPage.pillar1Body') },
    { emoji: '🎓', title: t('aboutPage.pillar2Title'), body: t('aboutPage.pillar2Body') },
    { emoji: '📷', title: t('aboutPage.pillar3Title'), body: t('aboutPage.pillar3Body') },
    { emoji: '🏘️', title: t('aboutPage.pillar4Title'), body: t('aboutPage.pillar4Body') },
    { emoji: '📅', title: t('aboutPage.pillar5Title'), body: t('aboutPage.pillar5Body') },
    { emoji: '📖', title: t('aboutPage.pillar6Title'), body: t('aboutPage.pillar6Body') },
  ];

  const STATS = [
    { value: '90%',   label: t('aboutPage.stat1Label'), source: t('aboutPage.stat1Source') },
    { value: '250M+', label: t('aboutPage.stat2Label'), source: t('aboutPage.stat2Source') },
    { value: '1 in 3', label: t('aboutPage.stat3Label'), source: t('aboutPage.stat3Source') },
    { value: '£10+',  label: t('aboutPage.stat4Label'), source: t('aboutPage.stat4Source') },
  ];

  return (
    <>
      <SEO
        title={t('aboutPage.seoTitle')}
        description={t('aboutPage.seoDescription')}
        canonical="/about"
      />

      <div>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-background pb-24 pt-16">
          <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-secondary-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-3xl px-6 text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              <Icon name={uiIcons.heart} className="h-3.5 w-3.5" alt="" /> {t('aboutPage.heroBadge')}
            </span>

            <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              {t('aboutPage.heroH1Part1')}{' '}
              <span className="text-primary-600">{t('aboutPage.heroH1Highlight')}</span>{' '}
              {t('aboutPage.heroH1Part2')}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-text-secondary">
              {t('aboutPage.heroDescription')}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate(localePath('/register'))}
                className="btn-duo-green-pill-lg"
              >
                {t('aboutPage.heroGetStarted')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
              </button>
              <Link
                to={localePath('/mission')}
                className="btn-duo-outline-pill-lg inline-flex items-center justify-center no-underline"
              >
                {t('aboutPage.heroMission')}
              </Link>
            </div>
          </div>
        </section>

        {/* ===== VISION ===== */}
        <section className="bg-surface py-12">
          <div className="mx-auto max-w-3xl px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                  {t('aboutPage.visionEyebrow')}
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                  {t('aboutPage.visionHeading')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-text-secondary">
                  {t('aboutPage.visionP1')}
                </p>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">
                  {t('aboutPage.visionP2')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STATS.map(({ value, label, source }) => (
                  <div
                    key={value}
                    className="card-hover rounded-3xl border border-border-light bg-background p-5 shadow-sm"
                  >
                    <p className="text-3xl font-black text-primary-600">{value}</p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-text-primary">{label}</p>
                    <p className="mt-2 text-[12px] text-text-secondary">{source}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHAT WE BELIEVE ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('aboutPage.valuesEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('aboutPage.valuesHeading')}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {BELIEFS.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="card-hover rounded-3xl border border-border-light bg-surface p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                    <Icon name={icon} className="h-5 w-5 text-primary-700" alt="" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRODUCT ===== */}
        <section className="bg-surface py-12">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('aboutPage.platformEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('aboutPage.platformHeading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('aboutPage.platformSubheading')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PILLARS.map(({ emoji, title, body }) => (
                <div
                  key={title}
                  className="card-hover rounded-3xl border border-primary-200 bg-surface p-6 shadow-sm"
                >
                  <span className="text-3xl">{emoji}</span>
                  <h3 className="mt-3 font-semibold text-text-primary">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== RAISED FOR ALL ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="overflow-hidden rounded-3xl border border-primary-200 bg-surface p-8 md:p-12 shadow-sm">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
                    <Icon name={uiIcons.globe} className="h-3.5 w-3.5" alt="" /> {t('aboutPage.raisedForAllBadge')}
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-text-primary md:text-3xl">
                    {t('aboutPage.raisedForAllHeading')}
                  </h2>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-text-secondary">
                    {t('aboutPage.raisedForAllBody')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(localePath('/register'))}
                      className="btn-duo-green-pill"
                    >
                      {t('aboutPage.joinRaised')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
                    </button>
                    <Link
                      to={localePath('/mission')}
                      className="btn-duo-outline-pill inline-flex items-center justify-center no-underline"
                    >
                      {t('aboutPage.readMission')}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                  {['🇳🇬 Nigeria', '🇵🇰 Pakistan', '🇰🇪 Kenya', '🇧🇩 Bangladesh', '🇮🇳 India', '🇬🇭 Ghana'].map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border-light bg-background px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      {c}
                    </span>
                  ))}
                  <span className="rounded-full border border-dashed border-border-light px-3 py-1.5 text-xs font-medium text-text-secondary">
                    {t('aboutPage.moreRegions')}
                  </span>
                </div>
              </div>
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
                {t('aboutPage.ctaHeading')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/90 leading-relaxed">
                {t('aboutPage.ctaBody')}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(localePath('/register'))}
                  className="btn-duo-sky inline-flex items-center gap-2 !min-h-12 !rounded-full !px-8 !py-3 !text-sm"
                >
                  {t('aboutPage.ctaGetStarted')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 brightness-0 invert" alt="" />
                </button>
                <a
                  href="mailto:partnerships@raised.app"
                  className="rounded-full border border-white/40 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {t('aboutPage.ctaPartner')}
                </a>
              </div>
              <p className="mt-4 text-xs font-medium text-white/75">{t('aboutPage.ctaNoCard')}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
