import { z } from "zod";

const isoDateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const dateOrDateTimeSchema = z
  .string()
  .refine(
    (value) =>
      isoDateOnlyRegex.test(value) ||
      z.string().datetime().safeParse(value).success,
    {
      message: "Invalid date. Use ISO datetime or YYYY-MM-DD.",
    },
  );

export const createFamilySchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateFamilySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  modules: z
    .object({
      welcome: z.boolean().optional(),
      children: z.boolean().optional(),
      insights: z.boolean().optional(),
      calendar: z.boolean().optional(),
      moments: z.boolean().optional(),
      village: z.boolean().optional(),
      ai: z.boolean().optional(),
    })
    .optional(),
});

const memberRoleSchema = z
  .enum([
    "member",
    "mother",
    "father",
    "nanny",
    "grandmother",
    "grandfather",
    "guardian",
    "other",
  ])
  .optional()
  .default("member");

export const addMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  birthday: dateOrDateTimeSchema.optional(),
  role: memberRoleSchema,
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: memberRoleSchema,
});

export const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthday: dateOrDateTimeSchema.optional(),
  role: z
    .enum([
      "member",
      "mother",
      "father",
      "nanny",
      "grandmother",
      "grandfather",
      "guardian",
      "other",
    ])
    .optional(),
});

export const addChildSchema = z.object({
  name: z.string().min(1).max(100),
  birthday: dateOrDateTimeSchema.optional(),
  isUnborn: z.boolean().optional().default(false),
  dueDate: dateOrDateTimeSchema.optional(),
  pregnancyType: z
    .enum(["single", "twin", "triplet", "quadruplet", "quintuplet", "other"])
    .optional(),
  modules: z.record(z.boolean()).optional(),
});

export const updateChildSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthday: dateOrDateTimeSchema.optional(),
  isUnborn: z.boolean().optional(),
  dueDate: dateOrDateTimeSchema.optional(),
  pregnancyType: z
    .enum(["single", "twin", "triplet", "quadruplet", "quintuplet", "other"])
    .optional(),
  modules: z.record(z.boolean()).optional(),
});

export const repeatRuleSchema = z.object({
  type: z.enum(["none", "daily", "weekly", "monthly", "yearly", "weekdays"]),
  interval: z.number().int().positive().optional().default(1),
  endDate: z.string().datetime().optional(),
  count: z.number().int().positive().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export const createEventSchema = z.object({
  childId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  eventType: z.enum([
    "appointment",
    "milestone",
    "activity",
    "reminder",
    "other",
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().optional().default(false),
  location: z.string().max(200).optional(),
  assignedTo: z.string().optional(),
  repeatRule: repeatRuleSchema
    .optional()
    .default({ type: "none", interval: 1 }),
});

export const updateEventSchema = z.object({
  childId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  eventType: z
    .enum(["appointment", "milestone", "activity", "reminder", "other"])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(200).optional(),
  assignedTo: z.string().optional(),
  repeatRule: repeatRuleSchema.optional(),
});

export type RepeatRuleJson = {
  type: string;
  interval: number;
  endDate?: string;
  count?: number;
  daysOfWeek?: number[];
};
