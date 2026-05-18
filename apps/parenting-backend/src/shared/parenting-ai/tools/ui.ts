import { nanoid } from "nanoid";
import { confirmCard, checklistCard } from "./cards.js";
import type { ToolDefinition } from "./types.js";

const requestConfirmation: ToolDefinition = {
  name: "ui_request_confirmation",
  description:
    "Render an interactive confirmation card with Yes/Cancel buttons. Use this BEFORE any destructive action (children_delete, calendar_delete_event) instead of asking in plain text. The Yes button sends the `confirmMessage` back to chat verbatim, which is your signal to call the destructive tool next.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short title for the card. Example: \"Delete Mira?\"",
      },
      description: {
        type: "string",
        description:
          "One-sentence explanation of consequences. Example: \"This permanently removes Mira's profile and all of her data.\"",
      },
      confirmLabel: {
        type: "string",
        description: "Label for the confirm button. Example: \"Yes, delete\".",
      },
      confirmMessage: {
        type: "string",
        description:
          "The exact text that will be sent as the next user message if confirmed. Make it unambiguous, e.g. \"Yes, delete Mira\".",
      },
      cancelLabel: {
        type: "string",
        description: "Optional cancel button label. Default \"Cancel\".",
      },
      danger: {
        type: "boolean",
        description: "True for destructive actions (red styling).",
      },
    },
    required: ["title", "description", "confirmLabel", "confirmMessage"],
    additionalProperties: false,
  },
  statusLabel: () => "Asking for confirmation",
  async execute(args) {
    return {
      ok: true,
      summary: "Confirmation card surfaced. Wait for user's reply before acting.",
      cards: [
        confirmCard(nanoid(8), {
          title: String(args.title),
          description: String(args.description),
          confirmLabel: String(args.confirmLabel),
          confirmMessage: String(args.confirmMessage),
          cancelLabel: args.cancelLabel ? String(args.cancelLabel) : "Cancel",
          danger: Boolean(args.danger),
        }),
      ],
    };
  },
};

const showChecklist: ToolDefinition = {
  name: "ui_show_checklist",
  description:
    "Render an interactive checklist card. Use when the user asks for a routine, plan, or step-by-step list (bedtime routine, weaning plan, packing list, sleep training steps). Each item is a short actionable step (5-12 words). Keep `items` to 3-8 entries. The user can tick off items; their state persists in the browser.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the checklist. Example: \"Bedtime routine for a 3 yr old\".",
      },
      subtitle: {
        type: "string",
        description: "Optional one-line context, e.g. age range or duration.",
      },
      items: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "The action, kept short." },
            hint: { type: "string", description: "Optional one-line tip." },
          },
          required: ["label"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "items"],
    additionalProperties: false,
  },
  statusLabel: () => "Drafting a checklist",
  async execute(args) {
    const rawItems = Array.isArray(args.items) ? args.items : [];
    const items = rawItems.map((raw, idx) => {
      const r = raw as { label?: unknown; hint?: unknown };
      return {
        id: `item-${idx}`,
        label: String(r.label ?? ""),
        hint: r.hint ? String(r.hint) : undefined,
      };
    });
    return {
      ok: true,
      summary: `Drafted a ${items.length}-step checklist.`,
      cards: [
        checklistCard(nanoid(8), {
          title: String(args.title),
          subtitle: args.subtitle ? String(args.subtitle) : undefined,
          items,
        }),
      ],
    };
  },
};

export const uiTools: ToolDefinition[] = [requestConfirmation, showChecklist];
