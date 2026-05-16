import { prisma } from "../../shared/db/index.js";

// ── Courses ───────────────────────────────────────────────────────────────────

export async function findAllCourses(locale: string, needsTranslation: boolean) {
  return prisma.learningCourse.findMany({
    orderBy: { order: "asc" },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { modules: true } },
          ...(needsTranslation ? { translations: { where: { locale } } } : {}),
        },
      },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export async function findCourseModules(
  courseId: string,
  userId: string,
  locale: string,
  needsTranslation: boolean,
) {
  return prisma.learningPhase.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
          lessons: {
            select: { progress: { where: { userId } } },
          },
          ...(needsTranslation ? { translations: { where: { locale } } } : {}),
        },
      },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

// ── Modules ───────────────────────────────────────────────────────────────────

export async function findModuleById(moduleId: string) {
  return prisma.learningModule.findUnique({
    where: { id: moduleId },
    select: { id: true, phase: { select: { courseId: true } } },
  });
}

export async function findPhasesForCourse(courseId: string) {
  return prisma.learningPhase.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      modules: { orderBy: { order: "asc" }, select: { id: true } },
    },
  });
}

export async function countLessonsInModule(moduleId: string) {
  return prisma.learningLesson.count({ where: { moduleId } });
}

export async function countCompletedLessonsInModule(userId: string, moduleId: string) {
  return prisma.learningProgress.count({
    where: { userId, lesson: { moduleId } },
  });
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function findLessonsForModule(
  moduleId: string,
  userId: string,
  locale: string,
  needsTranslation: boolean,
) {
  return prisma.learningLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: {
      progress: { where: { userId } },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export async function findLessonById(lessonId: string) {
  return prisma.learningLesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, order: true },
  });
}

export async function findPreviousLessons(moduleId: string, order: number) {
  return prisma.learningLesson.findMany({
    where: { moduleId, order: { lt: order } },
    select: { id: true },
  });
}

export async function countCompletedAmong(userId: string, lessonIds: string[]) {
  return prisma.learningProgress.count({
    where: { userId, lessonId: { in: lessonIds } },
  });
}

export async function upsertLessonProgress(userId: string, lessonId: string, pointsEarned: number) {
  return prisma.learningProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completedAt: new Date() },
    create: { userId, lessonId, pointsEarned },
  });
}

// ── Module unlock ─────────────────────────────────────────────────────────────

// (Unlock itself is coin-spend only — no separate DB record needed beyond gamification)

// ── Leaps / Playbooks ─────────────────────────────────────────────────────────

export async function findChildrenForUser(userId: string) {
  return prisma.child.findMany({
    where: { family: { members: { some: { userId } } } },
    select: { birthday: true, isUnborn: true, dueDate: true },
  });
}

export async function findPlaybooksForLeap(
  leapNumber: number,
  userId: string,
  locale: string,
  needsTranslation: boolean,
) {
  return prisma.playbook.findMany({
    where: { leapNumber },
    orderBy: [{ groupNumber: "asc" }, { sequence: "asc" }],
    include: {
      progress: {
        where: { userId },
        select: { triedCount: true, lastTriedAt: true },
      },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export async function findPlaybookById(id: string, leapNumber: number, userId: string, locale: string, needsTranslation: boolean) {
  return prisma.playbook.findFirst({
    where: { id, leapNumber },
    include: {
      progress: {
        where: { userId },
        select: { triedCount: true, lastTriedAt: true },
      },
      ...(needsTranslation ? { translations: { where: { locale } } } : {}),
    },
  });
}

export async function findPlaybookProgressEntry(userId: string, playbookId: string) {
  return prisma.playbookProgress.findUnique({
    where: { userId_playbookId: { userId, playbookId } },
  });
}

export async function upsertPlaybookProgress(userId: string, playbookId: string) {
  return prisma.playbookProgress.upsert({
    where: { userId_playbookId: { userId, playbookId } },
    update: { triedCount: { increment: 1 }, lastTriedAt: new Date() },
    create: { userId, playbookId, triedCount: 1, lastTriedAt: new Date() },
  });
}

export async function findPlaybooksInGroup(leapNumber: number, groupNumber: number) {
  return prisma.playbook.findMany({
    where: { leapNumber, groupNumber },
    select: { id: true },
  });
}

export async function countTriedInGroup(userId: string, groupIds: string[]) {
  return prisma.playbookProgress.count({
    where: { userId, playbookId: { in: groupIds } },
  });
}
