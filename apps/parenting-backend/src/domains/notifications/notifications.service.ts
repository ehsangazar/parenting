import webpush from "web-push";
import { env } from "../../config/env.js";
import { prisma } from "../../shared/db/index.js";
import * as repo from "./notifications.repository.js";
import type { NotificationPrefs } from "../identity/identity.types.js";
import type { PushPayload, SendResult } from "./notifications.types.js";

const DEFAULT_PREFS: NotificationPrefs = {
  channels: { push: false, email: true },
  topics: {
    dailyTip: true,
    weeklyRecap: true,
    courseReminders: true,
    calendarReminders: true,
    marketing: false,
  },
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
};

let vapidConfigured = false;

const configureVapid = () => {
  if (vapidConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return false;
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
};

export const isPushConfigured = () =>
  Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

const readPrefs = (profile: unknown): NotificationPrefs => {
  if (!profile || typeof profile !== "object") return DEFAULT_PREFS;
  const stored = (profile as { notificationPrefs?: Partial<NotificationPrefs> }).notificationPrefs;
  if (!stored) return DEFAULT_PREFS;
  return {
    channels: { ...DEFAULT_PREFS.channels, ...stored.channels },
    topics: { ...DEFAULT_PREFS.topics, ...stored.topics },
    quietHours: { ...DEFAULT_PREFS.quietHours, ...stored.quietHours },
  };
};

const readTimeZone = (profile: unknown): string | null => {
  if (!profile || typeof profile !== "object") return null;
  const tz = (profile as { timeZone?: string }).timeZone;
  return typeof tz === "string" && tz.length > 0 ? tz : null;
};

/** Convert HH:mm in a given IANA TZ into minutes-since-midnight in that TZ. */
const minutesInTimeZone = (now: Date, timeZone: string | null): number => {
  if (!timeZone) {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
};

const parseHHmm = (value: string): number => {
  const [h, m] = value.split(":").map((s) => Number(s));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

/** True if `nowMin` is within the closed quiet window. Window may wrap past midnight. */
export const isInQuietWindow = (nowMin: number, startMin: number, endMin: number): boolean => {
  if (startMin === endMin) return false;
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
};

const shouldSkip = (
  prefs: NotificationPrefs,
  payload: PushPayload,
  timeZone: string | null,
  now: Date,
): SendResult["skipped"] => {
  if (!prefs.channels.push) return "channel_off";
  if (payload.topic && !prefs.topics[payload.topic]) return "topic_off";
  if (prefs.quietHours.enabled) {
    const nowMin = minutesInTimeZone(now, timeZone);
    const startMin = parseHHmm(prefs.quietHours.start);
    const endMin = parseHHmm(prefs.quietHours.end);
    if (isInQuietWindow(nowMin, startMin, endMin)) return "quiet_hours";
  }
  return null;
};

interface SendOptions {
  ignoreQuietHours?: boolean;
  ignoreTopic?: boolean;
}

export const sendPushToUser = async (
  userId: string,
  payload: PushPayload,
  opts: SendOptions = {},
): Promise<SendResult> => {
  if (!configureVapid()) {
    return { sent: 0, removed: 0, skipped: "channel_off" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: true },
  });
  if (!user) return { sent: 0, removed: 0, skipped: "no_subscriptions" };

  const prefs = readPrefs(user.profile);
  const tz = readTimeZone(user.profile);

  const effectivePrefs: NotificationPrefs = {
    ...prefs,
    quietHours: opts.ignoreQuietHours
      ? { ...prefs.quietHours, enabled: false }
      : prefs.quietHours,
    topics: opts.ignoreTopic && payload.topic
      ? { ...prefs.topics, [payload.topic]: true }
      : prefs.topics,
  };

  const skipped = shouldSkip(effectivePrefs, payload, tz, new Date());
  if (skipped) return { sent: 0, removed: 0, skipped };

  const subs = await repo.listSubscriptionsForUser(userId);
  if (subs.length === 0) {
    return { sent: 0, removed: 0, skipped: "no_subscriptions" };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? payload.topic ?? "raised-push",
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
        await repo.touchSubscription(sub.id);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await repo.deleteSubscriptionByEndpoint(sub.endpoint);
          removed += 1;
        }
      }
    }),
  );

  return { sent, removed, skipped: null };
};

export const subscribe = async (
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
  timeZone?: string,
) => {
  await repo.upsertSubscription({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent,
  });

  if (timeZone) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    });
    const existing =
      user?.profile && typeof user.profile === "object" && !Array.isArray(user.profile)
        ? (user.profile as Record<string, unknown>)
        : {};
    if ((existing as { timeZone?: string }).timeZone !== timeZone) {
      await prisma.user.update({
        where: { id: userId },
        data: { profile: { ...existing, timeZone } },
      });
    }
  }
};

export const unsubscribe = (endpoint: string) =>
  repo.deleteSubscriptionByEndpoint(endpoint);

export const sendTest = (userId: string, title?: string, body?: string) =>
  sendPushToUser(
    userId,
    {
      title: title ?? "Test push from Raised",
      body: body ?? "If you can see this, push notifications are working.",
      tag: "raised-test",
    },
    { ignoreQuietHours: true, ignoreTopic: true },
  );
