import { IntentCategory, SupportedTask } from "./types.js";

export const INTENTS: IntentCategory[] = [
  "greeting",
  "parenting",
  "task",
  "follow_up",
  "emotional",
  "safety",
  "unrelated",
];

export const SUPPORTED_TASKS: SupportedTask[] = [
  "create_calendar_event",
  "set_reminder",
  "log_milestone",
  "track_behavior",
  "add_follow_up",
  "search_articles",
];

export const EMERGENCY_KEYWORDS = [
  "fever",
  "rash",
  "not breathing",
  "choking",
  "unconscious",
  "seizure",
  "severe allergic reaction",
  "difficulty breathing",
  "blue lips",
  "no pulse",
  "bleeding heavily",
  "overdose",
  "self harm",
  "suicide",
  "suicidal",
  "call 999",
  "call 111",
  "call 911",
  "emergency",
];

export const MODEL_CONFIG = {
  FAST: "gpt-4o-mini",
  SMART: "gpt-4o",
  REASONING: "gpt-4o-mini",
};

export const SYSTEM_PROMPTS = {
  EMERGENCY: `I am not able to provide medical advice for this situation. Please call 999 immediately if this is a life-threatening emergency, or call NHS 111 for urgent medical advice.`,
};

export const TASK_DESCRIPTIONS: Record<SupportedTask, string> = {
  create_calendar_event: "Schedule an event, appointment, or activity on the calendar.",
  set_reminder: "Set a specific reminder for a time or date.",
  log_milestone: "Record a developmental milestone for a child.",
  track_behavior: "Log a behavioral observation or mood tracking entry.",
  add_follow_up: "Set a follow-up reminder to check on something later.",
  search_articles: "Search for parenting articles or resources.",
};
