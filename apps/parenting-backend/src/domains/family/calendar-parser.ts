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

function buildDateAnchors(nowIso: string): string {
  const now = new Date(nowIso);
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
  now: string;
}): string {
  const childLines = opts.children.length
    ? opts.children.map((c) => `- id=${c.id} name="${c.name}"`).join("\n")
    : "(no children on file)";
  return [
    "You convert a parent's short message into a structured calendar event draft.",
    "",
    `Current date/time: ${opts.now}`,
    buildDateAnchors(opts.now),
    "",
    "Children in this family (resolve childId by best name match; null if unclear):",
    childLines,
    "",
    "Field rules:",
    "- startDate / endDate are ISO 8601 datetimes. If only a date is given, use 09:00 local; if 'all day', set allDay=true and use 00:00.",
    "- Resolve relative phrases like 'tomorrow', 'next Tuesday', 'in 3 days' against the current date. Use the 'Upcoming weekdays' list above; do not compute weekdays yourself.",
    "- eventType: best of appointment/milestone/activity/reminder/other.",
    "- repeatRule.type: one of none/daily/weekly/monthly/yearly/weekdays. interval defaults to 1.",
    "- repeatRule.daysOfWeek: 0=Sunday through 6=Saturday, only when type=weekly.",
    "- If a field is not mentioned, return null (or 'none' repeat).",
    "- When given an existing event, return the FULL updated event (existing values + the user's changes), not just the diff.",
    "- notes: optionally explain any assumption you had to make. Keep under 120 chars. null if obvious.",
  ].join("\n");
}

function buildUserPrompt(input: ParseEventInput): string {
  const lines: string[] = [];
  if (input.existingEvent) {
    lines.push(
      "Existing event (the user wants to edit this):",
      JSON.stringify(input.existingEvent, null, 2),
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

  const oai = getOpenAI();
  const completion = await oai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: buildSystemPrompt({ children, now }) },
      { role: "user", content: buildUserPrompt(opts.input) },
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

  return parsed;
}
