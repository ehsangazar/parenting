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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

export const notificationPrefsSchema = z.object({
  channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
  }),
  topics: z.object({
    dailyTip: z.boolean(),
    weeklyRecap: z.boolean(),
    courseReminders: z.boolean(),
    calendarReminders: z.boolean(),
    marketing: z.boolean(),
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    start: timeOfDay,
    end: timeOfDay,
  }),
});

export const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  onboarded: z.boolean().optional(),
  roleInHousehold: z.string().optional(),
  interests: z.array(z.string()).optional(),
  locale: z.string().optional(),
  notificationPrefs: notificationPrefsSchema.optional(),
  timeZone: z.string().max(100).optional(),
  country: z.string().length(2).toUpperCase().optional(),
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
