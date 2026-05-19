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

// ── Resume (continue where you left off) ──────────────────────────────────────

// Most recent lesson the user touched. We use it as the seed for the resume
// card: from this lesson we either resume it (if not complete) or surface the
// next lesson in the same module.
export async function findMostRecentProgress(userId: string) {
  return prisma.learningProgress.findFirst({
    where: { userId },
    orderBy: { completedAt: "desc" },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              phase: {
                include: {
                  course: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function findFirstIncompleteLessonInModule(
  userId: string,
  moduleId: string,
) {
  return prisma.learningLesson.findFirst({
    where: {
      moduleId,
      progress: { none: { userId } },
    },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true, moduleId: true },
  });
}

export async function findFirstLessonOfFirstModule(courseId: string) {
  const phase = await prisma.learningPhase.findFirst({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        take: 1,
        include: {
          lessons: { orderBy: { order: "asc" }, take: 1 },
        },
      },
    },
  });
  const mod = phase?.modules[0];
  const lesson = mod?.lessons[0];
  if (!mod || !lesson) return null;
  return { module: mod, lesson };
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

// ── Practice Loop ─────────────────────────────────────────────────────────────

export async function createPractice(data: {
  userId: string;
  lessonId: string;
  childId: string | null;
  technique: string;
  dueAt: Date;
}) {
  return prisma.lessonPractice.create({
    data: {
      userId: data.userId,
      lessonId: data.lessonId,
      childId: data.childId,
      technique: data.technique,
      dueAt: data.dueAt,
    },
  });
}

export async function findPracticeById(id: string) {
  return prisma.lessonPractice.findUnique({ where: { id } });
}

export async function reflectOnPractice(
  id: string,
  data: { outcome: string; note: string | null },
) {
  return prisma.lessonPractice.update({
    where: { id },
    data: {
      reflectionOutcome: data.outcome,
      reflectionNote: data.note,
      reflectedAt: new Date(),
    },
  });
}

export async function deletePractice(id: string) {
  return prisma.lessonPractice.delete({ where: { id } });
}

export async function findPendingPractices(userId: string, limit = 10) {
  return prisma.lessonPractice.findMany({
    where: { userId, reflectedAt: null },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          module: {
            select: {
              id: true,
              title: true,
              phase: { select: { course: { select: { id: true, title: true } } } },
            },
          },
        },
      },
      child: { select: { id: true, name: true } },
    },
  });
}

export async function findRecentReflectedPractices(userId: string, limit = 5) {
  return prisma.lessonPractice.findMany({
    where: { userId, reflectedAt: { not: null } },
    orderBy: { reflectedAt: "desc" },
    take: limit,
    include: {
      lesson: { select: { id: true, title: true } },
      child: { select: { id: true, name: true } },
    },
  });
}

// Pull every practice the user touched in the window: any pledge that was
// either created OR reflected on between `since` and now. Used by the
// weekly recap, which needs to count both "I committed to try X" and
// "here's how it actually went."
export async function findPracticesInWindow(userId: string, since: Date) {
  return prisma.lessonPractice.findMany({
    where: {
      userId,
      OR: [{ pledgedAt: { gte: since } }, { reflectedAt: { gte: since } }],
    },
    orderBy: { pledgedAt: "desc" },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          module: {
            select: {
              id: true,
              title: true,
              phase: { select: { course: { select: { id: true, title: true } } } },
            },
          },
        },
      },
      child: { select: { id: true, name: true } },
    },
  });
}

export async function findPracticesReadyForNudge(now: Date, limit = 50) {
  return prisma.lessonPractice.findMany({
    where: {
      reflectedAt: null,
      nudgedAt: null,
      dueAt: { lte: now },
    },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: {
      lesson: { select: { id: true, title: true } },
      child: { select: { id: true, name: true } },
    },
  });
}

export async function markPracticeNudged(id: string) {
  return prisma.lessonPractice.update({
    where: { id },
    data: { nudgedAt: new Date() },
  });
}

export async function userOwnsChild(userId: string, childId: string): Promise<boolean> {
  const found = await prisma.child.findFirst({
    where: { id: childId, family: { members: { some: { userId } } } },
    select: { id: true },
  });
  return !!found;
}
