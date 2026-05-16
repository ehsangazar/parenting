import { getSignedViewUrl } from "../../shared/storage/index.js";
import * as repo from "./content.repository.js";

// ── Locale helpers ────────────────────────────────────────────────────────────

const DEFAULT_LOCALE = "en";

export function resolveLocale(raw: string | undefined): string {
  if (!raw) return DEFAULT_LOCALE;
  return raw.trim().split("-")[0].toLowerCase() || DEFAULT_LOCALE;
}

// ── Cover image signing ───────────────────────────────────────────────────────

async function signCoverImage<T extends { id: string; coverImage: string | null }>(
  article: T,
): Promise<T> {
  if (article.coverImage && !article.coverImage.startsWith("http")) {
    try {
      article.coverImage = await getSignedViewUrl(article.coverImage);
    } catch (err) {
      console.error(`Failed to sign cover image for article ${article.id}:`, err);
    }
  }
  return article;
}

// ── Translation merger ────────────────────────────────────────────────────────

type ArticleTranslation = {
  title: string;
  content: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

function applyArticleTranslation<
  T extends {
    title: string;
    content: string;
    excerpt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  },
>(article: T, translation: ArticleTranslation | null): T {
  if (!translation) return article;
  return {
    ...article,
    title: translation.title || article.title,
    content: translation.content || article.content,
    excerpt: translation.excerpt ?? article.excerpt,
    seoTitle: translation.seoTitle ?? article.seoTitle,
    seoDescription: translation.seoDescription ?? article.seoDescription,
  };
}

function applyCategoryTranslation(
  article: Record<string, unknown>,
): void {
  const catWithTr = article.category as
    | { translations?: { name: string }[]; [key: string]: unknown }
    | null;
  if (!catWithTr) return;
  const catTr = catWithTr.translations?.[0];
  const { translations: _ignored, ...catBase } = catWithTr;
  article.category = catTr?.name ? { ...catBase, name: catTr.name } : catBase;
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function getPublicArticles(opts: {
  categoryId?: string;
  search?: string;
  limit: number;
  offset: number;
  locale: string;
}) {
  const { locale, limit, offset, categoryId, search } = opts;
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const where = repo.buildPublicArticleWhere({ categoryId, search });

  const [articles, total] = await Promise.all([
    repo.findPublishedArticles({ where, locale, needsTranslation, take: limit, skip: offset }),
    repo.countPublishedArticles(where),
  ]);

  const processed = await Promise.all(
    articles.map(async (a) => {
      const { translations, ...rest } = a as typeof a & {
        translations?: ArticleTranslation[];
      };
      const translated = applyArticleTranslation(rest, translations?.[0] ?? null);
      applyCategoryTranslation(translated as unknown as Record<string, unknown>);
      return signCoverImage(translated);
    }),
  );

  return { articles: processed, total };
}

export async function getArticleById(id: string, locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const now = new Date();

  const article = await repo.findArticleById(id, locale, needsTranslation);
  if (!article || !article.published || article.createdAt > now) return null;

  const { translations, ...rest } = article as typeof article & {
    translations?: ArticleTranslation[];
  };
  const translated = applyArticleTranslation(rest, translations?.[0] ?? null);
  applyCategoryTranslation(translated as unknown as Record<string, unknown>);
  await signCoverImage(translated);
  return translated;
}
