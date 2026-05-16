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

export async function awardCoins(userId: string, amount: number): Promise<void> {
  await prisma.userPoints.update({
    where: { userId },
    data: { gemsBalance: { increment: amount }, gemsEarned: { increment: amount } },
  });
}

export async function spendCoins(userId: string, amount: number): Promise<void> {
  const points = await prisma.userPoints.findUnique({ where: { userId } });
  if (!points || points.gemsBalance < amount) throw new Error("Insufficient coins");
  await prisma.userPoints.update({
    where: { userId },
    data: { gemsBalance: { decrement: amount } },
  });
}

export const awardGems = awardCoins;
export const spendGems = spendCoins;

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
  let streakBroken = false;

  if (!lastActive) {
    newStreak = 1;
  } else {
    const dayDiff = differenceInDays(today, lastActive);
    if (dayDiff === 1) {
      newStreak += 1;
    } else if (dayDiff > 1) {
      if (profile.streak.freezesAvailable > 0) {
        await prisma.userStreak.update({ where: { userId }, data: { freezesAvailable: { decrement: 1 } } });
      } else {
        newStreak = 1;
        streakBroken = true;
      }
    }
  }

  if (newStreak > longestStreak) longestStreak = newStreak;

  if (isNewDay) {
    coinsToAdd += POINTS.COINS_DAILY_LOGIN;
    if (!streakBroken) {
      if (newStreak === 7) coinsToAdd += POINTS.COINS_STREAK_MILESTONE_7;
      else if (newStreak === 14) coinsToAdd += POINTS.COINS_STREAK_MILESTONE_14;
      else if (newStreak === 30) coinsToAdd += POINTS.COINS_STREAK_MILESTONE_30;
      else if (newStreak === 60) coinsToAdd += POINTS.COINS_STREAK_MILESTONE_60;
      else if (newStreak === 100) coinsToAdd += POINTS.COINS_STREAK_MILESTONE_100;
    }
  }

  const updates: Promise<unknown>[] = [
    prisma.userStreak.update({ where: { userId }, data: { currentStreak: newStreak, longestStreak, lastActiveDate: now } }),
  ];
  if (isNewDay) {
    updates.push(prisma.userPoints.update({
      where: { userId },
      data: { gemsBalance: { increment: coinsToAdd }, gemsEarned: { increment: coinsToAdd }, lastAwardedAt: now },
    }));
  }
  await Promise.all(updates);

  const finalPoints = await prisma.userPoints.findUnique({ where: { userId } });
  const coinsBalance = finalPoints?.gemsBalance ?? 0;

  return {
    streak: newStreak,
    longestStreak,
    coinsBalance,
    totalXp: coinsBalance,
    dailyXp: isNewDay ? coinsToAdd : 0,
    gemsBalance: coinsBalance,
    hearts: 5,
    msUntilNextHeart: null,
    newlyUnlockedAchievements: [] as never[],
  };
}
