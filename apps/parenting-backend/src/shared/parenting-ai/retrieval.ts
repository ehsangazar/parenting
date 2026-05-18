import { prisma } from "../db/index.js";
import { embedText } from "./openai.js";

type RetrievedChunk = { content: string };

async function findRelevantChunks(
  query: string,
  opts: { limit?: number; locale?: string; sourceType?: string },
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);
  const vectorStr = `[${embedding.join(",")}]`;
  const limit = opts.limit ?? 3;

  const rows = await prisma.$queryRaw<Array<{ content: string }>>`
    SELECT c.content
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."docId"
    WHERE d."docType" = ${opts.sourceType ?? "Expert"}
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return rows;
}

export async function performRetrieval(
  query: string,
  _locale: string,
): Promise<{ expert: string[]; community: string[] }> {
  const [expertChunks, communityChunks] = await Promise.all([
    findRelevantChunks(query, { limit: 3, sourceType: "Expert" }),
    findRelevantChunks(query, { limit: 3, sourceType: "Experience" }),
  ]);

  return {
    expert: expertChunks.map((c) => c.content),
    community: communityChunks.map((c) => c.content),
  };
}
