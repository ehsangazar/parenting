import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";

export type ArticleWhereInput = Prisma.ArticleWhereInput;

// ── Public article queries ────────────────────────────────────────────────────

export async function findPublishedArticles(opts: {
  where: ArticleWhereInput;
  locale: string;
  needsTranslation: boolean;
  take: number;
  skip: number;
}) {
  return prisma.article.findMany({
    where: opts.where,
    include: {
      category: {
        include: {
          ...(opts.needsTranslation
            ? { translations: { where: { locale: opts.locale } } }
            : {}),
        },
      },
      citations: { orderBy: { position: "asc" } },
      ...(opts.needsTranslation
        ? { translations: { where: { locale: opts.locale, status: "published" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take,
    skip: opts.skip,
  });
}

export async function countPublishedArticles(where: ArticleWhereInput) {
  return prisma.article.count({ where });
}

export async function findArticleById(
  id: string,
  locale: string,
  needsTranslation: boolean,
) {
  return prisma.article.findUnique({
    where: { id },
    include: {
      category: {
        include: {
          ...(needsTranslation
            ? { translations: { where: { locale } } }
            : {}),
        },
      },
      media: { orderBy: { position: "asc" } },
      actions: { orderBy: { position: "asc" } },
      citations: { orderBy: { position: "asc" } },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export async function findArticleBySlug(
  slug: string,
  locale: string,
  needsTranslation: boolean,
) {
  return prisma.article.findUnique({
    where: { slug },
    include: {
      category: {
        include: {
          ...(needsTranslation
            ? { translations: { where: { locale } } }
            : {}),
        },
      },
      media: { orderBy: { position: "asc" } },
      actions: { orderBy: { position: "asc" } },
      citations: { orderBy: { position: "asc" } },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export function buildPublicArticleWhere(opts: {
  categoryId?: string;
  search?: string;
}): ArticleWhereInput {
  const now = new Date();
  return {
    published: true,
    createdAt: { lte: now },
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.search
      ? {
          OR: [
            { title: { contains: opts.search, mode: Prisma.QueryMode.insensitive } },
            { content: { contains: opts.search, mode: Prisma.QueryMode.insensitive } },
            { excerpt: { contains: opts.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };
}
