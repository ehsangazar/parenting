import { prisma } from "../db/index.js";
import { Prisma } from "@prisma/client";

export const trackEvent = async (params: {
  tenantId?: string;
  userId?: string;
  eventType: string;
  props?: Record<string, unknown>;
}) => {
  await prisma.analyticsEvent.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      eventType: params.eventType,
      props: (params.props ?? {}) as Prisma.InputJsonValue,
    },
  });
};
