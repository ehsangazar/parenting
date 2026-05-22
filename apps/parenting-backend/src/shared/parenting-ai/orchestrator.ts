import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { resolveLanguage, detectEmergencyRules } from "./classifier.js";
import { getSessionMemory, getLongTermMemory, saveLongTermMemory } from "./memory.js";
import { SYSTEM_PROMPTS } from "./constants.js";
import { runToolLoop } from "./tool-loop.js";
import type { NavCard, Card, ToolContext } from "./tools/types.js";
import { listRecentReflections, listPendingPractices } from "../../domains/learning/learning.service.js";

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

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function buildDateAnchors(now: Date): string {
  const lines: string[] = [];
  const today = WEEKDAY_NAMES[now.getUTCDay()];
  lines.push(`TODAY is ${today}, ${now.toISOString().slice(0, 10)} (full ISO: ${now.toISOString()}).`);
  const upcoming: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + i);
    upcoming.push(`  next ${WEEKDAY_NAMES[d.getUTCDay()]} = ${d.toISOString().slice(0, 10)}`);
  }
  lines.push("Upcoming weekdays (use these dates verbatim; do NOT compute weekdays yourself):");
  lines.push(...upcoming);
  return lines.join("\n");
}

function formatOutcome(outcome: string): string {
  switch (outcome) {
    case "worked":
      return "worked";
    case "mixed":
      return "had mixed results";
    case "didnt_work":
      return "didn't work";
    default:
      return outcome;
  }
}

function buildPracticeSection(
  reflections: Array<{
    lessonTitle: string;
    technique: string;
    outcome: string;
    note: string | null;
    childName: string | null;
  }>,
  pending: Array<{
    lessonTitle: string;
    technique: string;
    childName: string | null;
    overdueHours: number;
  }>,
): string {
  const lines: string[] = [];
  if (reflections.length) {
    lines.push("RECENT PRACTICE (what the parent has actually tried):");
    for (const r of reflections) {
      const child = r.childName ? ` with ${r.childName}` : "";
      const note = r.note ? ` Their note: "${r.note}"` : "";
      lines.push(
        `- From lesson "${r.lessonTitle}"${child}: tried "${r.technique}" — ${formatOutcome(r.outcome)}.${note}`,
      );
    }
  }
  if (pending.length) {
    if (lines.length) lines.push("");
    lines.push("PENDING PRACTICE (parent pledged to try, hasn't reflected yet):");
    for (const p of pending) {
      const child = p.childName ? ` with ${p.childName}` : "";
      const overdue = p.overdueHours > 0 ? ` (${p.overdueHours}h overdue)` : "";
      lines.push(`- "${p.technique}"${child}${overdue}`);
    }
  }
  return lines.join("\n");
}

function buildSystemPrompt(
  language: string,
  longTermFacts: string[],
  childInfo: Array<{ name: string; age?: number }>,
  hasFamily: boolean,
  practiceSection: string,
): string {
  const childSummary = childInfo.length
    ? childInfo.map((c) => `${c.name}${c.age != null ? ` (age ${c.age})` : ""}`).join(", ")
    : "none on file";

  return `You are Raised, a calm, evidence-based parenting assistant. Respond in language code "${language}".

${buildDateAnchors(new Date())}

When the user says relative time ("tomorrow", "next Tuesday", "in two weeks", "this Friday"), resolve it against the dates above. Do NOT fall back to any internally-remembered date.

You have access to tools that let you act on the user's account (search knowledge, manage children, schedule events, log moments, update profile, recall/save memory, suggest pages). Use tools whenever they help. Do not invent data: if you need to know something about the user's family, call the appropriate tool.

CRITICAL TOOL POLICY:
- For ANY parenting question (sleep, feeding, behaviour, development, safety, health), call knowledge_search_expert first, optionally knowledge_search_community, and consider knowledge_search_articles for linkable resources.
- For action requests (add child, schedule event, log milestone, update profile, etc.), call the matching tool. If you lack an id, call the corresponding _list tool first.
- DESTRUCTIVE tools (children_delete, calendar_delete_event) MUST be preceded by ui_request_confirmation in a prior turn. Do NOT ask in plain text; call ui_request_confirmation with a clear confirmMessage like "Yes, delete Mira". Only when the user's next message is an unambiguous yes (or matches the confirmMessage), call the destructive tool with confirmed: true.
- When the user asks for a routine, plan, or step-by-step list (bedtime routine, weaning plan, screen-time rules, packing list), call ui_show_checklist to render an interactive checklist instead of writing bullet points in your reply. The card is self-contained: it has its own tick boxes, a "Mark as complete" submit button, and a reset control. Do NOT tell the user to find the checklist in a "checklist section", "saved items", or any other place; that section does not exist. After rendering, the card is the only place it lives. End your reply with ONE short concrete follow-up in plain text (e.g., "Tap the button at the bottom once you've tried it and I'll suggest tweaks," or "Want me to add this as a recurring morning event?"). Keep it under one sentence.
- If multiple independent tools are useful, call them in parallel in one turn.
- Tools that surface visual cards (children_list, calendar_list_upcoming, knowledge_search_articles, lessons_recommend, ui_show_checklist, ui_request_confirmation, calendar_create_event, children_add) already render rich UI; keep your text reply short and DO NOT restate the card content in prose.

EMPATHY-FIRST RULE:
- ALWAYS lead your reply with one or two sentences that acknowledge the parent's situation or feeling before any advice or recommendations. If the parent is clearly venting, distressed, or describing a hard moment ("she won't stop crying", "I'm exhausted", "I lost it today"), the FIRST sentence must validate that feeling. Do not jump straight into tips.
- After acknowledging, you may then offer guidance and/or call lessons_recommend if a concrete lesson would clearly help. Limit to ONE lesson card per reply if the message contained emotional content. Never recommend a lesson when the parent is purely venting and has not asked for help.
- Recommending a lesson the parent did not ask for should feel like a friend handing them a small useful resource, not an upsell. If in doubt, skip the recommendation.

FAMILY CONTEXT: ${hasFamily ? "User has a family on file." : "User does NOT have a family yet. They must create one in Settings before you can add children or events."}
KNOWN CHILDREN: ${childSummary}.
LONG-TERM FACTS: ${longTermFacts.slice(0, 8).join(" | ") || "none"}

${practiceSection || "RECENT PRACTICE: none yet."}

When recent practice is shown above, reference it naturally if the user's question is related ("Last week you tried X — how did that go after the first night?"). Don't recite the list; weave it in.

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

  const [sessionMem, longTermMem, family, recentReflections, pendingPractices] =
    await Promise.all([
      getSessionMemory(conversationId),
      getLongTermMemory(userId),
      prisma.family.findFirst({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      listRecentReflections(userId, 5).catch(() => []),
      listPendingPractices(userId).catch(() => []),
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
    buildPracticeSection(
      recentReflections,
      pendingPractices.slice(0, 3).map((p) => ({
        lessonTitle: p.lessonTitle,
        technique: p.technique,
        childName: p.childName,
        overdueHours: p.overdueHours,
      })),
    ),
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
