import { prisma } from "../db/index.js";
import { startOfDay, differenceInDays } from "date-fns";
import { POINTS } from "../../config/points.js";

export async function ensureGamificationProfile(userId: string) {
  const [points, streak] = await Promise.all([
    prisma.userPoints.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.userStreak.upsert({ where: { userId }, update: {}, create: { userId } }),
  ]);
  return { points, streak };
}

// ── Coins (spend currency) ────────────────────────────────────────────────────

export async function awardCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await prisma.userPoints.update({
    where: { userId },
    data: { gemsBalance: { increment: amount }, gemsEarned: { increment: amount } },
  });
}

export async function spendCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const points = await prisma.userPoints.findUnique({ where: { userId } });
  if (!points || points.gemsBalance < amount) throw new Error("Insufficient coins");
  await prisma.userPoints.update({
    where: { userId },
    data: { gemsBalance: { decrement: amount } },
  });
}

export const awardGems = awardCoins;
export const spendGems = spendCoins;

// ── Insight (motivation currency, earned only) ────────────────────────────────

export async function awardInsight(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  if (amount <= 0) return;
  await prisma.$transaction([
    prisma.userPoints.update({
      where: { userId },
      data: { totalXp: { increment: amount }, currentDailyXp: { increment: amount } },
    }),
    prisma.xpTransaction.create({
      data: { userId, amount, reason },
    }),
  ]);
}

// Awards both currencies for a single event. Use this at award sites that
// previously just called awardCoins; it keeps the two ledgers in lockstep
// while still allowing them to diverge for streak multipliers etc.
export async function awardForAction(
  userId: string,
  opts: { coins?: number; insight?: number; reason: string },
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (opts.coins && opts.coins > 0) tasks.push(awardCoins(userId, opts.coins));
  if (opts.insight && opts.insight > 0) {
    tasks.push(awardInsight(userId, opts.insight, opts.reason));
  }
  await Promise.all(tasks);
}

// ── Daily activity & streak ───────────────────────────────────────────────────

// Forgiving streak: if a user would lose their streak and they have no
// freezes available, we auto-grant one and burn it on the spot — once per
// calendar month, tracked via the `lastAwardedAt` field's month component.
// This matches the parenting-app guideline that a bad week shouldn't punish.
function shouldAutoGrantFreeze(lastFreezeGrantAt: Date | null, now: Date): boolean {
  if (!lastFreezeGrantAt) return true;
  return (
    lastFreezeGrantAt.getFullYear() !== now.getFullYear() ||
    lastFreezeGrantAt.getMonth() !== now.getMonth()
  );
}

export async function updateDailyActivity(userId: string) {
  const profile = await ensureGamificationProfile(userId);
  const now = new Date();
  const today = startOfDay(now);
  const lastActive = profile.streak.lastActiveDate ? startOfDay(profile.streak.lastActiveDate) : null;
  const lastAwardedDay = profile.points.lastAwardedAt ? startOfDay(profile.points.lastAwardedAt) : null;
  const isNewDay = !lastAwardedDay || differenceInDays(today, lastAwardedDay) >= 1;

  let newStreak = profile.streak.currentStreak;
  let longestStreak = profile.streak.longestStreak;
  let coinsToAdd = 0;
  let insightToAdd = 0;
  let streakBroken = false;
  let usedAutoFreeze = false;

  if (!lastActive) {
    newStreak = 1;
  } else {
    const dayDiff = differenceInDays(today, lastActive);
    if (dayDiff === 1) {
      newStreak += 1;
    } else if (dayDiff > 1) {
      if (profile.streak.freezesAvailable > 0) {
        await prisma.userStreak.update({
          where: { userId },
          data: { freezesAvailable: { decrement: 1 } },
        });
      } else if (shouldAutoGrantFreeze(profile.streak.lastAutoFreezeAt, now)) {
        // Auto-grant + burn a freeze. Recorded so we only do it once per month.
        await prisma.userStreak.update({
          where: { userId },
          data: { lastAutoFreezeAt: now },
        });
        usedAutoFreeze = true;
      } else {
        newStreak = 1;
        streakBroken = true;
      }
    }
  }

  if (newStreak > longestStreak) longestStreak = newStreak;

  if (isNewDay) {
    coinsToAdd += POINTS.COINS_DAILY_LOGIN;
    insightToAdd += POINTS.INSIGHT_DAILY_LOGIN;
    if (!streakBroken) {
      if (newStreak === 7) {
        coinsToAdd += POINTS.COINS_STREAK_MILESTONE_7;
        insightToAdd += POINTS.INSIGHT_STREAK_MILESTONE_7;
      } else if (newStreak === 14) {
        coinsToAdd += POINTS.COINS_STREAK_MILESTONE_14;
        insightToAdd += POINTS.INSIGHT_STREAK_MILESTONE_14;
      } else if (newStreak === 30) {
        coinsToAdd += POINTS.COINS_STREAK_MILESTONE_30;
        insightToAdd += POINTS.INSIGHT_STREAK_MILESTONE_30;
      } else if (newStreak === 60) {
        coinsToAdd += POINTS.COINS_STREAK_MILESTONE_60;
        insightToAdd += POINTS.INSIGHT_STREAK_MILESTONE_60;
      } else if (newStreak === 100) {
        coinsToAdd += POINTS.COINS_STREAK_MILESTONE_100;
        insightToAdd += POINTS.INSIGHT_STREAK_MILESTONE_100;
      }
    }
  }

  const updates: Promise<unknown>[] = [
    prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: newStreak, longestStreak, lastActiveDate: now },
    }),
  ];
  if (isNewDay) {
    updates.push(
      prisma.userPoints.update({
        where: { userId },
        data: {
          gemsBalance: { increment: coinsToAdd },
          gemsEarned: { increment: coinsToAdd },
          totalXp: { increment: insightToAdd },
          currentDailyXp: insightToAdd,
          lastAwardedAt: now,
        },
      }),
    );
    if (insightToAdd > 0) {
      updates.push(
        prisma.xpTransaction.create({
          data: { userId, amount: insightToAdd, reason: "daily_login" },
        }),
      );
    }
  }
  await Promise.all(updates);

  const finalPoints = await prisma.userPoints.findUnique({ where: { userId } });
  const coinsBalance = finalPoints?.gemsBalance ?? 0;
  const totalInsight = finalPoints?.totalXp ?? 0;

  return {
    streak: newStreak,
    longestStreak,
    coinsBalance,
    totalInsight,
    dailyInsight: isNewDay ? insightToAdd : 0,
    // Legacy field names kept for callers/UI not yet migrated.
    totalXp: totalInsight,
    dailyXp: isNewDay ? insightToAdd : 0,
    gemsBalance: coinsBalance,
    hearts: 5,
    msUntilNextHeart: null,
    usedAutoFreeze,
    newlyUnlockedAchievements: [] as never[],
  };
}
