import { prisma } from "../../shared/db/index.js";

const EMPTY_CONVERSATION_GRACE_PERIOD_MS = 15 * 60 * 1000;

export async function createConversation(userId: string, tenantId?: string | null) {
  return prisma.conversation.create({
    data: { userId, tenantId: tenantId ?? undefined },
    select: { id: true, createdAt: true },
  });
}

export async function findConversations(
  userId: string,
  limit: number,
  offset: number,
) {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit + 1,
    include: {
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  const hasMore = conversations.length > limit;
  const page = hasMore ? conversations.slice(0, limit) : conversations;

  const withMessages = page.filter((c) => c._count.messages > 0);
  const empty = page.filter((c) => c._count.messages === 0);

  if (empty.length > 0) {
    const staleBefore = new Date(Date.now() - EMPTY_CONVERSATION_GRACE_PERIOD_MS);
    prisma.conversation
      .deleteMany({
        where: {
          id: { in: empty.map((c) => c.id) },
          userId,
          createdAt: { lt: staleBefore },
        },
      })
      .catch(() => {
        // Fire-and-forget cleanup, ignore errors
      });
  }

  return {
    conversations: withMessages.map((conv) => ({
      id: conv.id,
      createdAt: conv.createdAt,
      preview: conv.messages[0]?.content
        ? conv.messages[0].content.substring(0, 60).trim() +
          (conv.messages[0].content.length > 60 ? "..." : "")
        : null,
    })),
    hasMore,
  };
}

export async function findConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function findConversationOwner(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    select: { id: true, userId: true, tenantId: true },
  });
}

export async function deleteConversation(id: string) {
  await prisma.message.deleteMany({ where: { conversationId: id } });
  await prisma.conversation.delete({ where: { id } });
}

export async function createMessage(data: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  docTypeFilter?: string;
  locale?: string;
  clientMessageId?: string;
}) {
  return prisma.message.create({ data });
}

export async function findUserMessageByClientId(
  conversationId: string,
  clientMessageId: string,
) {
  return prisma.message.findUnique({
    where: {
      conversationId_clientMessageId: { conversationId, clientMessageId },
    },
    select: { id: true, conversationId: true, createdAt: true },
  });
}

export async function findAssistantReplyAfter(
  conversationId: string,
  afterCreatedAt: Date,
) {
  return prisma.message.findFirst({
    where: {
      conversationId,
      role: "assistant",
      createdAt: { gt: afterCreatedAt },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true, citations: true, locale: true },
  });
}

export async function findMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findUserTenantId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  return user?.tenantId ?? null;
}
