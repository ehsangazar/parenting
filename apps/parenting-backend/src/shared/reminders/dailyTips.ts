import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { env } from "../../config/env.js";
import { sendPushToUser } from "../../domains/notifications/notifications.service.js";
import { tipForDate } from "./dailyTipContent.js";

type Logger = { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };

interface LocalClock {
  hour: number;
  date: string; // YYYY-MM-DD in the user's timezone
}

const localClockFor = (now: Date, timeZone: string | null): LocalClock => {
  const tz = timeZone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return {
      hour: Number(get("hour")),
      date: `${get("year")}-${get("month")}-${get("day")}`,
    };
  } catch {
    return {
      hour: now.getUTCHours(),
      date: now.toISOString().slice(0, 10),
    };
  }
};

interface UserSlice {
  id: string;
  locale: string;
  profile: Prisma.JsonValue;
}

const wantsDailyTip = (user: UserSlice): boolean => {
  if (!user.profile || typeof user.profile !== "object" || Array.isArray(user.profile)) {
    return false;
  }
  const prefs = (user.profile as {
    notificationPrefs?: { channels?: { push?: boolean }; topics?: { dailyTip?: boolean } };
  }).notificationPrefs;
  if (!prefs) return false;
  return Boolean(prefs.channels?.push && prefs.topics?.dailyTip !== false);
};

const tzFor = (user: UserSlice): string | null => {
  if (!user.profile || typeof user.profile !== "object" || Array.isArray(user.profile)) {
    return null;
  }
  const tz = (user.profile as { timeZone?: string }).timeZone;
  return typeof tz === "string" && tz.length > 0 ? tz : null;
};

export const dispatchDailyTips = async (
  logger?: Logger,
): Promise<{ sent: number; scanned: number }> => {
  const now = new Date();

  const candidates = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, locale: true, profile: true },
  });

  if (candidates.length === 0) return { sent: 0, scanned: 0 };

  let sent = 0;
  for (const user of candidates) {
    if (!wantsDailyTip(user)) continue;

    const { hour, date } = localClockFor(now, tzFor(user));
    if (hour < env.REMINDER_HOUR) continue;

    const tip = tipForDate(user.locale ?? "en", new Date(`${date}T12:00:00Z`));

    try {
      await prisma.dailyTipSent.create({
        data: { userId: user.id, localDate: date, tipKey: tip.key },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      logger?.error({ err, userId: user.id }, "dailyTips: claim failed");
      continue;
    }

    try {
      const result = await sendPushToUser(user.id, {
        title: tip.title,
        body: tip.body,
        topic: "dailyTip",
        url: "/app",
        tag: `daily-tip-${date}`,
      });
      if (result.sent > 0) sent += 1;
    } catch (err) {
      logger?.error({ err, userId: user.id }, "dailyTips: push failed");
    }
  }

  return { sent, scanned: candidates.length };
};
