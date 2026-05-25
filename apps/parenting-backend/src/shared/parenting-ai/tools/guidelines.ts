import { Prisma } from "@prisma/client";
import { prisma } from "../../db/index.js";
import type { ToolDefinition } from "./types.js";

const AUTHORITY_COUNTRY_MAP: Record<string, string[]> = {
  NHS: ["GB"],
  NICE: ["GB"],
  AAP: ["US"],
  CDC: ["US"],
  WHO: [],
};

function priorityForCountry(guidelineCountries: unknown, userCountry: string | null): number {
  if (!userCountry) return 0;
  const countries = Array.isArray(guidelineCountries) ? guidelineCountries : [];
  if (countries.length === 0) return 1;
  if (countries.includes(userCountry)) return 2;
  return 0;
}

const searchGuidelines: ToolDefinition = {
  name: "guideline_search",
  description:
    "Search authoritative parenting guidelines from NHS, WHO, AAP, NICE, and CDC. Use when the user asks about health, safety, development, feeding, sleep, vaccination, screen time, or any topic where citing an official source would strengthen the answer. Returns up to 5 guidelines sorted by relevance to the user's country.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Topic to search for, e.g. 'safe sleep newborn', 'screen time toddler', 'vaccination schedule'.",
      },
      authority: {
        type: "string",
        enum: ["NHS", "WHO", "AAP", "NICE", "CDC"],
        description: "Optional: filter to a specific authority.",
      },
      ageMonths: {
        type: "number",
        description: "Optional: child's age in months to filter age-appropriate guidelines.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  statusLabel: () => "Searching official guidelines",
  async execute(args, ctx) {
    const query = String(args.query ?? "").trim();
    if (!query) return { ok: false, summary: "Missing query", error: "missing_query" };

    const authority = args.authority ? String(args.authority) : undefined;
    const ageMonths = typeof args.ageMonths === "number" ? args.ageMonths : undefined;

    const where: Prisma.ParentingGuidelineWhereInput = {
      AND: [
        {
          OR: [
            { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { content: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { topic: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ],
        },
        ...(authority ? [{ authority }] : []),
        ...(ageMonths !== undefined
          ? [
              {
                OR: [
                  { ageMinMonths: null, ageMaxMonths: null },
                  { ageMinMonths: { lte: ageMonths }, ageMaxMonths: { gte: ageMonths } },
                  { ageMinMonths: { lte: ageMonths }, ageMaxMonths: null },
                  { ageMinMonths: null, ageMaxMonths: { gte: ageMonths } },
                ],
              },
            ]
          : []),
      ],
    };

    const results = await prisma.parentingGuideline.findMany({
      where,
      take: 15,
      select: {
        authority: true,
        topic: true,
        title: true,
        content: true,
        sourceUrl: true,
        ageMinMonths: true,
        ageMaxMonths: true,
        countries: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { profile: true },
    });
    const profile = user?.profile as Record<string, unknown> | null;
    const userCountry = typeof profile?.country === "string" ? profile.country : null;

    const sorted = results
      .map((g) => ({ ...g, priority: priorityForCountry(g.countries, userCountry) }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    if (sorted.length === 0) {
      return { ok: true, summary: "No matching guidelines found.", data: { guidelines: [] } };
    }

    const formatted = sorted.map((g) => ({
      authority: g.authority,
      topic: g.topic,
      title: g.title,
      content: g.content,
      sourceUrl: g.sourceUrl,
      ageRange: g.ageMinMonths != null || g.ageMaxMonths != null
        ? `${g.ageMinMonths ?? 0}-${g.ageMaxMonths ?? "∞"} months`
        : "all ages",
    }));

    return {
      ok: true,
      summary: `Found ${formatted.length} guideline(s) from ${[...new Set(formatted.map((g) => g.authority))].join(", ")}.`,
      data: { guidelines: formatted, userCountry },
    };
  },
};

export const guidelinesTools: ToolDefinition[] = [searchGuidelines];
