import { prisma } from "../../shared/db/index.js";

export const upsertSubscription = (data: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) =>
  prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: data,
    update: {
      userId: data.userId,
      p256dh: data.p256dh,
      auth: data.auth,
      userAgent: data.userAgent,
      lastUsedAt: new Date(),
    },
  });

export const deleteSubscriptionByEndpoint = (endpoint: string) =>
  prisma.pushSubscription.deleteMany({ where: { endpoint } });

export const listSubscriptionsForUser = (userId: string) =>
  prisma.pushSubscription.findMany({ where: { userId } });

export const touchSubscription = (id: string) =>
  prisma.pushSubscription.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
