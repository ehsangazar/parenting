import { z } from "zod";

export const articleActionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  actionType: z.string(),
  url: z.string().optional(),
  targetId: z.string().optional(),
  position: z.number().default(0),
});

export const articleMediaSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["image", "video", "audio"]),
  s3Key: z.string(),
  duration: z.number().optional(),
  position: z.number().default(0),
});

export const createArticleSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  published: z.boolean().default(false),
  aiSummary: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  categoryId: z.string().optional(),
  actions: z.array(articleActionSchema).optional(),
  media: z.array(articleMediaSchema).optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export const createCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
});

export const publicArticlesQuerySchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  locale: z.string().optional(),
});

export const articleIdParamSchema = z.object({
  id: z.string(),
});

export type CreateArticle = z.infer<typeof createArticleSchema>;
export type UpdateArticle = z.infer<typeof updateArticleSchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type PublicArticlesQuery = z.infer<typeof publicArticlesQuerySchema>;
