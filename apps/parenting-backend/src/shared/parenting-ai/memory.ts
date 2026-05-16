import { nanoid } from "nanoid";
import { prisma } from "../db/index.js";
import { getOpenAI, embedText } from "./openai.js";
import { SessionMemory, LongTermMemory } from "./types.js";

export async function getSessionMemory(conversationId: string): Promise<SessionMemory> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  return {
    recentMessages: messages
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  };
}

export async function getLongTermMemory(userId: string): Promise<LongTermMemory> {
  const families = await prisma.family.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: { children: true },
  });

  const children = families.flatMap((f) =>
    f.children.map((c) => ({
      name: c.name,
      birthday: c.birthday ?? undefined,
      age: c.birthday
        ? Math.floor((Date.now() - new Date(c.birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : undefined,
    })),
  );

  const memories = await prisma.userMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: true },
  });

  return {
    childInfo: children,
    userPreferences: (user?.profile as Record<string, unknown>) ?? {},
    relevantFacts: memories.map((m) => m.summary),
  };
}

export async function saveLongTermMemory(
  userId: string,
  content: string,
  _conversationId: string,
): Promise<void> {
  const client = getOpenAI();

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the user's message. If they state a STABLE FACT about their family, preferences, or child's routine, extract it. Ignore questions or transient chatter. Return JSON: { "hasNewFact": boolean, "fact": string | null }`,
        },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    if (parsed.hasNewFact && parsed.fact) {
      const embedding = await embedText(parsed.fact);
      const vectorStr = `[${embedding.join(",")}]`;
      const id = nanoid();
      await prisma.$executeRaw`
        INSERT INTO "UserMemory" ("id", "userId", "summary", "embedding", "updatedAt", "createdAt")
        VALUES (${id}, ${userId}, ${parsed.fact}, ${vectorStr}::vector, NOW(), NOW())
      `;
    }
  } catch (e) {
    console.error("Failed to save memory", e);
  }
}
