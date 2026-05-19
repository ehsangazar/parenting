import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const subscribeBodySchema = z.object({
  subscription: pushSubscriptionSchema,
  userAgent: z.string().max(500).optional(),
  timeZone: z.string().max(100).optional(),
});

export const unsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
});

export const sendTestBodySchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().max(500).optional(),
}).default({});
