// Natural-language → structured calendar event draft.
// Used by the "Ask AI" tab in the create/edit event drawer.

import { getOpenAI } from "../../shared/parenting-ai/openai.js";
import * as repo from "./family.repository.js";

const MODEL = "gpt-4o-mini";

const EVENT_TYPES = [
  "appointment",
  "milestone",
  "activity",
  "reminder",
  "other",
] as const;

const REPEAT_TYPES = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "weekdays",
] as const;

export type ParsedEventDraft = {
  childId: string | null;
  title: string | null;
  eventType: (typeof EVENT_TYPES)[number] | null;
  startDate: string | null;
  endDate: string | null;
  allDay: boolean | null;
  location: string | null;
  description: string | null;
  repeatRule: {
    type: (typeof REPEAT_TYPES)[number];
    interval: number;
    endDate?: string | null;
    count?: number | null;
    daysOfWeek?: number[] | null;
  } | null;
  notes: string | null;
};

export type ParseEventInput = {
  text: string;
  // Optional existing event when editing, so the model can apply a diff.
  existingEvent?: {
    childId?: string | null;
    title?: string | null;
    eventType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    allDay?: boolean | null;
    location?: string | null;
    description?: string | null;
    repeatRule?: unknown;
  } | null;
  // Client-provided "now" in ISO so we can resolve "tomorrow", "next Tuesday"
  // in the user's timezone instead of the server's.
  now?: string | null;
  // Client's getTimezoneOffset() value (minutes; negative means east of UTC).
  // Used to translate stored UTC ISO into the user's wall-clock view so the
  // model edits dates the user actually sees, not the underlying UTC date.
  tzOffsetMinutes?: number | null;
};

const parseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    childId: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    eventType: { type: ["string", "null"], enum: [...EVENT_TYPES, null] },
    startDate: { type: ["string", "null"], description: "ISO 8601 datetime" },
    endDate: { type: ["string", "null"], description: "ISO 8601 datetime" },
    allDay: { type: ["boolean", "null"] },
    location: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    repeatRule: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: [...REPEAT_TYPES] },
        interval: { type: "integer", minimum: 1 },
        endDate: { type: ["string", "null"] },
        count: { type: ["integer", "null"], minimum: 1 },
        daysOfWeek: {
          type: ["array", "null"],
          items: { type: "integer", minimum: 0, maximum: 6 },
        },
      },
      required: ["type", "interval", "endDate", "count", "daysOfWeek"],
    },
    notes: {
      type: ["string", "null"],
      description:
        "Short note to show the user about what was parsed or anything ambiguous.",
    },
  },
  required: [
    "childId",
    "title",
    "eventType",
    "startDate",
    "endDate",
    "allDay",
    "location",
    "description",
    "repeatRule",
    "notes",
  ],
} as const;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Convert a UTC ISO string to the user's local wall-clock as a naive ISO
// (no Z, no offset). The user thinks in this timezone, so the model should
// edit dates that look like what the user sees on their screen.
function utcToLocalNaive(iso: string | null | undefined, offsetMin: number): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() - offsetMin * 60000);
  return shifted.toISOString().replace(/Z$/, "");
}

// Reverse of utcToLocalNaive. Accepts a naive ISO string the model produced
// (or one with Z/offset, which we strip) and returns the actual UTC instant.
function localNaiveToUtc(value: string | null | undefined, offsetMin: number): string | null {
  if (!value) return null;
  const stripped = String(value).replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
  const asIfUtc = new Date(`${stripped}Z`);
  if (Number.isNaN(asIfUtc.getTime())) return null;
  return new Date(asIfUtc.getTime() + offsetMin * 60000).toISOString();
}

function buildDateAnchors(nowLocalNaive: string): string {
  const now = new Date(`${nowLocalNaive}Z`);
  if (Number.isNaN(now.getTime())) return "";
  const lines: string[] = [];
  const today = WEEKDAY_NAMES[now.getUTCDay()];
  lines.push(`Today is ${today}, ${now.toISOString().slice(0, 10)}.`);
  // List the date of each upcoming named weekday, so the model never has to
  // compute day-of-week math (it gets this wrong on smaller models).
  const upcoming: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + i);
    const name = WEEKDAY_NAMES[d.getUTCDay()];
    const iso = d.toISOString().slice(0, 10);
    upcoming.push(`  next ${name} = ${iso}`);
  }
  lines.push("Upcoming weekdays (use these as the source of truth):");
  lines.push(...upcoming);
  return lines.join("\n");
}

function buildSystemPrompt(opts: {
  children: Array<{ id: string; name: string }>;
  nowLocalNaive: string;
}): string {
  const childLines = opts.children.length
    ? opts.children.map((c) => `- id=${c.id} name="${c.name}"`).join("\n")
    : "(no children on file)";
  return [
    "You convert a parent's short message into a structured calendar event draft.",
    "",
    "All datetimes in this conversation are in the user's LOCAL wall-clock time, formatted as naive ISO (e.g. 2026-05-23T15:00:00, with no Z and no offset).",
    `Current local date/time: ${opts.nowLocalNaive}`,
    buildDateAnchors(opts.nowLocalNaive),
    "",
    "Children in this family (resolve childId by best name match; null if unclear):",
    childLines,
    "",
    "Field rules:",
    "- startDate / endDate are LOCAL naive ISO 8601 datetimes (no Z, no offset). If only a date is given, use 09:00; if 'all day', set allDay=true and use 00:00.",
    "- Resolve relative phrases like 'tomorrow', 'next Tuesday', 'in 3 days' against the current local date. Use the 'Upcoming weekdays' list above; do not compute weekdays yourself.",
    "- eventType: best of appointment/milestone/activity/reminder/other.",
    "- repeatRule.type: one of none/daily/weekly/monthly/yearly/weekdays. interval defaults to 1.",
    "- repeatRule.daysOfWeek: 0=Sunday through 6=Saturday, only when type=weekly.",
    "- If a field is not mentioned, return null (or 'none' repeat).",
    "- When given an existing event, return the FULL updated event (existing values + the user's changes), not just the diff.",
    "- When editing dates: the date numbers shown in the existing event are exactly what the user sees. Do not adjust them for any timezone.",
    "- notes: optionally explain any assumption you had to make. Keep under 120 chars. null if obvious.",
  ].join("\n");
}

function buildUserPrompt(input: ParseEventInput, existingForModel: unknown): string {
  const lines: string[] = [];
  if (existingForModel) {
    lines.push(
      "Existing event (the user wants to edit this):",
      JSON.stringify(existingForModel, null, 2),
      "",
    );
  }
  lines.push("User message:");
  lines.push(input.text.trim());
  return lines.join("\n");
}

export async function parseCalendarEvent(opts: {
  familyId: string;
  userId: string;
  input: ParseEventInput;
}): Promise<ParsedEventDraft | { error: "family_not_found" }> {
  const family = await repo.findFamilyById(opts.familyId, opts.userId);
  if (!family) return { error: "family_not_found" };

  const children = (family.children ?? []).map((c) => ({ id: c.id, name: c.name }));
  const now = opts.input.now || new Date().toISOString();
  const offsetMin = typeof opts.input.tzOffsetMinutes === "number"
    ? opts.input.tzOffsetMinutes
    : 0;

  // Naive local-time view used to talk to the model and convert back later.
  const nowLocalNaive = utcToLocalNaive(now, offsetMin) ?? now.replace(/Z$/, "");

  const existingForModel = opts.input.existingEvent
    ? {
        ...opts.input.existingEvent,
        startDate: utcToLocalNaive(opts.input.existingEvent.startDate, offsetMin),
        endDate: utcToLocalNaive(opts.input.existingEvent.endDate, offsetMin),
      }
    : null;

  const oai = getOpenAI();
  const completion = await oai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: buildSystemPrompt({ children, nowLocalNaive }) },
      { role: "user", content: buildUserPrompt(opts.input, existingForModel) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "calendar_event_draft",
        schema: parseSchema,
        strict: true,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      childId: null,
      title: null,
      eventType: null,
      startDate: null,
      endDate: null,
      allDay: null,
      location: null,
      description: null,
      repeatRule: null,
      notes: "Empty response from model.",
    };
  }

  const parsed = JSON.parse(content) as ParsedEventDraft;

  // Sanity-check that childId actually exists on this family. If the model
  // invented an id, drop it so the form doesn't silently reference garbage.
  if (parsed.childId && !children.some((c) => c.id === parsed.childId)) {
    parsed.childId = null;
  }

  // The model speaks naive local-time; turn its output back into the UTC ISO
  // the rest of the app stores.
  parsed.startDate = localNaiveToUtc(parsed.startDate, offsetMin);
  parsed.endDate = localNaiveToUtc(parsed.endDate, offsetMin);
  if (parsed.repeatRule?.endDate) {
    parsed.repeatRule.endDate = localNaiveToUtc(parsed.repeatRule.endDate, offsetMin);
  }

  return parsed;
}
