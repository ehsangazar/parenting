import { prisma } from "../../shared/db/index.js";
import type { LeaderboardMetric, LeaderboardPeriod } from "./gamification.schema.js";

// ── Profile ───────────────────────────────────────────────────────────────────

export async function findUserPoints(userId: string) {
  return prisma.userPoints.findUnique({ where: { userId } });
}

export async function findUserStreak(userId: string) {
  return prisma.userStreak.findUnique({ where: { userId } });
}

export async function upsertUserPoints(userId: string, leaderboardOptedIn: boolean) {
  return prisma.userPoints.upsert({
    where: { userId },
    create: { userId, leaderboardOptedIn },
    update: { leaderboardOptedIn },
  });
}

export async function incrementStreakFreezes(userId: string) {
  return prisma.userStreak.update({
    where: { userId },
    data: { freezesAvailable: { increment: 1 } },
  });
}

// ── Leaderboard participant resolution ────────────────────────────────────────

export async function findOptedInUserIds(): Promise<string[]> {
  const rows = await prisma.userPoints.findMany({
    where: { leaderboardOptedIn: true },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function findUserPointsOptIn(userId: string) {
  return prisma.userPoints.findUnique({
    where: { userId },
    select: { leaderboardOptedIn: true, totalXp: true },
  });
}

export async function findChildrenForUser(userId: string) {
  return prisma.child.findMany({
    where: { family: { members: { some: { userId } } } },
    select: { birthday: true, dueDate: true },
  });
}

export async function findChildrenInDateRange(rangeStart: Date, rangeEnd: Date) {
  return prisma.child.findMany({
    where: {
      OR: [
        { birthday: { gte: rangeStart, lte: rangeEnd } },
        { dueDate: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    include: {
      family: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });
}

export async function findFamilyMemberByUser(userId: string) {
  return prisma.familyMember.findFirst({
    where: { userId },
    select: { familyId: true },
  });
}

export async function findFamilyMembers(familyId: string) {
  return prisma.familyMember.findMany({
    where: { familyId },
    select: { userId: true },
  });
}

// ── Score computation ─────────────────────────────────────────────────────────

function getPeriodStart(period: LeaderboardPeriod): Date | null {
  if (period === "alltime") return null;
  const now = new Date();
  const ms = period === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - ms);
}

export function getPreviousPeriodRange(period: LeaderboardPeriod): { start: Date; end: Date } | null {
  if (period === "alltime") return null;
  const now = new Date();
  if (period === "week") {
    return {
      end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    };
  }
  return {
    end: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    start: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
  };
}

export async function computeScores(
  userIds: string[],
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
): Promise<Map<string, number>> {
  const scores = new Map<string, number>(userIds.map((id) => [id, 0]));
  const periodStart = getPeriodStart(period);

  if (metric === "xp") {
    if (period === "alltime") {
      const points = await prisma.userPoints.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, totalXp: true },
      });
      for (const p of points) scores.set(p.userId, p.totalXp);
    } else {
      const txns = await prisma.xpTransaction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, createdAt: { gte: periodStart! } },
        _sum: { amount: true },
      });
      for (const t of txns) scores.set(t.userId, t._sum.amount ?? 0);
    }
  } else if (metric === "streak") {
    const streaks = await prisma.userStreak.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, currentStreak: true },
    });
    for (const s of streaks) scores.set(s.userId, s.currentStreak);
  } else if (metric === "learning") {
    const filter =
      period === "alltime"
        ? { userId: { in: userIds } }
        : { userId: { in: userIds }, completedAt: { gte: periodStart! } };
    const counts = await prisma.learningProgress.groupBy({
      by: ["userId"],
      where: filter,
      _count: { id: true },
    });
    for (const c of counts) scores.set(c.userId, c._count.id);
  } else if (metric === "community") {
    const postFilter =
      period === "alltime"
        ? { authorId: { in: userIds } }
        : { authorId: { in: userIds }, createdAt: { gte: periodStart! } };
    const commentFilter = postFilter;

    const [postCounts, commentCounts] = await Promise.all([
      prisma.villagePost.groupBy({ by: ["authorId"], where: postFilter, _count: { id: true } }),
      prisma.villageComment.groupBy({ by: ["authorId"], where: commentFilter, _count: { id: true } }),
    ]);

    for (const p of postCounts) scores.set(p.authorId, (scores.get(p.authorId) ?? 0) + p._count.id);
    for (const c of commentCounts) scores.set(c.authorId, (scores.get(c.authorId) ?? 0) + c._count.id);
  }

  return scores;
}

export async function computePreviousScores(
  userIds: string[],
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
): Promise<Map<string, number> | null> {
  const prevRange = getPreviousPeriodRange(period);
  if (!prevRange || metric === "streak") return null;

  const scores = new Map<string, number>(userIds.map((id) => [id, 0]));

  if (metric === "xp") {
    const txns = await prisma.xpTransaction.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, createdAt: { gte: prevRange.start, lt: prevRange.end } },
      _sum: { amount: true },
    });
    for (const t of txns) scores.set(t.userId, t._sum.amount ?? 0);
  } else if (metric === "learning") {
    const counts = await prisma.learningProgress.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, completedAt: { gte: prevRange.start, lt: prevRange.end } },
      _count: { id: true },
    });
    for (const c of counts) scores.set(c.userId, c._count.id);
  } else if (metric === "community") {
    const [postCounts, commentCounts] = await Promise.all([
      prisma.villagePost.groupBy({
        by: ["authorId"],
        where: { authorId: { in: userIds }, createdAt: { gte: prevRange.start, lt: prevRange.end } },
        _count: { id: true },
      }),
      prisma.villageComment.groupBy({
        by: ["authorId"],
        where: { authorId: { in: userIds }, createdAt: { gte: prevRange.start, lt: prevRange.end } },
        _count: { id: true },
      }),
    ]);
    for (const p of postCounts) scores.set(p.authorId, (scores.get(p.authorId) ?? 0) + p._count.id);
    for (const c of commentCounts) scores.set(c.authorId, (scores.get(c.authorId) ?? 0) + c._count.id);
  }

  return scores;
}

export async function findUsersWithProfiles(userIds: string[]) {
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, profile: true },
  });
}
