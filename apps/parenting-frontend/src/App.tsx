import { useState, useEffect, useRef, type ReactElement } from 'react';
import { Route, Routes, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './lib/api.js';
import { useAuth } from './state/auth.js';
import { soundManager } from './lib/soundManager.js';
import { useLocale } from './hooks/useLocale.js';
import { useAppBase } from './hooks/useAppBase.js';
import { SUPPORTED_LOCALES, type AppLocale } from './i18n.js';
import { Toaster } from 'sonner';
import { AchievementUnlockModal } from './components/ui/AchievementUnlockModal.js';
import type { Achievement } from './components/ui/AchievementUnlockModal.js';
import { StreakCelebrationModal } from './components/ui/StreakCelebrationModal.js';
import { InstallBanner } from './components/InstallBanner.js';
import { AdminDashboard } from './admin/AdminDashboard.js';
import { AdminArticles } from './admin/AdminArticles.js';
import { AdminUpload } from './admin/AdminUpload.js';
import { AdminContent } from './admin/AdminContent.js';
import { AdminUsers } from './admin/AdminUsers.js';
import { AdminConversations } from './admin/AdminConversations.js';
import { AdminSurveys } from './admin/AdminSurveys.js';
import { AdminModules } from './admin/AdminModules.js';
import { AdminChat } from './admin/AdminChat.js';
import { LearningAdmin } from './admin/LearningAdmin.js';
import { AdminLeads } from './admin/AdminLeads.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { HomePage } from './pages/HomePage.js';
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
import { AppLayout } from './components/app/AppLayout.js';
import { DashboardPage } from './pages/app/DashboardPage.js';
import { ChatPage } from './pages/app/ChatPage.js';
import { CalendarPage } from './pages/app/CalendarPage.js';
import { AppArticleListPage } from './pages/app/AppArticleListPage.js';
import { MomentsPage } from './pages/app/MomentsPage.js';
import { FamilyPage } from './pages/app/FamilyPage.js';
import { ModulesPage } from './pages/app/ModulesPage.js';
import { LearningPage } from './pages/app/LearningPage.js';
import { CoursePath } from './pages/app/CoursePath.js';
import { LessonPlaybackPage } from './pages/app/LessonPlaybackPage.js';
import { PlaybookLibraryPage } from './pages/app/PlaybookLibraryPage.js';
import { PlaybookViewerPage } from './pages/app/PlaybookViewerPage.js';
import { SettingsPage } from './pages/app/SettingsPage.js';
import { InsightsPage } from './pages/app/InsightsPage.js';
import { LeaderboardPage } from './pages/app/LeaderboardPage.js';
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
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999]">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-primary-600/25 border-t-primary-700 rounded-full animate-spin"></div>
        <img
          src="/logo.jpg"
          alt="Raised"
          className="absolute inset-0 m-auto w-12 h-12 object-contain"
        />
      </div>
      <div className="mt-8 text-primary-700 font-bold tracking-[0.08em] uppercase animate-pulse">
        {t('splash.preparing')}
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
      navigate('/login');
      return;
    }
    
    // Fetch user info if we have a token but no user data
    if (token && !user) {
      setLoading(true);
      api.get('/api/auth/me')
        .then((res) => {
          setUser({ ...res.data.user, gamification: res.data.gamification });
          setLoading(false);
          
          // After re-auth, check if we have a persisted path
          const lastPath = localStorage.getItem('lastPath');
          if (lastPath && lastPath !== location.pathname && !['/login', '/register', '/onboarding'].includes(lastPath)) {
            navigate(lastPath, { replace: true });
          }
        })
        .catch(() => {
          // If fetching user info fails, the token might be invalid
          useAuth.getState().setToken(null);
          navigate('/login');
          setLoading(false);
        });
    } else if (user) {
      setLoading(false);
    }
  }, [token, navigate, user, setUser, location.pathname]);
  
  if (!token) return null;
  if (loading) return <SplashLoading />;
  
  return children;
};

const RequireOnboarding = ({ children }: { children: ReactElement }) => {
  const { isOnboarded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toApp } = useAppBase();

  useEffect(() => {
    if (!isOnboarded() && !location.pathname.startsWith('/onboarding')) {
      navigate('/onboarding');
    } else if (isOnboarded() && location.pathname.startsWith('/onboarding')) {
      navigate(toApp('/app'));
    }
  }, [isOnboarded, navigate, location]);

  return children;
};

const RequireAdmin = ({ children }: { children: ReactElement }) => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toApp } = useAppBase();

  useEffect(() => {
    if (user && !isAdmin()) {
      navigate(toApp('/app'));
    }
  }, [user, isAdmin, navigate]);
  
  // Don't render until we have user data
  if (!user) {
    return null;
  }
  
  return isAdmin() ? children : null;
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
  const { token } = useAuth();

  useEffect(() => {
    if (lang && SUPPORTED_LOCALES.includes(lang as AppLocale) && i18n.language !== lang) {
      i18n.changeLanguage(lang as AppLocale);
    }
  }, [lang, i18n]);

  if (!lang || !SUPPORTED_LOCALES.includes(lang as AppLocale)) {
    return <Navigate to={token ? '/app' : '/login'} replace />;
  }

  return <Outlet />;
};

const RootRedirect = () => {
  const { token, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    const lastPath = localStorage.getItem('lastPath');
    if (
      lastPath &&
      !isPublicMarketingPath(lastPath) &&
      !lastPath.startsWith('/onboarding')
    ) {
      navigate(lastPath, { replace: true });
      return;
    }

    if (user && isAdmin()) {
      navigate('/admin', { replace: true });
    } else {
      navigate('/app', { replace: true });
    }
  }, [token, user, isAdmin, navigate]);

  if (!token) return <HomePage />;
  return <SplashLoading />;
};

export default function App() {
  const { token, user, isAdmin } = useAuth();
  const location = useLocation();
  const { i18n } = useTranslation();
  const [isInitialLoading, setIsInitialLoading] = useState(() =>
    typeof window !== 'undefined' && !isPublicMarketingPath(window.location.pathname),
  );

  // Mount locale sync (sets dir/lang on <html>)
  useLocale();

  // Sync i18next with user's stored locale preference when they log in.
  // Only apply if the server has an explicit non-default preference (fa, etc.).
  // This prevents login from reverting a browser-selected language back to 'en'.
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

  // Show celebrations when gamification data loads/updates
  useEffect(() => {
    const streak = user?.gamification?.streak ?? 0;
    const milestones = [7, 14, 30, 60, 100];
    if (streak > 0 && milestones.includes(streak)) {
      const coinsBonus = streak >= 100 ? 1_000_000 : streak >= 60 ? 500_000 : streak >= 30 ? 250_000 : streak >= 14 ? 100_000 : 75_000;
      setStreakCelebration({ streak, coinsBonus });
    } else if (streak > 0 && !hasPlayedLoginSound.current) {
      // Gentle daily login chime — deferred to next user interaction to satisfy autoplay policy
      hasPlayedLoginSound.current = true;
      const playLogin = () => soundManager.play('dailyLogin');
      document.addEventListener('click', playLogin, { once: true });
      document.addEventListener('touchend', playLogin, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.gamification?.streak]);

  // Branded splash only for first paint on app/admin-style entry (not marketing pages)
  useEffect(() => {
    if (!isInitialLoading) return;
    const timer = setTimeout(() => setIsInitialLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [isInitialLoading]);

  // Persist current path (skip marketing and onboarding)
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
      {/* ── Global gamification modals ── */}
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
            // Show streak celebration after achievements if one is pending
            // (already set, will render on next tick)
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
        <Route path="/" element={<RootRedirect />} />
        {/* English default public routes (no prefix) */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/safeguarding" element={<SafeguardingPage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/articles" element={<ArticleListPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage variant="public" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage initialMode="signup" />} />
        <Route path="/profile" element={<Navigate to="/app/settings" replace />} />
        <Route path="/onboarding" element={<RequireAuth><RequireOnboarding><OnboardingPage /></RequireOnboarding></RequireAuth>} />
        {/* App routes */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireOnboarding>
                <AppLayout />
              </RequireOnboarding>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="moments" element={<MomentsPage />} />
          <Route path="family" element={<FamilyPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="learning/course/:courseId" element={<CoursePath />} />
          <Route path="learning/:moduleId" element={<LessonPlaybackPage />} />
          <Route path="community" element={<Navigate to=".." relative="path" replace />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="resources" element={<AppArticleListPage />} />
          <Route path="resources/:slug" element={<ArticleDetailPage variant="app" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        {/* Locale-prefixed routes: /fa/home, /fa/app/settings, etc. — keeps locale in URL */}
        <Route path="/:lang" element={<LocaleLayout />}>
          <Route path="home" element={<HomePage />} />
          <Route path="survey" element={<SurveyPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="cookies" element={<CookiePolicyPage />} />
          <Route path="safeguarding" element={<SafeguardingPage />} />
          <Route path="mission" element={<MissionPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="articles" element={<ArticleListPage />} />
          <Route path="articles/:slug" element={<ArticleDetailPage variant="public" />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<LoginPage initialMode="signup" />} />
          <Route path="onboarding" element={<RequireAuth><RequireOnboarding><OnboardingPage /></RequireOnboarding></RequireAuth>} />
          <Route
            path="app"
            element={
              <RequireAuth>
                <RequireOnboarding>
                  <AppLayout />
                </RequireOnboarding>
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="moments" element={<MomentsPage />} />
            <Route path="family" element={<FamilyPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="learning" element={<LearningPage />} />
            <Route path="learning/course/:courseId" element={<CoursePath />} />
            <Route path="learning/:moduleId" element={<LessonPlaybackPage />} />
            <Route path="community" element={<Navigate to=".." relative="path" replace />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="resources" element={<AppArticleListPage />} />
            <Route path="resources/:slug" element={<ArticleDetailPage variant="app" />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/upload"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminUpload />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/content"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminContent />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/conversations"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminConversations />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminModules />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/learning"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <LearningAdmin />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/surveys"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminSurveys />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminChat />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/articles"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminArticles />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/articles/:slug"
          element={
            <RequireAuth>
              <RequireAdmin>
                <ArticleDetailPage variant="admin" />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/leads"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout>
                  <AdminLeads />
                </AdminLayout>
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={token ? (user && isAdmin() ? '/admin' : '/profile') : '/login'} />} />
      </Routes>
    </>
  );
}
