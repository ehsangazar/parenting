import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";
import type { RepeatRuleJson } from "./family.schema.js";

// ---------------------------------------------------------------------------
// Selects
// ---------------------------------------------------------------------------

const userSelect = {
  id: true,
  email: true,
} satisfies Prisma.UserSelect;

const memberWithUserInclude = {
  user: { select: userSelect },
} satisfies Prisma.FamilyMemberInclude;

const familyFullInclude = {
  owner: { select: userSelect },
  members: { include: memberWithUserInclude },
  children: true,
} satisfies Prisma.FamilyInclude;

// ---------------------------------------------------------------------------
// Family
// ---------------------------------------------------------------------------

export const findFamilyById = (id: string, userId: string) =>
  prisma.family.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: familyFullInclude,
  });

export const findFamilyByOwner = (id: string, ownerId: string) =>
  prisma.family.findFirst({
    where: { id, ownerId },
  });

export const findFamiliesForUser = (userId: string) =>
  prisma.family.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: userSelect },
      members: { include: memberWithUserInclude },
      children: true,
      _count: { select: { members: true, children: true } },
    },
    orderBy: { createdAt: "asc" },
  });

export const createFamily = (data: {
  name: string;
  ownerId: string;
  modules: Record<string, boolean>;
}) =>
  prisma.family.create({
    data: {
      name: data.name,
      ownerId: data.ownerId,
      modules: data.modules,
      members: {
        create: { userId: data.ownerId, role: "member" },
      },
    },
    include: familyFullInclude,
  });

export const updateFamily = (id: string, data: Prisma.FamilyUpdateInput) =>
  prisma.family.update({
    where: { id },
    data,
    include: familyFullInclude,
  });

export const deleteFamily = (id: string) =>
  prisma.family.delete({ where: { id } });

// ---------------------------------------------------------------------------
// Family members
// ---------------------------------------------------------------------------

export const findFamilyMember = (memberId: string) =>
  prisma.familyMember.findUnique({ where: { id: memberId } });

export const findFamilyMemberByUser = (familyId: string, userId: string) =>
  prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
  });

export const findFamilyMembers = (familyId: string) =>
  prisma.familyMember.findMany({
    where: { familyId },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  });

export const createFamilyMember = (data: {
  familyId: string;
  userId: string;
  name?: string;
  role?: string;
  birthday?: Date;
}) =>
  prisma.familyMember.create({
    data: {
      familyId: data.familyId,
      userId: data.userId,
      name: data.name,
      role: data.role ?? "member",
      birthday: data.birthday,
    },
    include: { user: { select: userSelect } },
  });

export const updateFamilyMember = (
  memberId: string,
  data: Prisma.FamilyMemberUpdateInput,
) =>
  prisma.familyMember.update({
    where: { id: memberId },
    data,
    include: { user: { select: userSelect } },
  });

export const deleteFamilyMember = (memberId: string) =>
  prisma.familyMember.delete({ where: { id: memberId } });

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

export const findChild = (childId: string) =>
  prisma.child.findUnique({ where: { id: childId } });

export const findChildren = (familyId: string) =>
  prisma.child.findMany({
    where: { familyId },
    orderBy: { createdAt: "asc" },
  });

export const createChild = (data: Prisma.ChildUncheckedCreateInput) =>
  prisma.child.create({ data });

export const updateChild = (childId: string, data: Prisma.ChildUpdateInput) =>
  prisma.child.update({ where: { id: childId }, data });

export const deleteChild = (childId: string) =>
  prisma.child.delete({ where: { id: childId } });

// ---------------------------------------------------------------------------
// Family invites
// ---------------------------------------------------------------------------

export const findFamilyInviteByToken = (token: string) =>
  prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true },
  });

export const findPendingFamilyInvite = (familyId: string, email: string) =>
  prisma.familyInvite.findFirst({
    where: {
      familyId,
      email,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });

export const createFamilyInvite = (data: {
  familyId: string;
  email: string;
  token: string;
  role: string;
  invitedBy: string;
  expiresAt: Date;
}) => prisma.familyInvite.create({ data });

export const updateFamilyInvite = (
  id: string,
  data: Prisma.FamilyInviteUpdateInput,
) => prisma.familyInvite.update({ where: { id }, data });

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------

const eventWithChildInclude = {
  child: { select: { id: true, name: true } },
} satisfies Prisma.CalendarEventInclude;

export const findCalendarEvents = (familyId: string) =>
  prisma.calendarEvent.findMany({
    where: { familyId },
    include: eventWithChildInclude,
    orderBy: { startDate: "asc" },
  });

export const findUpcomingEvents = (familyId: string, limit = 10) =>
  prisma.calendarEvent.findMany({
    where: { familyId, startDate: { gte: new Date() } },
    include: eventWithChildInclude,
    orderBy: { startDate: "asc" },
    take: limit,
  });

export const findCalendarEvent = (eventId: string) =>
  prisma.calendarEvent.findUnique({ where: { id: eventId } });

export const findCalendarEventWithChild = (eventId: string) =>
  prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: eventWithChildInclude,
  });

export const createCalendarEvent = (data: {
  familyId: string;
  childId: string;
  title: string;
  description?: string;
  eventType: string;
  startDate: Date;
  endDate?: Date | null;
  allDay: boolean;
  location?: string;
  assignedTo?: string;
  createdBy: string;
  repeatRule: RepeatRuleJson;
}) =>
  prisma.calendarEvent.create({
    data: {
      ...data,
      repeatRule: data.repeatRule as Prisma.InputJsonValue,
    },
    include: eventWithChildInclude,
  });

export const updateCalendarEvent = (
  eventId: string,
  data: Prisma.CalendarEventUpdateInput,
) =>
  prisma.calendarEvent.update({
    where: { id: eventId },
    data,
    include: eventWithChildInclude,
  });

export const deleteCalendarEvent = (eventId: string) =>
  prisma.calendarEvent.delete({ where: { id: eventId } });

export const findFamilyMemberByUserInFamily = (
  familyId: string,
  userId: string,
) =>
  prisma.familyMember.findFirst({
    where: { familyId, userId },
    include: { user: { select: { id: true, email: true } } },
  });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
