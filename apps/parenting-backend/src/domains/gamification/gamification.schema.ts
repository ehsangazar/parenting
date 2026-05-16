import { z } from "zod";

// ── Gamification profile ──────────────────────────────────────────────────────

// No request body needed for GET /gamification/profile

// ── Streak freeze ─────────────────────────────────────────────────────────────

// No request body for POST /gamification/streak-freeze

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const leaderboardQuerySchema = z.object({
  scope: z.enum(["community", "village", "family"]).default("community"),
  metric: z.enum(["xp", "streak", "learning", "community"]).default("xp"),
  period: z.enum(["week", "month", "alltime"]).default("week"),
  familyId: z.string().optional(),
});

export const optInBodySchema = z.object({
  optIn: z.boolean(),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type OptInBody = z.infer<typeof optInBodySchema>;

// ── Shared types ──────────────────────────────────────────────────────────────

export type LeaderboardScope = "community" | "village" | "family";
export type LeaderboardMetric = "xp" | "streak" | "learning" | "community";
export type LeaderboardPeriod = "week" | "month" | "alltime";
export type LeaderboardChange = "up" | "down" | "same" | "new";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  scoreLabel: string;
  change: LeaderboardChange;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null | undefined;
  totalParticipants: number;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  updatedAt: string;
  userOptedIn: boolean;
}
