import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { sendEventReminderEmail } from "../mailer/index.js";
import { env } from "../../config/env.js";
import { occursOnDate, projectInstanceStart, type RepeatRule } from "./recurrence.js";
import { sendPushToUser } from "../../domains/notifications/notifications.service.js";
import { dispatchDailyTips } from "./dailyTips.js";

const HOUR_MS = 60 * 60 * 1000;

const startOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
};

const addDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

type Logger = { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };

export const dispatchEventReminders = async (logger?: Logger) => {
  const now = new Date();
  const tomorrow = startOfDay(addDays(now, 1));
  const dayAfter = startOfDay(addDays(now, 2));

  // Two cases to catch:
  //   1) Non-recurring event whose anchor falls on tomorrow.
  //   2) Recurring event with anchor on/before tomorrow that produces a
  //      tomorrow-instance. JSON columns can't be filtered for repeatRule
  //      content, so over-fetch and filter in memory.
  const events = await prisma.calendarEvent.findMany({
    where: {
      status: "confirmed",
      OR: [
        { startDate: { gte: tomorrow, lt: dayAfter } },
        {
          AND: [
            { startDate: { lt: dayAfter } },
            { repeatRule: { not: Prisma.JsonNull } },
          ],
        },
      ],
    },
    include: {
      child: { select: { name: true } },
      family: {
        select: {
          members: { include: { user: { select: { id: true, email: true, locale: true } } } },
        },
      },
    },
  });

  const due = events.filter((e) =>
    occursOnDate(e.startDate, e.repeatRule as RepeatRule, tomorrow),
  );

  if (due.length === 0) return { sent: 0, scanned: events.length };

  let sent = 0;
  for (const event of due) {
    // Claim the (event, tomorrow) slot before sending so concurrent ticks /
    // manual triggers cannot double-send. Unique (eventId, occurrenceDate)
    // makes this atomic.
    try {
      await prisma.eventReminderSent.create({
        data: { eventId: event.id, occurrenceDate: tomorrow },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      logger?.error({ err, eventId: event.id }, "reminders: claim failed");
      continue;
    }

    const members = event.family.members
      .map((m) => m.user)
      .filter((u): u is { id: string; email: string; locale: string } => Boolean(u.email));

    if (members.length === 0) continue;

    const instanceStart = projectInstanceStart(event.startDate, tomorrow);
    const uniqueEmails = Array.from(new Set(members.map((u) => u.email)));
    const uniqueUserIds = Array.from(new Set(members.map((u) => u.id)));

    try {
      await Promise.all([
        ...uniqueEmails.map((to) =>
          sendEventReminderEmail({
            to,
            childName: event.child.name,
            title: event.title,
            startDate: instanceStart,
            allDay: event.allDay,
            location: event.location,
            appUrl: env.APP_URL,
          }),
        ),
        ...uniqueUserIds.map((userId) => {
          const locale = members.find((m) => m.id === userId)?.locale ?? "en";
          const body = renderEventPushBody({
            locale,
            childName: event.child.name,
            startDate: instanceStart,
            allDay: event.allDay,
            location: event.location,
          });
          return sendPushToUser(userId, {
            title: event.title,
            body,
            topic: "calendarReminders",
            url: `/app/calendar`,
            tag: `event-${event.id}-${tomorrow.toISOString().slice(0, 10)}`,
          }).catch((err) =>
            logger?.error({ err, userId, eventId: event.id }, "reminders: push failed"),
          );
        }),
      ]);
      sent += 1;
    } catch (err) {
      logger?.error({ err, eventId: event.id }, "reminders: send failed");
    }
  }
  return { sent, scanned: events.length };
};

const renderEventPushBody = (opts: {
  locale: string;
  childName: string;
  allDay: boolean;
  startDate: Date;
  location: string | null;
}): string => {
  const lang = opts.locale.startsWith("fa") ? "fa" : "en";
  const timePart = opts.allDay
    ? lang === "fa"
      ? "تمام‌روز"
      : "All day"
    : new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(opts.startDate);

  if (lang === "fa") {
    const childPart = opts.childName ? ` برای ${opts.childName}` : "";
    const locPart = opts.location ? ` · ${opts.location}` : "";
    return `فردا${childPart} · ${timePart}${locPart}`;
  }
  const childPart = opts.childName ? ` for ${opts.childName}` : "";
  const locPart = opts.location ? ` · ${opts.location}` : "";
  return `Tomorrow${childPart} · ${timePart}${locPart}`;
};

export const startReminderScheduler = (logger: Logger) => {
  if (!env.REMINDER_ENABLED) {
    logger.info("reminders: scheduler disabled via REMINDER_ENABLED=false");
    return;
  }
  const tick = async () => {
    try {
      const nowHour = new Date().getHours();
      if (nowHour >= env.REMINDER_HOUR) {
        const eventResult = await dispatchEventReminders(logger);
        if (eventResult.sent > 0) {
          logger.info(eventResult, "reminders: events tick complete");
        }
      }
      const tipsResult = await dispatchDailyTips(logger);
      if (tipsResult.sent > 0) {
        logger.info(tipsResult, "reminders: daily-tip tick complete");
      }
    } catch (err) {
      logger.error({ err }, "reminders: tick failed");
    }
  };
  setTimeout(() => {
    void tick();
  }, 30_000);
  setInterval(() => {
    void tick();
  }, HOUR_MS);
  logger.info(
    { reminderHour: env.REMINDER_HOUR },
    "reminders: scheduler started",
  );
};
