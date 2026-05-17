import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../state/auth.js';
import { articleApi } from '../lib/articleApi.js';
import { isPublicMarketingPath } from '../lib/publicRoutes.js';
import { Article } from '../types/Articles.js';
import { SEO } from '../components/SEO.js';
import type { IconName } from '../components/icons/index.js';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { PublicSiteHeader } from '../components/PublicSiteHeader.js';
import { PublicFooter } from '../components/PublicFooter.js';
import { LazyImage } from '../components/ui/LazyImage.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { useAppBase } from '../hooks/useAppBase.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useTranslation();
  const { localePath } = useLocalePath();
  const { toApp } = useAppBase();

  const features: { iconName: IconName; title: string; body: string }[] = [
    { iconName: 'idea', title: t('home.features.f1Title'), body: t('home.features.f1Body') },
    { iconName: 'calendar', title: t('home.features.f2Title'), body: t('home.features.f2Body') },
    { iconName: 'reading_ebook', title: t('home.features.f3Title'), body: t('home.features.f3Body') },
    { iconName: 'camera', title: t('home.features.f4Title'), body: t('home.features.f4Body') },
    { iconName: 'organization', title: t('home.features.f5Title'), body: t('home.features.f5Body') },
    { iconName: 'like', title: t('home.features.f6Title'), body: t('home.features.f6Body') },
  ];

  const parentQuestions = [
    t('home.parentQuestions.q1'),
    t('home.parentQuestions.q2'),
    t('home.parentQuestions.q3'),
    t('home.parentQuestions.q4'),
    t('home.parentQuestions.q5'),
    t('home.parentQuestions.q6'),
    t('home.parentQuestions.q7'),
    t('home.parentQuestions.q8'),
  ];

  const lifeStages: { image: string; label: string; age: string }[] = [
    { image: '/images/stage-pregnancy.png', label: t('home.lifeStages.pregnancy'), age: t('home.lifeStages.pregnancyAge') },
    { image: '/images/stage-newborn.png', label: t('home.lifeStages.newborn'), age: t('home.lifeStages.newbornAge') },
    { image: '/images/stage-baby.png', label: t('home.lifeStages.baby'), age: t('home.lifeStages.babyAge') },
    { image: '/images/stage-toddler.png', label: t('home.lifeStages.toddler'), age: t('home.lifeStages.toddlerAge') },
    { image: '/images/stage-child.png', label: t('home.lifeStages.child'), age: t('home.lifeStages.childAge') },
    { image: '/images/stage-teen.png', label: t('home.lifeStages.teen'), age: t('home.lifeStages.teenAge') },
  ];

  const parentTestimonials = [
    { quote: t('home.testimonials.t1Quote'), name: t('home.testimonials.t1Name') },
    { quote: t('home.testimonials.t2Quote'), name: t('home.testimonials.t2Name') },
    { quote: t('home.testimonials.t3Quote'), name: t('home.testimonials.t3Name') },
  ];

  const trustItems: { iconName: IconName; label: string; description: string }[] = [
    { iconName: 'biotech', label: t('home.trust.t1Label'), description: t('home.trust.t1Description') },
    { iconName: 'safe', label: t('home.trust.t2Label'), description: t('home.trust.t2Description') },
    { iconName: 'like', label: t('home.trust.t3Label'), description: t('home.trust.t3Description') },
  ];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(installed);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const fetchArticles = async () => {
      try {
        const res = await articleApi.getPublicArticles({ limit: 3 });
        setLatestArticles(res.articles);
      } catch (err) {
        console.error('Failed to fetch articles for homepage:', err);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArticles();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!token || !isInstalled) return;

    const updateAndRedirect = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              return;
            }
          }
        } catch (err) {
          console.debug('SW update check failed on app open:', err);
        }
      }

      const lastPath = localStorage.getItem('lastPath');
      if (
        lastPath &&
        !isPublicMarketingPath(lastPath) &&
        !lastPath.startsWith('/onboarding')
      ) {
        navigate(lastPath, { replace: true });
        return;
      }
      navigate(toApp('/app'), { replace: true });
    };

    void updateAndRedirect();
  }, [token, isInstalled, navigate]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SEO
        description="Parenting made calmer. Raised is your family's science-backed hub for routines, milestones, and expert guidance from bump to 18."
        canonical="/"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Raised',
            'url': 'https://raised.info',
            'logo': {
              '@type': 'ImageObject',
              'url': 'https://raised.info/logo.jpg',
            },
            'description': t('home.hero.schemaOrgDescription'),
            'contactPoint': {
              '@type': 'ContactPoint',
              'contactType': 'customer support',
              'email': 'hello@raised.info',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'url': 'https://raised.info',
            'name': 'Raised',
            'potentialAction': {
              '@type': 'SearchAction',
              'target': 'https://raised.info/articles?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      <PublicSiteHeader />

      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-background">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-24 pt-16 md:grid-cols-[1fr_0.88fr] md:items-center lg:gap-20">
            {/* Left — copy */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary-fg">
                <Icon name={uiIcons.sparkles} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden /> {t('home.hero.badge')}
              </span>

              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.15] tracking-tight text-text-primary md:text-5xl lg:text-[54px]">
                {t('home.hero.h1Part1')}{' '}
                <span className="text-primary-700">{t('home.hero.h1Highlight')}</span>
                {' '}{t('home.hero.h1Part2')}
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-secondary">
                {t('home.hero.description')}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate(localePath('/register'))} className="btn-duo-green-pill-lg">
                  {t('home.hero.startFree')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
                </button>
                <button type="button" onClick={() => navigate(localePath('/login'))} className="btn-duo-outline-pill-lg">
                  {t('home.nav.signIn')}
                </button>
              </div>

              <p className="mt-3 text-sm text-text-dimmed">
                {t('home.hero.freeToStart')}
              </p>
            </div>

            {/* Right — hero illustration */}
            <div className="relative flex justify-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
              {/* Floating badge — top right */}
              <div className="absolute -right-2 top-4 z-20 animate-float-slow sm:-right-6">
                <div className="glass rounded-2xl px-3 py-2.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-sm">🎉</span>
                    <div>
                      <p className="text-[11px] font-bold text-text-primary">{t('home.hero.mockupMilestone')}</p>
                      <p className="text-[10px] text-text-tertiary">{t('home.hero.mockupFirstSteps')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge — bottom left */}
              <div className="absolute -bottom-2 -left-2 z-20 animate-float-slow sm:-left-6" style={{ animationDelay: '1.8s' }}>
                <div className="glass rounded-2xl px-3 py-2.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-400/20 text-sm">🔥</span>
                    <div>
                      <p className="text-[11px] font-bold text-text-primary">7-day streak</p>
                      <p className="text-[10px] text-text-tertiary">{t('home.hero.mockupKeepItUp')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative w-full max-w-[480px]">
                <img
                  src="/images/home-hero.png"
                  alt="A family reading together — Raised in action"
                  className="w-full rounded-3xl shadow-2xl"
                  loading="eager"
                  decoding="async"
                />
                <div className="pointer-events-none absolute -bottom-6 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-primary-400/20 blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== PARENT QUESTIONS STRIP ===== */}
        <section className="border-b border-border-light bg-surface/60 py-10" aria-labelledby="parent-questions-heading">
          <div className="mx-auto w-full max-w-6xl px-6">
            <p id="parent-questions-heading" className="text-center text-xs font-bold uppercase tracking-[0.25em] text-primary-700">
              {t('home.parentQuestions.heading')}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:gap-3">
              {parentQuestions.map((q) => (
                <span
                  key={q}
                  className="inline-flex max-w-full rounded-full border border-border-light bg-background px-4 py-2 text-left text-xs font-medium leading-snug text-text-secondary shadow-sm sm:text-sm"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section id="trust" className="border-y border-border-light bg-surface py-12">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
              {trustItems.map((t) => (
                <div key={t.label} className="flex items-start gap-4">
                  <Icon name={t.iconName} className="h-8 w-8 shrink-0 object-contain text-primary-500" alt="" aria-hidden />
                  <div>
                    <p className="font-display text-base font-semibold text-text-primary">{t.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== LIFE STAGES ===== */}
        <section className="border-b border-border-light bg-background py-16" aria-labelledby="life-stages-heading">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-700">{t('home.lifeStages.heading')}</p>
              <h2 id="life-stages-heading" className="mt-3 font-display text-3xl font-bold text-text-primary md:text-4xl">
                {t('home.lifeStages.subheading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('home.lifeStages.description')}
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {lifeStages.map(({ image, label, age }) => (
                <div
                  key={label}
                  className="card-hover flex flex-col items-center overflow-hidden rounded-2xl border border-border-light bg-surface shadow-sm transition-colors hover:border-primary-200"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={image}
                      alt={label}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="px-3 pb-4 pt-3 text-center">
                    <p className="font-display text-sm font-semibold text-text-primary">{label}</p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{age}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        {/* bg-background so the bg-surface cards stand out — critical for visual contrast */}
        <section id="features" className="bg-background py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-700">{t('home.features.heading')}</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-text-primary md:text-4xl">
                {t('home.features.subheading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('home.features.description')}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="card-hover rounded-3xl border border-border-light bg-surface p-6 shadow-sm transition-colors duration-200 hover:border-primary-200"
                >
                  <Icon name={item.iconName} className="h-9 w-9 object-contain text-primary-500" alt="" aria-hidden />
                  <h3 className="mt-4 font-display text-lg font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PARENT TESTIMONIALS ===== */}
        <section className="border-y border-border-light bg-background py-20" aria-labelledby="testimonials-heading">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="text-center">
              <h2 id="testimonials-heading" className="font-display text-3xl font-bold text-text-primary md:text-4xl">
                {t('home.testimonials.heading')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
                {t('home.testimonials.subheading')}
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {parentTestimonials.map(({ quote, name }) => (
                <blockquote
                  key={name}
                  className="flex h-full flex-col rounded-3xl border border-border-light bg-background p-6 shadow-sm"
                >
                  <p className="text-sm leading-relaxed text-text-primary">&ldquo;{quote}&rdquo;</p>
                  <footer className="mt-4 text-xs font-semibold text-text-tertiary">— {name}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ===== LATEST ARTICLES ===== */}
        {/* bg-surface alternates cleanly with the sections above */}
        <section className="bg-surface py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-700">{t('home.articles.sectionLabel')}</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-text-primary md:text-4xl">
                  {t('home.articles.heading')}
                </h2>
                <p className="mt-3 text-base text-text-secondary">
                  {t('home.articles.description')}
                </p>
              </div>
              <Link
                to={localePath('/articles')}
                className="inline-flex flex-shrink-0 items-center gap-2 text-sm font-bold text-primary-700 transition-colors hover:text-primary-fg"
              >
                {t('home.articles.viewAllGuides')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
              </Link>
            </div>

            {loadingArticles ? (
              <div className="grid gap-5 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-shimmer aspect-[4/5] rounded-3xl border border-border-light" />
                ))}
              </div>
            ) : latestArticles.length === 0 ? (
              <div className="rounded-3xl border border-border-light bg-background px-6 py-14 text-center">
                <p className="mx-auto max-w-md text-text-secondary">
                  {t('home.articles.loadError')}
                </p>
                <Link to={localePath('/articles')} className="btn-duo-green-pill-lg mt-6 inline-flex">
                  {t('home.articles.browseArticles')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {latestArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-border-light bg-surface shadow-sm transition-all duration-300 hover:border-primary-200 hover:shadow-xl flex flex-col"
                  >
                    <div className="aspect-video bg-primary-50 relative overflow-hidden">
                      {article.coverImage ? (
                        <LazyImage
                          src={article.coverImage}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          containerClassName="w-full h-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-text-tertiary">
                          <Icon name={uiIcons.bookOpen} className="h-10 w-10 object-contain opacity-20" alt="" aria-hidden />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="bg-surface-light/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-700 shadow-sm">
                          {article.category?.name || 'Article'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-xl font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                        {article.title}
                      </h3>
                      <p className="mt-3 text-sm text-text-secondary leading-relaxed line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="mt-auto pt-6 flex items-center justify-between">
                        <span className="text-xs text-text-tertiary flex items-center gap-1">
                           {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-primary-600 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          {t('home.articles.readMore')} <Icon name={uiIcons.chevronRight} className="h-4 w-4 object-contain" alt="" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== RAISED FOR ALL MISSION TEASER ===== */}
        <section className="bg-background py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            {/* Dark-first treatment: surface card with subtle green border accent */}
            <div className="overflow-hidden rounded-3xl border border-primary-200 bg-surface p-8 md:p-12">

              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary-fg">
                    <Icon name={uiIcons.globe} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden /> {t('home.mission.badge')}
                  </span>
                  <h2 className="mt-5 font-display text-2xl font-bold text-text-primary md:text-3xl">
                    {t('home.mission.heading')}
                  </h2>
                  <p className="mt-3 max-w-lg leading-relaxed text-text-secondary">
                    {t('home.mission.description')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={localePath('/mission')} className="btn-duo-green-pill">
                      {t('home.mission.learnMore')} <Icon name={uiIcons.chevronRight} className="h-4 w-4 object-contain inline" alt="" />
                    </Link>
                    <button type="button" onClick={() => navigate(localePath('/register'))} className="btn-duo-outline-pill">
                      {t('home.mission.joinMission')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:max-w-[220px]">
                  {['🇳🇬 Nigeria', '🇵🇰 Pakistan', '🇰🇪 Kenya', '🇧🇩 Bangladesh', '🇮🇳 India', '🇬🇭 Ghana', '🇺🇬 Uganda'].map((c) => (
                    <span key={c} className="rounded-full border border-border-light bg-surface-light px-3 py-1 text-xs font-medium text-text-secondary">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== INSTALL PROMOTION ===== */}
        {/* bg-surface section with dark card inside — polished and distinct without being alarming */}
        <section className="bg-surface py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="overflow-hidden rounded-3xl border border-primary-200 bg-background p-8 shadow-lg md:p-10">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
                    <Icon name={uiIcons.smartphone} className="h-3.5 w-3.5 object-contain" alt="" aria-hidden /> {t('home.install.badge')}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-bold text-text-primary md:text-3xl">
                    {t('home.install.heading')}
                  </h3>
                  <p className="mt-3 max-w-lg leading-relaxed text-text-secondary">
                    {t('home.install.description')}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
                      <Icon name={uiIcons.apple} className="h-5 w-5 object-contain opacity-80" alt="" aria-hidden />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{t('home.install.iosTitle')}</p>
                        <p className="text-xs text-text-tertiary">{t('home.install.iosInstructions')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
                      <Icon name={uiIcons.smartphone} className="h-5 w-5 object-contain opacity-80" alt="" aria-hidden />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{t('home.install.androidTitle')}</p>
                        <p className="text-xs text-text-tertiary">{t('home.install.androidInstructions')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:items-end">
                  {isInstalled ? (
                    <>
                      <div className="flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-5 py-2.5 text-sm font-semibold text-primary-fg">
                        <Icon name={uiIcons.checkOk} className="h-4 w-4 object-contain" alt="" aria-hidden /> {t('home.install.appInstalled')}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(localePath('/register'))}
                        className="btn-duo-green-pill-lg"
                      >
                        {t('home.install.getStartedFree')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
                      </button>
                    </>
                  ) : deferredPrompt ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleInstallClick()}
                        className="btn-duo-green-pill-lg"
                      >
                        {t('home.install.installApp')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(localePath('/register'))}
                        className="btn-duo-outline-pill-lg"
                      >
                        {t('home.install.getStartedFree')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(localePath('/register'))}
                        className="btn-duo-green-pill-lg"
                      >
                        {t('home.install.getStartedFree')} <Icon name={uiIcons.arrowRight} className="h-4 w-4 object-contain inline" alt="" />
                      </button>
                      <p className="text-center text-xs text-text-tertiary sm:text-right">
                        {isIOS
                          ? t('home.install.iosHint')
                          : t('home.install.androidHint')}
                      </p>
                    </>
                  )}
                  <p className="text-center text-xs text-text-dimmed sm:text-right">{t('home.install.noCreditCard')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
