import { prisma } from "../../db/index.js";
import type { ToolDefinition, ToolResult } from "./types.js";

function requireFamily(familyId: string | null): ToolResult | null {
  if (!familyId) return { ok: false, summary: "No family on this account yet.", error: "no_family" };
  return null;
}

const logMilestone: ToolDefinition = {
  name: "moments_log_milestone",
  description:
    "Record a developmental milestone for the family (e.g. 'first steps', 'first tooth'). Stored as a Moment of type 'milestone'. Use when the user shares a milestone in chat.",
  parameters: {
    type: "object",
    properties: {
      milestone: { type: "string", description: "Short title for the milestone." },
      notes: { type: "string", description: "Optional description." },
      date: { type: "string", description: "Optional ISO date. Defaults to now." },
    },
    required: ["milestone"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Logging "${args.milestone ?? "milestone"}"`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const moment = await prisma.moment.create({
      data: {
        familyId: ctx.familyId!,
        title: String(args.milestone),
        description: args.notes ? String(args.notes) : null,
        momentType: "milestone",
        createdBy: ctx.userId,
        createdAt: args.date ? new Date(String(args.date)) : new Date(),
      },
    });
    return {
      ok: true,
      summary: `Logged milestone "${moment.title}".`,
      data: { moment },
      navCards: [{ type: "navLink", label: "Open moments", to: "/app/moments" }],
    };
  },
};

const trackBehavior: ToolDefinition = {
  name: "moments_track_behavior",
  description:
    "Log a behavioral observation or mood entry as a Moment of type 'everyday'. Use for tantrums, sleep notes, eating notes, etc.",
  parameters: {
    type: "object",
    properties: {
      behaviorType: { type: "string", description: "E.g. 'tantrum', 'sleep', 'eating'." },
      severity: { type: "string", description: "Optional, free text e.g. 'mild', 'severe'." },
      notes: { type: "string" },
    },
    required: ["behaviorType"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Logging behaviour: ${args.behaviorType ?? ""}`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const sev = args.severity ? `Severity: ${String(args.severity)}. ` : "";
    const notes = args.notes ? String(args.notes) : "";
    const moment = await prisma.moment.create({
      data: {
        familyId: ctx.familyId!,
        title: `Behavior: ${String(args.behaviorType)}`,
        description: `${sev}${notes}` || null,
        momentType: "everyday",
        createdBy: ctx.userId,
      },
    });
    return {
      ok: true,
      summary: `Tracked behaviour "${args.behaviorType}".`,
      data: { moment },
    };
  },
};

export const momentsTools: ToolDefinition[] = [logMilestone, trackBehavior];
