import * as identitySvc from "../../../domains/identity/identity.service.js";
import type { ToolDefinition } from "./types.js";

const get: ToolDefinition = {
  name: "profile_get",
  description:
    "Return the current user's profile (display name, locale, avatar). Use when answers should be personalised.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  statusLabel: () => "Reading your profile",
  async execute(_args, ctx) {
    const me = await identitySvc.getMe(ctx.userId);
    if (!me) return { ok: false, summary: "Profile not found.", error: "not_found" };
    return { ok: true, summary: `Profile loaded.`, data: { profile: me } };
  },
};

const update: ToolDefinition = {
  name: "profile_update",
  description:
    "Update the current user's profile fields: display name, locale (e.g. 'en', 'fa'), or interests. Pass only fields that change.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Display name." },
      locale: { type: "string", description: "Language code, e.g. 'en', 'fa'." },
      interests: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of parenting interests.",
      },
      country: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code, e.g. 'GB', 'US', 'AU'.",
      },
    },
    additionalProperties: false,
  },
  statusLabel: () => "Updating your profile",
  async execute(args, ctx) {
    const updated = await identitySvc.updateMe(ctx.userId, {
      name: args.name !== undefined ? String(args.name) : undefined,
      locale: args.locale !== undefined ? String(args.locale) : undefined,
      interests: Array.isArray(args.interests)
        ? (args.interests as unknown[]).map(String)
        : undefined,
      country: args.country !== undefined ? String(args.country) : undefined,
    } as Parameters<typeof identitySvc.updateMe>[1]);
    return { ok: true, summary: "Profile updated.", data: { profile: updated } };
  },
};

export const profileTools: ToolDefinition[] = [get, update];
