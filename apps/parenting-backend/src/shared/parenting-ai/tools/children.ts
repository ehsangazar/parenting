import * as familySvc from "../../../domains/family/family.service.js";
import { childCard, ageLabelFromBirthday } from "./cards.js";
import type { ToolDefinition, ToolResult } from "./types.js";

function requireFamily(familyId: string | null): ToolResult | null {
  if (!familyId) {
    return {
      ok: false,
      summary:
        "No family on this account yet. The user needs to create one before adding children.",
      error: "no_family",
    };
  }
  return null;
}

const list: ToolDefinition = {
  name: "children_list",
  description:
    "List the children in the user's current family, including name, birthday, and unborn status. Use when you need to know who is in the family before answering a child-specific question, or before suggesting which child to attach an event/milestone to.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  statusLabel: () => "Looking up your children",
  async execute(_args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const children = await familySvc.listChildren(ctx.familyId!, ctx.userId);
    if (!children) return { ok: false, summary: "Family not accessible.", error: "not_found" };
    return {
      ok: true,
      summary: children.length
        ? `Children: ${children.map((c) => c.name).join(", ")}.`
        : "No children on file yet.",
      data: { children },
      cards: children.map((c) =>
        childCard({
          childId: c.id,
          name: c.name,
          ageLabel: ageLabelFromBirthday(c.birthday, c.isUnborn, c.dueDate),
        }),
      ),
    };
  },
};

const add: ToolDefinition = {
  name: "children_add",
  description:
    "Add a child to the user's current family. Use when the user clearly asks to add a child or pregnancy (e.g. 'add my daughter Mira, 4', 'I'm pregnant, due in August'). Always pass `name`. Pass `birthday` (YYYY-MM-DD) for born children, or `isUnborn: true` with `dueDate` for pregnancies.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Child's name." },
      birthday: {
        type: "string",
        description: "ISO date YYYY-MM-DD. Omit for unborn.",
      },
      isUnborn: { type: "boolean", description: "True for pregnancy." },
      dueDate: { type: "string", description: "ISO due date for unborn." },
    },
    required: ["name"],
    additionalProperties: false,
  },
  statusLabel: (args) => `Adding ${args.name ?? "child"}`,
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const child = await familySvc.addChild(ctx.familyId!, ctx.userId, {
      name: String(args.name),
      birthday: args.birthday ? String(args.birthday) : undefined,
      isUnborn: Boolean(args.isUnborn),
      dueDate: args.dueDate ? String(args.dueDate) : undefined,
    } as Parameters<typeof familySvc.addChild>[2]);
    if (!child) return { ok: false, summary: "Could not add child.", error: "not_found" };
    return {
      ok: true,
      summary: `Added ${child.name}.`,
      data: { child },
      cards: [
        childCard({
          childId: child.id,
          name: child.name,
          ageLabel: ageLabelFromBirthday(child.birthday, child.isUnborn, child.dueDate),
        }),
      ],
    };
  },
};

const update: ToolDefinition = {
  name: "children_update",
  description:
    "Update a child's profile (name, birthday, unborn/due date). Requires the `childId`. Call `children_list` first if you don't know the id.",
  parameters: {
    type: "object",
    properties: {
      childId: { type: "string" },
      name: { type: "string" },
      birthday: { type: "string", description: "ISO date YYYY-MM-DD." },
      isUnborn: { type: "boolean" },
      dueDate: { type: "string" },
    },
    required: ["childId"],
    additionalProperties: false,
  },
  statusLabel: () => "Updating child",
  async execute(args, ctx) {
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const result = await familySvc.updateChild(
      ctx.familyId!,
      String(args.childId),
      ctx.userId,
      {
        name: args.name !== undefined ? String(args.name) : undefined,
        birthday: args.birthday !== undefined ? String(args.birthday) : undefined,
        isUnborn: args.isUnborn !== undefined ? Boolean(args.isUnborn) : undefined,
        dueDate: args.dueDate !== undefined ? String(args.dueDate) : undefined,
      } as Parameters<typeof familySvc.updateChild>[3],
    );
    if ("error" in result) {
      return { ok: false, summary: `Could not update child (${result.error}).`, error: result.error };
    }
    return { ok: true, summary: `Updated ${result.child.name}.`, data: { child: result.child } };
  },
};

const deleteChild: ToolDefinition = {
  name: "children_delete",
  description:
    "Permanently delete a child profile and all their data. DESTRUCTIVE. Only call this AFTER you have asked the user in a previous turn 'Are you sure you want to delete <name>? This cannot be undone.' and they have confirmed with an unambiguous yes. Pass `confirmed: true` to acknowledge that you have obtained confirmation.",
  parameters: {
    type: "object",
    properties: {
      childId: { type: "string" },
      confirmed: {
        type: "boolean",
        description: "Must be true. Set only after explicit user confirmation in chat.",
      },
    },
    required: ["childId", "confirmed"],
    additionalProperties: false,
  },
  statusLabel: () => "Deleting child profile",
  async execute(args, ctx) {
    if (!args.confirmed) {
      return {
        ok: false,
        summary:
          "Refusing to delete: confirmation flag is false. Ask the user to confirm in chat first.",
        error: "not_confirmed",
      };
    }
    const guard = requireFamily(ctx.familyId);
    if (guard) return guard;
    const result = await familySvc.deleteChild(
      ctx.familyId!,
      String(args.childId),
      ctx.userId,
    );
    if ("error" in result) {
      return { ok: false, summary: `Delete failed (${result.error}).`, error: result.error };
    }
    return { ok: true, summary: "Child profile deleted." };
  },
};

export const childrenTools: ToolDefinition[] = [list, add, update, deleteChild];
