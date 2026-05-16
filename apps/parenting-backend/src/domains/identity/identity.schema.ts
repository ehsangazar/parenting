import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const googleSchema = z.object({
  idToken: z.string(),
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  onboarded: z.boolean().optional(),
  roleInHousehold: z.string().optional(),
  interests: z.array(z.string()).optional(),
  locale: z.string().optional(),
});

export const consentSchema = z.object({
  type: z.enum(["terms", "privacy", "cookie"]),
  version: z.string(),
  locale: z.string().default("en"),
});

export const avatarUploadQuerySchema = z.object({
  contentType: z.string(),
  contentLength: z.coerce.number().int().positive(),
});
