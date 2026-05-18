// RFC 5545 ICS feed builder for family calendar events.
// Kept self-contained (no extra dependencies). Output is plain ASCII text
// with CRLF line endings, folded to 75 octets per spec.

type RepeatRule =
  | {
      type?: string | null;
      interval?: number | null;
      endDate?: string | null;
      count?: number | null;
      daysOfWeek?: number[] | null;
    }
  | null
  | undefined;

export type IcsEventInput = {
  id: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  eventType?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  allDay?: boolean | null;
  child?: { name?: string | null } | null;
  repeatRule?: RepeatRule;
};

const ICS_DAY_BY_INDEX = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

function formatDateTimeUtc(d: Date): string {
  return `${formatDate(d)}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

// RFC 5545 text escaping. Backslash first.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Fold long content lines at 75 octets, continuation lines begin with a space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 74) {
    parts.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  if (remaining.length > 0) parts.push(" " + remaining);
  return parts.join("\r\n");
}

function buildRrule(rule: RepeatRule): string | null {
  if (!rule || !rule.type || rule.type === "none") return null;
  const interval = rule.interval && rule.interval > 1 ? rule.interval : null;
  const parts: string[] = [];

  switch (rule.type) {
    case "daily":
      parts.push("FREQ=DAILY");
      break;
    case "weekly":
      parts.push("FREQ=WEEKLY");
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const days = rule.daysOfWeek
          .filter((d) => d >= 0 && d <= 6)
          .map((d) => ICS_DAY_BY_INDEX[d])
          .join(",");
        if (days) parts.push(`BYDAY=${days}`);
      }
      break;
    case "weekdays":
      parts.push("FREQ=WEEKLY", "BYDAY=MO,TU,WE,TH,FR");
      break;
    case "monthly":
      parts.push("FREQ=MONTHLY");
      break;
    case "yearly":
      parts.push("FREQ=YEARLY");
      break;
    default:
      return null;
  }

  if (interval) parts.push(`INTERVAL=${interval}`);
  if (rule.count && rule.count > 0) parts.push(`COUNT=${rule.count}`);
  if (rule.endDate) {
    const until = toDate(rule.endDate);
    if (!Number.isNaN(until.getTime())) {
      parts.push(`UNTIL=${formatDateTimeUtc(until)}`);
    }
  }
  return parts.join(";");
}

function eventLines(event: IcsEventInput, productHost: string, dtstamp: string): string[] {
  const start = toDate(event.startDate);
  if (Number.isNaN(start.getTime())) return [];
  const end = event.endDate ? toDate(event.endDate) : null;
  const allDay = event.allDay === true;

  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(`UID:${event.id}@${productHost}`);
  lines.push(`DTSTAMP:${dtstamp}`);

  if (allDay) {
    const endDate = end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000);
    lines.push(`DTSTART;VALUE=DATE:${formatDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(endDate)}`);
  } else {
    lines.push(`DTSTART:${formatDateTimeUtc(start)}`);
    if (end && !Number.isNaN(end.getTime())) {
      lines.push(`DTEND:${formatDateTimeUtc(end)}`);
    } else {
      const fallbackEnd = new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTEND:${formatDateTimeUtc(fallbackEnd)}`);
    }
  }

  const titleParts: string[] = [];
  if (event.title) titleParts.push(event.title);
  if (event.child?.name) titleParts.push(`(${event.child.name})`);
  const summary = titleParts.join(" ") || "Untitled";
  lines.push(`SUMMARY:${escapeText(summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  if (event.eventType) {
    lines.push(`CATEGORIES:${escapeText(event.eventType.toUpperCase())}`);
  }

  const rrule = buildRrule(event.repeatRule);
  if (rrule) lines.push(`RRULE:${rrule}`);

  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsCalendar(opts: {
  calendarName: string;
  events: IcsEventInput[];
  productHost?: string;
}): string {
  const productHost = opts.productHost || "parenting.app";
  const dtstamp = formatDateTimeUtc(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Parenting//${productHost}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
    `NAME:${escapeText(opts.calendarName)}`,
  ];

  for (const event of opts.events) {
    lines.push(...eventLines(event, productHost, dtstamp));
  }
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
