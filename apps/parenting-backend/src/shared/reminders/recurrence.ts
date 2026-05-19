// Given an event's anchor startDate and its repeatRule, returns whether the
// series produces an instance on the given target calendar date. Uses
// container-local time, matching how startDate is stored and how the dispatcher
// computes "tomorrow". COUNT is not supported (the UI does not emit it).

export type RepeatRule =
  | {
      type?: string | null;
      interval?: number | null;
      endDate?: Date | string | null;
      daysOfWeek?: number[] | null;
    }
  | null
  | undefined;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const startOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
};

const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);

const startOfWeek = (d: Date) => {
  const out = startOfDay(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
};

export const occursOnDate = (
  anchor: Date,
  rule: RepeatRule,
  target: Date,
): boolean => {
  const a = startOfDay(anchor);
  const t = startOfDay(target);
  if (t.getTime() < a.getTime()) return false;

  if (rule?.endDate) {
    const raw = rule.endDate instanceof Date ? rule.endDate : new Date(rule.endDate);
    if (!Number.isNaN(raw.getTime())) {
      const until = startOfDay(raw);
      if (t.getTime() > until.getTime()) return false;
    }
  }

  const type = rule?.type ?? "none";
  const interval = Math.max(1, rule?.interval ?? 1);

  if (!type || type === "none") {
    return a.getTime() === t.getTime();
  }

  if (type === "daily") {
    const d = daysBetween(a, t);
    return d >= 0 && d % interval === 0;
  }

  if (type === "weekly") {
    const weeks = Math.round((startOfWeek(t).getTime() - startOfWeek(a).getTime()) / WEEK_MS);
    if (weeks < 0 || weeks % interval !== 0) return false;
    const days = (rule?.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6);
    if (days.length > 0) return days.includes(t.getDay());
    return t.getDay() === a.getDay();
  }

  if (type === "weekdays") {
    const dow = t.getDay();
    return dow >= 1 && dow <= 5;
  }

  if (type === "monthly") {
    if (t.getDate() !== a.getDate()) return false;
    const months = (t.getFullYear() - a.getFullYear()) * 12 + (t.getMonth() - a.getMonth());
    return months >= 0 && months % interval === 0;
  }

  if (type === "yearly") {
    if (t.getMonth() !== a.getMonth() || t.getDate() !== a.getDate()) return false;
    const years = t.getFullYear() - a.getFullYear();
    return years >= 0 && years % interval === 0;
  }

  return false;
};

// Project an anchor's time-of-day onto the target's calendar date. Used so the
// reminder email reads "Tomorrow at 10am" for an instance whose anchor was
// years ago.
export const projectInstanceStart = (anchor: Date, target: Date): Date => {
  const out = startOfDay(target);
  out.setHours(anchor.getHours(), anchor.getMinutes(), anchor.getSeconds(), 0);
  return out;
};
