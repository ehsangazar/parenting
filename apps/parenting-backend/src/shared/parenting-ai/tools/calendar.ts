import * as familySvc from "../../../domains/family/family.service.js";
import { prisma } from "../../db/index.js";
import { eventCard } from "./cards.js";
import type { ToolDefinition, ToolResult } from "./types.js";

type EventWithChild = {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date | null;
  eventType: string;
  allDay?: boolean;
  location?: string | null;
  child?: { id: string; name: string } | null;
};

function toEventCard(e: EventWithChild) {
  return eventCard({
    eventId: e.id,
    title: e.title,
    startsAt: e.startDate instanceof Date ? e.startDate.toISOString() : String(e.startDate),
    endsAt: e.endDate ? (e.endDate instanceof Date ? e.endDate.toISOString() : String(e.endDate)) : undefined,
    childName: e.child?.name,
    eventType: e.eventType,
    location: e.location ?? undefined,
    allDay: e.allDay ?? false,
  });
}

function requireFamily(familyId: string | null): ToolResult | null {
  if (!familyId) return { ok: false, summary: "No family on this account yet.", error: "no_family" };
  return null;
}

async function resolveChildId(
  familyId: string,
  userId: string,
  childIdArg: unknown,
  childNameArg: unknown,
): Promise<string | null> {
  if (childIdArg) return String(childIdArg);
  const children = await familySvc.listChildren(familyId, userId);
  if (!children || children.length === 0) return null;
  if (childNameArg) {
    const wanted = String(childNameArg).toLowerCase();
    const match = children.find((c) => c.name.toLowerCase() === wanted);
    if (match) return match.id;
  }
  return children[0].id;
}

const listUpcoming: ToolDefinition = {
  name: "calendar_list_upcoming",
  description:
    "List upcoming calendar events (appointments, milestones, reminders) for the family. Use when the user asks 'what's coming up', 'next appointment', etc.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  statusLabel: () => "Checking the calendar",
  async execute(_args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const events = await familySvc.listUpcomingEvents(ctx.familyId!, ctx.userId);
    if (!events) return { ok: false, summary: "Could not load events.", error: "not_found" };
    return {
      ok: true,
      summary: events.length ? `${events.length} upcoming event(s).` : "No upcoming events.",
      data: { events },
      cards: events.map((e) => toEventCard(e as EventWithChild)),
    };
  },
};

const listEvents: ToolDefinition = {
  name: "calendar_list_events",
  description:
    "List calendar events with optional filters. Use for 'show all events', 'last month's appointments', 'birthdays this year', or anything past the next-few-upcoming window. All filters optional; with none, returns the full event list.",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "ISO 8601 datetime; only include events starting on or after this." },
      to: { type: "string", description: "ISO 8601 datetime; only include events starting on or before this." },
      eventType: {
        type: "string",
        enum: ["appointment", "milestone", "activity", "reminder", "other"],
        description: "Filter by event type.",
      },
      childId: { type: "string", description: "Filter to one child. Use children_list to get ids." },
      childName: { type: "string", description: "Filter to one child by name. Used if childId not provided." },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "Cap the number of events returned. Defaults to 50." },
    },
    additionalProperties: false,
  },
  statusLabel: () => "Looking through the calendar",
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const all = await familySvc.listCalendarEvents(ctx.familyId!, ctx.userId);
    if (!all) return { ok: false, summary: "Could not load events.", error: "not_found" };

    const from = args.from ? new Date(String(args.from)) : null;
    const to = args.to ? new Date(String(args.to)) : null;
    const eventType = args.eventType ? String(args.eventType) : null;
    let childIdFilter: string | null = args.childId ? String(args.childId) : null;
    if (!childIdFilter && args.childName) {
      const resolved = await resolveChildId(ctx.familyId!, ctx.userId, undefined, args.childName);
      childIdFilter = resolved;
    }
    const limit = args.limit ? Math.min(Number(args.limit), 100) : 50;

    const filtered = (all as EventWithChild[])
      .filter((e) => {
        const start = e.startDate instanceof Date ? e.startDate : new Date(e.startDate as unknown as string);
        if (from && start < from) return false;
        if (to && start > to) return false;
        if (eventType && e.eventType !== eventType) return false;
        if (childIdFilter && e.child?.id !== childIdFilter) return false;
        return true;
      })
      .slice(0, limit);

    return {
      ok: true,
      summary: filtered.length ? `${filtered.length} event(s).` : "No events match.",
      data: { events: filtered },
      cards: filtered.map((e) => toEventCard(e)),
    };
  },
};

const getEvent: ToolDefinition = {
  name: "calendar_get_event",
  description:
    "Fetch a single calendar event's full details by id. Use when the user asks about a specific event by name or when you need to verify fields before updating.",
  parameters: {
    type: "object",
    properties: { eventId: { type: "string" } },
    required: ["eventId"],
    additionalProperties: false,
  },
  statusLabel: () => "Looking up event",
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const all = await familySvc.listCalendarEvents(ctx.familyId!, ctx.userId);
    if (!all) return { ok: false, summary: "Could not load events.", error: "not_found" };
    const event = (all as EventWithChild[]).find((e) => e.id === String(args.eventId));
    if (!event) return { ok: false, summary: "Event not found.", error: "event_not_found" };
    return {
      ok: true,
      summary: `"${event.title}" on ${new Date(event.startDate).toLocaleString()}.`,
      data: { event },
      cards: [toEventCard(event)],
    };
  },
};

const repeatRuleParamSchema = {
  type: "object",
  description:
    "Optional recurrence. `type` defaults to 'none'. `interval` is how many units between occurrences (e.g., type='weekly', interval=2 = every 2 weeks). For 'weekly', `daysOfWeek` is an array of 0-6 (Sun-Sat). Use either `endDate` or `count` to bound; omit both for indefinite.",
  properties: {
    type: {
      type: "string",
      enum: ["none", "daily", "weekly", "monthly", "yearly", "weekdays"],
    },
    interval: { type: "integer", minimum: 1 },
    endDate: { type: "string", description: "ISO 8601 datetime; stop recurring after this." },
    count: { type: "integer", minimum: 1, description: "Stop after this many occurrences." },
    daysOfWeek: {
      type: "array",
      items: { type: "integer", minimum: 0, maximum: 6 },
      description: "Days of week (0=Sun, 6=Sat) for weekly recurrence.",
    },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const createEvent: ToolDefinition = {
  name: "calendar_create_event",
  description:
    "Schedule a calendar event for a child. `eventType` is one of: appointment, milestone, activity, reminder, other. `startDate` must be ISO 8601 datetime (with timezone). `childName` is optional; if omitted the event attaches to the first child. `repeatRule` is optional for recurring events. `assignedTo` is an optional userId of the responsible family member; defaults to the creator.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      startDate: { type: "string", description: "ISO 8601 datetime." },
      endDate: { type: "string", description: "Optional ISO 8601 datetime." },
      eventType: {
        type: "string",
        enum: ["appointment", "milestone", "activity", "reminder", "other"],
      },
      description: { type: "string" },
      location: { type: "string" },
      allDay: { type: "boolean" },
      childId: { type: "string", description: "Optional. Use children_list to get ids." },
      childName: { type: "string", description: "Optional. Used if childId not provided." },
      assignedTo: {
        type: "string",
        description: "Optional userId of the family member responsible for the event. Defaults to the creator.",
      },
      repeatRule: repeatRuleParamSchema,
    },
    required: ["title", "startDate", "eventType"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Scheduling "${args.title ?? "event"}"`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const childId = await resolveChildId(ctx.familyId!, ctx.userId, args.childId, args.childName);
    if (!childId) return { ok: false, summary: "No child to attach event to.", error: "no_child" };

    const result = await familySvc.createCalendarEvent(ctx.familyId!, ctx.userId, {
      childId,
      title: String(args.title),
      startDate: String(args.startDate),
      endDate: args.endDate ? String(args.endDate) : undefined,
      eventType: String(args.eventType) as "appointment" | "milestone" | "activity" | "reminder" | "other",
      description: args.description ? String(args.description) : undefined,
      location: args.location ? String(args.location) : undefined,
      allDay: Boolean(args.allDay ?? false),
      assignedTo: args.assignedTo ? String(args.assignedTo) : undefined,
      repeatRule: (args.repeatRule as { type: string; interval?: number }) ?? { type: "none", interval: 1 },
    } as Parameters<typeof familySvc.createCalendarEvent>[2]);

    if ("error" in result) {
      return { ok: false, summary: `Could not create event (${result.error}).`, error: result.error };
    }
    return {
      ok: true,
      summary: `Created event "${result.event.title}" on ${new Date(result.event.startDate).toLocaleString()}.`,
      data: { event: result.event },
      cards: [toEventCard(result.event as EventWithChild)],
    };
  },
};

const updateEvent: ToolDefinition = {
  name: "calendar_update_event",
  description:
    "Update an existing calendar event by id. Pass only the fields that change. `repeatRule` replaces any existing recurrence; pass `{ type: 'none' }` to clear it. `assignedTo` is an optional userId.",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      title: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      eventType: {
        type: "string",
        enum: ["appointment", "milestone", "activity", "reminder", "other"],
      },
      description: { type: "string" },
      location: { type: "string" },
      allDay: { type: "boolean" },
      childId: { type: "string", description: "Reassign the event to a different child by id." },
      assignedTo: { type: "string", description: "Reassign the event to a different family member by userId." },
      repeatRule: repeatRuleParamSchema,
    },
    required: ["eventId"],
    additionalProperties: false,
  },
  statusLabel: () => "Updating event",
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const result = await familySvc.updateCalendarEvent(
      ctx.familyId!,
      String(args.eventId),
      ctx.userId,
      {
        title: args.title !== undefined ? String(args.title) : undefined,
        startDate: args.startDate !== undefined ? String(args.startDate) : undefined,
        endDate: args.endDate !== undefined ? String(args.endDate) : undefined,
        eventType:
          args.eventType !== undefined
            ? (String(args.eventType) as "appointment" | "milestone" | "activity" | "reminder" | "other")
            : undefined,
        description: args.description !== undefined ? String(args.description) : undefined,
        location: args.location !== undefined ? String(args.location) : undefined,
        allDay: args.allDay !== undefined ? Boolean(args.allDay) : undefined,
        childId: args.childId !== undefined ? String(args.childId) : undefined,
        assignedTo: args.assignedTo !== undefined ? String(args.assignedTo) : undefined,
        repeatRule: args.repeatRule as { type: string; interval?: number } | undefined,
      } as Parameters<typeof familySvc.updateCalendarEvent>[3],
    );
    if ("error" in result) {
      return { ok: false, summary: `Update failed (${result.error}).`, error: result.error };
    }
    return { ok: true, summary: `Updated "${result.event.title}".`, data: { event: result.event } };
  },
};

const deleteEvent: ToolDefinition = {
  name: "calendar_delete_event",
  description:
    "Delete a calendar event. DESTRUCTIVE. Only call after the user has explicitly confirmed in a prior turn. Pass `confirmed: true`.",
  parameters: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      confirmed: { type: "boolean" },
    },
    required: ["eventId", "confirmed"],
    additionalProperties: false,
  },
  statusLabel: () => "Deleting event",
  async execute(args, ctx) {
    if (!args.confirmed) {
      return {
        ok: false,
        summary: "Refusing to delete: confirmation required. Ask the user first.",
        error: "not_confirmed",
      };
    }
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const result = await familySvc.deleteCalendarEvent(
      ctx.familyId!,
      String(args.eventId),
      ctx.userId,
    );
    if ("error" in result) {
      return { ok: false, summary: `Delete failed (${result.error}).`, error: result.error };
    }
    return { ok: true, summary: "Event deleted." };
  },
};

const setReminder: ToolDefinition = {
  name: "calendar_set_reminder",
  description:
    "Shortcut for creating a reminder-type event. Attaches to the first child in the family. Use for 'remind me to...'.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      time: { type: "string", description: "ISO 8601 datetime when the reminder fires." },
    },
    required: ["title", "time"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Setting reminder "${args.title ?? ""}"`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const child = await prisma.child.findFirst({
      where: { familyId: ctx.familyId! },
      select: { id: true },
    });
    if (!child) return { ok: false, summary: "No child to attach reminder to.", error: "no_child" };

    const result = await familySvc.createCalendarEvent(ctx.familyId!, ctx.userId, {
      childId: child.id,
      title: String(args.title),
      startDate: String(args.time),
      eventType: "reminder",
      allDay: false,
      repeatRule: { type: "none", interval: 1 },
    } as Parameters<typeof familySvc.createCalendarEvent>[2]);

    if ("error" in result) {
      return { ok: false, summary: `Could not set reminder (${result.error}).`, error: result.error };
    }
    return {
      ok: true,
      summary: `Reminder set: "${result.event.title}" at ${new Date(result.event.startDate).toLocaleString()}.`,
      data: { event: result.event },
    };
  },
};

export const calendarTools: ToolDefinition[] = [
  listUpcoming,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  setReminder,
];
