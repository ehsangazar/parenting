import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { sendEventReminderEmail } from "../mailer/index.js";
import { env } from "../../config/env.js";
import { occursOnDate, projectInstanceStart, type RepeatRule } from "./recurrence.js";

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
          members: { include: { user: { select: { email: true } } } },
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

    const emails = Array.from(
      new Set(
        event.family.members
          .map((m) => m.user.email)
          .filter((e): e is string => Boolean(e)),
      ),
    );
    if (emails.length === 0) continue;

    const instanceStart = projectInstanceStart(event.startDate, tomorrow);
    try {
      await Promise.all(
        emails.map((to) =>
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
      );
      sent += 1;
    } catch (err) {
      logger?.error({ err, eventId: event.id }, "reminders: send failed");
    }
  }
  return { sent, scanned: events.length };
};

export const startReminderScheduler = (logger: Logger) => {
  if (!env.REMINDER_ENABLED) {
    logger.info("reminders: scheduler disabled via REMINDER_ENABLED=false");
    return;
  }
  const tick = async () => {
    try {
      const nowHour = new Date().getHours();
      if (nowHour < env.REMINDER_HOUR) return;
      const result = await dispatchEventReminders(logger);
      if (result.sent > 0) {
        logger.info(result, "reminders: tick complete");
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
