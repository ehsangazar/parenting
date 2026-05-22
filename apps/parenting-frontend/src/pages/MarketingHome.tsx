import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { appAssetIcons } from '../lib/appAssetIcons.js';
import { SEO } from '../components/SEO.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

const PENDING_KEY = 'pendingChatMessage';

export const MarketingHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localePath } = useLocalePath();
  const [ask, setAsk] = useState('');

  const stashAndRegister = (question: string) => {
    if (question.trim()) {
      try { localStorage.setItem(PENDING_KEY, question.trim()); } catch { /* private mode etc. */ }
    }
    navigate(localePath('/register'));
  };

  const handleAskSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    stashAndRegister(ask);
  };

  const askExamples = [
    t('marketingHome.askExample1'),
    t('marketingHome.askExample2'),
    t('marketingHome.askExample3'),
    t('marketingHome.askExample4'),
    t('marketingHome.askExample5'),
    t('marketingHome.askExample6'),
  ];

  const trustSources = [
    t('marketingHome.trustSourceNhs'),
    t('marketingHome.trustSourceWho'),
    t('marketingHome.trustSourceAap'),
    t('marketingHome.trustSourceNice'),
  ];

  const featureCards = [
    { icon: uiIcons.sparkles, titleKey: 'marketingHome.feature1Title', bodyKey: 'marketingHome.feature1Body' },
    { icon: uiIcons.bookOpen, titleKey: 'marketingHome.feature2Title', bodyKey: 'marketingHome.feature2Body' },
    { icon: uiIcons.calendar, titleKey: 'marketingHome.feature3Title', bodyKey: 'marketingHome.feature3Body' },
  ];

  const year = new Date().getFullYear();

  return (
    <>
      <SEO
        title={t('marketingHome.seoTitle')}
        description={t('marketingHome.seoDescription')}
        canonical="/"
      />

      <div className="min-h-screen bg-background text-text-primary">
        {/* ===== TOP NAV ===== */}
        <header className="sticky top-0 z-30 border-b border-border-light bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-6">
            <Link to={localePath('/')} className="text-[17px] font-extrabold tracking-tight text-text-primary no-underline">
              Raised
            </Link>
            <nav className="hidden gap-6 text-[14px] font-semibold text-text-secondary md:flex">
              <Link to={localePath('/features')} className="hover:text-text-primary no-underline">{t('marketingHome.navFeatures')}</Link>
              <Link to={localePath('/about')} className="hover:text-text-primary no-underline">{t('marketingHome.navAbout')}</Link>
              <Link to={localePath('/mission')} className="hover:text-text-primary no-underline">{t('marketingHome.navMission')}</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                to={localePath('/login')}
                className="hidden rounded-full px-4 py-2 text-[14px] font-semibold text-text-primary hover:bg-surface-light sm:inline-flex no-underline"
              >
                {t('marketingHome.navSignIn')}
              </Link>
              <Link to={localePath('/register')} className="btn-duo-green-pill no-underline">
                {t('marketingHome.navGetStarted')}
              </Link>
            </div>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden pb-20 pt-12 sm:pt-16">
          <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-secondary-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              <Icon name={uiIcons.users} className="h-3.5 w-3.5" alt="" /> {t('marketingHome.heroBadge')}
            </span>

            <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-text-primary sm:text-5xl">
              {t('marketingHome.heroH1Part1')}{' '}
              <span className="text-primary-600">{t('marketingHome.heroH1Highlight')}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
              {t('marketingHome.heroSubtitle')}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-[13px] font-semibold text-primary-700">
              <Icon name={uiIcons.shield} className="h-4 w-4" alt="" />
              {t('marketingHome.heroPrivacyPill')}
            </div>

            <form onSubmit={handleAskSubmit} className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder={t('marketingHome.heroAskPlaceholder')}
                aria-label={t('marketingHome.heroAskPlaceholder')}
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary-500"
              />
              <button type="submit" className="btn-duo-green-pill-lg">
                {t('marketingHome.heroAskCta')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to={localePath('/register')} className="btn-duo-outline-pill-lg inline-flex items-center justify-center no-underline">
                {t('marketingHome.heroPrimaryCta')}
              </Link>
              <Link to={localePath('/features')} className="text-[14px] font-semibold text-text-secondary hover:text-text-primary no-underline">
                {t('marketingHome.heroSecondaryCta')} →
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-text-tertiary">{t('marketingHome.heroNoCard')}</p>
          </div>
        </section>

        {/* ===== COMPARISON ===== */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-4xl px-5 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('marketingHome.comparisonEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('marketingHome.comparisonHeading')}
              </h2>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-border-light bg-background p-6 shadow-sm opacity-80">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-light">
                  <Icon name={appAssetIcons.aiGuide} className="h-5 w-5 text-text-tertiary" alt="" />
                </div>
                <h3 className="font-semibold text-text-primary">{t('marketingHome.comparisonChatGptLabel')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('marketingHome.comparisonChatGptBody')}</p>
              </div>
              <div className="rounded-3xl border border-border-light bg-background p-6 shadow-sm opacity-80">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-light">
                  <Icon name={uiIcons.globe} className="h-5 w-5 text-text-tertiary" alt="" />
                </div>
                <h3 className="font-semibold text-text-primary">{t('marketingHome.comparisonGoogleLabel')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('marketingHome.comparisonGoogleBody')}</p>
              </div>
              <div className="rounded-3xl border-2 border-primary-400 bg-background p-6 shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100">
                  <Icon name={uiIcons.sparkles} className="h-5 w-5 text-primary-700" alt="" />
                </div>
                <h3 className="font-semibold text-text-primary">{t('marketingHome.comparisonRaisedLabel')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('marketingHome.comparisonRaisedBody')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ASK EXAMPLES ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('marketingHome.askExamplesEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('marketingHome.askExamplesHeading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('marketingHome.askExamplesSub')}
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-2">
              {askExamples.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => stashAndRegister(q)}
                  className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-[14px] font-medium text-text-primary transition-colors hover:border-primary-400 hover:bg-surface-light"
                >
                  <Icon name={uiIcons.sparkles} className="h-4 w-4 flex-shrink-0 text-primary-600" alt="" />
                  <span>{q}</span>
                  <Icon name={uiIcons.arrowRight} className="ml-auto h-4 w-4 flex-shrink-0 text-text-tertiary" alt="" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
              {t('marketingHome.trustEyebrow')}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
              {t('marketingHome.trustHeading')}
            </h2>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {trustSources.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border-light bg-background px-5 py-2 text-sm font-bold tracking-wide text-text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-text-secondary">
              {t('marketingHome.trustExpertReviewed')}
            </p>
          </div>
        </section>

        {/* ===== FEATURES SNAPSHOT ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-5 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                {t('marketingHome.featuresEyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('marketingHome.featuresHeading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('marketingHome.featuresSub')}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {featureCards.map(({ icon, titleKey, bodyKey }) => (
                <div
                  key={titleKey}
                  className="card-hover rounded-3xl border border-border-light bg-surface p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
                    <Icon name={icon} className="h-6 w-6 text-primary-700" alt="" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{t(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(bodyKey)}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link to={localePath('/features')} className="btn-duo-outline-pill inline-flex items-center justify-center no-underline">
                {t('marketingHome.featuresSeeAll')} <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== BUILT BY PARENTS ===== */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
              {t('marketingHome.founderEyebrow')}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-text-primary sm:text-3xl">
              {t('marketingHome.founderHeading')}
            </h2>
            <p className="mt-5 mx-auto max-w-xl text-base leading-relaxed text-text-secondary">
              {t('marketingHome.founderBody')}
            </p>
            <p className="mt-6 mx-auto max-w-xl text-sm text-text-tertiary">
              {t('marketingHome.founderFootnote')}
            </p>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <div className="overflow-hidden rounded-[32px] bg-primary-fg p-10 text-center shadow-xl ring-1 ring-white/10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Icon name={uiIcons.sparkles} className="h-8 w-8 text-white" aria-hidden />
              </div>
              <h2 className="font-display text-3xl font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
                {t('marketingHome.finalCtaHeading')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/95 leading-relaxed">
                {t('marketingHome.finalCtaSub')}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white">
                <Icon name={uiIcons.shield} className="h-4 w-4" alt="" />
                {t('marketingHome.finalCtaPrivacyPill')}
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to={localePath('/register')}
                  className="btn-duo-sky inline-flex items-center gap-2 !min-h-12 !rounded-full !px-8 !py-3 !text-sm no-underline"
                >
                  {t('marketingHome.finalCtaPrimary')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 brightness-0 invert" alt="" />
                </Link>
                <Link
                  to={localePath('/features')}
                  className="rounded-full border border-white/40 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/15 no-underline"
                >
                  {t('marketingHome.finalCtaSecondary')}
                </Link>
              </div>
              <p className="mt-4 text-xs font-medium text-white/85">{t('marketingHome.finalCtaNoCard')}</p>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-border-light bg-background py-10">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
              <div>
                <p className="text-[17px] font-extrabold tracking-tight text-text-primary">Raised</p>
                <p className="mt-2 text-sm text-text-secondary max-w-sm">
                  {t('marketingHome.footerTagline')}
                </p>
                <p className="mt-3 text-xs text-text-tertiary">
                  {t('marketingHome.footerBuilt')}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('marketingHome.footerProduct')}</p>
                <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                  <li><Link to={localePath('/features')} className="hover:text-text-primary no-underline">{t('marketingHome.navFeatures')}</Link></li>
                  <li><Link to={localePath('/articles')} className="hover:text-text-primary no-underline">Articles</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('marketingHome.footerCompany')}</p>
                <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                  <li><Link to={localePath('/about')} className="hover:text-text-primary no-underline">{t('marketingHome.navAbout')}</Link></li>
                  <li><Link to={localePath('/mission')} className="hover:text-text-primary no-underline">{t('marketingHome.navMission')}</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">{t('marketingHome.footerLegal')}</p>
                <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                  <li><Link to={localePath('/privacy')} className="hover:text-text-primary no-underline">{t('home.footer.privacyPolicy', 'Privacy')}</Link></li>
                  <li><Link to={localePath('/terms')} className="hover:text-text-primary no-underline">{t('home.footer.termsOfService', 'Terms')}</Link></li>
                  <li><Link to={localePath('/cookies')} className="hover:text-text-primary no-underline">{t('home.footer.cookiePolicy', 'Cookies')}</Link></li>
                  <li><Link to={localePath('/safeguarding')} className="hover:text-text-primary no-underline">{t('home.footer.safeguarding', 'Safeguarding')}</Link></li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-xs text-text-tertiary">
              {t('marketingHome.footerCopyright', { year })}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};
