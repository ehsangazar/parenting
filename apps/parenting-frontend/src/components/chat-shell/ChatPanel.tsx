import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Icon, type IconName } from '../icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { chatApi, familiesApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { useAppContext } from '../app/AppContext.js';
import { useChatShell } from './ChatShellContext.js';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string };
type ChildCtx = { id: string; name: string; age: number | null };

function getAge(birthday?: string | null): number | null {
  if (!birthday) return null;
  return Math.floor((Date.now() - new Date(birthday).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function getSuggestedQuestions(t: TFunction, childName: string | null, age: number | null, isLoggedOut: boolean): { iconName: IconName; text: string }[] {
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
  // Logged-out visitors: showcase a question per major life stage so they
  // see the product spans pregnancy through teens.
  if (isLoggedOut) {
    return [
      { iconName: 'biotech', text: t('chatPage.qPregnancy', 'Is it normal to feel Braxton Hicks at 34 weeks?') },
      { iconName: 'night_landscape', text: t('chatPage.qBaby', "Why won't my 4-month-old sleep through the night?") },
      { iconName: 'disclaimer', text: t('chatPage.qToddler', 'How do I handle tantrums without losing it?') },
      { iconName: 'cell_phone', text: t('chatPage.qTeen', 'How should I talk to my teen about social media?') },
    ];
  }
  return [
    { iconName: 'cell_phone', text: t('chatPage.screenTimeGeneral') },
    { iconName: 'biotech', text: t('chatPage.pickyEating') },
    { iconName: 'clock', text: t('chatPage.sleepRegressionGeneral') },
    { iconName: 'voice_presentation', text: t('chatPage.speechDelay') },
  ];
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

        const combined = group.items.map((i) => (i as any).text).join(' ');
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

const STATUS_LABEL_KEYS: Record<string, string> = {
  loading_context: 'chatPage.loadingContext',
  classifying: 'chatPage.classifying',
  processing_task: 'chatPage.processingTask',
  retrieving_knowledge: 'chatPage.retrievingKnowledge',
  generating_response: 'chatPage.generatingResponse',
};

export const ChatPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load children for the active family
  useEffect(() => {
    if (!activeFamily || !token) {
      setChildren([]);
      return;
    }
    familiesApi.listChildren(activeFamily.id)
      .then((res) => setChildren((res.children ?? []).map((c: { id: string; name: string; birthday?: string }) => ({ id: c.id, name: c.name, age: getAge(c.birthday) }))))
      .catch(() => {});
  }, [activeFamily, token]);

  // Hydrate messages when conversation changes (and we're not actively streaming)
  useEffect(() => {
    if (streaming) return;
    if (!activeConversationId) { setMessages([]); return; }
    if (!token) return;

    chatApi.getMessages(activeConversationId)
      .then((data) => setMessages((data.messages ?? []).filter((m: any) => m.role !== 'system')))
      .catch(() => {});
  }, [activeConversationId, streaming, token]);

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
    if (!message || streaming) return;

    // Login gate — logged-out users get bounced to /login with the draft message
    // preserved as next-action context.
    if (!token) {
      try {
        localStorage.setItem('pendingChatMessage', message);
      } catch {
        // localStorage unavailable; non-fatal.
      }
      navigate('/login?next=/');
      return;
    }

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: message }]);
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

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

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
            continue;
          } else if (eventName === 'status') {
            const key = STATUS_LABEL_KEYS[dataLine];
            setLoadingStatus(key ? t(key) : t('chatPage.thinking'));
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
    }
  }, [input, streaming, activeConversationId, activeChild, token, navigate, t, setActiveConversationId]);

  // After login, resume any pending draft saved before the login redirect.
  useEffect(() => {
    if (!token) return;
    const pending = localStorage.getItem('pendingChatMessage');
    if (!pending) return;
    localStorage.removeItem('pendingChatMessage');
    void handleSend(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const suggested = getSuggestedQuestions(t, activeChild?.name ?? null, activeChild?.age ?? null, !token);
  const isEmpty = messages.length === 0;
  const placeholder = activeChild
    ? t('chatPage.askAboutChild', { name: activeChild.name })
    : t('chatPage.askParenting');

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isEmpty && !streaming && (
          <div className="mx-auto flex max-w-2xl min-h-[300px] flex-col items-center justify-center gap-5 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-brand-blue/20 blur-xl" />
              <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-blue/15">
                <Icon name={appAssetIcons.aiGuide} className="h-8 w-8 object-contain" alt="" />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-brand-blue">
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
                <Icon name={uiIcons.shieldCheck} className="h-5 w-5 object-contain text-brand-blue" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp1', 'Evidence-based')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3">
                <Icon name={uiIcons.baby} className="h-5 w-5 object-contain text-brand-blue" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp2', 'Age-appropriate')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-3">
                <Icon name={uiIcons.bookOpen} className="h-5 w-5 object-contain text-brand-blue" alt="" />
                <span className="font-semibold text-text-primary">{t('chatPage.valueProp3', 'Sourced answers')}</span>
              </div>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2">
              {suggested.map((q) => (
                <button
                  key={q.text}
                  onClick={() => handleSend(q.text)}
                  className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-[14px] font-medium text-text-primary transition-colors hover:border-brand-blue/50 hover:bg-surface-light"
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
                  onClick={() => navigate('/login?next=/')}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white shadow-sm hover:brightness-110 min-h-[44px]"
                >
                  <Icon name={uiIcons.user} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
                  {t('chatPage.signInToChat')}
                </button>
                <p className="text-[13px] text-text-secondary">
                  {t('chatPage.signInToChatHint')}
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
                  <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15">
                    <Icon name={appAssetIcons.aiGuide} className="h-4 w-4 object-contain" alt="" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-3 sm:px-4 sm:py-3 ${
                  msg.role === 'user'
                    ? 'bg-brand-blue text-white rounded-br-sm text-[15px] leading-relaxed'
                    : 'bg-surface border border-border rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant'
                    ? <MarkdownContent content={msg.content} />
                    : msg.content
                  }
                </div>
              </div>
            ))}

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
              <span className="flex-shrink-0 text-[12px] font-bold text-text-secondary uppercase tracking-wide">
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
                className="mb-1 ml-2 inline-flex h-11 min-h-0 flex-shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-4 text-[14px] font-bold text-red-500 hover:bg-red-500/20"
              >
                <Icon name={uiIcons.stopSquare} className="h-4 w-4 object-contain" alt="" />
                {t('chatPage.stop')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="mb-1 ml-2 inline-flex h-11 min-h-0 flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-blue px-4 text-[14px] font-bold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border-dark disabled:text-text-secondary"
              >
                {t('chatPage.send')}
                <Icon name={uiIcons.send} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[12px] text-text-secondary">
            {t('chatPage.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
};
