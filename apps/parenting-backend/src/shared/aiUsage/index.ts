import { prisma } from "../db/index.js";
import { POINTS } from "../../config/points.js";
import { spendCoins } from "../gamification/index.js";

// UTC date string (YYYY-MM-DD). We use UTC for the cap so the user can't
// reset by changing timezone. The UX wording shows "resets at midnight your
// time," which is a small white lie acceptable for the free tier; we'll
// switch to per-user timezone when memberships ship.
function utcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type Usage = {
  used: number;
  cap: number;
  topupRemaining: number;
  remaining: number;
  resetsAt: Date;
};

function endOfUtcDay(now: Date = new Date()): Date {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

export async function getAiUsage(userId: string): Promise<Usage> {
  const date = utcDateString();
  const row = await prisma.aiUsageDaily.findUnique({
    where: { userId_date: { userId, date } },
  });
  const used = row?.count ?? 0;
  const topupRemaining = row?.topupCount ?? 0;
  const cap = POINTS.AI_FREE_DAILY_MESSAGES;
  const remaining = Math.max(0, cap - used) + topupRemaining;

  return { used, cap, topupRemaining, remaining, resetsAt: endOfUtcDay() };
}

// Returns true if the user is allowed to send another AI message right now.
// Caller is responsible for invoking `incrementAiUsage` after a successful
// send (so failed sends don't burn quota).
export async function canSendAiMessage(userId: string): Promise<{
  allowed: boolean;
  usage: Usage;
}> {
  const usage = await getAiUsage(userId);
  return { allowed: usage.remaining > 0, usage };
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const date = utcDateString();
  // If the user has top-up credits, burn those before counting toward the cap.
  const existing = await prisma.aiUsageDaily.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing && existing.topupCount > 0) {
    await prisma.aiUsageDaily.update({
      where: { userId_date: { userId, date } },
      data: { topupCount: { decrement: 1 } },
    });
    return;
  }
  await prisma.aiUsageDaily.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });
}

// Spends coins for a top-up bundle that adds extra messages for today only.
// Top-ups never roll over; we want them to feel like an in-the-moment
// accelerator, not stockpiled fuel.
export async function buyAiTopup(userId: string): Promise<Usage> {
  await spendCoins(userId, POINTS.COST_AI_TOPUP_BUNDLE);
  const date = utcDateString();
  await prisma.aiUsageDaily.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      count: 0,
      topupCount: POINTS.AI_TOPUP_BUNDLE_MESSAGES,
    },
    update: { topupCount: { increment: POINTS.AI_TOPUP_BUNDLE_MESSAGES } },
  });
  return getAiUsage(userId);
}
