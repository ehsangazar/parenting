import { nanoid } from "nanoid";
import { prisma } from "../../db/index.js";
import { embedText } from "../openai.js";
import type { ToolDefinition } from "./types.js";

const recall: ToolDefinition = {
  name: "memory_recall",
  description:
    "Recall the user's most recent stored long-term memories (stable facts about family/preferences/routines). Use to ground answers in what you already know about this family. Returns up to 10 summaries.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  statusLabel: () => "Recalling what I know about you",
  async execute(_args, ctx) {
    const memories = await prisma.userMemory.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { summary: true, createdAt: true },
    });
    return {
      ok: true,
      summary: memories.length ? `${memories.length} memory entries.` : "No long-term memory yet.",
      data: { memories: memories.map((m) => m.summary) },
    };
  },
};

const remember: ToolDefinition = {
  name: "memory_remember",
  description:
    "Save a stable fact about the user's family, preferences, or routines for future conversations. Pass `fact` as a self-contained sentence (e.g. 'Mira is allergic to peanuts'). Use sparingly: only for durable facts, not transient chatter.",
  parameters: {
    type: "object",
    properties: {
      fact: { type: "string", description: "Self-contained sentence to remember." },
    },
    required: ["fact"],
    additionalProperties: false,
  },
  statusLabel: () => "Remembering that for next time",
  async execute(args, ctx) {
    const fact = String(args.fact ?? "").trim();
    if (!fact) return { ok: false, summary: "Empty fact.", error: "empty" };
    const embedding = await embedText(fact);
    const vectorStr = `[${embedding.join(",")}]`;
    const id = nanoid();
    await prisma.$executeRaw`
      INSERT INTO "UserMemory" ("id", "userId", "summary", "embedding", "updatedAt", "createdAt")
      VALUES (${id}, ${ctx.userId}, ${fact}, ${vectorStr}::vector, NOW(), NOW())
    `;
    return { ok: true, summary: `Saved: "${fact}".` };
  },
};

export const memoryTools: ToolDefinition[] = [recall, remember];
