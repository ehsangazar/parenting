import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { switchLocalePath } from '../../lib/publicRoutes.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../state/auth.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { profileApi } from '../../lib/appApi.js';
import axios from 'axios';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { useSoundManager } from '../../lib/useSoundManager.js';
import { DEFAULT_AVATAR_URL } from '../../lib/defaultAvatar.js';
import { SUPPORTED_LOCALES, type AppLocale } from '../../i18n.js';
import { FamilyManagement } from './FamilyManagement.js';

const LOCALE_LABELS: Record<string, { native: string; flag: string }> = {
  en: { native: 'English', flag: '🇬🇧' },
  fa: { native: 'فارسی', flag: '🇮🇷' },
};

const currentLocale = (lng: string): AppLocale => {
  const base = (lng?.split('-')[0] ?? 'en') as AppLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : 'en';
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    data-on={checked}
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className="toggle-switch focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:ring-offset-1 focus:ring-offset-surface"
  >
    <span className="toggle-switch-thumb" />
  </button>
);

const IconBox = ({ name, tone = 'neutral' }: { name: IconName; tone?: 'neutral' | 'brand' | 'danger' }) => {
  const toneClass =
    tone === 'brand' ? 'bg-primary-100 text-primary-fg'
    : tone === 'danger' ? 'bg-red-500/10 text-red-500'
    : 'bg-surface-light text-text-secondary';
  return (
    <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClass)}>
      <Icon name={name} className="h-5 w-5 object-contain opacity-80" alt="" />
    </div>
  );
};

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section>
    <p className="mb-2 ml-1 text-[13px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
    <div className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border/60">
      {children}
    </div>
  </section>
);

const InfoRow = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <div className="flex items-center gap-3 px-4 py-4">
    <IconBox name={icon} />
    <p className="flex-1 text-[14px] font-semibold text-text-secondary">{label}</p>
    <p className="text-[14px] font-semibold text-text-primary text-end">{value}</p>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { token, user, setUser, setToken } = useAuth();
  const { soundEnabled, setSoundEnabled, voiceEnabled, setVoiceEnabled, play } = useSoundManager();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingLocale, setChangingLocale] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!user) {
      api.get('/api/identity/me')
        .then((res) => {
          setUser(res.data.user);
          setName(res.data.user.profile?.name || '');
        })
        .catch(() => navigate('/login'))
        .finally(() => setLoading(false));
    } else {
      setName(user.profile?.name || '');
      setLoading(false);
    }
  }, [token, user, navigate, setUser]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleUpdateProfile = useCallback(async () => {
    setSaving(true);
    try {
      const res = await profileApi.update({ name });
      setUser(res.user);
      toast.success(t('settingsPage.profileUpdated'));
    } catch {
      toast.error(t('settingsPage.profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  }, [name, setUser, t]);

  const handleLocaleChange = async (locale: AppLocale) => {
    if (locale === currentLocale(i18n.language) || changingLocale) return;
    setChangingLocale(true);
    try {
      await i18n.changeLanguage(locale);
      navigate(switchLocalePath(location.pathname, locale), { replace: true });
      const res = await profileApi.update({ locale });
      setUser(res.user);
      toast.success(t('settings.changesSaved'));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setChangingLocale(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await profileApi.getAvatarUploadUrl(file.type, file.size);
      await axios.put(url, file, { headers: { 'Content-Type': file.type } });
      const avatarUrl = url.split('?')[0];
      const res = await profileApi.update({ avatarUrl });
      setUser(res.user);
      toast.success(t('settingsPage.avatarUpdated'));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || t('settingsPage.avatarUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success(t('settingsPage.installSuccess'));
        setInstallPrompt(null);
      }
    } catch {
      // user dismissed; nothing to do.
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setConfirmSignOut(false);
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await profileApi.deleteAccount();
      toast.success(t('settingsPage.deleteAccountSuccess'));
      setToken(null);
      setUser(null);
      navigate('/');
    } catch {
      toast.error(t('settingsPage.deleteAccountFailed'));
      setDeleting(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <PageContainer verticalSpacing="normal">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <div className="h-32 animate-pulse rounded-3xl bg-surface" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 animate-pulse rounded-2xl bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
        </div>
      </PageContainer>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', { month: 'long', year: 'numeric' })
    : '';
  const activeLang = currentLocale(i18n.language);
  const nameChanged = name !== (user.profile?.name || '');

  return (
    <PageContainer verticalSpacing="normal">
      <div className="mx-auto w-full max-w-2xl space-y-6 pb-20 lg:pb-8">

        {/* ── Profile hero ──────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={t('settingsPage.yourAvatar')}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface"
            >
              <img
                src={user.profile?.avatarUrl || DEFAULT_AVATAR_URL}
                alt=""
                className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Icon name={uiIcons.camera} className="h-5 w-5 object-contain brightness-0 invert" alt="" />
                )}
              </div>
              <div className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface shadow-sm">
                <Icon name={uiIcons.camera} className="h-3.5 w-3.5 object-contain opacity-70" alt="" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-bold text-text-primary sm:text-[22px]">
                {user.profile?.name || <span className="text-text-secondary">{t('settingsPage.noNameSet')}</span>}
              </p>
              <p className="mt-0.5 truncate text-[14px] text-text-secondary">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-1 text-[12px] font-bold capitalize text-primary-fg">
                  <Icon name={uiIcons.checkOk} className="h-3 w-3 object-contain" alt="" />
                  {user.role || t('settingsPage.userRole')}
                </span>
                {memberSince && (
                  <span className="text-[12px] text-text-secondary">{t('settingsPage.since', { date: memberSince })}</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-4">
            <label className="mb-2 block text-[13px] font-semibold text-text-secondary" htmlFor="display-name">
              {t('settingsPage.displayName')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => { if (nameChanged) handleUpdateProfile(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                placeholder={t('settingsPage.displayNamePlaceholder')}
                className="flex-1 rounded-xl border border-border bg-surface-light px-4 py-3 text-[15px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
              {saving && (
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              )}
            </div>
            <p className="mt-2 text-[13px] text-text-secondary">{t('settingsPage.displayNameHint')}</p>
          </div>
        </section>

        {/* ── Preferences ────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.preferences')}>
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <IconBox name={uiIcons.globe} />
            <p className="flex-1 text-[15px] font-semibold text-text-primary">{t('settings.language')}</p>
            <div className="flex gap-1 rounded-xl border border-border bg-surface-light p-1">
              {SUPPORTED_LOCALES.map((loc) => {
                const info = LOCALE_LABELS[loc] ?? { native: loc, flag: '🌐' };
                const isActive = activeLang === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    disabled={changingLocale}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all',
                      isActive
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <span aria-hidden="true">{info.flag}</span>
                    <span>{info.native}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-4">
            <IconBox name={uiIcons.megaphone} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">{t('settingsPage.gameSounds')}</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">{t('settingsPage.gameSoundsDesc')}</p>
            </div>
            <Toggle
              checked={soundEnabled}
              onChange={(v) => { setSoundEnabled(v); if (v) play('buttonPrimary'); }}
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-4">
            <IconBox name={uiIcons.music} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">{t('settingsPage.voicePhrases')}</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">{t('settingsPage.voicePhrasesDesc')}</p>
            </div>
            <Toggle checked={voiceEnabled} onChange={setVoiceEnabled} />
          </div>
        </Group>

        {/* ── Family ─────────────────────────────────────────────────────── */}
        <FamilyManagement />

        {/* ── Install app ─────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.installApp')}>
          <div className="flex items-start gap-3 px-4 py-4">
            <IconBox name={uiIcons.smartphone} tone="brand" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary">{t('settingsPage.addToHomeScreen')}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                {installPrompt
                  ? t('settingsPage.installDescription')
                  : t('settingsPage.installNotAvailable')}
              </p>
              {installPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                >
                  <Icon name={uiIcons.download} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                  {t('settingsPage.installNow')}
                </button>
              )}
            </div>
          </div>
        </Group>

        {/* ── Account info ───────────────────────────────────────────────── */}
        <Group label={t('settings.account')}>
          <InfoRow icon={uiIcons.mail} label={t('settingsPage.email')} value={user.email} />
          {memberSince && (
            <InfoRow icon={uiIcons.calendar} label={t('settingsPage.memberSince')} value={memberSince} />
          )}
        </Group>

        {/* ── Danger zone ────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.dangerZone')}>
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-surface-light min-h-[56px]"
          >
            <IconBox name={uiIcons.logout} />
            <p className="flex-1 text-[15px] font-semibold text-text-primary">{t('settingsPage.signOut')}</p>
          </button>
          <button
            type="button"
            onClick={() => { setConfirmDelete(true); setDeleteConfirmText(''); }}
            className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-red-500/5 min-h-[56px]"
          >
            <IconBox name={uiIcons.trash} tone="danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-red-500">{t('settingsPage.deleteAccount')}</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">{t('settingsPage.deleteAccountDesc')}</p>
            </div>
          </button>
        </Group>

      </div>

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
                <Icon name={uiIcons.alertTriangle} className="h-5 w-5 object-contain text-red-500" alt="" />
              </div>
              <h2 id="delete-account-title" className="text-[18px] font-bold text-text-primary">
                {t('settingsPage.deleteAccountConfirmTitle')}
              </h2>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
              {t('settingsPage.deleteAccountConfirmBody')}
            </p>
            <input
              type="text"
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t('settingsPage.deleteAccountTypeHint')}
              className="mt-4 w-full rounded-xl border border-border bg-surface-light px-4 py-3 text-[15px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light disabled:opacity-50"
              >
                {t('settingsPage.deleteAccountCancel')}
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {t('settingsPage.deleteAccountConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign-out confirmation modal ──────────────────────────────────── */}
      {confirmSignOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-out-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-light">
                <Icon name={uiIcons.logout} className="h-5 w-5 object-contain" alt="" />
              </div>
              <h2 id="sign-out-title" className="text-[18px] font-bold text-text-primary">
                {t('settingsPage.signOutConfirmTitle')}
              </h2>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
              {t('settingsPage.signOutConfirmBody')}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light min-h-[44px]"
              >
                {t('settingsPage.deleteAccountCancel')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:brightness-110 min-h-[44px]"
              >
                <Icon name={uiIcons.logout} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                {t('settingsPage.signOutConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
