import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { api, parseApiError } from '../lib/api.js';
import { useAuth } from '../state/auth.js';
import { useNotificationStore } from '../state/notification.js';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import {
  ActionLink,
  Avatar,
  DuoButton,
  DuoInput,
} from '../components/ui/index.js';

export const LoginPage = ({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) => {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { setToken, token, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const isLoading = isSubmitting || isGoogleLoading;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (token) {
      api
        .get('/api/identity/me')
        .then((res) => {
          setUser(res.data.user);
          navigate(next);
        })
        .catch(() => {});
    }
  }, [token, navigate, setUser, next]);

  const handleGoogleSignIn = useCallback(
    async (response: { credential: string }) => {
      setIsGoogleLoading(true);
      try {
        const res = await api.post('/api/identity/google', { idToken: response.credential });
        setToken(res.data.token);
        const userRes = await api.get('/api/identity/me');
        setUser(userRes.data.user);
        navigate(next);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!status || status >= 500) Sentry.captureException(err);
        toast.error(parseApiError(err, t('auth.errorGoogleSignIn')));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setToken, setUser, t, next],
  );

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.warn('[GoogleSignIn] VITE_GOOGLE_CLIENT_ID is not defined — Google sign-in will not be available');
      return;
    }
    if (typeof window === 'undefined') return;

    let checkInterval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const renderGoogleButton = () => {
      const buttonElement = document.getElementById('google-signin-button');
      if (!buttonElement || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignIn,
      });
      window.google.accounts.id.renderButton(buttonElement, {
        theme: 'outline',
        size: 'large',
        width: 400,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          renderGoogleButton();
        }
      }, 100);

      timeout = setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('[GoogleSignIn] window.google.accounts.id did not load within 10s — check that accounts.google.com/gsi/client script is not blocked');
      }, 10000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [handleGoogleSignIn]);

  const formatDisplayName = (raw: string | undefined) => {
    if (!raw) return t('auth.guestName');
    if (i18n.language.startsWith('fa')) return raw;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/identity/login' : '/api/identity/signup';
      const res = await api.post(endpoint, { email, password });
      if (mode === 'login') {
        setToken(res.data.token);
        const userRes = await api.get('/api/identity/me');
        setUser(userRes.data.user);
        navigate(next);

        const displayName = formatDisplayName(userRes.data.user?.email?.split('@')[0]);

        useNotificationStore.getState().addNotification({
          type: 'success',
          title: t('auth.notificationWelcomeTitle'),
          message: t('auth.notificationWelcomeMessage', { name: displayName }),
        });

        toast.success(t('auth.toastWelcomeBack', { name: displayName }));
      } else {
        toast.success(t('auth.toastAccountCreated'), {
          description: t('auth.toastAccountCreatedDescription'),
        });
        navigate('/login');
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status >= 500) Sentry.captureException(err);
      const fallback = mode === 'login' ? t('auth.errorSignInFailed') : t('auth.errorSignUpFailed');
      toast.error(parseApiError(err, fallback));
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarLetter = email.trim() ? email.trim().charAt(0).toUpperCase() : 'R';

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-text-primary">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-surface-light"
          aria-label={t('common.close')}
        >
          <Icon name={uiIcons.close} className="h-6 w-6 object-contain" alt="" aria-hidden />
        </button>
        <DuoButton
          variant="outline"
          size="pill"
          disabled={isLoading}
          onClick={() => {
            const next = mode === 'login' ? 'signup' : 'login';
            setMode(next);
            navigate(next === 'signup' ? '/register' : '/login');
          }}
        >
          {mode === 'login' ? t('common.signUp') : t('home.nav.signIn')}
        </DuoButton>
      </header>

      <div className="flex flex-1 flex-col items-center px-4 pb-12 pt-2 sm:px-6">
        <div className="flex w-full max-w-md flex-1 flex-col">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <Avatar
                name={avatarLetter}
                size="lg"
                color="#C084FC"
                className="!text-3xl font-bold"
                emptyFallback="initials"
              />
            </div>
            <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
              {mode === 'login' ? t('auth.titleSignIn') : t('auth.titleSignUp')}
            </h1>
            {mode === 'login' && (
              <ActionLink
                onClick={() => {
                  setEmail('');
                  setPassword('');
                }}
                className="mt-4 justify-center"
              >
                {t('auth.useAnotherAccount')}
              </ActionLink>
            )}
          </div>

          <div className="mt-10 space-y-5">
            <DuoInput
              label={t('auth.emailFieldLabel')}
              type="email"
              disabled={isLoading}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && submit()}
              autoComplete="email"
            />

            <DuoInput
              label={t('auth.password')}
              type="password"
              disabled={isLoading}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && submit()}
              trailingAction={
                mode === 'login'
                  ? { label: t('auth.forgotShort'), onClick: () => toast.message(t('auth.resetPasswordContactSupport')) }
                  : undefined
              }
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <DuoButton variant="blue" fullWidth loading={isSubmitting} disabled={isGoogleLoading} onClick={submit}>
              {mode === 'login' ? t('home.nav.signIn') : t('auth.titleSignUp')}
            </DuoButton>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-medium" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-background px-4 text-text-tertiary">{t('auth.orContinueWith')}</span>
                  </div>
                </div>

                <div
                  id="google-signin-button"
                  className={`w-full ${isGoogleLoading ? 'pointer-events-none opacity-60' : ''}`}
                  aria-label={t('auth.loginWithGoogle')}
                />
              </>
            )}
          </div>

          <div className="mt-auto pt-8">
            <p className="mt-10 text-center text-xs leading-relaxed text-text-tertiary sm:text-sm">
              <Trans
                i18nKey="auth.legalSignIn"
                components={{
                  terms: <Link to="/terms" className="font-semibold text-brand-blue hover:underline" />,
                  privacy: <Link to="/privacy" className="font-semibold text-brand-blue hover:underline" />,
                }}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
