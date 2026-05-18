import { useState, useEffect, useRef, type ReactElement } from 'react';
import { Route, Routes, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './lib/api.js';
import { useAuth } from './state/auth.js';
import { soundManager } from './lib/soundManager.js';
import { useLocale } from './hooks/useLocale.js';
import { SUPPORTED_LOCALES, type AppLocale } from './i18n.js';
import { Toaster } from 'sonner';
import { AchievementUnlockModal } from './components/ui/AchievementUnlockModal.js';
import type { Achievement } from './components/ui/AchievementUnlockModal.js';
import { StreakCelebrationModal } from './components/ui/StreakCelebrationModal.js';
import { InstallBanner } from './components/InstallBanner.js';
import { LoginPage } from './pages/LoginPage.js';
import { SurveyPage } from './pages/SurveyPage.js';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.js';
import { TermsOfServicePage } from './pages/TermsOfServicePage.js';
import { CookiePolicyPage } from './pages/CookiePolicyPage.js';
import { SafeguardingPage } from './pages/SafeguardingPage.js';
import { MissionPage } from './pages/MissionPage.js';
import { AboutPage } from './pages/AboutPage.js';
import { FeaturesPage } from './pages/FeaturesPage.js';
import { ArticleListPage } from './pages/ArticleListPage.js';
import { ArticleDetailPage } from './pages/ArticleDetailPage.js';
import { CookieConsentBanner } from './components/CookieConsentBanner.js';
import { ChatShell } from './components/chat-shell/ChatShell.js';
import { ChatPanel } from './components/chat-shell/ChatPanel.js';
import { FeaturePageFrame } from './components/chat-shell/FeaturePageFrame.js';
import { SettingsPage } from './pages/app/SettingsPage.js';
import { OnboardingPage } from './pages/onboarding/OnboardingPage.js';
import { isPublicMarketingPath } from './lib/publicRoutes.js';

declare global {
  interface Window {
    google?: {
      accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
        renderButton: (
          element: HTMLElement | null,
          config: {
            theme?: string;
            size?: string;
            width?: string | number;
            text?: string;
            shape?: string;
            logo_alignment?: string;
          },
        ) => void;
      };
      };
    };
  }
}

const SplashLoading = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="relative h-28 w-28" aria-hidden="true">
        {/* Soft outer halo */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-blue/50 via-primary-400/40 to-primary-600/50 blur-2xl animate-pulse"
          style={{ animationDuration: '2.4s' }}
        />
        {/* Slow rotating ring */}
        <div
          className="absolute inset-0 rounded-full border border-primary-300/40 animate-spin"
          style={{ animationDuration: '7s' }}
        />
        {/* Counter-rotating dashed ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-dashed border-primary-400/30 animate-spin"
          style={{ animationDuration: '11s', animationDirection: 'reverse' }}
        />
        {/* Core orb */}
        <div
          className="absolute inset-5 rounded-full bg-gradient-to-br from-brand-blue via-primary-500 to-primary-700 shadow-[0_0_40px_8px_rgba(99,102,241,0.35)] animate-pulse"
          style={{ animationDuration: '1.6s' }}
        />
        {/* Inner highlight */}
        <div className="absolute inset-[34%] rounded-full bg-white/70 blur-[2px]" />
      </div>
      <div className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.18em] text-text-secondary">
        <span>{t('splash.preparing')}</span>
        <span className="inline-flex gap-1" aria-hidden="true">
          <span
            className="inline-block h-1 w-1 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
          />
          <span
            className="inline-block h-1 w-1 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1.2s' }}
          />
          <span
            className="inline-block h-1 w-1 rounded-full bg-current animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1.2s' }}
          />
        </span>
      </div>
    </div>
  );
};

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const { token, setUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(!user && !!token);

  useEffect(() => {
    if (!token) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`);
      return;
    }

    if (token && !user) {
      setLoading(true);
      api.get('/api/identity/me')
        .then((res) => {
          setUser({ ...res.data.user, gamification: res.data.gamification });
          setLoading(false);
        })
        .catch(() => {
          useAuth.getState().setToken(null);
          navigate('/login');
          setLoading(false);
        });
    } else if (user) {
      setLoading(false);
    }
  }, [token, navigate, user, setUser, location.pathname, location.search]);

  if (!token) return null;
  if (loading) return <SplashLoading />;

  return children;
};

const RequireOnboarding = ({ children }: { children: ReactElement }) => {
  const { isOnboarded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isOnboarded() && !location.pathname.startsWith('/onboarding')) {
      navigate('/onboarding');
    } else if (isOnboarded() && location.pathname.startsWith('/onboarding')) {
      navigate('/');
    }
  }, [isOnboarded, navigate, location]);

  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

/** Sets locale from URL prefix and renders child routes without stripping or redirecting. */
const LocaleLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LOCALES.includes(lang as AppLocale) && i18n.language !== lang) {
      i18n.changeLanguage(lang as AppLocale);
    }
  }, [lang, i18n]);

  if (!lang || !SUPPORTED_LOCALES.includes(lang as AppLocale)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default function App() {
  const { token, user } = useAuth();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const [isInitialLoading, setIsInitialLoading] = useState(() =>
    typeof window !== 'undefined' && !isPublicMarketingPath(window.location.pathname),
  );

  // Mount locale sync (sets dir/lang on <html>)
  useLocale();

  // Sync i18next with user's stored locale preference after sign-in.
  useEffect(() => {
    const userLocale = (user as any)?.locale as string | undefined;
    if (userLocale && userLocale !== 'en' && userLocale !== i18n.language) {
      i18n.changeLanguage(userLocale);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [streakCelebration, setStreakCelebration] = useState<{ streak: number; coinsBonus: number } | null>(null);
  const hasPlayedLoginSound = useRef(false);

  useEffect(() => {
    const streak = user?.gamification?.streak ?? 0;
    const milestones = [7, 14, 30, 60, 100];
    if (streak > 0 && milestones.includes(streak)) {
      const coinsBonus = streak >= 100 ? 1_000_000 : streak >= 60 ? 500_000 : streak >= 30 ? 250_000 : streak >= 14 ? 100_000 : 75_000;
      setStreakCelebration({ streak, coinsBonus });
    } else if (streak > 0 && !hasPlayedLoginSound.current) {
      hasPlayedLoginSound.current = true;
      const playLogin = () => soundManager.play('dailyLogin');
      document.addEventListener('click', playLogin, { once: true });
      document.addEventListener('touchend', playLogin, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.gamification?.streak]);

  useEffect(() => {
    if (!isInitialLoading) return;
    const timer = setTimeout(() => setIsInitialLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [isInitialLoading]);

  useEffect(() => {
    if (
      token &&
      !isPublicMarketingPath(location.pathname) &&
      !location.pathname.startsWith('/onboarding')
    ) {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location, token]);

  return (
    <>
      {streakCelebration && !pendingAchievements.length && (
        <StreakCelebrationModal
          streak={streakCelebration.streak}
          coinsBonus={streakCelebration.coinsBonus}
          onDismiss={() => setStreakCelebration(null)}
        />
      )}
      {pendingAchievements.length > 0 && (
        <AchievementUnlockModal
          achievements={pendingAchievements}
          onDismiss={() => {
            setPendingAchievements([]);
          }}
        />
      )}

      <Toaster
        position="top-right"
        expand={true}
        richColors
        closeButton
        theme="light"
        toastOptions={{
          style: {
            borderRadius: '12px',
            padding: '16px',
            background: '#FFFFFF',
            color: '#1E293B',
            border: '1px solid #E0E7FF',
            boxShadow: '0 4px 12px 0 rgba(15, 23, 42, 0.08)',
          },
        }}
      />
      <CookieConsentBanner />
      <InstallBanner />
      <ScrollToTop />
      {isInitialLoading && !isPublicMarketingPath(location.pathname) && (
        <SplashLoading />
      )}
      <Routes>
        {/* Chat-first root layout. Logged-out visitors land here too; the
            chat panel gates send-actions through /login. */}
        <Route path="/" element={<ChatShell />}>
          <Route index element={<ChatPanel />} />
          <Route
            path="settings"
            element={
              <RequireAuth>
                <RequireOnboarding>
                  <FeaturePageFrame title={t('nav.settings', 'Settings')}>
                    <SettingsPage />
                  </FeaturePageFrame>
                </RequireOnboarding>
              </RequireAuth>
            }
          />

          {/* Marketing & legal pages — same shell so the user keeps history
              and feature shortcuts visible while reading. */}
          <Route
            path="about"
            element={
              <FeaturePageFrame title={t('home.nav.about', 'About')}>
                <AboutPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="mission"
            element={
              <FeaturePageFrame title={t('home.nav.mission', 'Mission')}>
                <MissionPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="features"
            element={
              <FeaturePageFrame title={t('home.nav.features', 'Features')}>
                <FeaturesPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="privacy"
            element={
              <FeaturePageFrame title={t('home.footer.privacyPolicy', 'Privacy policy')}>
                <PrivacyPolicyPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="terms"
            element={
              <FeaturePageFrame title={t('home.footer.termsOfService', 'Terms of service')}>
                <TermsOfServicePage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="cookies"
            element={
              <FeaturePageFrame title={t('home.footer.cookiePolicy', 'Cookie policy')}>
                <CookiePolicyPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="safeguarding"
            element={
              <FeaturePageFrame title={t('home.footer.safeguarding', 'Safeguarding')}>
                <SafeguardingPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="articles"
            element={
              <FeaturePageFrame title={t('nav.articles', 'Articles')}>
                <ArticleListPage />
              </FeaturePageFrame>
            }
          />
          <Route
            path="articles/:slug"
            element={
              <FeaturePageFrame title={t('nav.articles', 'Articles')}>
                <ArticleDetailPage variant="public" />
              </FeaturePageFrame>
            }
          />
        </Route>

        {/* Survey is a full-page funnel and shouldn't get the shell. */}
        <Route path="/survey" element={<SurveyPage />} />

        {/* Auth pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage initialMode="signup" />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <RequireOnboarding>
                <OnboardingPage />
              </RequireOnboarding>
            </RequireAuth>
          }
        />

        {/* Legacy aliases — keep old links working by redirecting to the new home. */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/app/*" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />

        {/* Locale-prefixed routes — mirror the English structure. */}
        <Route path="/:lang" element={<LocaleLayout />}>
          <Route path="survey" element={<SurveyPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<LoginPage initialMode="signup" />} />
          <Route
            path="onboarding"
            element={
              <RequireAuth>
                <RequireOnboarding>
                  <OnboardingPage />
                </RequireOnboarding>
              </RequireAuth>
            }
          />

          <Route element={<ChatShell />}>
            <Route index element={<ChatPanel />} />
            <Route
              path="about"
              element={
                <FeaturePageFrame title={t('home.nav.about', 'About')}>
                  <AboutPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="mission"
              element={
                <FeaturePageFrame title={t('home.nav.mission', 'Mission')}>
                  <MissionPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="features"
              element={
                <FeaturePageFrame title={t('home.nav.features', 'Features')}>
                  <FeaturesPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="privacy"
              element={
                <FeaturePageFrame title={t('home.footer.privacyPolicy', 'Privacy policy')}>
                  <PrivacyPolicyPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="terms"
              element={
                <FeaturePageFrame title={t('home.footer.termsOfService', 'Terms of service')}>
                  <TermsOfServicePage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="cookies"
              element={
                <FeaturePageFrame title={t('home.footer.cookiePolicy', 'Cookie policy')}>
                  <CookiePolicyPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="safeguarding"
              element={
                <FeaturePageFrame title={t('home.footer.safeguarding', 'Safeguarding')}>
                  <SafeguardingPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="articles"
              element={
                <FeaturePageFrame title={t('nav.articles', 'Articles')}>
                  <ArticleListPage />
                </FeaturePageFrame>
              }
            />
            <Route
              path="articles/:slug"
              element={
                <FeaturePageFrame title={t('nav.articles', 'Articles')}>
                  <ArticleDetailPage variant="public" />
                </FeaturePageFrame>
              }
            />
          </Route>

          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="app" element={<Navigate to="/" replace />} />
          <Route path="app/*" element={<Navigate to="/" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
