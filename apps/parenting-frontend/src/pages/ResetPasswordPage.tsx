import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { api, parseApiError } from '../lib/api.js';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';

/**
 * /reset?token=... — consumes the password-reset link from the email sent by
 * POST /api/identity/reset-request. Visual style mirrors AuthChat (chat
 * bubbles, brand-blue button) so the journey feels continuous.
 */
export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (!token) return;
    if (password.length < 8) {
      toast.error(t('auth.passwordMinLength', 'Password must be at least 8 characters'));
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.passwordsDontMatch', "Those passwords don't match."));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/identity/reset', { token, newPassword: password });
      setDone(true);
      toast.success(t('auth.toastPasswordReset', 'Password updated. Sign in with your new password.'));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status || status >= 500) Sentry.captureException(err);
      toast.error(
        parseApiError(
          err,
          status === 400
            ? t('auth.errorResetExpired', 'This reset link has expired. Request a new one from the sign-in screen.')
            : t('auth.errorResetFailed', 'Could not reset your password. Try again.'),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen flex-col bg-background text-text-primary">
      <header
        className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-surface-light"
          aria-label={t('common.close', 'Close')}
        >
          <Icon name={uiIcons.close} className="h-5 w-5 object-contain" alt="" aria-hidden />
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
        <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col gap-3">
          {!token ? (
            <>
              <AssistantBubble>
                {t(
                  'resetPage.missingToken',
                  "This reset link doesn't have a token. Try requesting a new one from the sign-in screen.",
                )}
              </AssistantBubble>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-semibold text-text-primary hover:border-brand-blue/40 hover:bg-brand-blue/5"
                >
                  {t('authChat.backToSignIn', 'Back to sign in')}
                </button>
              </div>
            </>
          ) : done ? (
            <>
              <AssistantBubble>
                {t('resetPage.success', "Done! Your password is updated. Let's get you signed in.")}
              </AssistantBubble>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white"
                >
                  {t('home.nav.signIn', 'Sign in')}
                </button>
              </div>
            </>
          ) : (
            <>
              <AssistantBubble>
                {t(
                  'resetPage.intro',
                  "Let's set a new password for your account. Eight characters or more.",
                )}
              </AssistantBubble>
              <div className="mt-1 flex flex-col gap-2">
                <input
                  ref={passwordInputRef}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder', 'Password')}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && confirm) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder={t('auth.confirmPassword', 'Confirm password')}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  disabled={!password || !confirm || isSubmitting}
                  onClick={() => void submit()}
                  className="self-start rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                >
                  {isSubmitting
                    ? t('resetPage.submitting', 'Updating…')
                    : t('auth.resetPassword', 'Reset password')}
                </button>
              </div>
            </>
          )}
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
