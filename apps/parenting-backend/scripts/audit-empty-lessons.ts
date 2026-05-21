/**
 * One-off audit: find LearningLesson / LearningLessonTranslation rows whose
 * content is effectively empty, plus per-card chunks that render as blank or
 * near-blank. Mirrors the frontend split in LessonViewer.buildLessonCards.
 * Read-only.
 *
 * Run: tsx scripts/audit-empty-lessons.ts
 *      tsx scripts/audit-empty-lessons.ts --json   (machine-readable)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Treat these as "visible nothing" when assessing whether a card renders blank:
// whitespace, <br>, &nbsp;, lone markdown punctuation (---, ###, ***, etc),
// and isolated HTML tags with no inner text.
const STRIP_RE =
  /<br\s*\/?>|<\/?[a-z][^>]*>|&nbsp;|&#\d+;|&[a-z]+;|[\s\-#*_~`>=.]+/gi;
const THIN_CHAR_THRESHOLD = 40;

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(STRIP_RE, '').trim();
}

// Mirrors apps/parenting-frontend/src/components/academy/LessonViewer.tsx
function splitChunks(raw: string | null | undefined): string[] {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return [];
  const explicit = trimmed.split(/\n\s*---+\s*\n/);
  const chunks = explicit.length > 1 ? explicit : trimmed.split(/\n\s*\n+/);
  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

type EmptyLesson = {
  id: string;
  moduleId: string;
  title: string;
  contentLen: number;
  normalizedLen: number;
  hasMedia: boolean;
  rawSnippet: string;
};

type EmptyTranslation = {
  id: string;
  lessonId: string;
  locale: string;
  status: string;
  aiGenerated: boolean;
  contentLen: number;
  normalizedLen: number;
  rawSnippet: string;
};

type ChunkProblem = {
  source: 'source' | 'translation';
  lessonId: string;
  locale?: string;
  status?: string;
  title: string;
  chunkIndex: number;
  chunkLen: number;
  normalizedLen: number;
  snippet: string;
};

async function main() {
  const asJson = process.argv.includes('--json');

  const lessons = await prisma.learningLesson.findMany({
    select: {
      id: true,
      moduleId: true,
      title: true,
      content: true,
      mediaUrl: true,
    },
  });

  const emptyLessons: EmptyLesson[] = [];
  const thinLessons: EmptyLesson[] = [];
  const emptyChunks: ChunkProblem[] = [];
  const thinChunks: ChunkProblem[] = [];
  const noCardLessons: { id: string; title: string; hasMedia: boolean }[] = [];

  for (const l of lessons) {
    const normalized = normalize(l.content);
    const row: EmptyLesson = {
      id: l.id,
      moduleId: l.moduleId,
      title: l.title,
      contentLen: (l.content ?? '').length,
      normalizedLen: normalized.length,
      hasMedia: !!l.mediaUrl,
      rawSnippet: (l.content ?? '').slice(0, 80).replace(/\n/g, '\\n'),
    };
    if (normalized.length === 0) emptyLessons.push(row);
    else if (normalized.length < THIN_CHAR_THRESHOLD) thinLessons.push(row);

    const chunks = splitChunks(l.content);
    if (chunks.length === 0 && !l.mediaUrl) {
      noCardLessons.push({ id: l.id, title: l.title, hasMedia: false });
    }
    chunks.forEach((chunk, i) => {
      const cn = normalize(chunk);
      const cp: ChunkProblem = {
        source: 'source',
        lessonId: l.id,
        title: l.title,
        chunkIndex: i,
        chunkLen: chunk.length,
        normalizedLen: cn.length,
        snippet: chunk.slice(0, 80).replace(/\n/g, '\\n'),
      };
      if (cn.length === 0) emptyChunks.push(cp);
      else if (cn.length < THIN_CHAR_THRESHOLD) thinChunks.push(cp);
    });
  }

  const translations = await prisma.learningLessonTranslation.findMany({
    select: {
      id: true,
      lessonId: true,
      locale: true,
      content: true,
      status: true,
      aiGenerated: true,
    },
  });

  const emptyTranslations: EmptyTranslation[] = [];
  const thinTranslations: EmptyTranslation[] = [];
  const draftCountByLocale: Record<string, number> = {};

  for (const tr of translations) {
    if (tr.status === 'draft') {
      draftCountByLocale[tr.locale] = (draftCountByLocale[tr.locale] ?? 0) + 1;
    }
    const normalized = normalize(tr.content);
    const row: EmptyTranslation = {
      id: tr.id,
      lessonId: tr.lessonId,
      locale: tr.locale,
      status: tr.status,
      aiGenerated: tr.aiGenerated,
      contentLen: (tr.content ?? '').length,
      normalizedLen: normalized.length,
      rawSnippet: (tr.content ?? '').slice(0, 80).replace(/\n/g, '\\n'),
    };
    if (normalized.length === 0) emptyTranslations.push(row);
    else if (normalized.length < THIN_CHAR_THRESHOLD) thinTranslations.push(row);

    const chunks = splitChunks(tr.content);
    chunks.forEach((chunk, i) => {
      const cn = normalize(chunk);
      const cp: ChunkProblem = {
        source: 'translation',
        lessonId: tr.lessonId,
        locale: tr.locale,
        status: tr.status,
        title: '(translation)',
        chunkIndex: i,
        chunkLen: chunk.length,
        normalizedLen: cn.length,
        snippet: chunk.slice(0, 80).replace(/\n/g, '\\n'),
      };
      if (cn.length === 0) emptyChunks.push(cp);
      else if (cn.length < THIN_CHAR_THRESHOLD) thinChunks.push(cp);
    });
  }

  const emptyByLocale: Record<string, number> = {};
  for (const t of emptyTranslations) {
    emptyByLocale[t.locale] = (emptyByLocale[t.locale] ?? 0) + 1;
  }
  const thinByLocale: Record<string, number> = {};
  for (const t of thinTranslations) {
    thinByLocale[t.locale] = (thinByLocale[t.locale] ?? 0) + 1;
  }

  const report = {
    totals: {
      lessons: lessons.length,
      translations: translations.length,
      emptyLessons: emptyLessons.length,
      thinLessons: thinLessons.length,
      noCardLessons: noCardLessons.length,
      emptyTranslations: emptyTranslations.length,
      thinTranslations: thinTranslations.length,
      emptyChunks: emptyChunks.length,
      thinChunks: thinChunks.length,
    },
    emptyByLocale,
    thinByLocale,
    draftCountByLocale,
    noCardLessons,
    emptyLessons,
    thinLessons,
    emptyTranslations: emptyTranslations.slice(0, 30),
    thinTranslations: thinTranslations.slice(0, 30),
    emptyChunks: emptyChunks.slice(0, 40),
    thinChunks: thinChunks.slice(0, 40),
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }

  const { totals } = report;
  console.log('--- Audit: empty / thin learning content ---');
  console.log(`Lessons total:              ${totals.lessons}`);
  console.log(`Lessons EMPTY (whole):      ${totals.emptyLessons}`);
  console.log(`Lessons THIN  (whole, <${THIN_CHAR_THRESHOLD}): ${totals.thinLessons}`);
  console.log(`Lessons with ZERO cards:    ${totals.noCardLessons}`);
  console.log(`Translations total:         ${totals.translations}`);
  console.log(`Translations EMPTY:         ${totals.emptyTranslations}`);
  console.log(`Translations THIN:          ${totals.thinTranslations}`);
  console.log(`CHUNKS empty (per-card):    ${totals.emptyChunks}`);
  console.log(`CHUNKS thin  (per-card):    ${totals.thinChunks}`);
  console.log('');
  console.log('Empty translations by locale:', emptyByLocale);
  console.log('Thin translations by locale: ', thinByLocale);
  console.log('Draft translations by locale:', draftCountByLocale);

  if (noCardLessons.length) {
    console.log('\n--- Lessons that produce ZERO cards (id | title) ---');
    for (const l of noCardLessons.slice(0, 30)) {
      console.log(`${l.id} | ${l.title}`);
    }
  }

  if (emptyChunks.length) {
    console.log('\n--- Empty cards / chunks (first 40: source | lessonId | idx | locale) ---');
    for (const c of emptyChunks.slice(0, 40)) {
      console.log(
        `${c.source} | ${c.lessonId} | i=${c.chunkIndex} | ${c.locale ?? '-'} | len=${c.chunkLen} | "${c.snippet}"`,
      );
    }
  }
  if (thinChunks.length) {
    console.log('\n--- Thin cards / chunks (first 40) ---');
    for (const c of thinChunks.slice(0, 40)) {
      console.log(
        `${c.source} | ${c.lessonId} | i=${c.chunkIndex} | ${c.locale ?? '-'} | n=${c.normalizedLen} | "${c.snippet}"`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
