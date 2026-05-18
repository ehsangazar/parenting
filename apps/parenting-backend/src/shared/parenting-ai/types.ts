export type SessionMemory = {
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  currentTopic?: string;
  pendingClarification?: string;
};

export type LongTermMemory = {
  childInfo: Array<{ name: string; age?: number; birthday?: Date }>;
  userPreferences: Record<string, unknown>;
  parentingStyle?: string;
  relevantFacts: string[];
};
