import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { switchLocalePath } from '../../lib/publicRoutes.js';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../state/auth.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { profileApi } from '../../lib/appApi.js';
import axios from 'axios';
import { toast } from 'sonner';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { useSoundManager } from '../../lib/useSoundManager.js';
import { DEFAULT_AVATAR_URL } from '../../lib/defaultAvatar.js';
import { SUPPORTED_LOCALES, type AppLocale } from '../../i18n.js';

const LOCALE_LABELS: Record<string, { native: string; flag: string }> = {
  en: { native: 'English', flag: '🇬🇧' },
  fa: { native: 'فارسی', flag: '🇮🇷' },
};

const currentLocale = (lng: string): AppLocale => {
  const base = (lng?.split('-')[0] ?? 'en') as AppLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : 'en';
};

// ─── Small reusable primitives ────────────────────────────────────────────────

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

const IconBox = ({ name, accent }: { name: IconName; accent?: boolean }) => (
  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent ? 'bg-primary-100' : 'bg-surface-light'}`}>
    <Icon name={name} className="h-4 w-4 object-contain opacity-70" alt="" />
  </div>
);

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section>
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
    <div className="overflow-hidden rounded-2xl border border-border-light bg-surface divide-y divide-border-light/50">
      {children}
    </div>
  </section>
);

const InfoRow = ({ icon, label, value, accent }: { icon: IconName; label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center gap-3 px-4 py-3.5">
    <IconBox name={icon} accent={accent} />
    <p className="flex-1 text-sm font-medium text-text-secondary">{label}</p>
    <p className={`text-sm font-semibold ${accent ? 'text-primary-fg' : 'text-text-primary'}`}>{value}</p>
  </div>
);

const NavRow = ({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-light/50 active:bg-surface-light"
  >
    <IconBox name={icon} />
    <p className="flex-1 text-sm font-semibold text-text-primary">{label}</p>
    <Icon name={uiIcons.chevronRight} className="h-4 w-4 object-contain opacity-30" alt="" />
  </button>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toApp } = useAppBase();
  const { t, i18n } = useTranslation();
  const { token, user, setUser } = useAuth();
  const { families, activeFamilyId, setActiveFamilyId } = useAppContext();
  const { soundEnabled, setSoundEnabled, voiceEnabled, setVoiceEnabled, play } = useSoundManager();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingLocale, setChangingLocale] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!user) {
      api.get('/api/auth/me')
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

  const handleUpdateProfile = async () => {
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
  };

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
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('settingsPage.avatarUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <PageContainer verticalSpacing="normal">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <div className="h-28 animate-pulse rounded-3xl bg-surface" />
          <div className="h-16 animate-pulse rounded-2xl bg-surface" />
          <div className="h-36 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 animate-pulse rounded-2xl bg-surface" />
        </div>
      </PageContainer>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', { month: 'long', year: 'numeric' })
    : '—';
  const activeLang = currentLocale(i18n.language);
  const nameChanged = name !== (user.profile?.name || '');

  return (
    <PageContainer verticalSpacing="normal">
      <div className="mx-auto w-full max-w-2xl space-y-5 pb-20 lg:pb-8">

        {/* ── Profile hero ──────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-3xl border border-border-light bg-surface">
          {/* Decorative gradient strip */}
          <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-300 opacity-60" />
          <div className="flex items-center gap-5 px-5 py-5">
            {/* Avatar — click/tap to upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface"
            >
              <img
                src={user.profile?.avatarUrl || DEFAULT_AVATAR_URL}
                alt={t('settingsPage.yourAvatar')}
                className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Icon name={uiIcons.camera} className="h-5 w-5 object-contain brightness-0 invert" alt="" />
                )}
              </div>
              {/* Subtle camera badge */}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border-light bg-surface shadow-sm">
                <Icon name={uiIcons.camera} className="h-3 w-3 object-contain opacity-60" alt="" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />

            {/* Identity */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold text-text-primary">
                {user.profile?.name || <span className="text-text-tertiary">{t('settingsPage.noNameSet')}</span>}
              </p>
              <p className="mt-0.5 truncate text-sm text-text-secondary">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold capitalize text-primary-fg">
                  <Icon name={uiIcons.checkOk} className="h-3 w-3 object-contain" alt="" />
                  {user.role || t('settingsPage.userRole')}
                </span>
                {memberSince && (
                  <span className="text-xs text-text-tertiary">{t('settingsPage.since', { date: memberSince })}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Profile ────────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.profile')}>
          <div className="px-4 py-3.5">
            <label className="mb-1.5 block text-xs font-semibold text-text-tertiary" htmlFor="display-name">
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
                className="flex-1 rounded-xl border border-border bg-surface-light px-3.5 py-2.5 text-sm font-semibold text-text-primary placeholder:font-normal placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
              {saving && (
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              )}
            </div>
            <p className="mt-1.5 text-xs text-text-tertiary">{t('settingsPage.displayNameHint')}</p>
          </div>
        </Group>

        {/* ── Family ─────────────────────────────────────────────────────── */}
        {families.length > 0 && (
          <Group label={t('settingsPage.family')}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <IconBox name={uiIcons.users} />
              <p className="flex-1 text-sm font-semibold text-text-primary">{t('settingsPage.activeFamily')}</p>
              <select
                value={activeFamilyId ?? ''}
                onChange={(e) => setActiveFamilyId(e.target.value)}
                className="max-w-[160px] truncate rounded-xl border border-border-light bg-surface-light px-3 py-1.5 text-sm font-semibold text-text-primary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 transition-all"
              >
                {families.map((family) => (
                  <option key={family.id} value={family.id}>{family.name}</option>
                ))}
              </select>
            </div>
            <NavRow icon={uiIcons.userPlus} label={t('settingsPage.manageFamilyMembers')} onClick={() => navigate(toApp('/app/family'))} />
          </Group>
        )}

        {/* ── Preferences ────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.preferences')}>
          {/* Language */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconBox name={uiIcons.globe} />
            <p className="flex-1 text-sm font-semibold text-text-primary">{t('settings.language')}</p>
            <div className="flex gap-1 rounded-xl border border-border-light bg-surface-light p-0.5">
              {SUPPORTED_LOCALES.map((loc) => {
                const info = LOCALE_LABELS[loc] ?? { native: loc, flag: '🌐' };
                const isActive = activeLang === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    disabled={changingLocale}
                    className={`flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    <span>{info.flag}</span>
                    <span>{info.native}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game sounds */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconBox name={uiIcons.megaphone} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">{t('settingsPage.gameSounds')}</p>
              <p className="text-xs text-text-tertiary">{t('settingsPage.gameSoundsDesc')}</p>
            </div>
            <Toggle
              checked={soundEnabled}
              onChange={(v) => { setSoundEnabled(v); if (v) play('buttonPrimary'); }}
            />
          </div>

          {/* Voice phrases */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconBox name={uiIcons.music} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">{t('settingsPage.voicePhrases')}</p>
              <p className="text-xs text-text-tertiary">{t('settingsPage.voicePhrasesDesc')}</p>
            </div>
            <Toggle checked={voiceEnabled} onChange={setVoiceEnabled} />
          </div>
        </Group>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <Group label={t('settings.account')}>
          <InfoRow icon={uiIcons.mail} label={t('settingsPage.email')} value={user.email} />
          <InfoRow icon={uiIcons.checkOk} label={t('settingsPage.role')} value={user.role || t('settingsPage.userRole')} />
          {user.createdAt && (
            <InfoRow icon={uiIcons.calendar} label={t('settingsPage.memberSince')} value={memberSince} />
          )}
          <InfoRow icon={uiIcons.shield} label={t('settingsPage.dataPrivacy')} value={t('settingsPage.dataPrivacyValue')} accent />
        </Group>

        {/* ── Install app ─────────────────────────────────────────────────── */}
        <Group label={t('settingsPage.installApp')}>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <div className="mt-0.5">
              <IconBox name={uiIcons.smartphone} accent />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{t('settingsPage.addToHomeScreen')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-tertiary">{t('settingsPage.addToHomeScreenDesc')}</p>
            </div>
          </div>
        </Group>

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => {
            useAuth.getState().setToken(null);
            useAuth.getState().setUser(null);
            navigate('/login');
          }}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/15 active:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400/30"
        >
          <Icon name={uiIcons.logout} className="h-4 w-4 object-contain" alt="" />
          {t('settingsPage.signOut')}
        </button>

      </div>
    </PageContainer>
  );
};
