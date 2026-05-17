import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useLocation, Link } from 'react-router-dom';
import { PageContainer } from '../../components/app/PageContainer.js';
import { SideDrawer } from '../../components/app/SideDrawer.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { chatApi, familiesApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { useAppContext } from '../../components/app/AppContext.js';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ── Types ──────────────────────────────────────────────────────────────────
type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: string; createdAt: string; preview?: string | null };
type ChildCtx = { id: string; name: string; age: number | null };

// ── Helpers ────────────────────────────────────────────────────────────────
function getAge(birthday?: string | null): number | null {
  if (!birthday) return null;
  return Math.floor((Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function getSuggestedQuestions(t: TFunction, childName: string | null, age: number | null): { iconName: IconName; text: string }[] {
  if (childName) {
    if (age !== null && age <= 2) return [
      { iconName: 'cell_phone', text: t('chatPage.screenTimeChild', { name: childName }) },
      { iconName: 'biotech', text: t('chatPage.pickyEatingToddler') },
      { iconName: 'clock', text: t('chatPage.sleepRegressionAge', { name: childName }) },
      { iconName: 'voice_presentation', text: t('chatPage.speechDelay') },
    ];
    if (age !== null && age <= 6) return [
      { iconName: 'reading_ebook', text: t('chatPage.learningAtHome', { name: childName }) },
      { iconName: 'disclaimer', text: t('chatPage.managingTantrums') },
      { iconName: 'biotech', text: t('chatPage.pickyEating') },
      { iconName: 'night_landscape', text: t('chatPage.bedtimeRoutine', { name: childName }) },
    ];
    return [
      { iconName: 'cell_phone', text: t('chatPage.screenTimeChild', { name: childName }) },
      { iconName: 'collaboration', text: t('chatPage.socialSkills') },
      { iconName: 'reading', text: t('chatPage.lovingReading') },
      { iconName: 'clock', text: t('chatPage.sleepHabits') },
    ];
  }
  return [
    { iconName: 'cell_phone', text: t('chatPage.screenTimeGeneral') },
    { iconName: 'biotech', text: t('chatPage.pickyEating') },
    { iconName: 'clock', text: t('chatPage.sleepRegressionGeneral') },
    { iconName: 'voice_presentation', text: t('chatPage.speechDelay') },
  ];
}

// ── Markdown preprocessor — normalises LLM output into parseable markdown ─
function preprocessMarkdown(raw: string): string {
  if (!raw) return '';
  let t = raw;

  // 1. Normalise Windows line endings
  t = t.replace(/\r\n/g, '\n');

  // 2. "Heading:- Item" → "Heading:\n\n- Item"
  t = t.replace(/:- /g, ':\n\n- ');

  // 3. Letter/digit immediately before "- **" (no whitespace) e.g. "Recommendations- **Age"
  t = t.replace(/([a-zA-Z0-9,.])-\s\*\*/g, '$1\n\n- **');

  // 4. Space then "- **" in the middle of a line e.g. "text - **Bold**"
  t = t.replace(/([^\n]) - \*\*/g, '$1\n\n- **');

  // 5. ".- **Bold**" (full stop then bullet stuck together)
  t = t.replace(/\.\s?-\s\*\*/g, '.\n\n- **');

  // 6. "### Heading" stuck inline — force double newline before it
  t = t.replace(/([^\n])(#{1,6} )/g, '$1\n\n$2');

  // 7. Single newline before a bullet → double newline (ensure list separation)
  t = t.replace(/([^\n])\n([-*] )/g, '$1\n\n$2');
  t = t.replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2');

  // 8. Letter then "- " (no **): e.g. "guidelinesParents" → shouldn't split, skip.
  //    Only split when bullet text starts with capital or **
  t = t.replace(/([a-z,.])- ([A-Z*])/g, '$1\n\n- $2');

  // 9. Fix headings with no space: "###Word" → "### Word"
  t = t.replace(/^(#{1,6})([^# \n])/gm, '$1 $2');

  // 10. Remove bare hash lines: "#", "##", "###" on their own (no text after)
  t = t.replace(/^#{1,6}\s*$/gm, '');

  return t;
}

// ── Line-by-line renderer — handles mixed content (heading + bullets in one block) ─
function MarkdownContent({ content }: { content: string }) {
  const { t } = useTranslation();
  const artLabel = t('chatPage.recommendedArticle');
  const ri = (text: string) => renderInline(text, artLabel);
  const clean = preprocessMarkdown(content);

  // Render line by line for maximum accuracy
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

  // Group consecutive items of the same list type together
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
    <div className="space-y-2 text-[14px] leading-relaxed text-text-secondary">
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
                  ? 'text-[16px] font-bold text-text-primary mt-1'
                  : h.level === 2
                  ? 'text-[15px] font-bold text-text-primary mt-0.5'
                  : 'text-[14px] font-semibold text-text-primary mt-0.5';
                return <p key={ii} className={cls}>{ri(h.text)}</p>;
              })}
            </div>
          );
        }

        // Text — merge consecutive text lines into one paragraph
        const combined = group.items.map((i) => (i as any).text).join(' ');
        return <p key={gi} className="leading-relaxed">{ri(combined)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string, recommendedArticleLabel: string): React.ReactNode {
  // Support for bold, italic, and links [label](url)
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
                  <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">{recommendedArticleLabel}</div>
                  <div className="text-sm font-bold text-text-primary group-hover:text-primary-300 transition-colors">{label}</div>
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

// ── Status label keys (values resolved via t() inside the component) ──────
const STATUS_LABEL_KEYS: Record<string, string> = {
  loading_context: 'chatPage.loadingContext',
  classifying: 'chatPage.classifying',
  processing_task: 'chatPage.processingTask',
  retrieving_knowledge: 'chatPage.retrievingKnowledge',
  generating_response: 'chatPage.generatingResponse',
};

// ── History panel ─────────────────────────────────────────────────────────
function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full bg-surface flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-[14px] font-bold text-text-primary">{t('chatPage.conversationHistory', 'Conversation history')}</p>
        <button onClick={onClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-light hover:text-text-secondary">
          <Icon name={uiIcons.close} className="h-4 w-4 object-contain" alt="" />
        </button>
      </div>
      <button onClick={onNew}
        className="flex items-center gap-2 border-b border-border px-4 py-3 text-[13px] font-semibold text-primary-400 hover:bg-primary-50 transition-colors">
        <Icon name={uiIcons.plus} className="h-4 w-4 object-contain" alt="" /> {t('chatPage.newConversation')}
      </button>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="p-4 text-center text-[12px] text-text-tertiary">{t('chatPage.noConversations', 'No conversations yet')}</p>
        )}
        {conversations.map((conv) => (
          <div key={conv.id}
            className={`group flex items-start justify-between gap-2 px-4 py-3 border-b border-border cursor-pointer hover:bg-surface-light transition-colors ${
              activeId === conv.id ? 'bg-primary-50' : ''
            }`}
            onClick={() => { onSelect(conv.id); onClose(); }}>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[13px] font-semibold ${activeId === conv.id ? 'text-primary-fg' : 'text-text-primary'}`}>
                {conv.preview || t('chatPage.newConversation')}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">{new Date(conv.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 rounded p-1 text-text-tertiary hover:text-red-500 transition-all">
              <Icon name={uiIcons.trash} className="h-3.5 w-3.5 object-contain" alt="" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export const ChatPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeFamily } = useAppContext();
  const [children, setChildren] = useState<ChildCtx[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | 'general'>('general');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consumedPrefillRef = useRef<string | null>(null);

  // Load children
  useEffect(() => {
    if (!activeFamily) return;
    familiesApi.listChildren(activeFamily.id)
      .then((res) => setChildren((res.children ?? []).map((c: { id: string; name: string; birthday?: string }) => ({ id: c.id, name: c.name, age: getAge(c.birthday) }))))
      .catch(() => {});
  }, [activeFamily]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.listConversations();
      setConversations(data.conversations ?? []);
    } catch {
      // Ignore transient errors and keep existing history list.
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    // If we're already streaming, don't fetch or clear messages - preserve optimistic user bubble.
    if (streaming) return;
    if (!conversationId) { setMessages([]); return; }

    chatApi.getMessages(conversationId)
      .then((data) => setMessages((data.messages ?? []).filter((m: any) => m.role !== 'system')))
      .catch(() => {});
  }, [conversationId, streaming]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const activeChild = useMemo(() => children.find((c) => c.id === activeChildId) ?? null, [children, activeChildId]);

  const switchChild = (id: string | 'general') => {
    abortRef.current?.abort();
    setActiveChildId(id);
    setConversationId(null);
    setMessages([]);
    setStreaming(false);
    setLoadingStatus(null);
  };

  const newConversation = () => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setStreaming(false);
    setLoadingStatus(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // ── Send & stream ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (messageText?: string) => {
    const message = (messageText ?? input).trim();
    if (!message || streaming) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: message }]);
    setStreaming(true);
    setLoadingStatus(t('chatPage.thinking'));

    // Create conversation if needed
    let convId = conversationId;
    if (!convId) {
      try {
        const res = await chatApi.createConversation();
        convId = res.conversation.id;
        setConversationId(convId);
      } catch {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: t('chatPage.couldNotStart') }]);
        setStreaming(false);
        setLoadingStatus(null);
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

      const response = await fetch(`${API_BASE}/api/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuth.getState().token ?? ''}`,
        },
        body: JSON.stringify({ conversationId: convId, message: contextualMessage }),
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

        // ── Parse SSE: split on double-newline event boundaries ──────────
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? ''; // keep incomplete last event

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split('\n');

          let eventName: string | null = null;
          let dataLine: string | null = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataLine = line.slice(6);
          }

          if (!dataLine) continue;

          if (eventName === 'thinking') {
            // Initial "thinking" — conversationId confirmation, ignore
            continue;
          } else if (eventName === 'status') {
            // Status update — show human-readable label
            const key = STATUS_LABEL_KEYS[dataLine];
            setLoadingStatus(key ? t(key) : t('chatPage.thinking'));
          } else if (eventName === 'done') {
            // Stream complete
            setLoadingStatus(null);
          } else if (eventName === 'error') {
            // Stream error
            setLoadingStatus(null);
          } else {
            // No event name = actual content chunk
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
      loadConversations();
    }
  }, [input, streaming, conversationId, activeChild, loadConversations]);

  useEffect(() => {
    const prefillQuestion = (location.state as { prefillQuestion?: string } | null)?.prefillQuestion?.trim();
    if (!prefillQuestion) return;
    if (consumedPrefillRef.current === prefillQuestion) return;
    if (streaming || messages.length > 0) return;

    consumedPrefillRef.current = prefillQuestion;
    void handleSend(prefillQuestion);
  }, [location.state, streaming, messages.length, handleSend]);

  const suggested = getSuggestedQuestions(t, activeChild?.name ?? null, activeChild?.age ?? null);
  const isEmpty = messages.length === 0;
  const placeholder = activeChild
    ? t('chatPage.askAboutChild', { name: activeChild.name })
    : t('chatPage.askParenting');

  return (
    <PageContainer verticalSpacing="normal" contentSpacing="none" className="h-full overflow-hidden">
      {/* ── Compact inline header ── */}
      <div className="flex items-center gap-3 px-1 pb-2">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15">
          <Icon name={appAssetIcons.aiGuide} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-text-primary leading-tight">{t('nav.chat')}</p>
          <p className="text-[11px] text-text-tertiary leading-tight">{t('common.taglineScienceGuidance')}</p>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 min-h-0 text-[12px] font-semibold transition-colors ${
            showHistory ? 'border-brand-blue/50 bg-brand-blue/10 text-brand-blue' : 'border-border bg-surface text-text-secondary hover:bg-surface-light'
          }`}>
          <Icon name={uiIcons.timeline} className="h-3.5 w-3.5 object-contain" alt="" /> {t('chatPage.history', 'History')}
        </button>
        <button onClick={newConversation}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 min-h-0 text-[12px] font-semibold text-text-secondary hover:bg-surface-light transition-colors">
          <Icon name={uiIcons.plus} className="h-3.5 w-3.5 object-contain" alt="" /> {t('common.new', 'New')}
        </button>
      </div>

        {/* ── Chat area ── */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          {isEmpty && !streaming && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center px-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-brand-blue/20 blur-xl" />
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-blue/15">
                  <Icon name={appAssetIcons.aiGuide} className="h-8 w-8 object-contain" alt="" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                  {activeChild ? t('chatPage.talkAboutChild', { name: activeChild.name }) : t('chatPage.askAnything')}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-text-secondary max-w-sm mx-auto">
                  {t('chatPage.evidenceBasedTagline')}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-md">
                {suggested.map((q) => (
                  <button key={q.text} onClick={() => handleSend(q.text)}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-[13px] font-medium text-text-secondary hover:border-brand-blue/50 hover:text-text-primary transition-colors min-h-[44px]">
                    <Icon name={q.iconName} className="h-4 w-4 shrink-0 object-contain" alt="" />
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(!isEmpty || streaming) && (
            <div className="space-y-3">
              {messages.filter((m) => m.role !== 'system').map((msg, idx) => (
                <div key={msg.id}
                  className={`flex items-end gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
                  {msg.role === 'assistant' && (
                    <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15">
                      <Icon name={appAssetIcons.aiGuide} className="h-4 w-4 object-contain" alt="" />
                    </div>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-3 sm:px-4 sm:py-3 ${
                    msg.role === 'user'
                      ? 'bg-brand-blue text-white rounded-br-sm text-[14px]'
                      : 'bg-surface border border-border rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant'
                      ? <MarkdownContent content={msg.content} />
                      : msg.content
                    }
                  </div>
                </div>
              ))}

              {/* Typing indicator bubble */}
              {streaming && loadingStatus && (
                <div className="flex items-end gap-3 justify-start animate-slide-up">
                  <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15">
                    <Icon name={appAssetIcons.aiGuide} className="h-4 w-4 object-contain" alt="" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-1 text-brand-blue">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <p className="mt-1 text-[12px] text-text-tertiary">{loadingStatus}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-surface px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          {/* Child context pills — above textarea */}
          {children.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
              <span className="flex-shrink-0 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">{t('chatPage.contextLabel')}</span>
              {children.map((child) => (
                <button key={child.id} onClick={() => switchChild(child.id)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 min-h-0 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                    activeChildId === child.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-surface-light border border-border text-text-secondary hover:border-brand-blue/40 hover:text-text-primary'
                  }`}>
                  {child.name}{child.age !== null ? ` · ${child.age}${t('chatPage.yearsShort')}` : ''}
                </button>
              ))}
              <button onClick={() => switchChild('general')}
                className={`flex-shrink-0 rounded-full px-3 py-1 min-h-0 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                  activeChildId === 'general'
                    ? 'bg-surface border border-brand-blue/50 text-brand-blue'
                    : 'bg-surface-light border border-border text-text-secondary hover:border-border-dark'
                }`}>
                {t('chatPage.general')}
              </button>
            </div>
          )}
          <div className="flex items-end overflow-hidden rounded-[20px] border border-border bg-surface-light pr-2 pb-2 pl-4 transition-all focus-within:border-brand-blue focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-blue/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={placeholder}
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-none border-0 bg-transparent py-3 text-[14px] text-text-primary shadow-none outline-none ring-0 ring-offset-0 placeholder:text-text-tertiary focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 disabled:opacity-50"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={streaming || !input.trim()}
              className="mb-0.5 ml-2 flex h-9 w-9 min-h-0 flex-shrink-0 items-center justify-center rounded-[14px] bg-brand-blue p-0 text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border-dark disabled:text-text-secondary"
            >
              {streaming ? (
                <Icon name={uiIcons.loader} className="h-4 w-4 shrink-0 animate-spin object-contain" alt="" aria-hidden />
              ) : (
                <Icon name={uiIcons.arrowRight} className="h-4 w-4 shrink-0 object-contain" alt="" aria-hidden />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-text-tertiary">
            {t('chatPage.disclaimer')}
          </p>
        </div>

        </div>

      {showHistory && (
        <SideDrawer
          isVisible={showHistory}
          onClose={() => setShowHistory(false)}
          maxWidthClassName="max-w-full sm:max-w-sm"
          zIndexClassName="z-40"
        >
          <HistoryPanel
            conversations={conversations}
            activeId={conversationId}
            onSelect={(id) => { setConversationId(id); setMessages([]); }}
            onDelete={async (id) => {
              await chatApi.deleteConversation(id);
              if (conversationId === id) newConversation();
              await loadConversations();
            }}
            onClose={() => setShowHistory(false)}
            onNew={() => { newConversation(); setShowHistory(false); }}
          />
        </SideDrawer>
      )}
    </PageContainer>
  );
};
