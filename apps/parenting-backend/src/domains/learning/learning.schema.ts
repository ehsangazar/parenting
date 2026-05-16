import { z } from "zod";

// ── Learning ──────────────────────────────────────────────────────────────────

export const courseIdParamSchema = z.object({
  courseId: z.string(),
});

export const moduleIdParamSchema = z.object({
  moduleId: z.string(),
});

export const courseModuleParamSchema = z.object({
  courseId: z.string(),
  moduleId: z.string(),
});

export const lessonParamSchema = z.object({
  courseId: z.string(),
  moduleId: z.string(),
  lessonId: z.string(),
});

export const completeLessonBodySchema = z.object({
  lessonId: z.string(),
});

export const unlockModuleBodySchema = z.object({
  moduleId: z.string(),
});

export const localeQuerySchema = z.object({
  locale: z.string().optional(),
});

// ── Leaps ─────────────────────────────────────────────────────────────────────

export const leapParamSchema = z.object({
  leapNumber: z.string(),
});

export const leapPlaybookParamSchema = z.object({
  leapNumber: z.string(),
  id: z.string(),
});

export type CompleteLessonBody = z.infer<typeof completeLessonBodySchema>;
export type UnlockModuleBody = z.infer<typeof unlockModuleBodySchema>;
export type LocaleQuery = z.infer<typeof localeQuerySchema>;
