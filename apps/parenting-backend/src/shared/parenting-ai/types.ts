import { z } from "zod";

export type IntentCategory =
  | "greeting"
  | "parenting"
  | "task"
  | "follow_up"
  | "emotional"
  | "safety"
  | "unrelated";

export type SupportedTask =
  | "create_calendar_event"
  | "set_reminder"
  | "log_milestone"
  | "track_behavior"
  | "add_follow_up"
  | "search_articles";

export const CalendarEventSchema = z.object({
  title: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  childName: z.string().optional(),
});

export const ReminderSchema = z.object({
  title: z.string(),
  time: z.string(),
});

export const MilestoneSchema = z.object({
  milestone: z.string(),
  date: z.string().optional(),
  childName: z.string().optional(),
  notes: z.string().optional(),
});

export const BehaviorSchema = z.object({
  behaviorType: z.string(),
  severity: z.string().optional(),
  notes: z.string().optional(),
  childName: z.string().optional(),
});

export const TaskSchema = z.object({
  type: z.enum([
    "create_calendar_event",
    "set_reminder",
    "log_milestone",
    "track_behavior",
    "add_follow_up",
    "search_articles",
  ]),
  parameters: z.record(z.unknown()),
  confirmed: z.boolean().default(false),
});

export type Task = z.infer<typeof TaskSchema>;

export type SessionMemory = {
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  currentTopic?: string;
  pendingClarification?: string;
  pendingTask?: Task;
};

export type LongTermMemory = {
  childInfo: Array<{ name: string; age?: number; birthday?: Date }>;
  userPreferences: Record<string, unknown>;
  parentingStyle?: string;
  relevantFacts: string[];
};

export type ParentingContext = {
  conversationId: string;
  userId: string;
  userLocale: string;
  inputs: {
    message: string;
    detectedLanguage: string;
  };
  classification: {
    intent: IntentCategory;
    emergencyDetected: boolean;
    emergencyKeyword?: string;
    needsClarification: boolean;
  };
  memory: {
    session: SessionMemory;
    longTerm: LongTermMemory;
  };
  rag: {
    expert: string[];
    community: string[];
  };
  task?: Task;
};
