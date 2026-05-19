import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { recordAudit } from "../../shared/audit/index.js";
import { awardCoins, awardInsight } from "../../shared/gamification/index.js";
import { sendFamilyInviteEmail } from "../../shared/mailer/index.js";
import { getDefaultModulesForAge } from "../../shared/childModules/index.js";
import {
  applyAdminFamilyModuleDefaults,
  getAdminModuleDefaults,
  getFamilyDefaultModules,
} from "../../shared/adminModuleDefaults/index.js";
import { POINTS } from "../../config/points.js";
import * as repo from "./family.repository.js";
import { generateVaccinationSuggestions } from "./vaccination-schedule.js";
import type { z } from "zod";
import type {
  createFamilySchema,
  updateFamilySchema,
  addMemberSchema,
  inviteMemberSchema,
  updateMemberSchema,
  addChildSchema,
  updateChildSchema,
  createEventSchema,
  updateEventSchema,
  RepeatRuleJson,
} from "./family.schema.js";

const INVITE_TOKEN_EXPIRY_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RepeatRuleInput = {
  type?: string;
  interval?: number;
  endDate?: string;
  count?: number;
  daysOfWeek?: number[];
} | undefined;

function buildRepeatRule(rule: RepeatRuleInput): RepeatRuleJson {
  if (!rule) return { type: "none", interval: 1 };
  const result: RepeatRuleJson = {
    type: rule.type ?? "none",
    interval: rule.interval ?? 1,
  };
  if (rule.endDate) result.endDate = rule.endDate;
  if (rule.count != null) result.count = rule.count;
  if (rule.daysOfWeek && Array.isArray(rule.daysOfWeek)) {
    result.daysOfWeek = rule.daysOfWeek;
  }
  return result;
}

async function enrichEventsWithMembers(
  events: Awaited<ReturnType<typeof repo.findCalendarEvents>>,
  familyId: string,
) {
  return Promise.all(
    events.map(async (event) => {
      let assignedMember = null;
      if (event.assignedTo) {
        const member = await repo.findFamilyMemberByUserInFamily(
          familyId,
          event.assignedTo,
        );
        assignedMember = member
          ? {
              id: member.id,
              userId: member.userId,
              name: member.name || member.user.email,
              email: member.user.email,
            }
          : null;
      }
      return { ...event, assignedMember };
    }),
  );
}

// ---------------------------------------------------------------------------
// Family CRUD
// ---------------------------------------------------------------------------

export const createFamily = async (
  userId: string,
  body: z.infer<typeof createFamilySchema>,
) => {
  const adminDefaults = await getAdminModuleDefaults();
  const defaultModules =
    adminDefaults?.familyModules ?? getFamilyDefaultModules();

  const family = await repo.createFamily({
    name: body.name,
    ownerId: userId,
    modules: defaultModules,
  });

  await recordAudit({
    userId,
    action: "create",
    resourceType: "family",
    resourceId: family.id,
  });

  return family;
};

export const listFamiliesForUser = async (userId: string) => {
  const families = await repo.findFamiliesForUser(userId);
  const adminDefaults = await getAdminModuleDefaults();

  return families.map((family) => ({
    ...family,
    modules: applyAdminFamilyModuleDefaults(
      family.modules as Record<string, boolean> | null,
      adminDefaults?.familyModules,
    ),
  }));
};

export const getFamilyById = async (id: string, userId: string) => {
  const family = await repo.findFamilyById(id, userId);
  if (!family) return null;

  const adminDefaults = await getAdminModuleDefaults();
  return {
    ...family,
    modules: applyAdminFamilyModuleDefaults(
      family.modules as Record<string, boolean> | null,
      adminDefaults?.familyModules,
    ),
  };
};

export const updateFamily = async (
  id: string,
  userId: string,
  body: z.infer<typeof updateFamilySchema>,
) => {
  const family = await repo.findFamilyByOwner(id, userId);
  if (!family) return null;

  const updateData: Prisma.FamilyUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.modules !== undefined) {
    updateData.modules = {
      welcome: Boolean(body.modules.welcome),
      children: Boolean(body.modules.children),
      insights: Boolean(body.modules.insights),
      calendar: Boolean(body.modules.calendar),
      moments: Boolean(body.modules.moments),
      village: Boolean(body.modules.village),
      ai: Boolean(body.modules.ai),
    };
  }

  const updated = await repo.updateFamily(id, updateData);

  await recordAudit({
    userId,
    action: "update",
    resourceType: "family",
    resourceId: id,
  });

  return updated;
};

export const deleteFamily = async (id: string, userId: string) => {
  const family = await repo.findFamilyByOwner(id, userId);
  if (!family) return false;

  await repo.deleteFamily(id);

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "family",
    resourceId: id,
  });

  return true;
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const addMember = async (
  familyId: string,
  userId: string,
  body: z.infer<typeof addMemberSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const targetUser = await repo.findUserByEmail(body.email);

  if (!targetUser) {
    // User doesn't exist - send invite instead
    const existing = await repo.findPendingFamilyInvite(familyId, body.email);
    if (existing) return { error: "already_invited" as const };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    const invite = await repo.createFamilyInvite({
      familyId,
      email: body.email,
      token,
      role: body.role ?? "member",
      invitedBy: userId,
      expiresAt,
    });

    try {
      await sendFamilyInviteEmail(body.email, token, family.name);
    } catch {
      // non-fatal - invite is still created
    }

    await recordAudit({
      userId,
      action: "invite_member",
      resourceType: "family",
      resourceId: familyId,
      metadata: { email: body.email, role: body.role ?? "member" },
    });

    try {
      await Promise.all([
        awardCoins(userId, POINTS.COINS_INVITE_MEMBER),
        awardInsight(userId, POINTS.INSIGHT_INVITE_MEMBER, "invite_member"),
      ]);
    } catch {
      // non-fatal
    }

    return { invite, invited: true as const };
  }

  const existingMember = await repo.findFamilyMemberByUser(
    familyId,
    targetUser.id,
  );
  if (existingMember) return { error: "already_member" as const };

  const member = await repo.createFamilyMember({
    familyId,
    userId: targetUser.id,
    name: body.name,
    role: body.role ?? "member",
    birthday: body.birthday ? new Date(body.birthday) : undefined,
  });

  await recordAudit({
    userId,
    action: "add_member",
    resourceType: "family",
    resourceId: familyId,
    metadata: { memberId: targetUser.id },
  });

  return { member };
};

export const inviteMember = async (
  familyId: string,
  userId: string,
  body: z.infer<typeof inviteMemberSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const existingUser = await repo.findUserByEmail(body.email);

  if (existingUser) {
    const existingMember = await repo.findFamilyMemberByUser(
      familyId,
      existingUser.id,
    );
    if (existingMember) return { error: "already_member" as const };
  }

  const existing = await repo.findPendingFamilyInvite(familyId, body.email);
  if (existing) return { error: "already_invited" as const };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

  const invite = await repo.createFamilyInvite({
    familyId,
    email: body.email,
    token,
    role: body.role ?? "member",
    invitedBy: userId,
    expiresAt,
  });

  try {
    await sendFamilyInviteEmail(body.email, token, family.name);
  } catch {
    // non-fatal
  }

  await recordAudit({
    userId,
    action: "invite_member",
    resourceType: "family",
    resourceId: familyId,
    metadata: { email: body.email },
  });

  return { invite };
};

export const listMembers = async (familyId: string, userId: string) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;
  return repo.findFamilyMembers(familyId);
};

export const updateMember = async (
  familyId: string,
  memberId: string,
  userId: string,
  body: z.infer<typeof updateMemberSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const member = await repo.findFamilyMember(memberId);
  if (!member || member.familyId !== familyId) {
    return { error: "member_not_found" as const };
  }

  if (member.userId !== userId && family.ownerId !== userId) {
    return { error: "forbidden" as const };
  }

  const updateData: Prisma.FamilyMemberUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name ?? null;
  if (body.birthday !== undefined) {
    updateData.birthday = body.birthday ? new Date(body.birthday) : null;
  }
  if (body.role !== undefined) {
    if (body.role !== member.role && family.ownerId !== userId) {
      return { error: "role_forbidden" as const };
    }
    updateData.role = body.role;
  }

  const updated = await repo.updateFamilyMember(memberId, updateData);

  await recordAudit({
    userId,
    action: "update_member",
    resourceType: "family",
    resourceId: familyId,
    metadata: { memberId },
  });

  return { member: updated };
};

export const removeMember = async (
  familyId: string,
  memberId: string,
  userId: string,
) => {
  const family = await repo.findFamilyByOwner(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const member = await repo.findFamilyMember(memberId);
  if (!member || member.familyId !== familyId) {
    return { error: "member_not_found" as const };
  }

  if (family.ownerId === member.userId) {
    return { error: "cannot_remove_owner" as const };
  }

  await repo.deleteFamilyMember(memberId);

  await recordAudit({
    userId,
    action: "remove_member",
    resourceType: "family",
    resourceId: familyId,
    metadata: { memberId },
  });

  return { ok: true };
};

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

export const addChild = async (
  familyId: string,
  userId: string,
  body: z.infer<typeof addChildSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;

  const adminDefaults = await getAdminModuleDefaults();
  const childModuleOverrides = adminDefaults?.childModulesByPeriod;

  const childData: Prisma.ChildUncheckedCreateInput = {
    familyId,
    name: body.name,
    isUnborn: body.isUnborn ?? false,
  };

  if (body.birthday) childData.birthday = new Date(body.birthday);
  if (body.dueDate) childData.dueDate = new Date(body.dueDate);
  if (body.pregnancyType) childData.pregnancyType = body.pregnancyType;

  if (body.modules !== undefined) {
    childData.modules = body.modules;
  } else if (!body.isUnborn && body.birthday) {
    const today = new Date();
    const birthDate = new Date(body.birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    childData.modules = getDefaultModulesForAge(age, false, childModuleOverrides);
  } else if (!body.isUnborn) {
    childData.modules = getDefaultModulesForAge(null, false, childModuleOverrides);
  } else {
    childData.modules = getDefaultModulesForAge(null, true, childModuleOverrides);
  }

  const child = await repo.createChild(childData);

  await recordAudit({
    userId,
    action: "add_child",
    resourceType: "family",
    resourceId: familyId,
    metadata: { childId: child.id },
  });

  if (body.birthday && !body.isUnborn) {
    try {
      const suggestions = generateVaccinationSuggestions(
        new Date(body.birthday),
      );
      if (suggestions.length > 0) {
        await repo.createCalendarEventsBulk(
          suggestions.map((s) => ({
            familyId,
            childId: child.id,
            title: s.title,
            description: s.description,
            eventType: "appointment",
            status: "suggested",
            startDate: s.startDate,
            allDay: true,
            createdBy: userId,
          })),
        );
      }
    } catch {
      // non-fatal: a failed seed should not block child creation
    }
  }

  try {
    await Promise.all([
      awardCoins(userId, POINTS.COINS_ADD_CHILD),
      awardInsight(userId, POINTS.INSIGHT_ADD_CHILD, "add_child"),
    ]);
  } catch {
    // non-fatal
  }

  return child;
};

export const listChildren = async (familyId: string, userId: string) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;
  return repo.findChildren(familyId);
};

export const updateChild = async (
  familyId: string,
  childId: string,
  userId: string,
  body: z.infer<typeof updateChildSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const child = await repo.findChild(childId);
  if (!child || child.familyId !== familyId) {
    return { error: "child_not_found" as const };
  }

  const updateData: Prisma.ChildUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.birthday !== undefined) {
    updateData.birthday = body.birthday ? new Date(body.birthday) : null;
  }
  if (body.isUnborn !== undefined) updateData.isUnborn = body.isUnborn;
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.pregnancyType !== undefined)
    updateData.pregnancyType = body.pregnancyType;
  if (body.modules !== undefined) updateData.modules = body.modules;

  const updated = await repo.updateChild(childId, updateData);

  await recordAudit({
    userId,
    action: "update_child",
    resourceType: "family",
    resourceId: familyId,
    metadata: { childId },
  });

  return { child: updated };
};

export const deleteChild = async (
  familyId: string,
  childId: string,
  userId: string,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const child = await repo.findChild(childId);
  if (!child || child.familyId !== familyId) {
    return { error: "child_not_found" as const };
  }

  await repo.deleteChild(childId);

  await recordAudit({
    userId,
    action: "delete_child",
    resourceType: "family",
    resourceId: familyId,
    metadata: { childId },
  });

  return { ok: true };
};

export const getChildProfile = async (
  familyId: string,
  childId: string,
  userId: string,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const child = await repo.findChild(childId);
  if (!child || child.familyId !== familyId) {
    return { error: "child_not_found" as const };
  }

  const childShape = {
    id: child.id,
    name: child.name,
    birthday: child.birthday,
    isUnborn: child.isUnborn,
    dueDate: child.dueDate,
    pregnancyType: child.pregnancyType,
    modules: child.modules || {},
  };

  if (child.isUnborn || (!child.birthday && child.dueDate)) {
    return { child: { ...childShape, isUnborn: true }, age: null, profile: "Unborn" };
  }

  if (!child.birthday) {
    return { child: childShape, age: null, profile: "Unknown" };
  }

  const today = new Date();
  const birthDate = new Date(child.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  const ageRanges = [
    { min: 0, max: 2, prefix: "Tiny" },
    { min: 3, max: 5, prefix: "Little" },
    { min: 6, max: 8, prefix: "Growing" },
    { min: 9, max: 12, prefix: "Young" },
    { min: 13, max: 17, prefix: "Teen" },
  ];
  const range =
    ageRanges.find((r) => age >= r.min && age <= r.max) ??
    ageRanges[ageRanges.length - 1];
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return { child: childShape, age, profile: `${range.prefix}-${randomSuffix}` };
};

// ---------------------------------------------------------------------------
// Invite accept
// ---------------------------------------------------------------------------

export const acceptInvite = async (token: string, userId: string) => {
  const invite = await repo.findFamilyInviteByToken(token);
  if (!invite) return { error: "not_found" as const };

  if (invite.status !== "pending") return { error: "already_used" as const };

  if (invite.expiresAt < new Date()) {
    await repo.updateFamilyInvite(invite.id, { status: "expired" });
    return { error: "expired" as const };
  }

  const user = await repo.findUserById(userId);
  if (!user || user.email !== invite.email) {
    return { error: "wrong_email" as const };
  }

  const existingMember = await repo.findFamilyMemberByUser(
    invite.familyId,
    userId,
  );
  if (existingMember) {
    await repo.updateFamilyInvite(invite.id, { status: "accepted" });
    return { error: "already_member" as const };
  }

  await repo.createFamilyMember({
    familyId: invite.familyId,
    userId,
    role: invite.role ?? "member",
  });

  await repo.updateFamilyInvite(invite.id, { status: "accepted" });

  await recordAudit({
    userId,
    action: "accept_invite",
    resourceType: "family",
    resourceId: invite.familyId,
    metadata: { inviteId: invite.id },
  });

  return { ok: true, family: invite.family };
};

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------

export const listCalendarEvents = async (familyId: string, userId: string) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;

  const events = await repo.findCalendarEvents(familyId);
  return enrichEventsWithMembers(events, familyId);
};

export const getCalendarEventForExport = async (
  familyId: string,
  eventId: string,
  userId: string,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;

  const event = await repo.findCalendarEventWithChild(eventId);
  if (!event || event.familyId !== familyId) return null;
  return event;
};

export const listUpcomingEvents = async (familyId: string, userId: string) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return null;

  const events = await repo.findUpcomingEvents(familyId);
  return enrichEventsWithMembers(events, familyId);
};

export const createCalendarEvent = async (
  familyId: string,
  userId: string,
  body: z.infer<typeof createEventSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  if (!family.children || family.children.length === 0) {
    return { error: "no_children" as const };
  }

  const child = family.children.find((c) => c.id === body.childId);
  if (!child) return { error: "child_not_in_family" as const };

  if (body.assignedTo) {
    const member = await repo.findFamilyMemberByUserInFamily(
      familyId,
      body.assignedTo,
    );
    if (!member) return { error: "assignee_not_found" as const };
  }

  const repeatRule = buildRepeatRule(body.repeatRule);

  const event = await repo.createCalendarEvent({
    familyId,
    childId: body.childId,
    title: body.title,
    description: body.description,
    eventType: body.eventType,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    allDay: body.allDay ?? false,
    location: body.location,
    assignedTo: body.assignedTo ?? userId,
    createdBy: userId,
    repeatRule,
  });

  await recordAudit({
    userId,
    action: "create_calendar_event",
    resourceType: "calendar_event",
    resourceId: event.id,
    metadata: { familyId, childId: body.childId },
  });

  return { event };
};

export const updateCalendarEvent = async (
  familyId: string,
  eventId: string,
  userId: string,
  body: z.infer<typeof updateEventSchema>,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const event = await repo.findCalendarEvent(eventId);
  if (!event || event.familyId !== familyId) {
    return { error: "event_not_found" as const };
  }

  if (body.childId) {
    const child = await repo.findChild(body.childId);
    if (!child || child.familyId !== familyId) {
      return { error: "child_not_in_family" as const };
    }
  }

  if (body.assignedTo) {
    const member = await repo.findFamilyMemberByUserInFamily(
      familyId,
      body.assignedTo,
    );
    if (!member) return { error: "assignee_not_found" as const };
  }

  const updateData: Prisma.CalendarEventUpdateInput = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.eventType !== undefined) updateData.eventType = body.eventType;
  if (body.startDate !== undefined)
    updateData.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.allDay !== undefined) updateData.allDay = body.allDay;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.childId !== undefined) {
    updateData.child = { connect: { id: body.childId } };
  }
  if (body.repeatRule !== undefined) {
    updateData.repeatRule = buildRepeatRule(
      body.repeatRule,
    ) as Prisma.InputJsonValue;
  }

  const updated = await repo.updateCalendarEvent(eventId, updateData);

  await recordAudit({
    userId,
    action: "update_calendar_event",
    resourceType: "calendar_event",
    resourceId: eventId,
    metadata: { familyId },
  });

  return { event: updated };
};

export const deleteCalendarEvent = async (
  familyId: string,
  eventId: string,
  userId: string,
) => {
  const family = await repo.findFamilyById(familyId, userId);
  if (!family) return { error: "not_found" as const };

  const event = await repo.findCalendarEvent(eventId);
  if (!event || event.familyId !== familyId) {
    return { error: "event_not_found" as const };
  }

  await repo.deleteCalendarEvent(eventId);

  await recordAudit({
    userId,
    action: "delete_calendar_event",
    resourceType: "calendar_event",
    resourceId: eventId,
    metadata: { familyId },
  });

  return { ok: true };
};
