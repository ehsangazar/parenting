import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
// orchestrator.ts lives at src/shared/parenting-ai/orchestrator.ts (to be ported from raised-backend)
import { orchestrateFlow } from "../../shared/parenting-ai/orchestrator.js";
import { awardCoins } from "../../shared/gamification/index.js";
import { POINTS } from "../../config/points.js";
import { redactPII, applyBlocklist } from "../../shared/security/index.js";
import * as repo from "./assistant.repository.js";

const BLOCKLIST = ["password", "ssn"];

export async function listConversations(
  userId: string,
  limit: number,
  offset: number,
) {
  return repo.findConversations(userId, limit, offset);
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
};

export async function runQuery(
  userId: string,
  userRole: string,
  input: {
    conversationId?: string;
    message: string;
    docTypeFilter?: string;
    locale?: string;
  },
  callbacks: QueryStreamCallbacks,
): Promise<{ conversationId: string } | { error: string; status: number }> {
  let conversationId = input.conversationId;

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

  const sanitizedMessage = applyBlocklist(redactPII(input.message), BLOCKLIST);

  try {
    await repo.createMessage({
      id: nanoid(),
      conversationId: conversationId!,
      role: "user",
      content: sanitizedMessage,
      docTypeFilter: input.docTypeFilter,
      locale: input.locale ?? "en",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { error: "Conversation no longer exists", status: 409 };
    }
    throw error;
  }

  await orchestrateFlow({
    userId,
    conversationId: conversationId!,
    message: sanitizedMessage,
    onStream: callbacks.onStream,
    onStatus: callbacks.onStatus,
  });

  // Award coins for AI chat interaction (fire-and-forget)
  awardCoins(userId, POINTS.COINS_AI_CHAT).catch(() => {
    // Non-critical, ignore errors
  });

  return { conversationId: conversationId! };
}
