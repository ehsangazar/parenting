import type { FastifyReply } from "fastify";
import { awardCoins, spendCoins, ensureGamificationProfile } from "../../shared/gamification/index.js";
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

export async function assertModuleAccessible(
  userId: string,
  moduleId: string,
  reply: FastifyReply,
): Promise<boolean> {
  const mod = await repo.findModuleById(moduleId);
  if (!mod) {
    reply.notFound("Module not found");
    return false;
  }

  const phases = await repo.findPhasesForCourse(mod.phase.courseId);
  const orderedIds = phases.flatMap((p) => p.modules.map((m) => m.id));
  const idx = orderedIds.indexOf(moduleId);

  if (idx < 0) {
    reply.notFound("Module not found");
    return false;
  }
  if (idx === 0) return true;

  for (const priorId of orderedIds.slice(0, idx)) {
    const total = await repo.countLessonsInModule(priorId);
    if (total === 0) continue;
    const done = await repo.countCompletedLessonsInModule(userId, priorId);
    if (done < total) {
      reply.forbidden("Complete previous modules first");
      return false;
    }
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

  const previousLessons = await repo.findPreviousLessons(lesson.moduleId, lesson.order);
  if (previousLessons.length > 0) {
    const completedPrev = await repo.countCompletedAmong(userId, previousLessons.map((l) => l.id));
    if (completedPrev < previousLessons.length) {
      reply.badRequest("Complete the previous lessons first");
      return null;
    }
  }

  const progress = await repo.upsertLessonProgress(userId, lessonId, POINTS.COINS_COMPLETE_LESSON);

  try {
    await awardCoins(userId, POINTS.COINS_COMPLETE_LESSON);
  } catch (e) {
    console.error("Failed to award coins for lesson completion", e);
  }

  return {
    progress,
    coinsAwarded: POINTS.COINS_COMPLETE_LESSON,
    newlyUnlockedAchievements: [],
    completedQuestLabels: [],
  };
}

// ── Module unlock ─────────────────────────────────────────────────────────────

export async function unlockModule(userId: string): Promise<void> {
  await spendCoins(userId, POINTS.COST_UNLOCK_MODULE);
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
  let groupBonusAwarded = false;

  await ensureGamificationProfile(userId);

  if (isFirstTry) {
    await awardCoins(userId, COINS_PLAYBOOK_FIRST_TRY);
    coinsAwarded += COINS_PLAYBOOK_FIRST_TRY;

    const groupPlaybooks = await repo.findPlaybooksInGroup(leapNumber, groupNumber);
    const groupIds = groupPlaybooks.map((p) => p.id);
    const triedCount = await repo.countTriedInGroup(userId, groupIds);

    if (triedCount === groupIds.length) {
      await awardCoins(userId, COINS_PLAYBOOK_GROUP_COMPLETE);
      coinsAwarded += COINS_PLAYBOOK_GROUP_COMPLETE;
      groupBonusAwarded = true;
    }
  }

  const progress = await repo.findPlaybookProgressEntry(userId, playbookId);

  return {
    triedCount: progress?.triedCount ?? 1,
    isFirstTry,
    coinsAwarded,
    groupBonusAwarded,
  };
}
