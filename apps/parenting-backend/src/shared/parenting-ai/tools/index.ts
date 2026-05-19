import { knowledgeTools } from "./knowledge.js";
import { lessonsTools } from "./lessons.js";
import { childrenTools } from "./children.js";
import { familyTools } from "./family.js";
import { calendarTools } from "./calendar.js";
import { momentsTools } from "./moments.js";
import { profileTools } from "./profile.js";
import { memoryTools } from "./memory.js";
import { navigationTools } from "./navigation.js";
import { uiTools } from "./ui.js";
import { toOpenAITool, type ToolDefinition } from "./types.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

export const TOOL_REGISTRY: ToolDefinition[] = [
  ...knowledgeTools,
  ...lessonsTools,
  ...childrenTools,
  ...familyTools,
  ...calendarTools,
  ...momentsTools,
  ...profileTools,
  ...memoryTools,
  ...navigationTools,
  ...uiTools,
];

export const TOOLS_BY_NAME: Record<string, ToolDefinition> = Object.fromEntries(
  TOOL_REGISTRY.map((t) => [t.name, t]),
);

export const OPENAI_TOOLS: ChatCompletionTool[] = TOOL_REGISTRY.map(toOpenAITool);

export type { ToolDefinition, ToolContext, ToolResult, NavCard, Card } from "./types.js";
