import { describe, it, expect } from 'vitest';
import { buildLessonCards } from './buildLessonCards.js';

describe('buildLessonCards', () => {
  it('returns empty when content is empty and no media', () => {
    expect(buildLessonCards({ content: '' })).toEqual([]);
    expect(buildLessonCards({ content: null })).toEqual([]);
    expect(buildLessonCards({ content: '   \n\n  ' })).toEqual([]);
  });

  it('prepends a media card when mediaUrl is present', () => {
    expect(
      buildLessonCards({ content: 'hello', mediaUrl: 'https://x/y.png', mediaType: 'image' }),
    ).toEqual([
      { kind: 'media', mediaUrl: 'https://x/y.png', mediaType: 'image' },
      { kind: 'text', text: 'hello' },
    ]);
  });

  it('splits on --- separators when present', () => {
    const content = 'first card\n\n---\n\nsecond card\n\n---\n\nthird';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'first card' },
      { kind: 'text', text: 'second card' },
      { kind: 'text', text: 'third' },
    ]);
  });

  it('drops trailing --- with no newline after (regression: blank cards)', () => {
    const content = 'first card\n\n---\n\nsecond card\n\n---';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'first card' },
      { kind: 'text', text: 'second card' },
    ]);
  });

  it('drops leading --- with no newline before', () => {
    const content = '---\n\nfirst card\n\n---\n\nsecond card';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'first card' },
      { kind: 'text', text: 'second card' },
    ]);
  });

  it('falls back to blank-line splitting when no --- present', () => {
    const content = 'para one\n\npara two\n\npara three';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'para one' },
      { kind: 'text', text: 'para two' },
      { kind: 'text', text: 'para three' },
    ]);
  });

  it('drops chunks that are only separator characters (regression: pure --- chunk)', () => {
    // Real-world shape: two consecutive separators leave a "---" chunk
    // between them when each separator has the required surrounding newlines.
    const content = 'real text\n\n---\n\n---\n\nmore text';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'real text' },
      { kind: 'text', text: 'more text' },
    ]);
  });

  it('drops standalone language-label paragraphs (regression: leap5 **[English]** first card)', () => {
    // Real-world shape: paragraph-split content where the bilingual label is
    // its own paragraph followed by the real content paragraph.
    const content = '**[English]**\n\nThe real first card text.\n\nA second paragraph.';
    expect(buildLessonCards({ content })).toEqual([
      { kind: 'text', text: 'The real first card text.' },
      { kind: 'text', text: 'A second paragraph.' },
    ]);
  });
});
