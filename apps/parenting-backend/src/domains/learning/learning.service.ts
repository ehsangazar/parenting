import type { FastifyReply } from "fastify";
import {
  awardCoins,
  awardInsight,
  spendCoins,
  ensureGamificationProfile,
} from "../../shared/gamification/index.js";
import { getSignedViewUrl } from "../../shared/storage/index.js";
import { POINTS } from "../../config/points.js";
import * as repo from "./learning.repository.js";

// ── Locale helpers ────────────────────────────────────────────────────────────

const DEFAULT_LOCALE = "en";

export function resolveLocale(raw: string | undefined): string {
  if (!raw) return DEFAULT_LOCALE;
  const trimmed = raw.trim().split("-")[0].toLowerCase();
  return trimmed || DEFAULT_LOCALE;
}

// ── Translation mergers ───────────────────────────────────────────────────────

function applyTranslation<T extends { title: string; description?: string | null }>(
  item: T,
  translation: { title: string; description?: string | null } | null | undefined,
): T {
  if (!translation) return item;
  return {
    ...item,
    title: translation.title || item.title,
    description: translation.description ?? item.description,
  };
}

function applyLessonTranslation<T extends { title: string; content: string }>(
  lesson: T,
  translation: { title: string; content: string } | null | undefined,
): T {
  if (!translation) return lesson;
  return {
    ...lesson,
    title: translation.title || lesson.title,
    content: translation.content || lesson.content,
  };
}

// ── Media signing ─────────────────────────────────────────────────────────────

async function signOptionalMediaUrl(url: string | null): Promise<string | null> {
  if (!url || url.startsWith("http")) return url;
  try {
    return await getSignedViewUrl(url);
  } catch {
    return url;
  }
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i;
const MD_IMAGE_OR_LINK_RE = /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g;

async function signInlineMarkdownAssets(content: string): Promise<string> {
  if (!content) return content;

  const matches = Array.from(content.matchAll(MD_IMAGE_OR_LINK_RE));
  if (matches.length === 0) return content;

  const uniqueUrls = new Set<string>();
  for (const m of matches) {
    const [, bang, , url] = m;
    if (!url || url.startsWith("http")) continue;
    if (bang !== "!" && !IMAGE_EXT_RE.test(url)) continue;
    uniqueUrls.add(url);
  }
  if (uniqueUrls.size === 0) return content;

  const signed = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      try {
        signed.set(url, await getSignedViewUrl(url));
      } catch {
        signed.set(url, url);
      }
    }),
  );

  return content.replace(MD_IMAGE_OR_LINK_RE, (full, bang: string, alt: string, url: string) => {
    if (url.startsWith("http")) return full;
    const isImage = bang === "!" || IMAGE_EXT_RE.test(url);
    if (!isImage) return full;
    const target = signed.get(url) ?? url;
    return `![${alt}](${target})`;
  });
}

async function signLessonMedia<T extends { mediaUrl?: string | null; content?: string | null }>(
  lesson: T,
): Promise<T> {
  const mediaUrl = await signOptionalMediaUrl(lesson.mediaUrl ?? null);
  const content = lesson.content ? await signInlineMarkdownAssets(lesson.content) : lesson.content;
  return { ...lesson, mediaUrl, content };
}

// ── Module access guard ───────────────────────────────────────────────────────

// Soft access: confirms the module exists. Earlier modules in the course are
// recommended but not enforced; a panicked parent should be able to jump to
// the leap that matches their child's behaviour right now without grinding
// through earlier material first.
export async function assertModuleAccessible(
  _userId: string,
  moduleId: string,
  reply: FastifyReply,
): Promise<boolean> {
  const mod = await repo.findModuleById(moduleId);
  if (!mod) {
    reply.notFound("Module not found");
    return false;
  }
  return true;
}

// ── Leap eligibility ──────────────────────────────────────────────────────────

const LEAP_AGE_RANGE: Record<number, [number, number]> = {
  1: [0, 3],
};

function ageInMonths(birthday: Date): number {
  return Math.floor((Date.now() - birthday.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

export async function hasEligibleChild(userId: string, leapNumber: number): Promise<boolean> {
  const range = LEAP_AGE_RANGE[leapNumber];
  if (!range) return false;
  const [min, max] = range;

  const children = await repo.findChildrenForUser(userId);
  return children.some((child) => {
    if (child.isUnborn || !child.birthday) return false;
    const months = ageInMonths(child.birthday);
    return months >= min && months <= max;
  });
}

// ── Course services ───────────────────────────────────────────────────────────

export async function getCourses(locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const courses = await repo.findAllCourses(locale, needsTranslation);

  return courses.map((course) => {
    const { translations: ct, phases, ...courseRest } = course as typeof course & {
      translations?: { title: string; description: string | null }[];
      phases: ((typeof course.phases)[0] & {
        translations?: { title: string; description: string | null }[];
      })[];
    };
    const translatedCourse = applyTranslation(courseRest, ct?.[0]);
    return {
      ...translatedCourse,
      phases: phases.map((phase) => {
        const { translations: pt, ...phaseRest } = phase as typeof phase & {
          translations?: { title: string; description: string | null }[];
        };
        return applyTranslation(phaseRest, pt?.[0]);
      }),
    };
  });
}

export async function getCourseModules(courseId: string, userId: string, locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const phases = await repo.findCourseModules(courseId, userId, locale, needsTranslation);

  return phases.map((phase) => {
    const { translations: pt, modules, ...phaseRest } = phase as typeof phase & {
      translations?: { title: string; description: string | null }[];
      modules: ((typeof phase.modules)[0] & {
        translations?: { title: string; description: string | null }[];
      })[];
    };
    const translatedPhase = applyTranslation(phaseRest, pt?.[0]);
    return {
      ...translatedPhase,
      modules: modules.map((m) => {
        const { translations: mt, ...mRest } = m as typeof m & {
          translations?: { title: string; description: string | null }[];
        };
        const completedLessons = m.lessons.filter((l) => l.progress.length > 0).length;
        return { ...applyTranslation(mRest, mt?.[0]), completedLessons, lessons: undefined };
      }),
    };
  });
}

// ── Lesson services ───────────────────────────────────────────────────────────

export async function getLessonsForModule(moduleId: string, userId: string, locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const lessons = await repo.findLessonsForModule(moduleId, userId, locale, needsTranslation);

  return Promise.all(
    lessons.map(async (l) => {
      const { translations: lt, ...lRest } = l as typeof l & {
        translations?: { title: string; content: string }[];
      };
      const merged = applyLessonTranslation(lRest, lt?.[0]);
      return signLessonMedia(merged);
    }),
  );
}

export async function completeLesson(
  userId: string,
  lessonId: string,
  reply: FastifyReply,
) {
  const lesson = await repo.findLessonById(lessonId);
  if (!lesson) {
    reply.notFound("Lesson not found");
    return null;
  }

  const moduleOk = await assertModuleAccessible(userId, lesson.moduleId, reply);
  if (!moduleOk) return null;

  // Lessons within a module can be completed in any order. Parents often skim
  // a module and only mark the cards that actually applied to their situation,
  // and forcing a strict sequence punishes that.
  const progress = await repo.upsertLessonProgress(userId, lessonId, POINTS.COINS_COMPLETE_LESSON);

  try {
    await Promise.all([
      awardCoins(userId, POINTS.COINS_COMPLETE_LESSON),
      awardInsight(userId, POINTS.INSIGHT_COMPLETE_LESSON, "lesson_complete"),
    ]);
  } catch (e) {
    console.error("Failed to award coins/insight for lesson completion", e);
  }

  return {
    progress,
    coinsAwarded: POINTS.COINS_COMPLETE_LESSON,
    insightAwarded: POINTS.INSIGHT_COMPLETE_LESSON,
    newlyUnlockedAchievements: [],
    completedQuestLabels: [],
  };
}

// ── Module unlock ─────────────────────────────────────────────────────────────

export async function unlockModule(userId: string): Promise<void> {
  await spendCoins(userId, POINTS.COST_UNLOCK_MODULE);
}

// ── Resume (continue where you left off) ──────────────────────────────────────

type ResumeTarget = {
  courseId: string;
  courseTitle: string | null;
  moduleId: string;
  moduleTitle: string | null;
  lessonId: string;
  lessonTitle: string | null;
  lessonOrder: number;
  totalLessonsInModule: number;
  completedLessonsInModule: number;
  isFreshStart: boolean;
};

export async function getResumeTarget(userId: string): Promise<ResumeTarget | null> {
  const recent = await repo.findMostRecentProgress(userId);

  if (recent) {
    const moduleId = recent.lesson.moduleId;
    const totalInModule = await repo.countLessonsInModule(moduleId);
    const completedInModule = await repo.countCompletedLessonsInModule(userId, moduleId);

    const next = await repo.findFirstIncompleteLessonInModule(userId, moduleId);
    // If everything in this module is done, surface the lesson they most
    // recently completed as the resume target so users can re-enter the
    // module from a familiar spot.
    const lesson = next ?? recent.lesson;

    return {
      courseId: recent.lesson.module.phase.course.id,
      courseTitle: recent.lesson.module.phase.course.title ?? null,
      moduleId,
      moduleTitle: recent.lesson.module.title ?? null,
      lessonId: lesson.id,
      lessonTitle: lesson.title ?? null,
      lessonOrder: lesson.order ?? 0,
      totalLessonsInModule: totalInModule,
      completedLessonsInModule: completedInModule,
      isFreshStart: !next,
    };
  }

  // No progress yet: surface the first lesson of the first course so the card
  // doubles as a "start your first lesson" affordance.
  const courses = await repo.findAllCourses("en", false);
  const firstCourse = courses[0];
  if (!firstCourse) return null;

  const firstLesson = await repo.findFirstLessonOfFirstModule(firstCourse.id);
  if (!firstLesson) return null;

  const totalInModule = await repo.countLessonsInModule(firstLesson.module.id);

  return {
    courseId: firstCourse.id,
    courseTitle: firstCourse.title ?? null,
    moduleId: firstLesson.module.id,
    moduleTitle: firstLesson.module.title ?? null,
    lessonId: firstLesson.lesson.id,
    lessonTitle: firstLesson.lesson.title ?? null,
    lessonOrder: firstLesson.lesson.order ?? 0,
    totalLessonsInModule: totalInModule,
    completedLessonsInModule: 0,
    isFreshStart: true,
  };
}

// ── Playbook services ─────────────────────────────────────────────────────────

const COINS_PLAYBOOK_FIRST_TRY = 25_000;
const COINS_PLAYBOOK_GROUP_COMPLETE = 100_000;

export async function getPlaybooksForLeap(leapNumber: number, userId: string, locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const playbooks = await repo.findPlaybooksForLeap(leapNumber, userId, locale, needsTranslation);

  return playbooks.map((pb) => {
    const { translations, ...pbRest } = pb as typeof pb & {
      translations?: { title: string; content: string }[];
    };
    const translation = translations?.[0];
    return {
      id: pbRest.id,
      leapNumber: pbRest.leapNumber,
      groupNumber: pbRest.groupNumber,
      sequence: pbRest.sequence,
      title: translation?.title ?? pbRest.title,
      domains: pbRest.domains,
      triedCount: pbRest.progress[0]?.triedCount ?? 0,
      lastTriedAt: pbRest.progress[0]?.lastTriedAt ?? null,
    };
  });
}

export async function getPlaybook(id: string, leapNumber: number, userId: string, locale: string) {
  const needsTranslation = locale !== DEFAULT_LOCALE;
  const playbook = await repo.findPlaybookById(id, leapNumber, userId, locale, needsTranslation);
  if (!playbook) return null;

  const { translations, ...pbRest } = playbook as typeof playbook & {
    translations?: { title: string; content: string }[];
  };
  const translation = translations?.[0];

  return {
    ...pbRest,
    title: translation?.title ?? pbRest.title,
    content: translation?.content ?? pbRest.content,
    triedCount: pbRest.progress[0]?.triedCount ?? 0,
    lastTriedAt: pbRest.progress[0]?.lastTriedAt ?? null,
    progress: undefined,
  };
}

// ── Practice Loop ─────────────────────────────────────────────────────────────

const PRACTICE_DUE_AFTER_MS = 24 * 60 * 60 * 1000;
const PRACTICE_TECHNIQUE_MAX = 280;
const PRACTICE_NOTE_MAX = 500;
const VALID_PRACTICE_OUTCOMES = new Set(["worked", "mixed", "didnt_work"]);

export type PendingPractice = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string | null;
  courseTitle: string | null;
  technique: string;
  childId: string | null;
  childName: string | null;
  pledgedAt: string;
  dueAt: string;
  overdueHours: number;
};

export type RecentReflection = {
  lessonId: string;
  lessonTitle: string;
  technique: string;
  outcome: string;
  note: string | null;
  childName: string | null;
  reflectedAt: string;
};

export async function pledgePractice(
  userId: string,
  input: { lessonId: string; technique: string; childId?: string | null },
) {
  const technique = input.technique.trim();
  if (!technique) throw new Error("Technique is required");
  if (technique.length > PRACTICE_TECHNIQUE_MAX) {
    throw new Error(`Technique must be ${PRACTICE_TECHNIQUE_MAX} characters or fewer`);
  }

  const lesson = await repo.findLessonById(input.lessonId);
  if (!lesson) throw new Error("Lesson not found");

  let childId: string | null = null;
  if (input.childId) {
    const owned = await repo.userOwnsChild(userId, input.childId);
    if (!owned) throw new Error("Child not in your family");
    childId = input.childId;
  }

  const dueAt = new Date(Date.now() + PRACTICE_DUE_AFTER_MS);
  const practice = await repo.createPractice({
    userId,
    lessonId: input.lessonId,
    childId,
    technique,
    dueAt,
  });

  awardInsight(userId, POINTS.INSIGHT_PRACTICE_PLEDGE, "practice_pledge").catch(() => {});

  return {
    practice: {
      id: practice.id,
      lessonId: practice.lessonId,
      childId: practice.childId,
      technique: practice.technique,
      pledgedAt: practice.pledgedAt.toISOString(),
      dueAt: practice.dueAt.toISOString(),
    },
    insightAwarded: POINTS.INSIGHT_PRACTICE_PLEDGE,
  };
}

export async function reflectPractice(
  userId: string,
  practiceId: string,
  input: { outcome: string; note?: string | null },
) {
  if (!VALID_PRACTICE_OUTCOMES.has(input.outcome)) {
    throw new Error("Outcome must be worked, mixed, or didnt_work");
  }
  const note = (input.note ?? "").trim().slice(0, PRACTICE_NOTE_MAX) || null;

  const existing = await repo.findPracticeById(practiceId);
  if (!existing) throw new Error("Practice not found");
  if (existing.userId !== userId) throw new Error("Not your practice");
  if (existing.reflectedAt) throw new Error("Already reflected");

  const updated = await repo.reflectOnPractice(practiceId, {
    outcome: input.outcome,
    note,
  });

  await Promise.all([
    awardCoins(userId, POINTS.COINS_PRACTICE_REFLECT),
    awardInsight(userId, POINTS.INSIGHT_PRACTICE_REFLECT, "practice_reflect"),
  ]).catch(() => {});

  return {
    practice: {
      id: updated.id,
      reflectionOutcome: updated.reflectionOutcome,
      reflectionNote: updated.reflectionNote,
      reflectedAt: updated.reflectedAt?.toISOString() ?? null,
    },
    coinsAwarded: POINTS.COINS_PRACTICE_REFLECT,
    insightAwarded: POINTS.INSIGHT_PRACTICE_REFLECT,
  };
}

export async function dismissPractice(userId: string, practiceId: string) {
  const existing = await repo.findPracticeById(practiceId);
  if (!existing) throw new Error("Practice not found");
  if (existing.userId !== userId) throw new Error("Not your practice");
  await repo.deletePractice(practiceId);
}

export async function listPendingPractices(userId: string): Promise<PendingPractice[]> {
  const rows = await repo.findPendingPractices(userId);
  const now = Date.now();
  return rows.map((p) => ({
    id: p.id,
    lessonId: p.lessonId,
    lessonTitle: p.lesson.title ?? "",
    courseId: p.lesson.module.phase.course.id ?? null,
    courseTitle: p.lesson.module.phase.course.title ?? null,
    technique: p.technique,
    childId: p.child?.id ?? null,
    childName: p.child?.name ?? null,
    pledgedAt: p.pledgedAt.toISOString(),
    dueAt: p.dueAt.toISOString(),
    overdueHours: Math.max(0, Math.floor((now - p.dueAt.getTime()) / (60 * 60 * 1000))),
  }));
}

export async function listRecentReflections(
  userId: string,
  limit = 5,
): Promise<RecentReflection[]> {
  const rows = await repo.findRecentReflectedPractices(userId, limit);
  return rows.map((p) => ({
    lessonId: p.lessonId,
    lessonTitle: p.lesson.title ?? "",
    technique: p.technique,
    outcome: p.reflectionOutcome ?? "unknown",
    note: p.reflectionNote,
    childName: p.child?.name ?? null,
    reflectedAt: (p.reflectedAt ?? p.pledgedAt).toISOString(),
  }));
}

export type PracticeRecapEntry = {
  practiceId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string | null;
  courseTitle: string | null;
  technique: string;
  childName: string | null;
  outcome: "worked" | "mixed" | "didnt_work" | null;
  note: string | null;
  pledgedAt: string;
  reflectedAt: string | null;
};

export type PracticeRecap = {
  windowStart: string;
  windowEnd: string;
  pledgesMade: number;
  reflectionsLogged: number;
  outcomes: { worked: number; mixed: number; didnt_work: number };
  entries: PracticeRecapEntry[];
};

// Build the weekly recap: counts + a chronological list of every practice
// the user pledged or reflected on in the last N days. Frontend decides how
// to surface it (e.g. group wins first, show the latest 4, etc.).
export async function getPracticeRecap(
  userId: string,
  days = 7,
): Promise<PracticeRecap> {
  const now = new Date();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const since = new Date(now.getTime() - windowMs);
  const rows = await repo.findPracticesInWindow(userId, since);

  const outcomes = { worked: 0, mixed: 0, didnt_work: 0 };
  let pledgesMade = 0;
  let reflectionsLogged = 0;

  for (const p of rows) {
    if (p.pledgedAt >= since) pledgesMade += 1;
    if (p.reflectedAt && p.reflectedAt >= since) {
      reflectionsLogged += 1;
      const outcome = p.reflectionOutcome as keyof typeof outcomes | null;
      if (outcome && outcome in outcomes) outcomes[outcome] += 1;
    }
  }

  const entries: PracticeRecapEntry[] = rows.map((p) => ({
    practiceId: p.id,
    lessonId: p.lessonId,
    lessonTitle: p.lesson.title ?? "",
    courseId: p.lesson.module?.phase?.course?.id ?? null,
    courseTitle: p.lesson.module?.phase?.course?.title ?? null,
    technique: p.technique,
    childName: p.child?.name ?? null,
    outcome:
      (p.reflectionOutcome as "worked" | "mixed" | "didnt_work" | null) ?? null,
    note: p.reflectionNote,
    pledgedAt: p.pledgedAt.toISOString(),
    reflectedAt: p.reflectedAt ? p.reflectedAt.toISOString() : null,
  }));

  return {
    windowStart: since.toISOString(),
    windowEnd: now.toISOString(),
    pledgesMade,
    reflectionsLogged,
    outcomes,
    entries,
  };
}

export async function tryPlaybookWithGroup(
  userId: string,
  playbookId: string,
  leapNumber: number,
  groupNumber: number,
) {
  const existing = await repo.findPlaybookProgressEntry(userId, playbookId);
  const isFirstTry = !existing;

  await repo.upsertPlaybookProgress(userId, playbookId);

  let coinsAwarded = 0;
  let insightAwarded = 0;
  let groupBonusAwarded = false;

  await ensureGamificationProfile(userId);

  if (isFirstTry) {
    await Promise.all([
      awardCoins(userId, COINS_PLAYBOOK_FIRST_TRY),
      awardInsight(userId, POINTS.INSIGHT_PLAYBOOK_FIRST_TRY, "playbook_first_try"),
    ]);
    coinsAwarded += COINS_PLAYBOOK_FIRST_TRY;
    insightAwarded += POINTS.INSIGHT_PLAYBOOK_FIRST_TRY;

    const groupPlaybooks = await repo.findPlaybooksInGroup(leapNumber, groupNumber);
    const groupIds = groupPlaybooks.map((p) => p.id);
    const triedCount = await repo.countTriedInGroup(userId, groupIds);

    if (triedCount === groupIds.length) {
      await Promise.all([
        awardCoins(userId, COINS_PLAYBOOK_GROUP_COMPLETE),
        awardInsight(
          userId,
          POINTS.INSIGHT_PLAYBOOK_GROUP_COMPLETE,
          "playbook_group_complete",
        ),
      ]);
      coinsAwarded += COINS_PLAYBOOK_GROUP_COMPLETE;
      insightAwarded += POINTS.INSIGHT_PLAYBOOK_GROUP_COMPLETE;
      groupBonusAwarded = true;
    }
  }

  const progress = await repo.findPlaybookProgressEntry(userId, playbookId);

  return {
    triedCount: progress?.triedCount ?? 1,
    isFirstTry,
    coinsAwarded,
    insightAwarded,
    groupBonusAwarded,
  };
}
