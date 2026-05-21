import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { usePostHog } from '@posthog/react';
import { api, parseApiError } from '../../lib/api.js';
import { useAuth } from '../../state/auth.js';
import { useNotificationStore } from '../../state/notification.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type Method = 'google' | 'email';
type Step = 'method' | 'email' | 'password' | 'submitting';

type AuthChatProps = {
  initialMode?: 'login' | 'signup';
  /** When provided, the close X calls this instead of navigating away, and
   *  the mode toggle flips state in place instead of changing routes.
   *  Use this to embed AuthChat inside another panel (e.g. ChatPanel). */
  onClose?: () => void;
};

export const AuthChat = ({ initialMode = 'login', onClose }: AuthChatProps) => {
  const { t, i18n } = useTranslation();
  const posthog = usePostHog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { setToken, token, setUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [method, setMethod] = useState<Method | null>(null);
  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const isGuestReturn =
    typeof window !== 'undefined' &&
    !!(
      localStorage.getItem('guestConversation') ||
      localStorage.getItem('pendingChatMessage')
    );

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

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [step, method, mode]);

  useEffect(() => {
    if (step === 'email') emailInputRef.current?.focus();
    if (step === 'password') passwordInputRef.current?.focus();
  }, [step]);

  const handleGoogleSignIn = useCallback(
    async (response: { credential: string }) => {
      setIsGoogleLoading(true);
      try {
        const res = await api.post('/api/identity/google', { idToken: response.credential });
        setToken(res.data.token);
        const userRes = await api.get('/api/identity/me');
        setUser(userRes.data.user);
        posthog.identify(userRes.data.user.id, { email: userRes.data.user.email });
        posthog.capture('user_logged_in_with_google', { email: userRes.data.user.email });
        navigate(next);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!status || status >= 500) Sentry.captureException(err);
        toast.error(parseApiError(err, t('auth.errorGoogleSignIn')));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setToken, setUser, t, next, posthog],
  );

  // Render the Google Identity Services button into the bubble slot whenever
  // it appears in the DOM. Polls because the GSI script may load after mount.
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return;
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
        width: buttonElement.clientWidth || 320,
        text: mode === 'login' ? 'signin_with' : 'signup_with',
        shape: 'pill',
        logo_alignment: 'center',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (checkInterval) clearInterval(checkInterval);
          renderGoogleButton();
        }
      }, 100);
      timeout = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 10000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [googleClientId, handleGoogleSignIn, mode, step]);

  const formatDisplayName = (raw: string | undefined) => {
    if (!raw) return t('auth.guestName');
    if (i18n.language.startsWith('fa')) return raw;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setStep('submitting');
    try {
      const endpoint = mode === 'login' ? '/api/identity/login' : '/api/identity/signup';
      const res = await api.post(endpoint, { email: email.trim(), password });
      if (mode === 'login') {
        setToken(res.data.token);
        const userRes = await api.get('/api/identity/me');
        setUser(userRes.data.user);
        posthog.identify(userRes.data.user.id, { email: userRes.data.user.email });
        posthog.capture('user_logged_in', { email: userRes.data.user.email });
        navigate(next);

        const displayName = formatDisplayName(userRes.data.user?.email?.split('@')[0]);
        useNotificationStore.getState().addNotification({
          type: 'success',
          title: t('auth.notificationWelcomeTitle'),
          message: t('auth.notificationWelcomeMessage', { name: displayName }),
        });
        toast.success(t('auth.toastWelcomeBack', { name: displayName }));
      } else {
        posthog.capture('user_signed_up', { email });
        toast.success(t('auth.toastAccountCreated'), {
          description: t('auth.toastAccountCreatedDescription'),
        });
        // Embedded: switch to login mode in place, keep credentials so the
        // user can sign in with one more tap. Standalone: route to /login.
        if (onClose) {
          setMode('login');
          setStep('password');
        } else {
          navigate('/login');
        }
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status >= 500) Sentry.captureException(err);
      const fallback = mode === 'login' ? t('auth.errorSignInFailed') : t('auth.errorSignUpFailed');
      toast.error(parseApiError(err, fallback));
      setStep('password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    const nextMode = mode === 'login' ? 'signup' : 'login';
    setMode(nextMode);
    setStep('method');
    setMethod(null);
    // When embedded, just flip state. When standalone, also update the URL
    // so the route reflects which mode the user is in.
    if (!onClose) navigate(nextMode === 'signup' ? '/register' : '/login');
  };

  const introBubble =
    isGuestReturn && mode === 'login'
      ? t('authChat.guestReturnIntro', "Welcome back! I've kept your draft safe. Sign in and we'll pick up where you left off.")
      : mode === 'login'
        ? t('authChat.intro', "Hi! I'm Raised. Sign in and we'll keep the conversation going.")
        : t('authChat.signupIntro', "Hi! I'm Raised. Create an account so I can remember our chats.");

  return (
    <div className="relative flex h-full min-h-screen flex-col bg-background text-text-primary">
      {/* Header: close + mode toggle */}
      <header
        className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => (onClose ? onClose() : navigate('/'))}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-surface-light"
          aria-label={t('common.close', 'Close')}
        >
          <Icon name={uiIcons.close} className="h-5 w-5 object-contain" alt="" aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text-primary hover:border-brand-blue/40"
        >
          {mode === 'login' ? t('common.signUp', 'Sign up') : t('home.nav.signIn', 'Sign in')}
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2 sm:px-6"
      >
        <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col gap-3">
          <AssistantBubble>{introBubble}</AssistantBubble>
          <AssistantBubble>
            {mode === 'login'
              ? t('authChat.askMethod', 'How would you like to sign in?')
              : t('authChat.askMethodSignup', 'How would you like to sign up?')}
          </AssistantBubble>

          {step === 'method' ? (
            <div className="flex flex-col gap-2">
              {googleClientId && (
                <div
                  id="google-signin-button"
                  className="self-start max-w-[320px]"
                  aria-label={t('auth.loginWithGoogle')}
                />
              )}
              <ChipGroup
                options={[
                  { id: 'email', label: t('authChat.useEmail', 'Use email & password') },
                ]}
                onSelect={() => {
                  setMethod('email');
                  setStep('email');
                }}
              />
            </div>
          ) : (
            <UserBubble>{t('authChat.choseEmail', 'Email & password')}</UserBubble>
          )}

          {(step === 'email' || (method === 'email' && step !== 'method')) && (
            <>
              <AssistantBubble>
                {t('authChat.askEmail', "What's your email?")}
              </AssistantBubble>
              {step === 'email' ? (
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email.trim()) {
                        e.preventDefault();
                        setStep('password');
                      }
                    }}
                    placeholder={t('auth.emailPlaceholder', 'you@example.com')}
                    className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                  />
                  <button
                    type="button"
                    disabled={!email.trim()}
                    onClick={() => setStep('password')}
                    className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                  >
                    {t('common.continue', 'Continue')}
                  </button>
                </div>
              ) : email ? (
                <UserBubble>{email}</UserBubble>
              ) : null}
            </>
          )}

          {(step === 'password' || step === 'submitting') && (
            <>
              <AssistantBubble>
                {mode === 'login'
                  ? t('authChat.askPassword', 'And your password?')
                  : t('authChat.askPasswordSignup', 'Pick a password. Eight characters or more.')}
              </AssistantBubble>
              {step === 'password' ? (
                <div className="mt-1 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={passwordInputRef}
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && password) {
                          e.preventDefault();
                          submit();
                        }
                      }}
                      placeholder={t('auth.passwordPlaceholder', 'Password')}
                      className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                    />
                    <button
                      type="button"
                      disabled={!password || isSubmitting}
                      onClick={submit}
                      className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                    >
                      {mode === 'login'
                        ? t('home.nav.signIn', 'Sign in')
                        : t('auth.titleSignUp', 'Sign up')}
                    </button>
                  </div>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() =>
                        toast.message(t('auth.resetPasswordContactSupport', 'Contact support to reset your password.'))
                      }
                      className="self-start text-[12px] font-semibold text-brand-blue hover:underline"
                    >
                      {t('auth.forgotShort', 'Forgot?')}
                    </button>
                  )}
                </div>
              ) : (
                <UserBubble>{'•'.repeat(Math.min(password.length, 12))}</UserBubble>
              )}
            </>
          )}

          {step === 'submitting' && (
            <AssistantBubble>
              {mode === 'login'
                ? t('authChat.signingIn', 'Signing you in…')
                : t('authChat.creatingAccount', 'Creating your account…')}
            </AssistantBubble>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-text-tertiary">
            {t('auth.legalSignInShort', "By continuing you agree to our Terms and Privacy Policy.")}
          </p>
        </div>
      </div>
    </div>
  );
};

const AssistantBubble = ({ children }: { children: ReactNode }) => (
  <div className="flex items-end gap-2 animate-slide-up">
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
      R
    </span>
    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-light px-4 py-3 text-[15px] leading-relaxed text-text-primary">
      {children}
    </div>
  </div>
);

const UserBubble = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-blue px-4 py-2.5 text-[14px] leading-snug text-white">
      {children}
    </div>
  </div>
);

type ChipOption = { id: string; label: string };

const ChipGroup = ({
  options,
  onSelect,
}: {
  options: ChipOption[];
  onSelect: (opt: ChipOption) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onSelect(opt)}
        className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-semibold text-text-primary transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
      >
        {opt.label}
      </button>
    ))}
  </div>
);
