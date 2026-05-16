import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";

const userSelect = {
  id: true,
  email: true,
  role: true,
  profile: true,
  locale: true,
} satisfies Prisma.UserSelect;

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: userSelect });

export const findUserWithHashByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email },
    select: { ...userSelect, passwordHash: true, googleId: true },
  });

export const createUser = (data: {
  email: string;
  passwordHash?: string;
  googleId?: string;
  role?: string;
}) =>
  prisma.user.create({
    data: { role: "user", ...data },
    select: userSelect,
  });

export const updateUser = (
  id: string,
  data: { passwordHash?: string; profile?: Prisma.InputJsonValue; locale?: string },
) =>
  prisma.user.update({ where: { id }, data, select: userSelect });

export const deleteUser = (id: string) =>
  prisma.$transaction(async (tx) => {
    await tx.consent.deleteMany({ where: { userId: id } });
    await tx.auditLog.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

export const createConsent = (data: {
  userId: string;
  type: string;
  version: string;
  locale?: string;
}) => prisma.consent.create({ data });

export const createAuditLog = (data: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) =>
  prisma.auditLog.create({
    data: { ...data, metadata: (data.metadata ?? {}) as Prisma.InputJsonValue },
  });
