import * as familySvc from "../../../domains/family/family.service.js";
import type { ToolDefinition, ToolResult } from "./types.js";

function requireFamily(familyId: string | null): ToolResult | null {
  if (!familyId) {
    return {
      ok: false,
      summary: "No family on this account yet.",
      error: "no_family",
    };
  }
  return null;
}

const getCurrent: ToolDefinition = {
  name: "family_get_current",
  description:
    "Return the user's current family (name, members, children summary). Use to ground answers when family context matters.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  statusLabel: () => "Looking up your family",
  async execute(_args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const family = await familySvc.getFamilyById(ctx.familyId!, ctx.userId);
    if (!family) return { ok: false, summary: "Family not accessible.", error: "not_found" };
    const members = await familySvc.listMembers(ctx.familyId!, ctx.userId);
    return {
      ok: true,
      summary: `Family "${family.name}" with ${members?.length ?? 0} member(s).`,
      data: { family, members },
    };
  },
};

const update: ToolDefinition = {
  name: "family_update",
  description:
    "Rename the family or toggle module visibility. Module keys: welcome, children, insights, calendar, moments, village, ai.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "New family name." },
      modules: {
        type: "object",
        description: "Optional module toggles. Each key is a boolean.",
        additionalProperties: { type: "boolean" },
      },
    },
    additionalProperties: false,
  },
  statusLabel: () => "Updating family settings",
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const updated = await familySvc.updateFamily(ctx.familyId!, ctx.userId, {
      name: args.name !== undefined ? String(args.name) : undefined,
      modules: args.modules as Record<string, boolean> | undefined,
    } as Parameters<typeof familySvc.updateFamily>[2]);
    if (!updated) return { ok: false, summary: "Could not update family.", error: "not_found" };
    return { ok: true, summary: `Family updated.`, data: { family: updated } };
  },
};

const inviteMember: ToolDefinition = {
  name: "family_invite_member",
  description:
    "Email an invitation for someone to join the family (co-parent, grandparent, sitter). Pass `email` and optionally `role` ('member' or 'admin', defaults to 'member').",
  parameters: {
    type: "object",
    properties: {
      email: { type: "string", description: "Invitee's email address." },
      role: { type: "string", enum: ["member", "admin"] },
    },
    required: ["email"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Inviting ${args.email ?? "member"}`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const result = await familySvc.inviteMember(ctx.familyId!, ctx.userId, {
      email: String(args.email),
      role: args.role ? (String(args.role) as "member" | "admin") : "member",
    } as Parameters<typeof familySvc.inviteMember>[2]);
    if ("error" in result) {
      return { ok: false, summary: `Invite failed (${result.error}).`, error: result.error };
    }
    return { ok: true, summary: `Invite sent to ${args.email}.`, data: { invite: result.invite } };
  },
};

export const familyTools: ToolDefinition[] = [getCurrent, update, inviteMember];
