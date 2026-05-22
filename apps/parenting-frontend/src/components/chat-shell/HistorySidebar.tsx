import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { chatApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { LanguageSwitcher } from '../LanguageSwitcher.js';
import { useChatShell } from './ChatShellContext.js';

type Conversation = { id: string; createdAt: string; preview?: string | null };

/**
 * Left sidebar: conversation history (ChatGPT-style). Shows a sign-in CTA
 * when the user isn't authenticated, since we can't list private history.
 */
export const HistorySidebar = ({ onClose }: { onClose?: () => void }) => {
  const { t, i18n } = useTranslation();
  const { token, user, setToken, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeConversationId,
    setActiveConversationId,
    requestNewConversation,
    newConversationNonce,
  } = useChatShell();
  const isNewConversationActive = location.pathname === '/' && !activeConversationId;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }),
    [i18n.language],
  );

  const formatRelativeTime = (iso: string): string => {
    const date = new Date(iso);
    const diffMs = date.getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    const diffMin = Math.round(diffMs / 60_000);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHr = Math.round(diffMs / 3_600_000);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    const diffDay = Math.round(diffMs / 86_400_000);
    if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
    return date.toLocaleDateString(i18n.language);
  };

  const loadConversations = useCallback(async () => {
    if (!token) {
      setConversations([]);
      return;
    }
    setLoading(true);
    try {
      const data = await chatApi.listConversations();
      setConversations(data.conversations ?? []);
    } catch {
      // Ignore transient errors; keep prior list.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations, newConversationNonce]);

  // Re-poll periodically so the freshly-created assistant reply shows up.
  // Anything more efficient would need a backend event stream.
  useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(loadConversations, 15000);
    return () => clearInterval(id);
  }, [loadConversations, token]);

  const handleNew = () => {
    setActiveConversationId(null);
    requestNewConversation();
    // Also navigate when only the search string is non-empty (e.g. coming from
    // /login -> /?auth=login) so AuthChat closes via the URL effect.
    if (window.location.pathname !== '/' || window.location.search) {
      navigate('/');
    }
    onClose?.();
  };

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    if (window.location.pathname !== '/' || window.location.search) {
      navigate('/');
    }
    onClose?.();
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeleting(true);
    try {
      await chatApi.deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        requestNewConversation();
      }
      await loadConversations();
      setPendingDeleteId(null);
    } catch {
      // Silently ignore; the next refresh will reconcile.
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => {
            navigate('/');
            onClose?.();
          }}
          className="flex min-w-0 flex-col items-start gap-1 text-left"
        >
          <span className="text-[18px] font-extrabold leading-none tracking-tight text-text-primary">
            {t('common.appName', 'Raised')}
          </span>
          <span className="text-[12px] leading-snug text-text-secondary">
            {t('home.hero.schemaOrgDescription', 'Science-backed parenting guidance from bump to 18.')}
          </span>
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-light"
          >
            <Icon name={uiIcons.close} className="h-5 w-5 object-contain" alt="" />
          </button>
        )}
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={handleNew}
          aria-pressed={isNewConversationActive}
          data-rough-skip="true"
          className={clsx(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-[14px] font-semibold transition-colors',
            isNewConversationActive
              ? 'border-brand-blue/50 bg-brand-blue/10 text-brand-blue'
              : 'border-border bg-surface-light text-text-primary hover:bg-surface hover:border-brand-blue/40',
          )}
        >
          <Icon name={uiIcons.plus} className="h-4 w-4 object-contain" alt="" />
          <span>{t('chatPage.newConversation', 'New conversation')}</span>
        </button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-2">
        {!token && (
          <div className="m-2 rounded-xl bg-surface-light p-4 text-center">
            <p className="text-[14px] font-semibold text-text-primary">
              {t('chatShell.signInForHistory', 'Sign in to see your chat history')}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-text-secondary">
              {t('chatShell.signInBlurb', 'Your conversations are saved across devices once you sign in.')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-xl bg-brand-blue px-3 py-2.5 text-[14px] font-bold text-white hover:brightness-110"
              >
                {t('home.nav.signIn', 'Sign in')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light"
              >
                {t('common.signUp', 'Sign up')}
              </button>
            </div>
          </div>
        )}

        {token && conversations.length === 0 && !loading && (
          <p className="px-3 py-6 text-center text-[13px] text-text-secondary">
            {t('chatPage.noConversations', 'No conversations yet')}
          </p>
        )}

        {token && conversations.map((conv) => {
          const isSelected = activeConversationId === conv.id;
          return (
            <div
              key={conv.id}
              data-rough-skip="true"
              className={clsx(
                'mx-1 mb-1 flex items-start gap-1 rounded-xl border transition-colors',
                isSelected
                  ? 'border-brand-blue/50 bg-brand-blue/10'
                  : 'border-transparent hover:bg-surface-light',
              )}
            >
              <button
                type="button"
                onClick={() => handleSelect(conv.id)}
                aria-pressed={isSelected}
                className="flex min-w-0 flex-1 items-start gap-2 rounded-xl px-3 py-2.5 text-start"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={clsx(
                      'truncate text-[14px] font-semibold',
                      isSelected ? 'text-brand-blue' : 'text-text-primary',
                    )}
                  >
                    {conv.preview || t('chatPage.newConversation', 'New conversation')}
                  </p>
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    {formatRelativeTime(conv.createdAt)}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteId(conv.id)}
                title={t('chatPage.deleteConversation', 'Delete conversation')}
                className="mt-2 me-2 inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-text-secondary hover:bg-error/10 hover:text-error"
              >
                <Icon name={uiIcons.trash} className="h-3 w-3 object-contain" alt="" />
                {t('chatPage.deleteConversationShort', 'Delete')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 space-y-2 border-t border-border px-3 py-3">
        {token && user ? (
          <>
            <button
              type="button"
              onClick={() => {
                navigate('/settings');
                onClose?.();
              }}
              aria-label={t('chatShell.openSettings', 'Open settings')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-surface-light min-h-[44px]"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Icon name={uiIcons.user} className="h-3.5 w-3.5 object-contain" alt="" />
              </span>
              <span className="flex-1 truncate text-left">{user.email}</span>
              <Icon
                name={uiIcons.chevronRight}
                className="h-3.5 w-3.5 object-contain opacity-70"
                alt=""
              />
            </button>

            <LanguageSwitcher variant="full" className="w-full" />

            <button
              type="button"
              onClick={() => setSignOutConfirmOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-surface-light min-h-[44px]"
            >
              <Icon name={uiIcons.logout} className="h-4 w-4 object-contain" alt="" />
              {t('common.signOut', 'Sign out')}
            </button>
          </>
        ) : (
          <LanguageSwitcher variant="full" className="w-full" />
        )}
      </div>

      {signOutConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-out-confirm-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100">
                <Icon name={uiIcons.user} className="h-5 w-5 object-contain" alt="" />
              </div>
              <h2 id="sign-out-confirm-title" className="text-[18px] font-bold text-text-primary">
                {t('chatShell.signOutConfirmTitle', 'Sign out?')}
              </h2>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
              {t(
                'chatShell.signOutConfirmBody',
                "You'll need to sign in again to see your conversation history on this device.",
              )}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSignOutConfirmOpen(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light min-h-[44px]"
              >
                {t('settingsPage.deleteAccountCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignOutConfirmOpen(false);
                  handleLogout();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-accent-blueHover min-h-[44px]"
              >
                {t('common.signOut', 'Sign out')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-conversation-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-error/10 text-error">
                <Icon name={uiIcons.trash} className="h-5 w-5 object-contain" alt="" />
              </div>
              <h2 id="delete-conversation-title" className="text-[18px] font-bold text-text-primary">
                {t('chatPage.deleteConversationConfirmTitle', 'Delete this conversation?')}
              </h2>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
              {t('chatPage.deleteConversationConfirmBody', 'The full message history will be permanently removed. This cannot be undone.')}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light disabled:opacity-50 min-h-[44px]"
              >
                {t('settingsPage.deleteAccountCancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-error px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
              >
                {deleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                <Icon name={uiIcons.trash} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                {t('chatPage.deleteConversationConfirm', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
