import { z } from "zod";

export const createMomentSchema = z.object({
  title: z
    .string()
    .max(200)
    .optional()
    .transform((t) => (t && t.trim()) || ""),
  description: z.string().max(2000).optional(),
  momentType: z
    .enum(["milestone", "everyday", "celebration", "firsts"])
    .optional()
    .default("everyday"),
  location: z.string().max(200).optional(),
  createdAt: z.string().datetime().optional(),
});

export const updateMomentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  momentType: z
    .enum(["milestone", "everyday", "celebration", "firsts"])
    .optional(),
  location: z.string().max(200).optional(),
  createdAt: z.string().datetime().optional(),
});

export const presignSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
});

export const createMediaSchema = z.object({
  s3Key: z.string(),
  mimeType: z.string(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  position: z.number().int().nonnegative().optional().default(0),
});

export const createTagSchema = z.object({
  tagType: z.enum(["child", "member", "location", "object", "custom"]),
  tagValue: z.string().min(1).max(200),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const createReactionSchema = z.object({
  reaction: z.string().min(1).max(50),
});

export const createAlbumSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  albumType: z
    .enum(["manual", "date-based", "child"])
    .optional()
    .default("manual"),
  coverMediaId: z.string().optional(),
});

export const updateAlbumSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  coverMediaId: z.string().optional(),
});

export type CreateMomentInput = z.infer<typeof createMomentSchema>;
export type UpdateMomentInput = z.infer<typeof updateMomentSchema>;
export type PresignInput = z.infer<typeof presignSchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateReactionInput = z.infer<typeof createReactionSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
