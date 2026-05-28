import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { useAnalytics } from '../../lib/analytics';
import { api, parseApiError } from '../../lib/api.js';
import { useAuth } from '../../state/auth.js';
import { useNotificationStore } from '../../state/notification.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type Method = 'google' | 'email';
type Step =
  | 'method'
  | 'email'
  | 'password'
  | 'submitting'
  | 'forgot_email'
  | 'forgot_sending'
  | 'forgot_sent';

type LastError = 'login_invalid' | 'signup_exists' | null;

type AuthChatProps = {
  initialMode?: 'login' | 'signup';
  /** When provided, the close X calls this instead of navigating away, and
   *  the mode toggle flips state in place instead of changing routes.
   *  Use this to embed AuthChat inside another panel (e.g. ChatPanel). */
  onClose?: () => void;
};

export const AuthChat = ({ initialMode = 'login', onClose }: AuthChatProps) => {
  const { t, i18n } = useTranslation();
  const analytics = useAnalytics();
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
  const [lastError, setLastError] = useState<LastError>(null);

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
  }, [step, method, mode, lastError]);

  useEffect(() => {
    if (step === 'email' || step === 'forgot_email') emailInputRef.current?.focus();
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
        analytics.identify(userRes.data.user.id, { email: userRes.data.user.email });
        analytics.capture('user_logged_in_with_google', { email: userRes.data.user.email });
        navigate(next);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!status || status >= 500) Sentry.captureException(err);
        toast.error(parseApiError(err, t('auth.errorGoogleSignIn')));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setToken, setUser, t, next, analytics],
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

  // Switch between login and signup without wiping typed values. If an email
  // is already entered, jump straight to the password step in the new mode
  // (because we know the user has committed to this email). Otherwise reset
  // to the method chooser, which is the natural entry point.
  const switchMode = useCallback(
    (target: 'login' | 'signup') => {
      if (target === mode) return;
      setMode(target);
      setLastError(null);
      setMethod('email');
      if (email.trim()) {
        setStep('password');
      } else {
        setStep('method');
        setMethod(null);
      }
      // Standalone routes track mode in the URL; embedded mode is purely
      // in-state because the parent owns the route.
      if (!onClose) navigate(target === 'signup' ? '/register' : '/login');
    },
    [mode, email, onClose, navigate],
  );

  const goToChangeEmail = () => {
    setLastError(null);
    setStep('email');
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setStep('submitting');
    setLastError(null);
    const trimmedEmail = email.trim();
    try {
      // Signup creates the account, then we immediately chain into login so
      // the user lands authenticated without having to tap Sign in again.
      // The signup endpoint may or may not return a token depending on the
      // backend; we use whatever login returns to set auth state.
      let token: string | undefined;
      if (mode === 'signup') {
        const signupRes = await api.post('/api/identity/signup', {
          email: trimmedEmail,
          password,
        });
        analytics.capture('user_signed_up', { email: trimmedEmail });
        token = signupRes.data?.token;
      }
      if (!token) {
        const loginRes = await api.post('/api/identity/login', {
          email: trimmedEmail,
          password,
        });
        token = loginRes.data.token;
      }
      if (!token) throw new Error('Auth response did not include a token');
      setToken(token);
      const userRes = await api.get('/api/identity/me');
      setUser(userRes.data.user);
      analytics.identify(userRes.data.user.id, { email: userRes.data.user.email });
      analytics.capture(mode === 'signup' ? 'user_logged_in_after_signup' : 'user_logged_in', {
        email: userRes.data.user.email,
      });
      navigate(next);

      const displayName = formatDisplayName(userRes.data.user?.email?.split('@')[0]);
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: t('auth.notificationWelcomeTitle'),
        message: t('auth.notificationWelcomeMessage', { name: displayName }),
      });
      toast.success(
        mode === 'signup'
          ? t('auth.toastAccountCreated', "Welcome to Raised, {{name}}!", { name: displayName })
          : t('auth.toastWelcomeBack', { name: displayName }),
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status >= 500) Sentry.captureException(err);
      // Surface a chat-native recovery option for the two common mistakes
      // (wrong mode, wrong credentials) instead of just a generic toast.
      if (mode === 'login' && status === 401) {
        setLastError('login_invalid');
      } else if (mode === 'signup' && status === 409) {
        setLastError('signup_exists');
      } else {
        const fallback =
          mode === 'login' ? t('auth.errorSignInFailed') : t('auth.errorSignUpFailed');
        toast.error(parseApiError(err, fallback));
      }
      setStep('password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot-password: in-chat sub-flow that hits POST /api/identity/reset-request.
  // The backend always returns ok to prevent email enumeration, so the UI is
  // intentionally optimistic and tells the user to check their inbox.
  const startForgotFlow = () => {
    setLastError(null);
    setStep('forgot_email');
  };

  const submitForgot = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setStep('forgot_sending');
    try {
      await api.post('/api/identity/reset-request', { email: trimmedEmail });
      setStep('forgot_sent');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status >= 500) Sentry.captureException(err);
      toast.error(parseApiError(err, t('auth.errorResetFailed', 'Could not send reset link. Try again.')));
      setStep('forgot_email');
    }
  };

  const introBubble = isGuestReturn
    ? t(
        'authChat.guestReturnIntro',
        "Welcome back! I've kept your draft safe. Let's pick up where you left off.",
      )
    : t(
        'authChat.introNeutral',
        "Hi! I'm Raised. Let's set things up so I can remember our chats.",
      );

  const isForgotFlow = step === 'forgot_email' || step === 'forgot_sending' || step === 'forgot_sent';

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
        {!isForgotFlow && (
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text-primary hover:border-brand-blue/40"
          >
            {mode === 'login' ? t('common.signUp', 'Sign up') : t('home.nav.signIn', 'Sign in')}
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2 sm:px-6"
      >
        <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col gap-3">
          <AssistantBubble>{introBubble}</AssistantBubble>

          {!isForgotFlow && (
            <AssistantBubble>
              {t('authChat.askIntent', 'Are you signing back in, or creating an account?')}
            </AssistantBubble>
          )}

          {step === 'method' && (
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
                  { id: 'signin', label: t('authChat.chipSignIn', 'I have an account') },
                  { id: 'signup', label: t('authChat.chipSignUp', "I'm new here") },
                ]}
                onSelect={(opt) => {
                  setMode(opt.id === 'signup' ? 'signup' : 'login');
                  setMethod('email');
                  setStep('email');
                }}
              />
            </div>
          )}

          {!isForgotFlow && step !== 'method' && (
            <UserBubble>
              {mode === 'signup'
                ? t('authChat.choseSignUp', "I'm creating a new account")
                : t('authChat.choseSignIn', 'I have an account')}
            </UserBubble>
          )}

          {!isForgotFlow && (step === 'email' || (method === 'email' && step !== 'method')) && (
            <>
              <AssistantBubble>
                {mode === 'signup'
                  ? t('authChat.askEmailSignup', "Great! What's your email?")
                  : t('authChat.askEmail', "Welcome back! What's your email?")}
              </AssistantBubble>
              {step === 'email' ? (
                <>
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
                  <SwitchModeLink mode={mode} onSwitch={switchMode} />
                </>
              ) : email ? (
                <UserBubble>{email}</UserBubble>
              ) : null}
            </>
          )}

          {!isForgotFlow && (step === 'password' || step === 'submitting') && (
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
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <button
                      type="button"
                      onClick={goToChangeEmail}
                      className="text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:underline"
                    >
                      {t('authChat.changeEmail', 'Change email')}
                    </button>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={startForgotFlow}
                        className="text-[12px] font-semibold text-brand-blue hover:underline"
                      >
                        {t('auth.forgotShort', 'Forgot?')}
                      </button>
                    )}
                    <SwitchModeLink mode={mode} onSwitch={switchMode} compact />
                  </div>
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

          {lastError === 'login_invalid' && (
            <>
              <AssistantBubble>
                {t(
                  'authChat.loginInvalid',
                  "I couldn't sign you in with that email and password. If you're new here, I can create an account instead.",
                )}
              </AssistantBubble>
              <ChipGroup
                options={[
                  { id: 'signup', label: t('authChat.chipSwitchToSignup', 'Create an account instead') },
                  { id: 'forgot', label: t('authChat.chipForgot', 'I forgot my password') },
                ]}
                onSelect={(opt) => {
                  if (opt.id === 'signup') switchMode('signup');
                  else startForgotFlow();
                }}
              />
            </>
          )}

          {lastError === 'signup_exists' && (
            <>
              <AssistantBubble>
                {t(
                  'authChat.signupExists',
                  "Looks like you already have an account with that email. Want to sign in instead?",
                )}
              </AssistantBubble>
              <ChipGroup
                options={[
                  { id: 'signin', label: t('authChat.chipSwitchToSignin', 'Sign in instead') },
                ]}
                onSelect={() => switchMode('login')}
              />
            </>
          )}

          {/* Forgot-password sub-flow */}
          {isForgotFlow && (
            <>
              <AssistantBubble>
                {t(
                  'authChat.forgotIntro',
                  "No worries. What email should I send the reset link to?",
                )}
              </AssistantBubble>
              {step === 'forgot_email' && (
                <>
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
                          void submitForgot();
                        }
                      }}
                      placeholder={t('auth.emailPlaceholder', 'you@example.com')}
                      className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                    />
                    <button
                      type="button"
                      disabled={!email.trim()}
                      onClick={() => void submitForgot()}
                      className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                    >
                      {t('auth.sendResetLink', 'Send reset link')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('password')}
                    className="self-start text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:underline"
                  >
                    {t('authChat.backToSignIn', 'Back to sign in')}
                  </button>
                </>
              )}
              {step === 'forgot_sending' && (
                <AssistantBubble>
                  {t('authChat.forgotSending', 'Sending the reset link…')}
                </AssistantBubble>
              )}
              {step === 'forgot_sent' && (
                <>
                  <UserBubble>{email}</UserBubble>
                  <AssistantBubble>
                    {t(
                      'authChat.forgotSent',
                      "Check your inbox. If we have an account for that email, a reset link is on its way. The link expires in 30 minutes.",
                    )}
                  </AssistantBubble>
                  <ChipGroup
                    options={[
                      { id: 'signin', label: t('authChat.backToSignIn', 'Back to sign in') },
                    ]}
                    onSelect={() => {
                      setStep('password');
                      setLastError(null);
                    }}
                  />
                </>
              )}
            </>
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

const SwitchModeLink = ({
  mode,
  onSwitch,
  compact = false,
}: {
  mode: 'login' | 'signup';
  onSwitch: (target: 'login' | 'signup') => void;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const target: 'login' | 'signup' = mode === 'login' ? 'signup' : 'login';
  const label =
    mode === 'login'
      ? t('authChat.switchToSignup', "I'm new here, sign me up instead")
      : t('authChat.switchToSignin', 'I already have an account');
  return (
    <button
      type="button"
      onClick={() => onSwitch(target)}
      className={
        compact
          ? 'text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:underline'
          : 'self-start text-[13px] font-semibold text-text-secondary hover:text-text-primary hover:underline'
      }
    >
      {label}
    </button>
  );
};
