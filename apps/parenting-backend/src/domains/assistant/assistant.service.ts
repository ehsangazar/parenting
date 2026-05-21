import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
// orchestrator.ts lives at src/shared/parenting-ai/orchestrator.ts (to be ported from raised-backend)
import { orchestrateFlow } from "../../shared/parenting-ai/orchestrator.js";
import { getOpenAI } from "../../shared/parenting-ai/openai.js";
import { awardCoins, awardInsight } from "../../shared/gamification/index.js";
import { POINTS } from "../../config/points.js";
import { redactPII, applyBlocklist } from "../../shared/security/index.js";
import { capture as capturePosthog } from "../../shared/analytics/posthog.js";
import {
  canSendAiMessage,
  incrementAiUsage,
  getAiUsage,
  buyAiTopup,
} from "../../shared/aiUsage/index.js";
import * as repo from "./assistant.repository.js";

const BLOCKLIST = ["password", "ssn"];

export async function listConversations(
  userId: string,
  limit: number,
  offset: number,
) {
  return repo.findConversations(userId, limit, offset);
}

export async function getDailyAiUsage(userId: string) {
  const usage = await getAiUsage(userId);
  return {
    used: usage.used,
    cap: usage.cap,
    topupRemaining: usage.topupRemaining,
    remaining: usage.remaining,
    resetsAt: usage.resetsAt.toISOString(),
  };
}

export async function purchaseAiTopup(userId: string) {
  const usage = await buyAiTopup(userId);
  return {
    used: usage.used,
    cap: usage.cap,
    topupRemaining: usage.topupRemaining,
    remaining: usage.remaining,
    resetsAt: usage.resetsAt.toISOString(),
  };
}

export async function createConversation(userId: string) {
  const tenantId = await repo.findUserTenantId(userId);
  return repo.createConversation(userId, tenantId);
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
) {
  const convo = await repo.findConversation(conversationId);
  if (!convo || convo.userId !== userId) return null;
  return convo.messages;
}

export async function removeConversation(
  conversationId: string,
  userId: string,
) {
  const convo = await repo.findConversationOwner(conversationId);
  if (!convo || convo.userId !== userId) return false;
  await repo.deleteConversation(conversationId);
  return true;
}

export type QueryStreamCallbacks = {
  onStream: (chunk: string) => void;
  onStatus: (status: string) => void;
  onToolStart: (payload: { name: string; label: string; args: unknown }) => void;
  onToolFinish: (payload: { name: string; ok: boolean; summary: string }) => void;
  onNavCard: (card: { type: "navLink"; label: string; to: string }) => void;
  onCard: (card: unknown) => void;
};

export async function runQuery(
  userId: string,
  userRole: string,
  input: {
    conversationId?: string;
    message: string;
    docTypeFilter?: string;
    locale?: string;
    clientMessageId?: string;
  },
  callbacks: QueryStreamCallbacks,
): Promise<{ conversationId: string } | { error: string; status: number }> {
  let conversationId = input.conversationId;

  // Daily AI cap check. We do this before any DB write so failed quota checks
  // don't create empty conversations or messages.
  if (userRole !== "admin") {
    const { allowed } = await canSendAiMessage(userId);
    if (!allowed) {
      return { error: "Daily AI message cap reached", status: 429 };
    }
  }

  if (conversationId) {
    const existing = await repo.findConversationOwner(conversationId);
    if (!existing) return { error: "Conversation not found", status: 404 };
    if (existing.userId !== userId && userRole !== "admin") {
      return { error: "Not allowed to access this conversation", status: 403 };
    }
  } else {
    const tenantId = await repo.findUserTenantId(userId);
    const created = await repo.createConversation(userId, tenantId);
    conversationId = created.id;
  }

  // Idempotency: if the client retried with the same clientMessageId, replay the
  // stored assistant reply instead of orchestrating again.
  if (input.clientMessageId) {
    const existingUser = await repo.findUserMessageByClientId(
      conversationId!,
      input.clientMessageId,
    );
    if (existingUser) {
      const existingAssistant = await repo.findAssistantReplyAfter(
        conversationId!,
        existingUser.createdAt,
      );
      if (existingAssistant) {
        callbacks.onStream(existingAssistant.content);
        const cites = existingAssistant.citations as
          | { navCards?: unknown[]; cards?: unknown[] }
          | null;
        if (cites && Array.isArray(cites.navCards)) {
          for (const c of cites.navCards) callbacks.onNavCard(c as never);
        }
        if (cites && Array.isArray(cites.cards)) {
          for (const c of cites.cards) callbacks.onCard(c);
        }
      }
      return { conversationId: conversationId! };
    }
  }

  const sanitizedMessage = applyBlocklist(redactPII(input.message), BLOCKLIST);

  try {
    await repo.createMessage({
      id: nanoid(),
      conversationId: conversationId!,
      role: "user",
      content: sanitizedMessage,
      docTypeFilter: input.docTypeFilter,
      locale: input.locale ?? "en",
      clientMessageId: input.clientMessageId,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { error: "Conversation no longer exists", status: 409 };
    }
    // Lost race: same clientMessageId raced past the dedupe check above.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.clientMessageId
    ) {
      return { conversationId: conversationId! };
    }
    throw error;
  }

  const orchestrationStartedAt = Date.now();
  let orchestrationOk = true;
  try {
    await orchestrateFlow({
      userId,
      conversationId: conversationId!,
      message: sanitizedMessage,
      locale: input.locale,
      onStream: callbacks.onStream,
      onStatus: callbacks.onStatus,
      onToolStart: callbacks.onToolStart,
      onToolFinish: callbacks.onToolFinish,
      onNavCard: callbacks.onNavCard,
      onCard: callbacks.onCard,
    });
  } catch (err) {
    orchestrationOk = false;
    capturePosthog(userId, "openai_request", {
      route: "user_query",
      success: false,
      latency_ms: Date.now() - orchestrationStartedAt,
      locale: input.locale ?? null,
      error: (err as Error)?.message?.slice(0, 200) ?? "unknown",
    });
    throw err;
  }
  capturePosthog(userId, "openai_request", {
    route: "user_query",
    success: orchestrationOk,
    latency_ms: Date.now() - orchestrationStartedAt,
    locale: input.locale ?? null,
    message_length: sanitizedMessage.length,
  });

  // Consume one message from the daily cap. We do this after orchestrateFlow
  // succeeds so failed sends don't burn quota.
  incrementAiUsage(userId).catch(() => {});

  // Award coins + insight for AI chat interaction (fire-and-forget)
  awardCoins(userId, POINTS.COINS_AI_CHAT).catch(() => {});
  awardInsight(userId, POINTS.INSIGHT_AI_CHAT, "ai_chat").catch(() => {});

  return { conversationId: conversationId! };
}

const MAX_GUEST_TOTAL_CHARS = 50_000;

// Take a guest's pre-signup conversation (stashed client-side in localStorage)
// and seed it into a fresh server-side Conversation so they keep their history
// instead of restarting from scratch. Each message is sanitized the same way
// runQuery sanitizes a new send, since the content originated from an
// unauthenticated channel and shouldn't be trusted verbatim.
export async function importGuestConversation(
  userId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  locale: string | null,
): Promise<{ conversationId: string } | { error: string; status: number }> {
  const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_GUEST_TOTAL_CHARS) {
    return { error: "Imported conversation too large", status: 413 };
  }

  const tenantId = await repo.findUserTenantId(userId);
  const conversation = await repo.createConversation(userId, tenantId);

  for (const msg of messages) {
    const safeContent = applyBlocklist(redactPII(msg.content), BLOCKLIST);
    await repo.createMessage({
      id: nanoid(),
      conversationId: conversation.id,
      role: msg.role,
      content: safeContent,
      locale: locale ?? "en",
    });
  }

  capturePosthog(userId, "guest_conversation_imported", {
    messages_count: messages.length,
    total_chars: totalChars,
    locale: locale ?? null,
  });

  return { conversationId: conversation.id };
}

// Single-turn answer for logged-out visitors. No tools, no retrieval, no DB,
// no memory: just a clean taste of Raised's voice so they can decide to sign
// up. The route layer enforces a strict IP rate limit on top of this.
const GUEST_SYSTEM_PROMPT = `You are Raised, a calm, evidence-based parenting assistant.

You are answering a one-off question for a visitor who has not signed up yet. Be warm, specific, and useful. Aim for a clear, actionable answer in 4-8 short sentences or a few bullet points. Use Markdown. Reply in the same language the visitor wrote in. If the question is not about parenting, briefly say what you can help with and offer to assist.

You do NOT have access to the visitor's family, children, calendar, or history. Do not pretend to, do not ask follow-up questions that depend on data you can't see, and do not ask the visitor to sign up; the surrounding UI handles sign-up.`;

export async function runGuestQuery(
  message: string,
  locale: string | null,
  onStream: (chunk: string) => void,
  ipAddress: string | null,
): Promise<void> {
  const sanitized = applyBlocklist(redactPII(message), BLOCKLIST).slice(0, 1200);
  const oai = getOpenAI();
  const systemPrompt = locale
    ? `${GUEST_SYSTEM_PROMPT}\n\nRespond in language code "${locale}".`
    : GUEST_SYSTEM_PROMPT;
  const model = "gpt-4o";
  const startedAt = Date.now();
  // PostHog distinctId for anonymous visitors: hashed IP is overkill for v0,
  // so we tag with a stable "guest" bucket plus the IP as a property. This
  // ties guest events back to per-IP rate-limit cohorts without minting fake
  // user identities.
  const distinctId = ipAddress ? `guest:${ipAddress}` : "guest:unknown";

  try {
    const stream = await oai.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.6,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sanitized },
      ],
    });

    let promptTokens = 0;
    let completionTokens = 0;
    for await (const event of stream) {
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) onStream(delta);
      if (event.usage) {
        promptTokens = event.usage.prompt_tokens ?? 0;
        completionTokens = event.usage.completion_tokens ?? 0;
      }
    }

    capturePosthog(distinctId, "openai_request", {
      route: "guest_query",
      model,
      success: true,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      latency_ms: Date.now() - startedAt,
      locale: locale ?? null,
      message_length: sanitized.length,
    });
  } catch (err) {
    capturePosthog(distinctId, "openai_request", {
      route: "guest_query",
      model,
      success: false,
      latency_ms: Date.now() - startedAt,
      locale: locale ?? null,
      error: (err as Error)?.message?.slice(0, 200) ?? "unknown",
    });
    throw err;
  }
}
