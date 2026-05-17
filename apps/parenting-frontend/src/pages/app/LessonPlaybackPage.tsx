import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../state/auth.js';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { LessonCompleteScreen } from '../../components/app/LessonCompleteScreen.js';
import {
  orderedModulesFromPhases,
  isModuleLockedInOrderedList,
  getFirstActionableModuleIdFromOrdered,
  getNextModuleId,
} from '../../lib/learningCourseOrder.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { Icon } from '../../components/icons/index.js';
import { soundManager } from '../../lib/soundManager.js';

interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'audio' | null;
  order: number;
  progress: unknown[];
}

function isLessonIndexLocked(lessonsList: Lesson[], idx: number): boolean {
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!lessonsList[i]?.progress?.length) return true;
  }
  return false;
}

interface LearningModule {
  id: string;
  title: string;
  order: number;
  completedLessons: number;
  _count: { lessons: number };
}

interface LearningPhase {
  id: string;
  title: string;
  order: number;
  modules: LearningModule[];
}

const cardVariants: Variants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0, scale: 0.97 }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
  },
  exit: (dir: number) => ({
    x: dir * -60,
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.18, ease: 'easeIn' },
  }),
};

// ── Block classification ─────────────────────────────────────────────────────

type BlockVariant = 'prose' | 'myth' | 'truth' | 'lead-quote' | 'key-insight' | 'action';

function stripLabel(text: string): string {
  return text.replace(/^\*\*\d+\.\s*.+?\*\*[ \t]*\n?/, '').trim();
}

function classifyBlock(text: string): BlockVariant {
  const t = text.trim();

  const labelMatch = t.match(/^\*\*\d+\.\s*(.+?)\*\*/);
  if (labelMatch) {
    const label = labelMatch[1].toLowerCase();
    if (label.includes('myth')) return 'myth';
    if (label.includes('paradigm') || label.includes('truth') || label.includes('shift')) return 'truth';
    if (label.includes('edge') || label.includes('case')) return 'lead-quote';
    if (label.includes('micro') || label.includes('action')) return 'action';
    if (label.includes('question') || label.includes('philosophical')) return 'key-insight';
  }

  const clean = labelMatch ? stripLabel(t) : t;
  if (/^the myth/i.test(clean) || /^myth:/i.test(clean)) return 'myth';
  if (/^the truth/i.test(clean) || /^truth:/i.test(clean)) return 'truth';
  if (clean.startsWith('"') && /^"[^"]{8,}"/.test(clean)) return 'lead-quote';
  const textLen = clean.replace(/[*_`#>-]/g, '').trim().length;
  if (textLen < 140 && !/^#{1,3}\s/.test(clean) && !/^[-*]\s/.test(clean)) return 'key-insight';
  return 'prose';
}

// Extract leading quoted string and the commentary that follows
function extractLeadQuote(text: string): { quote: string; rest: string } {
  const m = text.match(/^"([^"]+)"\s*([\s\S]*)/);
  return m ? { quote: m[1].trim(), rest: m[2].trim() } : { quote: '', rest: text };
}

/** Markdown image syntax or HTML img — cards without these get reading-focused layout */
function markdownBlockHasImage(markdown: string): boolean {
  return /!\[[^\]]*\]\([^)]+\)/.test(markdown) || /<img[\s/>]/i.test(markdown);
}

/**
 * One block of body copy (no second paragraph, lists, headings, etc.).
 * Used to skip the "Reading" chrome so a lone paragraph can use more prominent type.
 */
function isSingleParagraphMarkdown(md: string): boolean {
  const t = md.trim();
  if (!t) return false;
  if (markdownBlockHasImage(t)) return false;
  if (/^#{1,6}\s/m.test(t)) return false;
  if (/^[\s]*[-*+]\s/m.test(t)) return false;
  if (/^[\s]*\d+\.\s/m.test(t)) return false;
  if (/^[\s]*>/m.test(t)) return false;
  if (/^[\s]*```/m.test(t)) return false;
  if (/^---\s*$/m.test(t)) return false;
  const blocks = t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return blocks.length === 1;
}

/** Markdown images: capped height + cover crop so the card fits the viewport without inner scroll */
const LESSON_MARKDOWN_IMG_CLASS =
  'my-3 w-full rounded-xl border object-cover object-center max-h-[min(28vh,190px)] sm:max-h-[min(30vh,220px)]';

// Shared custom markdown components — makes *emphasis* teal, **bold** highlighted
const mdComponents: import('react-markdown').Components = {
  img: ({ src, alt }) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      className={LESSON_MARKDOWN_IMG_CLASS}
      style={{ borderColor: '#E0E7FF' }}
      loading="lazy"
    />
  ),
  em: ({ children }) => (
    <span style={{ color: '#52D68C', fontStyle: 'normal', fontWeight: 600 }}>{children}</span>
  ),
  strong: ({ children }) => (
    <strong style={{
      color: '#1E293B',
      background: 'rgba(150,230,179,0.28)',
      padding: '1px 4px',
      borderRadius: '4px',
      fontWeight: 700,
    }}>{children}</strong>
  ),
};

// ── Content card body by variant ─────────────────────────────────────────────

const PROSE_CLASSES =
  'font-body lesson-content prose max-w-none ' +
  'prose-p:my-0 prose-p:text-[0.9375rem] prose-p:leading-[1.75] prose-p:text-text-secondary ' +
  'sm:prose-p:text-[1.0625rem] sm:prose-p:leading-[1.85] ' +
  'prose-strong:font-bold ' +
  'prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:marker:text-text-tertiary ' +
  'prose-headings:font-heading prose-headings:mt-0 prose-headings:mb-2 prose-headings:font-bold prose-headings:text-text-primary ' +
  'prose-h2:text-lg prose-h3:text-base sm:prose-h2:text-xl sm:prose-h3:text-lg ' +
  'prose-blockquote:my-3 prose-blockquote:border-l-4 prose-blockquote:border-primary-500/50 ' +
  'prose-blockquote:bg-surface-light prose-blockquote:py-2.5 prose-blockquote:pl-4 prose-blockquote:pr-3 ' +
  'prose-blockquote:not-italic prose-blockquote:text-text-secondary prose-blockquote:rounded-r-xl ' +
  'prose-a:font-medium prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline';

/** Extra classes when the card has no embedded image — calmer reading rhythm & line length */
const TEXT_ONLY_PROSE =
  ' mx-auto w-full max-w-[min(100%,42rem)] ' +
  ' prose-p:text-[1rem] sm:prose-p:text-[1.0625rem] prose-p:leading-[1.82] sm:prose-p:leading-[1.9] ' +
  ' [&_p:first-of-type]:text-[1.0625rem] [&_p:first-of-type]:sm:text-[1.125rem] [&_p:first-of-type]:leading-snug [&_p:first-of-type]:text-text-primary [&_p:first-of-type]:font-medium ' +
  ' [&_p+p]:mt-4 sm:[&_p+p]:mt-5';

/** Lone paragraph in reading card — line length + lead type (used without TEXT_ONLY_PROSE to avoid utility clashes) */
const SINGLE_PARAGRAPH_READING_PROSE =
  ' mx-auto w-full max-w-[min(100%,42rem)] pl-1 ' +
  ' prose-p:my-0 prose-p:text-[1.125rem] sm:prose-p:text-[1.25rem] prose-p:leading-snug sm:prose-p:leading-[1.45] ' +
  ' prose-p:font-semibold sm:prose-p:font-bold prose-p:text-text-primary ' +
  ' [&_strong]:text-text-primary';

function ContentCard({ block, lessonId }: { block: string; lessonId: string }) {
  const { t } = useTranslation();
  const variant = classifyBlock(block);
  const cleanBlock = stripLabel(block);
  const hasImage = markdownBlockHasImage(cleanBlock);
  const proseWithTextOnly = `${PROSE_CLASSES}${!hasImage ? TEXT_ONLY_PROSE : ''}`;

  if (variant === 'myth') {
    return (
      <div
        data-lesson-id={lessonId}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 px-4 py-4 sm:rounded-3xl sm:px-6 sm:py-6"
        style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
      >
        <div className={`mb-4 flex shrink-0 items-center gap-2 ${!hasImage ? 'sm:mb-5' : ''}`}>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest"
            style={{ backgroundColor: 'rgba(248,113,113,0.2)', borderColor: '#F87171', color: '#B91C1C' }}
          >
            {t('lessonPlayback.badgeMyth')}
          </span>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${!hasImage ? 'justify-start' : ''}`}>
          <div className={proseWithTextOnly}>
            <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'truth') {
    return (
      <div
        data-lesson-id={lessonId}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 px-4 py-4 sm:rounded-3xl sm:px-6 sm:py-6"
        style={{ backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }}
      >
        <div className={`mb-4 flex shrink-0 items-center gap-2 ${!hasImage ? 'sm:mb-5' : ''}`}>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest"
            style={{ backgroundColor: 'rgba(150,230,179,0.35)', borderColor: '#52D68C', color: '#14532d' }}
          >
            {t('lessonPlayback.badgeTruth')}
          </span>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${!hasImage ? 'justify-start' : ''}`}>
          <div className={proseWithTextOnly}>
            <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'lead-quote') {
    const { quote, rest } = extractLeadQuote(cleanBlock);
    return (
      <div
        data-lesson-id={lessonId}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 px-4 py-4 sm:rounded-3xl sm:px-6 sm:py-6"
        style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
      >
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${!hasImage && !rest ? 'justify-start' : ''}`}>
          <div
            className="mb-1 select-none font-serif text-6xl leading-none sm:text-8xl"
            style={{ color: '#52D68C', opacity: 0.28 }}
            aria-hidden
          >
            &#8220;
          </div>
          <p
            className={`text-lg font-semibold leading-snug text-text-primary sm:text-2xl ${rest ? 'mb-4 sm:mb-5' : ''}`}
            style={{ fontStyle: 'italic' }}
          >
            {quote}
          </p>
          {rest && (
            <>
              <div className="mb-3 h-px w-12 rounded-full sm:mb-4" style={{ backgroundColor: '#93C5FD' }} />
              <div className={proseWithTextOnly}>
                <ReactMarkdown components={mdComponents}>{rest}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'key-insight') {
    return (
      <div
        data-lesson-id={lessonId}
        className="flex h-full min-h-0 flex-col items-center justify-between overflow-hidden rounded-2xl border-2 px-5 pt-8 pb-6 sm:rounded-3xl sm:px-7 sm:pt-12 sm:pb-8"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(82,214,140,0.45)' }}
      >
        <div
          className="h-1 w-10 shrink-0 rounded-full mb-4"
          style={{ backgroundColor: '#52D68C', opacity: 0.6 }}
        />
        <div
          className={
            PROSE_CLASSES +
            ' flex min-h-0 w-full max-w-[min(100%,36rem)] flex-1 flex-col justify-start overflow-y-auto ' +
            ' prose-p:text-lg prose-p:font-semibold prose-p:leading-snug prose-p:text-text-primary ' +
            'sm:prose-p:text-2xl sm:prose-p:leading-snug'
          }
        >
          <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
        </div>
        <div
          className="h-1 w-10 shrink-0 rounded-full mb-4"
          style={{ backgroundColor: '#52D68C', opacity: 0.6 }}
        />
      </div>
    );
  }

  if (variant === 'action') {
    return (
      <div
        data-lesson-id={lessonId}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 px-4 py-4 sm:rounded-3xl sm:px-6 sm:py-6"
        style={{ backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }}
      >
        <div className={`mb-4 flex shrink-0 items-center gap-2 ${!hasImage ? 'sm:mb-5' : ''}`}>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest"
            style={{ backgroundColor: 'rgba(150,230,179,0.35)', borderColor: '#52D68C', color: '#14532d' }}
          >
            {t('lessonPlayback.badgeTryThis')}
          </span>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${!hasImage ? 'justify-start' : ''}`}>
          <div className={proseWithTextOnly}>
            <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // prose (default) — text-only intro cards get a reading layout + accent
  if (!hasImage) {
    const singleParagraph = isSingleParagraphMarkdown(cleanBlock);
    return (
      <div
        data-lesson-id={lessonId}
        className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 sm:rounded-3xl"
        style={{ backgroundColor: '#F1F4FF', borderColor: '#E0E7FF' }}
      >
        <div
          className="pointer-events-none absolute bottom-10 left-0 top-10 w-[3px] rounded-full sm:bottom-12 sm:top-12"
          style={{
            background: 'linear-gradient(180deg, rgba(82,214,140,0.45) 0%, rgba(150,230,179,0.15) 55%, transparent 100%)',
          }}
          aria-hidden
        />
        <div
          className={`flex min-h-0 flex-1 flex-col px-6 sm:px-10 ${singleParagraph ? 'justify-center overflow-hidden py-10 sm:py-14' : 'justify-start overflow-y-auto py-8 sm:py-10'}`}
        >
          {!singleParagraph && (
            <div className="mb-5 flex items-center gap-3 sm:mb-6">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border sm:h-11 sm:w-11"
                style={{ borderColor: '#C7D2FE', backgroundColor: 'rgba(150,230,179,0.2)' }}
              >
                <Icon name={uiIcons.bookOpen} className="h-5 w-5 opacity-90 sm:h-[22px] sm:w-[22px]" alt="" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">{t('lessonPlayback.reading')}</p>
                <p className="text-xs font-semibold text-text-secondary sm:text-sm">{t('lessonPlayback.takeYourTime')}</p>
              </div>
            </div>
          )}
          <div
            className={`${PROSE_CLASSES}${singleParagraph ? SINGLE_PARAGRAPH_READING_PROSE : `${TEXT_ONLY_PROSE} pl-1`}`}
          >
            <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-lesson-id={lessonId}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 px-4 py-4 sm:rounded-3xl sm:px-6 sm:py-6"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E0E7FF' }}
    >
      <div className={`${PROSE_CLASSES} min-h-0 flex-1 overflow-y-auto`}>
        <ReactMarkdown components={mdComponents}>{cleanBlock}</ReactMarkdown>
      </div>
    </div>
  );
}

export const LessonPlaybackPage = () => {
  const { t } = useTranslation();
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateGamification } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastCoinsAwarded, setLastCoinsAwarded] = useState(500);
  const [moduleTitle, setModuleTitle] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [phases, setPhases] = useState<LearningPhase[]>([]);
  // ── Card navigation state ────────────────────────────────────────────────
  const [cardIndex, setCardIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Capture URL params at module-load time — avoids re-fetching when we write lesson/card back to URL
  const initialParamsRef = useRef(searchParams);
  useEffect(() => { initialParamsRef.current = searchParams; }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const [lessonsRes, modulesRes] = await Promise.all([
          api.get(`/api/learning/modules/${moduleId}/lessons`),
          api.get('/api/learning/modules'),
        ]);
        if (cancelled) return;
        setLessons(lessonsRes.data.lessons || []);

        const mod = (modulesRes.data.modules || []).find(
          (m: { id: string }) => m.id === moduleId,
        );
        if (mod?.title) setModuleTitle(mod.title);

        if (mod?.phase?.course?.id) {
          const cId = mod.phase.course.id;
          setCourseId(cId);
          const phasesRes = await api.get(`/api/learning/courses/${cId}/phases`);
          if (cancelled) return;
          setPhases(phasesRes.data.phases || []);
        }

        const params = initialParamsRef.current;
        const list = (lessonsRes.data.lessons as Lesson[]) ?? [];
        const firstUncompleted = list.findIndex((l) => (l.progress?.length ?? 0) === 0);
        const forceIntro =
          params.get('start') === '0' ||
          params.get('intro') === '1';
        const urlLesson = parseInt(params.get('lesson') ?? '', 10);
        const urlCard = parseInt(params.get('card') ?? '', 10);
        if (forceIntro && list.length > 0) {
          setCurrentIndex(0);
        } else if (!isNaN(urlLesson) && urlLesson >= 0 && urlLesson < list.length) {
          setCurrentIndex(urlLesson);
          if (!isNaN(urlCard) && urlCard > 0) {
            setCardIndex(urlCard);
          }
        } else if (firstUncompleted !== -1) {
          setCurrentIndex(firstUncompleted);
        } else {
          setCurrentIndex(0);
        }
      } catch {
        toast.error('Failed to load lessons');
        navigate(toApp('/app/learning'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLessons();
    return () => {
      cancelled = true;
    };
  }, [moduleId, navigate]);

  const orderedModules = useMemo(() => orderedModulesFromPhases(phases), [phases]);

  // Redirect if module is locked
  useEffect(() => {
    if (!moduleId || orderedModules.length === 0) return;
    if (!isModuleLockedInOrderedList(moduleId, orderedModules)) return;
    const first = getFirstActionableModuleIdFromOrdered(orderedModules);
    if (first && first !== moduleId) navigate(toApp(`/app/learning/${first}`), { replace: true });
  }, [moduleId, orderedModules, navigate]);

  const goAfterModule = useCallback(() => {
    const next = moduleId ? getNextModuleId(moduleId, orderedModules) : null;
    if (next) navigate(toApp(`/app/learning/${next}`));
    else if (courseId) navigate(toApp(`/app/learning/course/${courseId}`));
    else navigate(toApp('/app/learning'));
  }, [moduleId, orderedModules, courseId, navigate]);

  const goBack = useCallback(() => {
    if (courseId) navigate(toApp(`/app/learning/course/${courseId}`));
    else navigate(toApp('/app/learning'));
  }, [courseId, navigate]);

  const currentLesson = lessons[currentIndex];
  const isCompleted = currentLesson?.progress?.length > 0;
  const isLastLesson = currentIndex === lessons.length - 1;
  const completedCount = lessons.filter((l) => l.progress.length > 0).length;
  const headerLessonPositionPct =
    lessons.length > 0 ? ((currentIndex + 1) / lessons.length) * 100 : 0;

  const stepInModuleLabel = useMemo(() => {
    const n = lessons.length;
    if (n === 0 || !currentLesson) return '';
    const i = currentIndex + 1;
    const title = currentLesson.title;
    if (currentIndex === 0 && /welcome|introduction/i.test(title)) {
      return t('lessonPlayback.introStep', { i, n });
    }
    return t('lessonPlayback.step', { i, n });
  }, [currentIndex, lessons.length, currentLesson, t]);

  const contentBlocks = useMemo(() => {
    const blocks = (currentLesson?.content ?? '')
      .split(/\n\n+/)
      .map(b => b.trim())
      .filter(Boolean)
      .map(b => b.replace(/<!--[\s\S]*?-->/g, '').trim())
      .filter(b => Boolean(b) && !/^-{3,}$/.test(b));

    // Merge standalone image-only blocks with the preceding block so no card
    // ever renders as image-with-no-text.
    const merged: string[] = [];
    for (const block of blocks) {
      const isImageOnly = /^!\[.*?\]\(.*?\)\s*$/.test(block);
      if (isImageOnly && merged.length > 0) {
        merged[merged.length - 1] = merged[merged.length - 1] + '\n' + block;
      } else {
        merged.push(block);
      }
    }
    return merged;
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [currentLesson?.id]);

  // totalCards = 1 title card + one card per content block
  const totalCards = contentBlocks.length + 1;
  const isLastCard = cardIndex === totalCards - 1;

  // Reset card index when lesson changes
  useEffect(() => {
    setCardIndex(0);
    setDirection(1);
  }, [currentIndex, currentLesson?.id]);

  // Keep lesson + card in URL so refresh restores position
  useEffect(() => {
    if (loading) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (currentIndex === 0) next.delete('lesson'); else next.set('lesson', String(currentIndex));
        if (cardIndex === 0) next.delete('card'); else next.set('card', String(cardIndex));
        return next;
      },
      { replace: true },
    );
  }, [currentIndex, cardIndex, loading, setSearchParams]);

  const goNextCard = useCallback(() => {
    if (cardIndex < totalCards - 1) {
      setDirection(1);
      setCardIndex(prev => prev + 1);
    }
  }, [cardIndex, totalCards]);

  const goPrevCard = useCallback(() => {
    if (cardIndex > 0) {
      setDirection(-1);
      setCardIndex(prev => prev - 1);
    }
  }, [cardIndex]);

  const isLessonLocked = useCallback(
    (idx: number) => isLessonIndexLocked(lessons, idx),
    [lessons],
  );

  const goTo = useCallback(
    (idx: number) => {
      if (isLessonLocked(idx)) return;
      setCurrentIndex(idx);
      setJustCompleted(false);
    },
    [isLessonLocked],
  );

  /** Previous card within a lesson, or jump to the previous lesson when on the title card. */
  const goPrevious = useCallback(() => {
    if (cardIndex > 0) {
      goPrevCard();
    } else if (currentIndex > 0 && !isLessonLocked(currentIndex - 1)) {
      setDirection(-1);
      setJustCompleted(false);
      goTo(currentIndex - 1);
    }
  }, [cardIndex, currentIndex, goPrevCard, goTo, isLessonLocked]);

  const canGoPrevious =
    cardIndex > 0 || (currentIndex > 0 && !isLessonLocked(currentIndex - 1));

  const isLastLessonLastCard = isLastLesson && isLastCard;

  useEffect(() => {
    if (isLastLessonLastCard && justCompleted) {
      soundManager.play('moduleComplete');
    }
  }, [isLastLessonLastCard, justCompleted]);

  const handleComplete = async () => {
    if (!currentLesson || isCompleted) return;
    setCompleting(true);
    try {
      const res = await api.post('/api/learning/lessons/complete', { lessonId: currentLesson.id });

      const updated = [...lessons];
      updated[currentIndex] = { ...currentLesson, progress: [{ completedAt: new Date() }] };
      setLessons(updated);
      setJustCompleted(true);

      const coins = res.data?.coinsAwarded ?? 500;
      setLastCoinsAwarded(coins);
      const currentCoins = user?.gamification?.coins ?? 0;
      updateGamification({ coins: currentCoins + coins });
      soundManager.play('xpEarn');
      setShowCelebration(true);
    } catch {
      toast.error('Failed to save progress');
    } finally {
      setCompleting(false);
    }
  };

  const handleCelebrationContinue = () => {
    setShowCelebration(false);
    handleContinue();
  };

  const handleContinue = () => {
    if (isLastLesson) {
      goAfterModule();
    } else {
      const nextIdx = currentIndex + 1;
      if (!isLessonLocked(nextIdx)) {
        goTo(nextIdx);
      }
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-6 px-4 pt-10"
        style={{ backgroundColor: '#F8F9FE' }}
      >
        <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4">
          <div className="h-3 w-full rounded-full bg-quest-track" />
          <div className="mt-8 h-4 w-24 rounded bg-quest-track" />
          <div className="h-9 w-2/3 rounded-xl bg-quest-track" />
          <div className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-quest-track" style={{ width: `${85 - i * 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#F8F9FE' }}
      >
        <Icon name="disapprove" className="h-16 w-16 object-contain opacity-90" alt="" />
        <p className="text-sm font-medium text-text-secondary">{t('lessonPlayback.noLessons')}</p>
        <button
          onClick={goBack}
          className="mt-2 text-sm font-extrabold uppercase tracking-wide text-primary-500 hover:underline"
        >
          {t('lessonPlayback.goBack')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col"
      style={{ backgroundColor: '#F8F9FE' }}
    >
      {/* ── Celebrations ── */}
      <AnimatePresence>
        {showCelebration && (
          <LessonCompleteScreen
            coinsAwarded={lastCoinsAwarded}
            onContinue={handleCelebrationContinue}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header
        className="shrink-0 border-b px-4 py-2.5 sm:py-3"
        style={{ backgroundColor: '#F8F9FE', borderColor: '#E0E7FF' }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={goBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-light hover:text-text-primary"
            aria-label={t('lessonPlayback.closeLesson')}
          >
            <Icon name={uiIcons.close} className="h-5 w-5 object-contain" alt="" />
          </button>

          <div className="h-3 flex-1 overflow-hidden rounded-full bg-quest-track">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${headerLessonPositionPct}%`, backgroundColor: '#52D68C' }}
            />
          </div>

        </div>
      </header>

      {/* ── Card area ── */}
      <main className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${currentLesson.id}-${cardIndex}`}
              data-lesson-id={currentLesson.id}
              data-card-index={cardIndex}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex flex-col"
              onClick={() => {
                if (!isLastCard) goNextCard();
              }}
              style={{ cursor: !isLastCard ? 'pointer' : 'default' }}
            >
              {cardIndex === 0 ? (
                /* ── Title card ── */
                <div
                  className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 p-5 sm:rounded-3xl sm:p-7"
                  style={{
                    backgroundColor:
                      currentLesson.mediaUrl && currentLesson.mediaType === 'image'
                        ? '#FFFFFF'
                        : '#F1F4FF',
                    borderColor: '#E0E7FF',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {!(currentLesson.mediaUrl && currentLesson.mediaType === 'image') && (
                    <div
                      className="pointer-events-none absolute bottom-12 left-0 top-12 w-[3px] rounded-full opacity-90 sm:bottom-16 sm:top-16"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(82,214,140,0.4) 0%, rgba(150,230,179,0.12) 50%, transparent 100%)',
                      }}
                      aria-hidden
                    />
                  )}
                  <div className="flex flex-1 flex-col items-center justify-center px-1 text-center">
                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary sm:mb-5 sm:text-[11px]">
                      {moduleTitle}
                    </p>
                    <h1 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-4xl">
                      {currentLesson.title}
                    </h1>
                    <p className="mt-2 text-xs font-bold text-text-secondary sm:mt-3 sm:text-sm">
                      {stepInModuleLabel}
                    </p>

                    {currentLesson.mediaUrl && currentLesson.mediaType === 'image' ? (
                      <div
                        className="mt-6 w-full overflow-hidden rounded-xl border sm:mt-8 sm:rounded-2xl"
                        style={{ borderColor: '#E0E7FF' }}
                      >
                        <img
                          src={currentLesson.mediaUrl}
                          alt={currentLesson.title}
                          className="max-h-[min(38vh,260px)] w-full object-cover object-center sm:max-h-[min(36vh,300px)]"
                        />
                      </div>
                    ) : (
                      <div className="mt-7 flex max-w-sm flex-col items-center gap-2 sm:mt-9">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border sm:h-14 sm:w-14"
                          style={{ borderColor: '#C7D2FE', backgroundColor: 'rgba(150,230,179,0.18)' }}
                        >
                          <Icon name={uiIcons.bookOpen} className="h-6 w-6 opacity-90 sm:h-7 sm:w-7" alt="" />
                        </div>
                        <p className="text-sm font-medium leading-snug text-text-secondary sm:text-base">
                          {t('lessonPlayback.textOnlyStep')}
                        </p>
                      </div>
                    )}

                    <p className="mt-6 text-xs font-semibold text-text-secondary sm:mt-8 sm:text-sm">
                      {t('lessonPlayback.tapNextToRead')}
                    </p>
                  </div>
                </div>
              ) : contentBlocks[cardIndex - 1] != null ? (
                /* ── Content card ── */
                <div className="flex h-full min-h-0 flex-col" onClick={e => e.stopPropagation()}>
                  <ContentCard block={contentBlocks[cardIndex - 1]} lessonId={currentLesson.id} />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Card progress ── */}
        <div className="flex shrink-0 items-center justify-center gap-2 py-2.5 sm:py-3">
          <div className="h-1 max-w-[200px] flex-1 overflow-hidden rounded-full bg-quest-track sm:max-w-[240px]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((cardIndex + 1) / totalCards) * 100}%`,
                backgroundColor: '#52D68C',
              }}
            />
          </div>
          <span className="ml-2 text-[11px] font-bold tabular-nums text-text-secondary">
            {cardIndex + 1}/{totalCards}
          </span>
        </div>
      </main>

      {/* ── Bottom bar ── */}
      <div
        className="shrink-0 border-t pb-[env(safe-area-inset-bottom)]"
        style={{
          borderColor: isLastLessonLastCard && isCompleted ? '#FDBA74' : '#E0E7FF',
          backgroundColor: isLastLessonLastCard && isCompleted ? '#FFFBEB' : '#F8F9FE',
        }}
      >
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6 sm:py-4">
          {isCompleted && isLastLessonLastCard && (
            <div className="mb-3 flex items-center gap-3">
              <Icon name="diploma_1" className="h-9 w-9 object-contain sm:h-10 sm:w-10" alt="" />
              <div>
                <p className="text-sm font-extrabold text-[#FFD700] sm:text-base">{t('lessonPlayback.moduleComplete')}</p>
                <p className="text-xs text-[#9a8a4a] sm:text-sm">{moduleTitle}</p>
              </div>
            </div>
          )}

          {isCompleted && currentIndex > 0 && (
            <div className="mb-2 text-center">
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                className="flex items-center gap-1 mx-auto text-xs font-extrabold uppercase tracking-wide text-text-secondary transition-colors hover:text-text-primary"
              >
                <Icon name={uiIcons.chevronLeft} className="h-3.5 w-3.5 rtl:scale-x-[-1]" alt="" />
                {t('lessonPlayback.previousLesson')}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={goPrevious}
              disabled={!canGoPrevious}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 font-bold text-text-secondary transition-all duration-150 disabled:opacity-25 sm:h-14 sm:w-14"
              style={{ borderColor: '#E0E7FF', backgroundColor: '#FFFFFF' }}
              aria-label={t('lessonPlayback.previousLesson')}
            >
              <Icon name={uiIcons.chevronLeft} className="h-5 w-5 object-contain rtl:scale-x-[-1]" alt="" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLastCard) {
                  goNextCard();
                  return;
                }
                if (!isCompleted) {
                  void handleComplete();
                  return;
                }
                if (!isLastLesson) {
                  handleContinue();
                  return;
                }
                goAfterModule();
              }}
              disabled={completing}
              className={
                isLastLessonLastCard && isCompleted
                  ? 'btn-duo-gold flex-1 !min-h-12 !rounded-2xl !text-sm !font-extrabold sm:!min-h-14 sm:!text-base'
                  : 'btn-duo-green flex-1 !min-h-12 !rounded-2xl !text-sm !font-extrabold sm:!min-h-14 sm:!text-base'
              }
            >
              {completing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : isLastCard ? (
                <>
                  {isCompleted
                    ? isLastLesson
                      ? t('lessonPlayback.keepGoing')
                      : t('lessonPlayback.nextLesson')
                    : t('lessonPlayback.gotItContinue')}
                  <Icon name={uiIcons.arrowRight} className="ms-2 h-5 w-5 object-contain rtl:scale-x-[-1]" alt="" />
                </>
              ) : (
                <>
                  {t('common.next')}
                  <Icon name={uiIcons.arrowRight} className="ms-2 h-5 w-5 object-contain rtl:scale-x-[-1]" alt="" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
