import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate, Link } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import { Icon, type IconName } from '../icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { chatApi, familiesApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { useAppContext } from '../app/AppContext.js';
import { useChatShell } from './ChatShellContext.js';
import { CardRenderer } from './cards/CardRenderer.js';
import type { Card, CardActionHandlers } from './cards/types.js';
import { OnboardingChat } from './OnboardingChat.js';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type NavCard = { type: 'navLink'; label: string; to: string };
type ToolPill = { id: string; label: string; state: 'running' | 'ok' | 'error'; summary?: string };
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolPills?: ToolPill[];
  navCards?: NavCard[];
  cards?: Card[];
};
type ChildCtx = { id: string; name: string; age: number | null };

function getAge(birthday?: string | null): number | null {
  if (!birthday) return null;
  return Math.floor((Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

type Suggestion = { iconName: IconName; text: string };

function getSuggestedPool(t: TFunction, childName: string | null, age: number | null, isLoggedOut: boolean): Suggestion[] {
  // Action-style prompts mixed in with questions so the hero hints that
  // Raised can also take actions (add events, log moments, etc), not just
  // answer questions. Each branch has a larger pool than we render; the
  // caller shuffles and slices so chips vary on each visit.
  if (childName) {
    if (age !== null && age <= 2) return [
      { iconName: 'cell_phone', text: t('chatPage.screenTimeChild', { name: childName }) },
      { iconName: 'biotech', text: t('chatPage.pickyEatingToddler') },
      { iconName: 'clock', text: t('chatPage.sleepRegressionAge', { name: childName }) },
      { iconName: 'voice_presentation', text: t('chatPage.speechDelay') },
      { iconName: 'calendar', text: t('chatPage.actionAddCheckup', { name: childName, defaultValue: "Add {{name}}'s next check-up to the calendar" }) },
      { iconName: 'checkmark', text: t('chatPage.actionLogFirstSmile', { name: childName, defaultValue: "Log {{name}}'s first smile today" }) },
      { iconName: 'serial_tasks', text: t('chatPage.actionBedtimeChecklist', { name: childName, defaultValue: "Build a bedtime routine for {{name}}" }) },
      { iconName: 'calendar', text: t('chatPage.actionReminderBottles', { defaultValue: 'Remind me to sterilise bottles every evening' }) },
    ];
    if (age !== null && age <= 6) return [
      { iconName: 'reading_ebook', text: t('chatPage.learningAtHome', { name: childName }) },
      { iconName: 'disclaimer', text: t('chatPage.managingTantrums') },
      { iconName: 'biotech', text: t('chatPage.pickyEating') },
      { iconName: 'night_landscape', text: t('chatPage.bedtimeRoutine', { name: childName }) },
      { iconName: 'calendar', text: t('chatPage.actionAddDentist', { name: childName, defaultValue: "Schedule {{name}}'s dentist visit for next Tuesday at 4pm" }) },
      { iconName: 'checkmark', text: t('chatPage.actionLogMilestone', { name: childName, defaultValue: 'Log that {{name}} started riding a bike today' }) },
      { iconName: 'serial_tasks', text: t('chatPage.actionPackingList', { defaultValue: 'Build a packing list for a weekend trip with toddlers' }) },
      { iconName: 'calendar', text: t('chatPage.actionScreenTimeRules', { defaultValue: 'Help me set screen-time rules at home' }) },
    ];
    return [
      { iconName: 'cell_phone', text: t('chatPage.screenTimeChild', { name: childName }) },
      { iconName: 'collaboration', text: t('chatPage.socialSkills') },
      { iconName: 'reading', text: t('chatPage.lovingReading') },
      { iconName: 'clock', text: t('chatPage.sleepHabits') },
      { iconName: 'calendar', text: t('chatPage.actionAddParentTeacher', { name: childName, defaultValue: "Add {{name}}'s parent-teacher meeting to the calendar" }) },
      { iconName: 'checkmark', text: t('chatPage.actionLogReport', { name: childName, defaultValue: "Log {{name}}'s school report" }) },
      { iconName: 'serial_tasks', text: t('chatPage.actionHomeworkRoutine', { defaultValue: 'Build a homework routine that actually sticks' }) },
      { iconName: 'calendar', text: t('chatPage.actionWeeklyChores', { defaultValue: 'Plan weekly chores I can share with my partner' }) },
    ];
  }
  // Logged-out visitors: showcase a question per major life stage AND a
  // couple of action examples so they understand the product can also act,
  // not just chat.
  if (isLoggedOut) {
    return [
      { iconName: 'biotech', text: t('chatPage.qPregnancy', 'Is it normal to feel Braxton Hicks at 34 weeks?') },
      { iconName: 'night_landscape', text: t('chatPage.qBaby', "Why won't my 4-month-old sleep through the night?") },
      { iconName: 'disclaimer', text: t('chatPage.qToddler', 'How do I handle tantrums without losing it?') },
      { iconName: 'cell_phone', text: t('chatPage.qTeen', 'How should I talk to my teen about social media?') },
      { iconName: 'calendar', text: t('chatPage.actionAddVaccination', { defaultValue: "Add my baby's vaccination to the calendar" }) },
      { iconName: 'checkmark', text: t('chatPage.actionLogFirstStep', { defaultValue: 'Log my toddler’s first step' }) },
      { iconName: 'serial_tasks', text: t('chatPage.actionWeaningPlan', { defaultValue: 'Build a 4-week weaning plan' }) },
    ];
  }
  return [
    { iconName: 'cell_phone', text: t('chatPage.screenTimeGeneral') },
    { iconName: 'biotech', text: t('chatPage.pickyEating') },
    { iconName: 'clock', text: t('chatPage.sleepRegressionGeneral') },
    { iconName: 'voice_presentation', text: t('chatPage.speechDelay') },
    { iconName: 'calendar', text: t('chatPage.actionAddAppointment', { defaultValue: 'Add a doctor appointment for next Tuesday at 4pm' }) },
    { iconName: 'checkmark', text: t('chatPage.actionLogMoment', { defaultValue: 'Log a new milestone for my child' }) },
    { iconName: 'serial_tasks', text: t('chatPage.actionBedtimePlan', { defaultValue: 'Build a calmer bedtime routine' }) },
    { iconName: 'calendar', text: t('chatPage.actionRemindVitamins', { defaultValue: 'Remind me to give vitamins every morning' }) },
  ];
}

function pickRandom<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function preprocessMarkdown(raw: string): string {
  if (!raw) return '';
  let t = raw;
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/:- /g, ':\n\n- ');
  t = t.replace(/([a-zA-Z0-9,.])-\s\*\*/g, '$1\n\n- **');
  t = t.replace(/([^\n]) - \*\*/g, '$1\n\n- **');
  t = t.replace(/\.\s?-\s\*\*/g, '.\n\n- **');
  t = t.replace(/([^\n])(#{1,6} )/g, '$1\n\n$2');
  t = t.replace(/([^\n])\n([-*] )/g, '$1\n\n$2');
  t = t.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');
  t = t.replace(/([a-z,.])- ([A-Z*])/g, '$1\n\n- $2');
  t = t.replace(/^(#{1,6})([^# \n])/gm, '$1 $2');
  t = t.replace(/^#{1,6}\s*$/gm, '');
  return t;
}

function MarkdownContent({ content }: { content: string }) {
  const { t } = useTranslation();
  const artLabel = t('chatPage.recommendedArticle');
  const ri = (text: string) => renderInline(text, artLabel);
  const clean = preprocessMarkdown(content);

  const lines = clean.split('\n');

  type MdBlock =
    | { type: 'heading'; level: 1|2|3; text: string }
    | { type: 'bullet'; text: string }
    | { type: 'ordered'; n: number; text: string }
    | { type: 'blank' }
    | { type: 'text'; text: string };

  const parsed: MdBlock[] = lines.map((line): MdBlock => {
    const h3 = line.match(/^### (.+)/);
    if (h3) return { type: 'heading', level: 3, text: h3[1] };
    const h2 = line.match(/^## (.+)/);
    if (h2) return { type: 'heading', level: 2, text: h2[1] };
    const h1 = line.match(/^# (.+)/);
    if (h1) return { type: 'heading', level: 1, text: h1[1] };
    const bullet = line.match(/^[-*] (.+)/);
    if (bullet) return { type: 'bullet', text: bullet[1] };
    const ordered = line.match(/^(\d+)\. (.+)/);
    if (ordered) return { type: 'ordered', n: parseInt(ordered[1]), text: ordered[2] };
    if (!line.trim()) return { type: 'blank' };
    return { type: 'text', text: line };
  });

  const groups: Array<{ kind: string; items: MdBlock[] }> = [];
  for (const block of parsed) {
    const last = groups[groups.length - 1];
    const kind = block.type === 'bullet' ? 'ul'
      : block.type === 'ordered' ? 'ol'
      : block.type;
    if (last && last.kind === kind) {
      last.items.push(block);
    } else {
      groups.push({ kind, items: [block] });
    }
  }

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-text-primary">
      {groups.map((group, gi) => {
        if (group.kind === 'blank') return null;

        if (group.kind === 'ul') {
          return (
            <ul key={gi} className="space-y-2 my-1">
              {group.items.map((item, ii) => {
                const text = (item as Extract<MdBlock, { text: string }>).text || '';
                const isArticle = /\[[^\]]+\]\(\/app\/resources\/[^)]+\)/.test(text);
                return (
                  <li key={ii} className="flex items-start gap-2.5">
                    {!isArticle && <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-blue" />}
                    <span className="flex-1">{ri(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        if (group.kind === 'ol') {
          return (
            <ol key={gi} className="space-y-2 my-1">
              {group.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 font-semibold text-brand-blue text-[13px] mt-0.5">{(item as Extract<MdBlock, { n: number }>).n ?? ii + 1}.</span>
                  <span className="flex-1">{ri((item as Extract<MdBlock, { text: string }>).text)}</span>
                </li>
              ))}
            </ol>
          );
        }

        if (group.kind === 'heading') {
          return (
            <div key={gi} className="space-y-0.5">
              {group.items.map((item, ii) => {
                const h = item as Extract<MdBlock, { type: 'heading' }>;
                const cls = h.level === 1
                  ? 'text-[18px] font-bold text-text-primary mt-1'
                  : h.level === 2
                  ? 'text-[16px] font-bold text-text-primary mt-0.5'
                  : 'text-[15px] font-semibold text-text-primary mt-0.5';
                return <p key={ii} className={cls}>{ri(h.text)}</p>;
              })}
            </div>
          );
        }

        const combined = group.items.map((i) => (i as { text?: string }).text ?? '').join(' ');
        return <p key={gi} className="leading-relaxed">{ri(combined)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string, recommendedArticleLabel: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const isInternal = url.startsWith('/');
      const isArticle = url.includes('/app/resources/');

      if (isArticle) {
        return (
          <Link
            key={i}
            to={url}
            className="block my-4 p-4 bg-surface border border-border-light rounded-2xl hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <Icon name={uiIcons.bookOpen} className="h-5 w-5 object-contain opacity-80" alt="" />
                </div>
                <div>
                  <div className="mb-0.5 text-[11px] font-bold text-primary-500">{recommendedArticleLabel}</div>
                  <div className="text-sm font-bold text-text-primary group-hover:text-primary-600 transition-colors">{label}</div>
                </div>
              </div>
              <Icon name={uiIcons.chevronRight} className="h-5 w-5 object-contain opacity-60 transition-all group-hover:translate-x-1" alt="" />
            </div>
          </Link>
        );
      }

      if (isInternal) {
        return (
          <Link
            key={i}
            to={url}
            className="text-primary-400 font-bold underline hover:text-primary-300 transition-colors"
          >
            {label}
          </Link>
        );
      }

      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-400 font-bold underline hover:text-primary-300 transition-colors"
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  loading_context: 'chatPage.loadingContext',
  classifying: 'chatPage.classifying',
  processing_task: 'chatPage.processingTask',
  retrieving_knowledge: 'chatPage.retrievingKnowledge',
  generating_response: 'chatPage.generatingResponse',
};

function ToolPillsRow({ pills }: { pills: ToolPill[] }) {
  if (!pills.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {pills.map((p) => {
        const tone =
          p.state === 'ok'
            ? 'bg-primary-50 text-primary-fg border-primary-200'
            : p.state === 'error'
            ? 'bg-error/10 text-error border-error/30'
            : 'bg-brand-blue/10 text-brand-blue border-brand-blue/30';
        return (
          <span
            key={p.id}
            title={p.summary}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}
          >
            {p.state === 'running' && <span className="typing-dot" />}
            {p.label}
          </span>
        );
      })}
    </div>
  );
}

function NavCardsRow({ cards }: { cards: NavCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {cards.map((c, i) => (
        <Link
          key={`${c.to}-${i}`}
          to={c.to}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-[13px] font-semibold text-brand-blue hover:bg-brand-blue/10"
        >
          {c.label}
          <span aria-hidden>→</span>
        </Link>
      ))}
    </div>
  );
}

export const ChatPanel = () => {
  const { t, i18n } = useTranslation();
  const posthog = usePostHog();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { activeFamily } = useAppContext();
  const {
    activeConversationId,
    setActiveConversationId,
    newConversationNonce,
  } = useChatShell();

  const [children, setChildren] = useState<ChildCtx[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | 'general'>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [guestUsedTurn, setGuestUsedTurn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('guestTurnUsed') === '1';
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  // Load children for the active family
  const refreshChildren = useCallback(() => {
    if (!activeFamily || !token) {
      setChildren([]);
      return;
    }
    familiesApi.listChildren(activeFamily.id)
      .then((res) => setChildren((res.children ?? []).map((c: { id: string; name: string; birthday?: string }) => ({ id: c.id, name: c.name, age: getAge(c.birthday) }))))
      .catch(() => {});
  }, [activeFamily, token]);

  useEffect(() => { refreshChildren(); }, [refreshChildren]);

  // Tool names that mutate the children list; on a successful tool_finish for
  // any of these, refetch so the sidebar reflects the change without a reload.
  const CHILD_MUTATION_TOOLS = useMemo(
    () => new Set(['children_add', 'children_update', 'children_delete']),
    [],
  );

  // Hydrate messages only when the conversation changes. We intentionally do NOT
  // depend on `streaming` here: re-running this effect when a stream ends would
  // overwrite freshly-streamed local state with whatever the server has
  // persisted, causing flicker or duplicate user messages if a previous
  // submission ever raced.
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    if (!token) return;
    if (sendingRef.current) return;

    chatApi.getMessages(activeConversationId)
      .then((data) => setMessages(
        ((data.messages ?? []) as Array<{
          id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          citations?: unknown;
        }>)
          .filter((m) => m.role !== 'system')
          .map((m) => {
            const cites = m.citations && typeof m.citations === 'object'
              ? (m.citations as { navCards?: unknown; cards?: unknown })
              : null;
            const navCards = Array.isArray(cites?.navCards) ? (cites.navCards as NavCard[]) : undefined;
            const cards = Array.isArray(cites?.cards) ? (cites.cards as Card[]) : undefined;
            return { id: m.id, role: m.role, content: m.content, navCards, cards };
          })
      ))
      .catch(() => {});
  }, [activeConversationId, token]);

  // Sidebar requested "new conversation" — reset local state
  useEffect(() => {
    if (newConversationNonce === 0) return;
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setLoadingStatus(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [newConversationNonce]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  );

  const switchChild = (id: string | 'general') => {
    abortRef.current?.abort();
    setActiveChildId(id);
    setActiveConversationId(null);
    setMessages([]);
    setStreaming(false);
    setLoadingStatus(null);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setLoadingStatus(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleSend = useCallback(async (messageText?: string) => {
    const message = (messageText ?? input).trim();
    if (!message) return;
    // Synchronous guard: blocks double-clicks / double-Enter in the same React
    // tick before `streaming` state has had a chance to update.
    if (sendingRef.current) return;
    sendingRef.current = true;

    // Guest path: visitors get one free turn through the public /guest-query
    // endpoint. After that, sends bounce to /login with both the draft message
    // and the local conversation preserved so the post-signup landing can
    // restore continuity.
    if (!token) {
      if (guestUsedTurn) {
        try {
          localStorage.setItem('pendingChatMessage', message);
        } catch {
          // localStorage unavailable; non-fatal.
        }
        posthog.capture('guest_send_after_wall', { message_length: message.length });
        sendingRef.current = false;
        navigate('/login?next=/');
        return;
      }

      posthog.capture('guest_send_clicked', {
        message_length: message.length,
        locale: i18n.language,
      });

      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';

      const userId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const guestAssistantId = (Date.now() + 1).toString();
      const abort = new AbortController();
      abortRef.current = abort;
      let hasContent = false;

      setMessages((prev) => [...prev, { id: userId, role: 'user', content: message }]);
      setStreaming(true);
      setLoadingStatus(t('chatPage.thinking'));

      try {
        const response = await fetch(`${API_BASE}/api/guest-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, locale: i18n.language }),
          signal: abort.signal,
        });

        if (response.status === 429) {
          posthog.capture('guest_answer_rate_limited');
          throw new Error(t('chatPage.guestRateLimited', 'Too many free questions, sign in to keep going.'));
        }
        if (!response.ok) throw new Error(`Server ${response.status}`);
        if (!response.body) throw new Error('No stream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            if (!rawEvent.trim()) continue;
            const lines = rawEvent.split('\n');
            let eventName: string | null = null;
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('event: ')) eventName = line.slice(7).trim();
              else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
            }
            if (dataLines.length === 0) continue;
            const dataLine = dataLines.join('\n');

            if (eventName === 'done') {
              setLoadingStatus(null);
            } else if (eventName === 'error') {
              setLoadingStatus(null);
              let errorText = t('chatPage.somethingWentWrong', 'Sorry, something went wrong. Please try again.');
              try {
                const parsed = JSON.parse(dataLine);
                if (parsed?.error) errorText = parsed.error;
              } catch {
                // dataLine wasn't JSON; fall back to default message
              }
              if (!hasContent) {
                hasContent = true;
                setMessages((prev) => [...prev, { id: guestAssistantId, role: 'assistant', content: errorText }]);
              }
            } else if (!eventName) {
              if (!hasContent) {
                hasContent = true;
                setLoadingStatus(null);
                setMessages((prev) => [...prev, { id: guestAssistantId, role: 'assistant', content: '' }]);
              }
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.id === guestAssistantId) {
                  updated[updated.length - 1] = { ...last, content: last.content + dataLine };
                }
                return updated;
              });
            }
          }
        }

        if (hasContent) {
          sessionStorage.setItem('guestTurnUsed', '1');
          setGuestUsedTurn(true);
          posthog.capture('guest_answer_completed');
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError' && !hasContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: guestAssistantId,
              role: 'assistant',
              content: (err as Error)?.message || t('chatPage.somethingWentWrong', 'Sorry, something went wrong. Please try again.'),
            },
          ]);
        }
      } finally {
        setStreaming(false);
        setLoadingStatus(null);
        sendingRef.current = false;
      }
      return;
    }

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const clientMessageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    posthog.capture('chat_message_sent', {
      message_length: message.length,
      has_active_child: !!activeChild,
    });
    setMessages((prev) => [...prev, { id: clientMessageId, role: 'user', content: message }]);
    setStreaming(true);
    setLoadingStatus(t('chatPage.thinking'));

    let convId = activeConversationId;
    if (!convId) {
      try {
        const res = await chatApi.createConversation();
        convId = res.conversation.id;
        setActiveConversationId(convId);
      } catch {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: t('chatPage.couldNotStart') }]);
        setStreaming(false);
        setLoadingStatus(null);
        sendingRef.current = false;
        return;
      }
    }

    const assistantId = (Date.now() + 1).toString();
    const abort = new AbortController();
    abortRef.current = abort;
    let hasContent = false;

    try {
      const contextualMessage = activeChild
        ? `[Context: ${activeChild.name}, age ${activeChild.age ?? 'unknown'}] ${message}`
        : message;

      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuth.getState().token ?? ''}`,
        },
        body: JSON.stringify({
          conversationId: convId,
          message: contextualMessage,
          locale: i18n.language,
          clientMessageId,
        }),
        signal: abort.signal,
      });

      if (!response.ok) throw new Error(`Server ${response.status}: ${response.statusText}`);
      if (!response.body) throw new Error('No stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split('\n');

          let eventName: string | null = null;
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
          }

          if (dataLines.length === 0) continue;
          const dataLine = dataLines.join('\n');

          if (eventName === 'thinking') {
            continue;
          } else if (eventName === 'status') {
            const key = STATUS_LABEL_KEYS[dataLine];
            setLoadingStatus(key ? t(key) : t('chatPage.thinking'));
          } else if (eventName === 'tool_start') {
            try {
              const payload = JSON.parse(dataLine) as { name: string; label: string };
              const pillId = `${payload.name}-${Date.now()}-${Math.random()}`;
              setLoadingStatus(null);
              setMessages((prev) => {
                const updated = [...prev];
                let target = updated[updated.length - 1];
                if (!target || target.id !== assistantId) {
                  target = { id: assistantId, role: 'assistant', content: '', toolPills: [], navCards: [] };
                  updated.push(target);
                  hasContent = true;
                }
                target.toolPills = [
                  ...(target.toolPills ?? []),
                  { id: pillId, label: payload.label, state: 'running' },
                ];
                updated[updated.length - 1] = { ...target };
                return updated;
              });
            } catch {
              // ignore malformed payload
            }
          } else if (eventName === 'tool_finish') {
            try {
              const payload = JSON.parse(dataLine) as { name: string; ok: boolean; summary: string };
              setMessages((prev) => {
                const updated = [...prev];
                const target = updated[updated.length - 1];
                if (!target || target.id !== assistantId) return prev;
                const pills = (target.toolPills ?? []).slice();
                for (let i = pills.length - 1; i >= 0; i--) {
                  if (pills[i].state === 'running') {
                    pills[i] = {
                      ...pills[i],
                      state: payload.ok ? 'ok' : 'error',
                      summary: payload.summary,
                    };
                    break;
                  }
                }
                updated[updated.length - 1] = { ...target, toolPills: pills };
                return updated;
              });
              if (payload.ok && CHILD_MUTATION_TOOLS.has(payload.name)) {
                refreshChildren();
              }
            } catch {
              // ignore malformed payload
            }
          } else if (eventName === 'nav_card') {
            try {
              const card = JSON.parse(dataLine) as NavCard;
              setMessages((prev) => {
                const updated = [...prev];
                let target = updated[updated.length - 1];
                if (!target || target.id !== assistantId) {
                  target = { id: assistantId, role: 'assistant', content: '', toolPills: [], navCards: [] };
                  updated.push(target);
                  hasContent = true;
                }
                target.navCards = [...(target.navCards ?? []), card];
                updated[updated.length - 1] = { ...target };
                return updated;
              });
            } catch {
              // ignore malformed payload
            }
          } else if (eventName === 'card') {
            try {
              const card = JSON.parse(dataLine) as Card;
              setLoadingStatus(null);
              setMessages((prev) => {
                const updated = [...prev];
                let target = updated[updated.length - 1];
                if (!target || target.id !== assistantId) {
                  target = { id: assistantId, role: 'assistant', content: '', toolPills: [], navCards: [], cards: [] };
                  updated.push(target);
                  hasContent = true;
                }
                target.cards = [...(target.cards ?? []), card];
                updated[updated.length - 1] = { ...target };
                return updated;
              });
            } catch {
              // ignore malformed payload
            }
          } else if (eventName === 'done') {
            setLoadingStatus(null);
          } else if (eventName === 'error') {
            setLoadingStatus(null);
            let errorText = t('chatPage.somethingWentWrong', 'Sorry, something went wrong. Please try again.');
            try {
              const parsed = JSON.parse(dataLine);
              if (parsed?.error) errorText = parsed.error;
            } catch {
              // dataLine wasn't JSON; fall back to default message
            }
            if (!hasContent) {
              hasContent = true;
              setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: errorText }]);
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.id === assistantId) {
                  updated[updated.length - 1] = { ...last, content: `${last.content}\n\n${errorText}` };
                }
                return updated;
              });
            }
          } else {
            if (!hasContent) {
              hasContent = true;
              setLoadingStatus(null);
              setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
            }
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.id === assistantId) {
                updated[updated.length - 1] = { ...last, content: last.content + dataLine };
              }
              return updated;
            });
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!hasContent) {
        setMessages((prev) => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: `Sorry, something went wrong: ${(err as Error).message ?? 'unknown error'}`,
        }]);
      }
    } finally {
      setStreaming(false);
      setLoadingStatus(null);
      sendingRef.current = false;
    }
  }, [input, activeConversationId, activeChild, token, guestUsedTurn, navigate, t, i18n.language, setActiveConversationId, refreshChildren, CHILD_MUTATION_TOOLS]);

  const gotoSignIn = useCallback(() => {
    try {
      const guestMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      if (guestMessages.length > 0) {
        localStorage.setItem('guestConversation', JSON.stringify(guestMessages));
      }
      posthog.capture('guest_signin_from_wall_clicked', {
        messages_count: guestMessages.length,
      });
    } catch {
      // localStorage unavailable; non-fatal.
    }
    navigate('/login?next=/');
  }, [messages, navigate, posthog]);

  // Fire once when the conversion wall first appears for this session.
  useEffect(() => {
    if (!token && guestUsedTurn) {
      posthog.capture('guest_wall_seen');
    }
  }, [token, guestUsedTurn, posthog]);

  // After login, replay any pending draft saved before the login redirect AND
  // rehydrate the local guest conversation so the visitor sees Q1/A1 above
  // their new authenticated send. Guest messages live locally only; they are
  // not migrated server-side.
  useEffect(() => {
    if (!token) return;

    let restored: ChatMessage[] = [];
    try {
      const raw = localStorage.getItem('guestConversation');
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ role: 'user' | 'assistant'; content: string }>;
        restored = parsed.map((m, i) => ({ id: `guest-${i}-${Date.now()}`, role: m.role, content: m.content }));
        localStorage.removeItem('guestConversation');
      }
    } catch {
      // ignore malformed payload
    }
    if (restored.length > 0) {
      setMessages(restored);
      posthog.capture('guest_conversation_rehydrated_after_signin', {
        messages_count: restored.length,
      });
    }
    try {
      sessionStorage.removeItem('guestTurnUsed');
    } catch {
      // sessionStorage unavailable; non-fatal.
    }
    setGuestUsedTurn(false);

    const pending = localStorage.getItem('pendingChatMessage');
    if (pending) {
      localStorage.removeItem('pendingChatMessage');
      posthog.capture('pending_message_replayed_after_signin', {
        message_length: pending.length,
      });
      void handleSend(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const suggested = useMemo(
    () => pickRandom(getSuggestedPool(t, activeChild?.name ?? null, activeChild?.age ?? null, !token), 4),
    // Re-shuffle when the relevant inputs change OR when the user lands on
    // the empty-state hero again. `messages.length === 0` keeps the chips
    // varied across new conversations without reshuffling mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChild?.id, !token, messages.length === 0, i18n.language],
  );
  const isEmpty = messages.length === 0;
  const placeholder = activeChild
    ? t('chatPage.askAboutChild', { name: activeChild.name })
    : t('chatPage.askParenting');

  const cardHandlers = useMemo<CardActionHandlers>(
    () => ({
      onSend: (message: string) => {
        void handleSend(message);
      },
      onNavigate: (to: string) => {
        navigate(to);
      },
    }),
    [handleSend, navigate],
  );

  // Chat-native onboarding: logged-in but not yet onboarded users see a
  // scripted conversation in place of the normal chat. On completion the
  // user object flips onboarded=true and this branch unmounts, revealing
  // the real chat with their first question already sent (if they tapped
  // a suggestion chip).
  if (token && user && !user.profile?.onboarded) {
    return (
      <OnboardingChat
        onComplete={(firstQuestion) => {
          if (firstQuestion) {
            void handleSend(firstQuestion);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty && !streaming && (
          <div className="mx-auto flex max-w-2xl min-h-[300px] flex-col items-center justify-center gap-5 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary-200 blur-xl" />
              <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-100">
                <Icon name={appAssetIcons.aiGuide} className="h-8 w-8 object-contain" alt="" />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-[12px] font-bold text-primary-fg">
              <Icon name={appAssetIcons.aiGuide} className="h-3 w-3 object-contain" alt="" />
              {t('chatPage.aiAssistantBadge', 'AI parenting assistant')}
            </span>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-[32px]">
                {activeChild
                  ? t('chatPage.talkAboutChild', { name: activeChild.name })
                  : !token
                  ? t('chatPage.welcomeTitle', 'Raised: your science-backed parenting guide')
                  : t('chatPage.askAnything', 'Ask any parenting question')}
              </h1>
              <p className="mt-3 text-[16px] leading-relaxed text-text-primary max-w-lg mx-auto">
                {!token && !activeChild
                  ? t('chatPage.welcomeSubtitle', 'From pregnancy through 18. Ask about sleep, milestones, tantrums, nutrition, or anything else on your mind. Every answer is backed by pediatric science and trusted sources.')
                  : t('chatPage.evidenceBasedTagline', 'Raised answers in seconds with guidance backed by pediatric science, tailored to your child\'s age, with sources you can check.')}
              </p>
            </div>
            <div className="grid w-full max-w-md grid-cols-3 gap-2 text-[12px]">
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3">
                <Icon name={uiIcons.shieldCheck} className="h-5 w-5 object-contain text-primary-500" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp1', 'Evidence-based')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3">
                <Icon name={uiIcons.baby} className="h-5 w-5 object-contain text-primary-500" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp2', 'Age-appropriate')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3">
                <Icon name={uiIcons.bookOpen} className="h-5 w-5 object-contain text-primary-500" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp3', 'Sourced answers')}</span>
              </div>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2">
              {suggested.map((q) => (
                <button
                  key={q.text}
                  onClick={() => handleSend(q.text)}
                  className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-[14px] font-medium text-text-primary transition-colors hover:border-primary-400 hover:bg-surface-light"
                >
                  <Icon name={q.iconName} className="h-5 w-5 shrink-0 object-contain" alt="" />
                  <span>{q.text}</span>
                </button>
              ))}
            </div>
            {!token && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={gotoSignIn}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-[15px] font-bold text-white shadow-sm hover:bg-primary-600 min-h-[44px]"
                >
                  <Icon name={uiIcons.user} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                  {t('chatPage.signInToChat')}
                </button>
                <p className="text-[13px] text-text-secondary">
                  {t('chatPage.signInToChatHint', 'Or ask one question first, no account needed.')}
                </p>
              </div>
            )}
          </div>
        )}

        {(!isEmpty || streaming) && (
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.filter((m) => m.role !== 'system').map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex items-end gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
              >
                {msg.role === 'assistant' && (
                  <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
                    <Icon name={appAssetIcons.aiGuide} className="h-4 w-4 object-contain" alt="" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-3 sm:px-4 sm:py-3 ${
                  msg.role === 'user'
                    ? 'bg-brand-blue text-white rounded-br-sm text-[15px] leading-relaxed'
                    : 'bg-surface border border-border rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.toolPills && msg.toolPills.length > 0 && <ToolPillsRow pills={msg.toolPills} />}
                      <MarkdownContent content={msg.content} />
                      {msg.cards && msg.cards.length > 0 && (
                        <CardRenderer cards={msg.cards} handlers={cardHandlers} />
                      )}
                      {msg.navCards && msg.navCards.length > 0 && <NavCardsRow cards={msg.navCards} />}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {streaming && loadingStatus && (
              <div className="flex items-end gap-3 justify-start animate-slide-up">
                <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
                  <Icon name={appAssetIcons.aiGuide} className="h-4 w-4 object-contain" alt="" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
                  <div className="flex items-center gap-1 text-primary-500">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">{loadingStatus}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-surface px-4 pb-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {token && children.length > 0 && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              <span className="flex-shrink-0 text-[12px] font-semibold text-text-tertiary">
                {t('chatPage.contextLabel')}
              </span>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => switchChild(child.id)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 min-h-0 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                    activeChildId === child.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-surface-light border border-border text-text-primary hover:border-brand-blue/40'
                  }`}
                >
                  {child.name}{child.age !== null ? ` · ${child.age}${t('chatPage.yearsShort')}` : ''}
                </button>
              ))}
              <button
                onClick={() => switchChild('general')}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 min-h-0 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeChildId === 'general'
                    ? 'bg-surface border border-brand-blue/50 text-brand-blue'
                    : 'bg-surface-light border border-border text-text-primary hover:border-border-dark'
                }`}
              >
                {t('chatPage.general')}
              </button>
            </div>
          )}

          {!token && guestUsedTurn && !streaming ? (
            <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-brand-blue/40 bg-brand-blue/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-text-primary">
                  {t('chatPage.guestWallTitle', 'Save this conversation and ask follow-ups')}
                </p>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  {t('chatPage.guestWallSubtitle', 'Free account, takes about 30 seconds. Your question and answer come with you.')}
                </p>
              </div>
              <button
                type="button"
                onClick={gotoSignIn}
                className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-accent-blueHover"
              >
                <Icon name={uiIcons.user} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                {t('chatPage.guestWallCta', 'Sign in to continue')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end overflow-hidden rounded-[20px] border border-border bg-surface-light pr-2 pb-2 pl-4 transition-all focus-within:border-brand-blue focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-blue/20">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={placeholder}
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-none border-0 bg-transparent py-3 text-[15px] leading-relaxed text-text-primary shadow-none outline-none ring-0 ring-offset-0 placeholder:text-text-secondary focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 disabled:opacity-50"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="mb-1 ml-2 inline-flex h-11 min-h-0 flex-shrink-0 items-center gap-1.5 rounded-full bg-error/10 px-4 text-[14px] font-bold text-error hover:bg-error/20"
                  >
                    <Icon name={uiIcons.stopSquare} className="h-4 w-4 object-contain" alt="" />
                    {t('chatPage.stop')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="mb-1 ml-2 inline-flex h-11 min-h-0 flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-blue px-4 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-accent-blueHover disabled:cursor-not-allowed disabled:bg-border-dark disabled:text-text-secondary"
                  >
                    {t('chatPage.send')}
                    <Icon name={uiIcons.send} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                  </button>
                )}
              </div>
              {!token && !guestUsedTurn && !isEmpty && (
                <p className="mt-2 text-center text-[12px] text-text-secondary">
                  {t('chatPage.guestFreeTurnHint', 'One free question, no account needed.')}
                </p>
              )}
            </>
          )}
          <p className="mt-2 text-center text-[12px] text-text-secondary">
            {t('chatPage.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
};
