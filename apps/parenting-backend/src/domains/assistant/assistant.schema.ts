import { z } from "zod";

export const chatQuerySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  docTypeFilter: z.string().optional(),
  locale: z.string().optional(),
  clientMessageId: z.string().min(1).max(128).optional(),
});

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const conversationIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ChatQueryInput = z.infer<typeof chatQuerySchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
