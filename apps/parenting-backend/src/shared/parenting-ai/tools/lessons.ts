import { Prisma } from "@prisma/client";
import { prisma } from "../../db/index.js";
import { lessonCard } from "./cards.js";
import type { ToolDefinition } from "./types.js";

const WORDS_PER_MINUTE = 200;
const RECENT_PLEDGE_WINDOW_DAYS = 14;

function readingMinutes(content: string | null | undefined): number {
  if (!content) return 1;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

// Strip the markdown noise (image refs, link refs, bold/italic, headings,
// code) so the card excerpt is human-readable plain text. Cheap and good
// enough for a 140-char preview; full markdown is rendered inside the
// lesson sheet.
function plainExcerpt(content: string | null | undefined, maxLen = 140): string {
  if (!content) return "";
  let out = content;
  // Image refs: ![alt](path) -> alt
  out = out.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  // Link refs: [text](url) -> text
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Headings, blockquotes, list markers at line start
  out = out.replace(/^\s*[#>*\-+]+\s+/gm, "");
  // Bold / italic / strike / code wrappers
  out = out.replace(/(\*\*|__|\*|_|`|~~)/g, "");
  // Horizontal rules
  out = out.replace(/^\s*-{3,}\s*$/gm, "");
  // Collapse whitespace
  out = out.replace(/\s+/g, " ").trim();
  if (out.length <= maxLen) return out;
  return out.slice(0, maxLen - 1).trimEnd() + "…";
}

function youngestChildAgeMonths(
  children: Array<{ birthday: Date | null; isUnborn: boolean }>,
): number | null {
  let youngest: number | null = null;
  for (const c of children) {
    if (c.isUnborn || !c.birthday) continue;
    const months = Math.floor(
      (Date.now() - c.birthday.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
    );
    if (months < 0) continue;
    if (youngest === null || months < youngest) youngest = months;
  }
  return youngest;
}

const recommend: ToolDefinition = {
  name: "lessons_recommend",
  description:
    "Recommend 1-2 short Academy lessons relevant to the parent's current question. Returns lesson cards the parent can open inline (no page change). Use ONLY when the parent has described a concrete parenting challenge or asked for guidance (sleep, behaviour, transitions, feeding, development, communication, discipline, etc.) AND would clearly benefit from a structured lesson. Do NOT use when the parent is venting, in emotional distress, asking a yes/no question, or making small talk. Always lead your text reply with empathy before any recommendation; never recommend more than one card if the message contains emotional content. Match the parent's question keywords closely.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "2-6 keywords summarising the parenting topic to search for (e.g. 'bedtime resistance transitions', 'sibling rivalry hitting', 'tantrum two year old'). Do not include filler words.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  statusLabel: () => "Looking for a relevant lesson",
  async execute(args, ctx) {
    const query = String(args.query ?? "").trim();
    if (!query) return { ok: false, summary: "Missing query", error: "missing_query" };

    // Pull child ages so we can prefer lessons in the right developmental
    // window. Skip silently if no family / no children.
    let youngestMonths: number | null = null;
    if (ctx.familyId) {
      const kids = await prisma.child.findMany({
        where: { familyId: ctx.familyId },
        select: { birthday: true, isUnborn: true },
      });
      youngestMonths = youngestChildAgeMonths(kids);
    }

    // Exclude lessons the user has already pledged or reflected on
    // recently, so we don't keep pushing the same one.
    const recentPledges = await prisma.lessonPractice.findMany({
      where: {
        userId: ctx.userId,
        pledgedAt: {
          gte: new Date(Date.now() - RECENT_PLEDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      select: { lessonId: true },
    });
    const excludeIds = new Set(recentPledges.map((p) => p.lessonId));

    // Tokenize the query for an OR-of-terms match (more forgiving than
    // a full-string contains, which misses any reordering).
    const terms = query
      .split(/\s+/)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length >= 3)
      .slice(0, 6);
    if (terms.length === 0) {
      return { ok: true, summary: "No usable search terms.", data: { lessons: [] } };
    }

    const candidates = await prisma.learningLesson.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { content: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ]),
        id: { notIn: Array.from(excludeIds) },
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            minAgeMonths: true,
            maxAgeMonths: true,
            isGeneral: true,
            phase: { select: { course: { select: { id: true, title: true } } } },
          },
        },
        progress: {
          where: { userId: ctx.userId },
          select: { id: true },
        },
      },
      take: 30,
    });

    // Rank: lessons in age-appropriate modules first (or isGeneral), then
    // by simple keyword density in title (title hits weighted higher).
    const scored = candidates.map((lesson) => {
      const titleLower = lesson.title.toLowerCase();
      const contentLower = (lesson.content ?? "").toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (titleLower.includes(term)) score += 3;
        if (contentLower.includes(term)) score += 1;
      }
      const mod = lesson.module;
      const ageMatch =
        mod.isGeneral ||
        youngestMonths === null ||
        ((mod.minAgeMonths == null || mod.minAgeMonths <= youngestMonths) &&
          (mod.maxAgeMonths == null || mod.maxAgeMonths >= youngestMonths));
      if (ageMatch) score += 4;
      return { lesson, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 2).filter((s) => s.score > 0);

    if (top.length === 0) {
      return { ok: true, summary: "No matching lessons.", data: { lessons: [] } };
    }

    const cards = top.map(({ lesson }) =>
      lessonCard({
        lessonId: lesson.id,
        moduleId: lesson.module.id,
        courseId: lesson.module.phase.course.id,
        title: lesson.title,
        courseTitle: lesson.module.phase.course.title,
        moduleTitle: lesson.module.title,
        readingMinutes: readingMinutes(lesson.content),
        isCompleted: lesson.progress.length > 0,
        excerpt: plainExcerpt(lesson.content),
      }),
    );

    return {
      ok: true,
      summary: `Found ${top.length} lesson(s): ${top.map((s) => s.lesson.title).join("; ")}.`,
      data: { lessons: top.map((s) => ({ id: s.lesson.id, title: s.lesson.title })) },
      cards,
    };
  },
};

export const lessonsTools: ToolDefinition[] = [recommend];
