import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export const adminConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  email: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const courseIdParamSchema = z.object({
  courseId: z.string().min(1),
});

export const phaseIdParamSchema = z.object({
  phaseId: z.string().min(1),
});

export const moduleIdParamSchema = z.object({
  moduleId: z.string().min(1),
});

export const widgetLayoutSchema = z.object({
  version: z.number().int().min(1),
  widgets: z.array(
    z.object({
      id: z.string().min(1),
      pluginId: z.string().min(1),
      widgetId: z.string().min(1),
      scope: z.enum(["global", "family", "child"]),
      placement: z.enum([
        "familyHome",
        "childHome",
        "mainDrawer",
        "familyDrawer",
        "childDrawer",
        "familyTabs",
        "quickActions",
      ]),
      size: z.enum(["small", "medium", "large"]).optional(),
      settings: z.record(z.unknown()).optional(),
    }),
  ),
  order: z.array(z.string().min(1)),
});

export const moduleDefaultsSchema = z.object({
  familyModules: z.record(z.boolean()).optional(),
  childModulesByPeriod: z.record(z.record(z.boolean())).optional(),
  widgetDefaults: z
    .object({
      family: z.object({ familyHome: widgetLayoutSchema.optional() }).optional(),
      child: z.object({ childHome: z.record(widgetLayoutSchema).optional() }).optional(),
    })
    .optional(),
});

export const learningCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

export const learningPhaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

export const learningModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  minAgeMonths: z.number().int().optional(),
  maxAgeMonths: z.number().int().optional(),
  isGeneral: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const learningLessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["image", "video", "audio"]).optional(),
  order: z.number().int().optional(),
});

export const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string()),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AdminConversationsQuery = z.infer<typeof adminConversationsQuerySchema>;
export type ModuleDefaultsInput = z.infer<typeof moduleDefaultsSchema>;
export type LearningCourseInput = z.infer<typeof learningCourseSchema>;
export type LearningPhaseInput = z.infer<typeof learningPhaseSchema>;
export type LearningModuleInput = z.infer<typeof learningModuleSchema>;
export type LearningLessonInput = z.infer<typeof learningLessonSchema>;
