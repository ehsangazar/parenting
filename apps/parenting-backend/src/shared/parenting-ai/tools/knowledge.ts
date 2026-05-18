import { Prisma } from "@prisma/client";
import { prisma } from "../../db/index.js";
import { performRetrieval } from "../retrieval.js";
import { articleCard } from "./cards.js";
import type { ToolDefinition } from "./types.js";

const searchExpert: ToolDefinition = {
  name: "knowledge_search_expert",
  description:
    "Search expert pediatric and parenting knowledge base (vetted articles, guidelines). Use whenever the user asks a question about parenting, child health, development, sleep, feeding, behaviour, safety, pregnancy, or any topic where authoritative guidance is helpful. Returns up to 3 expert passages.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural-language search query derived from the user's question.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  statusLabel: () => "Searching expert sources",
  async execute(args) {
    const query = String(args.query ?? "");
    if (!query) return { ok: false, summary: "Missing query", error: "missing_query" };
    const docs = await performRetrieval(query, "en");
    return {
      ok: true,
      summary: `Found ${docs.expert.length} expert passage(s).`,
      data: { passages: docs.expert },
    };
  },
};

const searchCommunity: ToolDefinition = {
  name: "knowledge_search_community",
  description:
    "Search community parent experiences for anecdotal but relevant perspectives. Use as a secondary signal alongside expert results, especially for relatable real-world examples. Returns up to 3 community passages.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural-language search query." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  statusLabel: () => "Looking at parent experiences",
  async execute(args) {
    const query = String(args.query ?? "");
    if (!query) return { ok: false, summary: "Missing query", error: "missing_query" };
    const docs = await performRetrieval(query, "en");
    return {
      ok: true,
      summary: `Found ${docs.community.length} community passage(s).`,
      data: { passages: docs.community },
    };
  },
};

const searchArticles: ToolDefinition = {
  name: "knowledge_search_articles",
  description:
    "Search the published Raised articles library by keyword. Returns up to 3 articles with title, excerpt, and slug. Use when the user might benefit from a linkable, longer-form article in addition to a direct answer.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keywords." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  statusLabel: () => "Searching articles",
  async execute(args) {
    const query = String(args.query ?? "").trim();
    if (!query) return { ok: false, summary: "Missing query", error: "missing_query" };

    const articles = await prisma.article.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { excerpt: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      take: 3,
      select: { title: true, excerpt: true, slug: true },
    });

    return {
      ok: true,
      summary: articles.length
        ? `Found ${articles.length} article(s): ${articles.map((a) => a.title).join("; ")}.`
        : "No matching articles.",
      data: { articles },
      cards: articles.map((a) =>
        articleCard({
          title: a.title,
          excerpt: a.excerpt ?? undefined,
          slug: a.slug,
        }),
      ),
    };
  },
};

export const knowledgeTools: ToolDefinition[] = [searchExpert, searchCommunity, searchArticles];
