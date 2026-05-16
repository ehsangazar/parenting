import { prisma } from "../../shared/db/index.js";

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, tenantId: true },
  });
}

export async function findSubscriptionByUserId(userId: string) {
  return prisma.subscription.findFirst({
    where: { tenant: { users: { some: { id: userId } } } },
  });
}
