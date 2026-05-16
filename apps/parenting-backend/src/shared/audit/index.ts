import { prisma } from "../db/index.js";
import { Prisma } from "@prisma/client";

export const recordAudit = async (params: {
  userId?: string;
  tenantId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) => {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
};
