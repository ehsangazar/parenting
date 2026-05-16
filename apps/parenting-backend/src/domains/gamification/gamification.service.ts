import { spendCoins } from "../../shared/gamification/index.js";
import { getSignedViewUrl } from "../../shared/storage/index.js";
import { POINTS } from "../../config/points.js";
import * as repo from "./gamification.repository.js";
import type {
  LeaderboardScope,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardChange,
  LeaderboardEntry,
  LeaderboardResponse,
} from "./gamification.schema.js";

// ── Gamification profile ──────────────────────────────────────────────────────

export async function getGamificationProfile(userId: string) {
  const [points, streak] = await Promise.all([
    repo.findUserPoints(userId),
    repo.findUserStreak(userId),
  ]);

  return {
    coins: {
      balance: points?.gemsBalance ?? 0,
      earned: points?.gemsEarned ?? 0,
    },
    streak: {
      current: streak?.currentStreak ?? 0,
      longest: streak?.longestStreak ?? 0,
      lastActiveDate: streak?.lastActiveDate ?? null,
      freezesAvailable: streak?.freezesAvailable ?? 0,
    },
  };
}

export async function buyStreakFreeze(userId: string): Promise<{ freezesAvailable: number }> {
  const streak = await repo.findUserStreak(userId);
  if (streak && streak.freezesAvailable > 0) {
    throw new Error("You already have a streak freeze available");
  }

  await spendCoins(userId, POINTS.COST_STREAK_FREEZE);
  await repo.incrementStreakFreezes(userId);

  return { freezesAvailable: (streak?.freezesAvailable ?? 0) + 1 };
}

// ── Leaderboard helpers ───────────────────────────────────────────────────────

function rankFromScores(scores: Map<string, number>): Map<string, number> {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i][1] < sorted[i - 1][1]) rank = i + 1;
    ranks.set(sorted[i][0], rank);
  }
  return ranks;
}

function deriveChange(
  userId: string,
  currentRank: number,
  prevRanks: Map<string, number> | null,
  prevScores: Map<string, number> | null,
  currentScores: Map<string, number>,
): LeaderboardChange {
  if (!prevRanks || !prevScores) return "same";
  const prevScore = prevScores.get(userId) ?? 0;
  if (prevScore === 0 && (currentScores.get(userId) ?? 0) > 0) return "new";
  const prevRank = prevRanks.get(userId);
  if (prevRank === undefined) return "new";
  if (currentRank < prevRank) return "up";
  if (currentRank > prevRank) return "down";
  return "same";
}

function scoreLabel(metric: LeaderboardMetric, score: number): string {
  switch (metric) {
    case "xp": return `${score} XP`;
    case "streak": return `${score} day${score !== 1 ? "s" : ""}`;
    case "learning": return `${score} lesson${score !== 1 ? "s" : ""}`;
    case "community": return `${score} contribution${score !== 1 ? "s" : ""}`;
  }
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "Parent";
  return fullName.trim().split(/\s+/)[0];
}

async function resolveAvatar(avatarUrl: string | null): Promise<string | undefined> {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  try {
    return await getSignedViewUrl(avatarUrl);
  } catch {
    return avatarUrl;
  }
}

// ── Participant resolution ────────────────────────────────────────────────────

async function resolveParticipants(
  userId: string,
  scope: LeaderboardScope,
  familyId?: string,
): Promise<{ participantIds: string[]; resolvedFamilyId?: string }> {
  if (scope === "community") {
    const ids = await repo.findOptedInUserIds();
    if (!ids.includes(userId)) ids.push(userId);
    return { participantIds: ids };
  }

  if (scope === "village") {
    const children = await repo.findChildrenForUser(userId);
    const refDate = children.length > 0
      ? children.reduce((latest, c) => {
          const d = c.birthday ?? c.dueDate;
          if (!d) return latest;
          return !latest || d > latest ? d : latest;
        }, null as Date | null)
      : null;

    if (!refDate) return { participantIds: [userId] };

    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const rangeStart = new Date(refDate.getTime() - sixMonthsMs);
    const rangeEnd = new Date(refDate.getTime() + sixMonthsMs);

    const villageChildren = await repo.findChildrenInDateRange(rangeStart, rangeEnd);
    const villageUserIds = new Set<string>([userId]);
    for (const child of villageChildren) {
      for (const member of child.family.members) {
        villageUserIds.add(member.userId);
      }
    }
    return { participantIds: [...villageUserIds] };
  }

  // scope === "family"
  let resolvedFamilyId = familyId;
  if (!resolvedFamilyId) {
    const membership = await repo.findFamilyMemberByUser(userId);
    resolvedFamilyId = membership?.familyId ?? undefined;
  }

  if (!resolvedFamilyId) return { participantIds: [userId] };

  const members = await repo.findFamilyMembers(resolvedFamilyId);
  return { participantIds: members.map((m) => m.userId), resolvedFamilyId };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(opts: {
  userId: string;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  familyId?: string;
}): Promise<LeaderboardResponse> {
  const { userId, scope, period, familyId } = opts;

  // community metric not supported for alltime — fall back to xp
  const metric: LeaderboardMetric =
    opts.metric === "community" && period === "alltime" ? "xp" : opts.metric;

  const userPointsRow = await repo.findUserPointsOptIn(userId);
  const userOptedIn = userPointsRow?.leaderboardOptedIn ?? true;

  const { participantIds } = await resolveParticipants(userId, scope, familyId);

  const users = await repo.findUsersWithProfiles(participantIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const currentScores = await repo.computeScores(participantIds, metric, period);
  const prevScores = await repo.computePreviousScores(participantIds, metric, period);
  const prevRanks = prevScores ? rankFromScores(prevScores) : null;

  const sorted = [...currentScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0 || participantIds.includes(userId));

  const entries: LeaderboardEntry[] = [];
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const [uid, score] = sorted[i];
    if (i > 0 && score < sorted[i - 1][1]) rank = i + 1;

    const user = userMap.get(uid);
    const profile = (user?.profile ?? {}) as Record<string, unknown>;
    const fullName = typeof profile.name === "string" ? profile.name : null;
    const rawAvatar = typeof profile.avatarUrl === "string" ? profile.avatarUrl : null;

    const displayName = scope === "community" ? getFirstName(fullName) : (fullName ?? "Parent");
    const avatarUrl = await resolveAvatar(rawAvatar);
    const change = deriveChange(uid, rank, prevRanks, prevScores, currentScores);

    entries.push({ rank, userId: uid, displayName, avatarUrl, score, scoreLabel: scoreLabel(metric, score), change, isCurrentUser: uid === userId });
  }

  let currentUserEntry = entries.find((e) => e.isCurrentUser);
  if (!currentUserEntry) {
    const user = userMap.get(userId);
    const profile = (user?.profile ?? {}) as Record<string, unknown>;
    const fullName = typeof profile.name === "string" ? profile.name : null;
    const rawAvatar = typeof profile.avatarUrl === "string" ? profile.avatarUrl : null;
    const displayName = scope === "community" ? getFirstName(fullName) : (fullName ?? "Parent");
    const avatarUrl = await resolveAvatar(rawAvatar);
    currentUserEntry = {
      rank: entries.length + 1,
      userId,
      displayName,
      avatarUrl,
      score: 0,
      scoreLabel: scoreLabel(metric, 0),
      change: "new",
      isCurrentUser: true,
    };
  }

  return {
    entries: entries.slice(0, 50),
    currentUser: currentUserEntry,
    totalParticipants: participantIds.length,
    scope,
    metric,
    period,
    updatedAt: new Date().toISOString(),
    userOptedIn,
  };
}

export async function getLeaderboardMe(opts: {
  userId: string;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  familyId?: string;
}): Promise<LeaderboardEntry | null> {
  const board = await getLeaderboard(opts);
  return board.currentUser ?? null;
}

export async function setLeaderboardOptIn(userId: string, optIn: boolean) {
  await repo.upsertUserPoints(userId, optIn);
  return { success: true, optedIn: optIn };
}
