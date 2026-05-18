import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

export type ToolContext = {
  userId: string;
  familyId: string | null;
  locale: string;
  conversationId: string;
};

export type NavCard = {
  type: "navLink";
  label: string;
  to: string;
};

export type CardAction =
  | { kind: "send"; label: string; message: string; tone?: "primary" | "danger" | "ghost" }
  | { kind: "navigate"; label: string; to: string; tone?: "primary" | "danger" | "ghost" };

export type ChildCardData = {
  childId: string;
  name: string;
  ageLabel: string;
  emoji?: string;
};

export type EventCardData = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  childName?: string;
  eventType: string;
  location?: string;
  allDay?: boolean;
};

export type ChecklistCardData = {
  title: string;
  subtitle?: string;
  items: Array<{ id: string; label: string; hint?: string }>;
};

export type ArticleCardData = {
  title: string;
  excerpt?: string;
  slug: string;
};

export type ConfirmCardData = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmMessage: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type Card =
  | { id: string; type: "child"; data: ChildCardData; actions?: CardAction[] }
  | { id: string; type: "event"; data: EventCardData; actions?: CardAction[] }
  | { id: string; type: "checklist"; data: ChecklistCardData; actions?: CardAction[] }
  | { id: string; type: "article"; data: ArticleCardData; actions?: CardAction[] }
  | { id: string; type: "confirm"; data: ConfirmCardData };

export type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  navCards?: NavCard[];
  cards?: Card[];
  error?: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ChatCompletionTool["function"]["parameters"];
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
  statusLabel?: (args: Record<string, unknown>) => string;
};

export function toOpenAITool(def: ToolDefinition): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    },
  };
}
