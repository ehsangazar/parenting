import type { NotificationPrefs } from '@parenting/shared/api';
import { profileApi } from './appApi.js';
import { enablePush, isPushSupported, type PushSetupResult } from './pushClient.js';

const DISMISSED_AT_KEY = 'raised_push_prompt_dismissed_at';
const HIDE_FOREVER_KEY = 'raised_push_prompt_hide_forever';
const ACCEPTED_KEY = 'raised_push_prompt_accepted_at';

const DISMISS_COOLDOWN_DAYS = 14;

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  channels: { push: false, email: true },
  topics: {
    dailyTip: true,
    weeklyRecap: true,
    courseReminders: true,
    calendarReminders: true,
    marketing: false,
  },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
};

const readPrefsFromProfile = (profile: unknown): NotificationPrefs => {
  if (!profile || typeof profile !== 'object') return DEFAULT_NOTIFICATION_PREFS;
  const stored = (profile as { notificationPrefs?: Partial<NotificationPrefs> }).notificationPrefs;
  if (!stored) return DEFAULT_NOTIFICATION_PREFS;
  return {
    channels: { ...DEFAULT_NOTIFICATION_PREFS.channels, ...stored.channels },
    topics: { ...DEFAULT_NOTIFICATION_PREFS.topics, ...stored.topics },
    quietHours: { ...DEFAULT_NOTIFICATION_PREFS.quietHours, ...stored.quietHours },
  };
};

const detectTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

const hasBrowserPushGranted = (): boolean => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
};

const hasBrowserPushDenied = (): boolean => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'denied';
};

/**
 * Returns true when the push opt-in nudge should be visible.
 * Returns false when push is unsupported, already granted, hard-blocked,
 * already dismissed within the cooldown, hidden forever, or the user already
 * has push enabled in their saved preferences.
 */
export const shouldShowPushPrompt = (profile: unknown): boolean => {
  if (!isPushSupported()) return false;
  if (hasBrowserPushGranted()) return false;
  if (hasBrowserPushDenied()) return false;

  const prefs = readPrefsFromProfile(profile);
  if (prefs.channels.push) return false;

  try {
    if (localStorage.getItem(HIDE_FOREVER_KEY)) return false;
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY) ?? '0');
    if (dismissedAt > 0) {
      const ageMs = Date.now() - dismissedAt;
      if (ageMs < DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return false;
    }
  } catch {
    // localStorage unavailable; default to showing the prompt
  }

  return true;
};

export const markPromptDismissed = () => {
  try {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

export const markPromptHideForever = () => {
  try {
    localStorage.setItem(HIDE_FOREVER_KEY, '1');
  } catch {
    // ignore
  }
};

export const markPromptAccepted = () => {
  try {
    localStorage.setItem(ACCEPTED_KEY, String(Date.now()));
    localStorage.removeItem(DISMISSED_AT_KEY);
  } catch {
    // ignore
  }
};

export interface RequestPushOptInResult extends PushSetupResult {
  /** Updated user payload returned by the profile API, when enable succeeded. */
  updatedUser?: unknown;
}

/**
 * Full opt-in flow: registers the push subscription AND flips
 * notificationPrefs.channels.push so the backend dispatcher will actually
 * send. Returns the updated user so callers can refresh auth state.
 */
export const requestPushOptIn = async (profile: unknown): Promise<RequestPushOptInResult> => {
  const result = await enablePush();
  if (!result.ok) return result;

  const prefs = readPrefsFromProfile(profile);
  const next: NotificationPrefs = {
    ...prefs,
    channels: { ...prefs.channels, push: true },
  };
  try {
    const res = await profileApi.update({
      notificationPrefs: next,
      timeZone: detectTimeZone(),
    });
    markPromptAccepted();
    return { ok: true, updatedUser: res.user };
  } catch (err) {
    return { ok: false, reason: 'subscribe_failed', message: String(err) };
  }
};
