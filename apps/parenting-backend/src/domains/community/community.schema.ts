import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  postType: z
    .enum(["question", "discussion", "advice", "announcement", "event"])
    .optional()
    .default("discussion"),
  visibility: z.enum(["public", "family_only"]).optional().default("public"),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isDraft: z.boolean().optional().default(false),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  postType: z
    .enum(["question", "discussion", "advice", "announcement", "event"])
    .optional(),
  visibility: z.enum(["public", "family_only"]).optional(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
});

export const createReactionSchema = z.object({
  reactionType: z
    .enum(["like", "helpful", "love", "laugh", "wow"])
    .optional()
    .default("like"),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export const reportSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const listPostsQuerySchema = z.object({
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  postType: z.string().optional(),
  visibility: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReactionInput = z.infer<typeof createReactionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
