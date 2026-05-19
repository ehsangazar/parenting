export const POINTS = {
  COINS_DAILY_LOGIN: 10_000,
  COINS_COMPLETE_LESSON: 50_000,
  COINS_VILLAGE_POST: 20_000,
  COINS_VILLAGE_COMMENT: 5_000,
  COINS_ADD_CHILD: 100_000,
  COINS_INVITE_MEMBER: 50_000,
  COINS_CAPTURE_MOMENT: 15_000,
  COINS_AI_CHAT: 2_500,
  COINS_STREAK_MILESTONE_7: 75_000,
  COINS_STREAK_MILESTONE_14: 100_000,
  COINS_STREAK_MILESTONE_30: 250_000,
  COINS_STREAK_MILESTONE_60: 500_000,
  COINS_STREAK_MILESTONE_100: 1_000_000,
  COST_UNLOCK_MODULE: 50_000,
  COST_STREAK_FREEZE: 100_000,

  // Insight (motivation currency) — earned only, never spent.
  // Scaled in tens/hundreds so "Level N" math stays legible to the user.
  INSIGHT_DAILY_LOGIN: 5,
  INSIGHT_COMPLETE_LESSON: 25,
  INSIGHT_VILLAGE_POST: 10,
  INSIGHT_VILLAGE_COMMENT: 3,
  INSIGHT_CAPTURE_MOMENT: 8,
  INSIGHT_AI_CHAT: 2,
  INSIGHT_INVITE_MEMBER: 10,
  INSIGHT_ADD_CHILD: 20,
  INSIGHT_PLAYBOOK_FIRST_TRY: 15,
  INSIGHT_PLAYBOOK_GROUP_COMPLETE: 50,
  INSIGHT_STREAK_MILESTONE_7: 40,
  INSIGHT_STREAK_MILESTONE_14: 60,
  INSIGHT_STREAK_MILESTONE_30: 150,
  INSIGHT_STREAK_MILESTONE_60: 300,
  INSIGHT_STREAK_MILESTONE_100: 600,

  // Free-tier daily AI cap. Generous enough that real parents rarely hit it,
  // but bounded so we have a coin top-up surface to introduce later.
  AI_FREE_DAILY_MESSAGES: 20,
  // Coin cost for buying a single AI top-up bundle (extra 10 messages).
  COST_AI_TOPUP_BUNDLE: 5_000,
  AI_TOPUP_BUNDLE_MESSAGES: 10,
} as const;

export type PointAction = keyof typeof POINTS;

// Each level requires this many additional Insight points to reach from the
// previous one. Linear keeps the math obvious; we can move to a curve later.
export const INSIGHT_PER_LEVEL = 100;

export function insightLevelFor(totalInsight: number): {
  level: number;
  currentLevelStart: number;
  nextLevelAt: number;
  progress: number;
} {
  const level = Math.max(1, Math.floor(totalInsight / INSIGHT_PER_LEVEL) + 1);
  const currentLevelStart = (level - 1) * INSIGHT_PER_LEVEL;
  const nextLevelAt = level * INSIGHT_PER_LEVEL;
  const progress = (totalInsight - currentLevelStart) / INSIGHT_PER_LEVEL;
  return { level, currentLevelStart, nextLevelAt, progress };
}
