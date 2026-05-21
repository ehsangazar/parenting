import type { LessonCard } from './LessonModal.js';

// Chunks that are only separator/whitespace characters render as a blank card
// (or a horizontal rule) and should be dropped.
const BLANK_CHUNK_RE = /^[\s\-#*_~`>=.]*$/;
// Some authored content starts with a bilingual label like `**[English]**`
// or `**[فارسی]**`. Strip these so the first card isn't a useless tag.
const LANGUAGE_LABEL_RE = /^\s*\*\*\[[^\]\n]+\]\*\*\s*$/;

export function buildLessonCards(lesson: {
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
}): LessonCard[] {
  const cards: LessonCard[] = [];
  if (lesson.mediaUrl) {
    cards.push({ kind: 'media', mediaUrl: lesson.mediaUrl, mediaType: lesson.mediaType });
  }
  const raw = (lesson.content ?? '').trim();
  if (raw) {
    // Allow `---` separators that are missing a trailing or leading newline
    // (start/end of file) and collapse consecutive separators into one. The
    // pre-existing regex required \n on both sides and didn't collapse runs.
    const explicit = raw.split(/(?:^|\n)(?:\s*---+)+\s*(?:\n|$)/);
    const chunks = explicit.length > 1 ? explicit : raw.split(/\n\s*\n+/);
    for (const chunk of chunks) {
      const text = chunk.trim();
      if (!text) continue;
      if (BLANK_CHUNK_RE.test(text)) continue;
      if (LANGUAGE_LABEL_RE.test(text)) continue;
      cards.push({ kind: 'text', text });
    }
  }
  return cards;
}
