import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { resolveLanguage, detectEmergencyRules } from "./classifier.js";
import { getSessionMemory, getLongTermMemory, saveLongTermMemory } from "./memory.js";
import { SYSTEM_PROMPTS } from "./constants.js";
import { runToolLoop } from "./tool-loop.js";
import type { NavCard, Card, ToolContext } from "./tools/types.js";

type OrchestratorOptions = {
  userId: string;
  conversationId: string;
  message: string;
  locale?: string | null;
  onStream: (chunk: string) => void;
  onStatus: (status: string) => void;
  onToolStart: (payload: { name: string; label: string; args: unknown }) => void;
  onToolFinish: (payload: { name: string; ok: boolean; summary: string }) => void;
  onNavCard: (card: NavCard) => void;
  onCard: (card: Card) => void;
};

function buildSystemPrompt(
  language: string,
  longTermFacts: string[],
  childInfo: Array<{ name: string; age?: number }>,
  hasFamily: boolean,
): string {
  const childSummary = childInfo.length
    ? childInfo.map((c) => `${c.name}${c.age != null ? ` (age ${c.age})` : ""}`).join(", ")
    : "none on file";

  return `You are Raised, a calm, evidence-based parenting assistant. Respond in language code "${language}".

You have access to tools that let you act on the user's account (search knowledge, manage children, schedule events, log moments, update profile, recall/save memory, suggest pages). Use tools whenever they help. Do not invent data: if you need to know something about the user's family, call the appropriate tool.

CRITICAL TOOL POLICY:
- For ANY parenting question (sleep, feeding, behaviour, development, safety, health), call knowledge_search_expert first, optionally knowledge_search_community, and consider knowledge_search_articles for linkable resources.
- For action requests (add child, schedule event, log milestone, update profile, etc.), call the matching tool. If you lack an id, call the corresponding _list tool first.
- DESTRUCTIVE tools (children_delete, calendar_delete_event) MUST be preceded by ui_request_confirmation in a prior turn. Do NOT ask in plain text; call ui_request_confirmation with a clear confirmMessage like "Yes, delete Mira". Only when the user's next message is an unambiguous yes (or matches the confirmMessage), call the destructive tool with confirmed: true.
- When the user asks for a routine, plan, or step-by-step list (bedtime routine, weaning plan, screen-time rules, packing list), call ui_show_checklist to render an interactive checklist instead of writing bullet points in your reply.
- If multiple independent tools are useful, call them in parallel in one turn.
- Tools that surface visual cards (children_list, calendar_list_upcoming, knowledge_search_articles, ui_show_checklist, ui_request_confirmation, calendar_create_event, children_add) already render rich UI; keep your text reply short and DO NOT restate the card content in prose.

FAMILY CONTEXT: ${hasFamily ? "User has a family on file." : "User does NOT have a family yet. They must create one in Settings before you can add children or events."}
KNOWN CHILDREN: ${childSummary}.
LONG-TERM FACTS: ${longTermFacts.slice(0, 8).join(" | ") || "none"}

FORMATTING:
- Use clear Markdown with short paragraphs and bullet points.
- Use ### headings to organise multi-part answers.
- Keep paragraphs to 2-3 sentences.
- When you cite expert/community passages, weave them in naturally; never mention "RAG" or "the database".
- Confirm any action you took with a short, plain-language sentence (e.g. "Done, added Mira.").
- If you decide to refuse (non-parenting topic outside family logistics), do so briefly and offer to help with parenting topics instead.`;
}

export async function orchestrateFlow(opts: OrchestratorOptions) {
  const {
    userId,
    conversationId,
    message,
    locale: callerLocale,
    onStream,
    onStatus,
    onToolStart,
    onToolFinish,
    onNavCard,
    onCard,
  } = opts;

  const saveAssistantMessage = async (payload: {
    content: string;
    locale: string;
    flagged?: boolean;
    citations?: Prisma.InputJsonValue;
  }) => {
    try {
      await prisma.message.create({
        data: {
          id: nanoid(),
          conversationId,
          role: "assistant",
          content: payload.content,
          locale: payload.locale,
          flagged: payload.flagged ?? false,
          citations: payload.citations,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return;
      }
      throw error;
    }
  };

  const language = resolveLanguage(message, callerLocale);
  const { detected: isEmergency } = detectEmergencyRules(message);

  if (isEmergency) {
    const emergencyMsg = SYSTEM_PROMPTS.EMERGENCY;
    onStream(emergencyMsg);
    await saveAssistantMessage({ content: emergencyMsg, locale: language, flagged: true });
    return;
  }

  onStatus("loading_context");

  const [sessionMem, longTermMem, family] = await Promise.all([
    getSessionMemory(conversationId),
    getLongTermMemory(userId),
    prisma.family.findFirst({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const ctx: ToolContext = {
    userId,
    familyId: family?.id ?? null,
    locale: language,
    conversationId,
  };

  const systemPrompt = buildSystemPrompt(
    language,
    longTermMem.relevantFacts,
    longTermMem.childInfo.map((c) => ({ name: c.name, age: c.age })),
    !!family?.id,
  );

  onStatus("generating_response");

  const { finalText, navCards, cards } = await runToolLoop(
    systemPrompt,
    sessionMem.recentMessages,
    message,
    ctx,
    { onStream, onStatus, onToolStart, onToolFinish, onNavCard, onCard },
  );

  await saveAssistantMessage({
    content: finalText,
    locale: language,
    citations: {
      navCards: navCards as unknown as Prisma.InputJsonValue,
      cards: cards as unknown as Prisma.InputJsonValue,
    } as Prisma.InputJsonValue,
  });

  saveLongTermMemory(userId, message, conversationId).catch((error) => {
    console.error("Failed to save long-term memory", error);
  });
}
