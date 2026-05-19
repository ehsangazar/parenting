import { notificationsApi } from './appApi.js';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
};

const detectTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

const serializeSubscription = (sub: PushSubscription) => {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Subscription is missing endpoint or keys');
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
};

export interface PushSetupResult {
  ok: boolean;
  reason?: 'unsupported' | 'permission_denied' | 'not_configured' | 'subscribe_failed';
  message?: string;
}

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const enablePush = async (): Promise<PushSetupResult> => {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  let cfg: { enabled: boolean; publicKey: string };
  try {
    cfg = await notificationsApi.getConfig();
  } catch {
    return { ok: false, reason: 'not_configured' };
  }
  if (!cfg.enabled || !cfg.publicKey) {
    return { ok: false, reason: 'not_configured' };
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'permission_denied' };
  } else if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'permission_denied' };
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (err) {
      return { ok: false, reason: 'subscribe_failed', message: String(err) };
    }
  }
  await navigator.serviceWorker.ready;

  let sub: PushSubscription | null = await registration.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey).buffer as ArrayBuffer,
      });
    } catch (err) {
      return { ok: false, reason: 'subscribe_failed', message: String(err) };
    }
  }

  try {
    await notificationsApi.subscribe({
      subscription: serializeSubscription(sub),
      userAgent: navigator.userAgent,
      timeZone: detectTimeZone(),
    });
  } catch (err) {
    return { ok: false, reason: 'subscribe_failed', message: String(err) };
  }

  return { ok: true };
};

export const disablePush = async (): Promise<void> => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return;

  try {
    await notificationsApi.unsubscribe(sub.endpoint);
  } catch {
    // server may already have purged it; carry on with the local unsubscribe
  }
  try {
    await sub.unsubscribe();
  } catch {
    // best-effort
  }
};

export const sendTestPush = async () => notificationsApi.sendTest();
