
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export const AdminChat = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const assistantMessageId = (Date.now() + 1).toString();

    try {
      const response = await fetch(`${api.defaults.baseURL}/api/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';
      let currentConversationId = conversationId;
      let isDone = false;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
        },
      ]);

      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7).trim();
            if (event === 'done') {
              isDone = true;
            } else if (event === 'medical_emergency') {
              // Handle medical emergency
            } else if (event === 'thinking') {
              // Extract conversationId from thinking event if needed
            }
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'medical_emergency') {
                assistantContent = parsed.message || 'I cannot provide medical advice. Please call your pediatrician or emergency services immediately.';
                isDone = true;
              } else if (parsed.conversationId) {
                currentConversationId = parsed.conversationId;
                setConversationId(parsed.conversationId);
              }
            } catch {
              assistantContent += dataStr;
            }
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }

      if (currentConversationId && !conversationId) {
        setConversationId(currentConversationId);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      toast.error('Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id && msg.id !== assistantMessageId));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const userMessageCount = messages.filter((message) => message.role === 'user').length;
  const assistantMessageCount = messages.length - userMessageCount;
  const quickPrompts = [
    'Create a 7-day newborn sleep routine.',
    'Explain toddler tantrum de-escalation steps.',
    'Draft a concise weekly family learning plan.',
    'Give age-appropriate language development activities.',
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                  <Icon name={uiIcons.messageSquare} className="h-5 w-5" alt="" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-text-primary">Admin AI Chat</h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Conversation Console</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary">
                {messages.length} total messages
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary">
                {assistantMessageCount} assistant
              </div>
              <button
                type="button"
                onClick={clearConversation}
                className="btn-duo-blue-sm !font-semibold !normal-case !tracking-normal"
              >
                <Icon name={uiIcons.plus} className="h-4 w-4" alt="" />
                New Conversation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 grid-cols-12 gap-6 px-5 py-6 md:px-8">
        <aside className="col-span-12 flex min-h-0 flex-col gap-4 xl:col-span-4">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-text-tertiary">Session Overview</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface-light p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">You</p>
                <p className="mt-1 text-2xl font-black text-text-primary">{userMessageCount}</p>
              </div>
              <div className="rounded-2xl border border-brand-blue/25 bg-brand-blue/10 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">Assistant</p>
                <p className="mt-1 text-2xl font-black text-brand-blue">{assistantMessageCount}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-success50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-success500">Conversation ID</p>
              <p className="mt-1 truncate font-mono text-xs font-semibold text-success700">
                {conversationId || 'No active thread'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Icon name={uiIcons.sparkles} className="h-4 w-4 text-brand-blue" alt="" />
              <p className="text-xs font-black uppercase tracking-widest text-text-tertiary">Prompt Starters</p>
            </div>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full rounded-xl border border-border bg-surface-light px-3 py-2 text-left text-sm font-medium text-text-secondary transition hover:border-brand-blue/40 hover:bg-brand-blue/10 hover:text-brand-blue"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="col-span-12 min-h-0 xl:col-span-8">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4 md:px-6">
              <p className="text-sm font-bold text-text-secondary">Live Conversation</p>
              <p className="text-xs text-text-secondary">Streaming answers with markdown support</p>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-light/60 px-4 py-5 md:px-6">
              {messages.length === 0 ? (
                <div className="flex min-h-full items-center justify-center">
                  <div className="max-w-lg text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                      <Icon name={uiIcons.bot} className="h-8 w-8" alt="" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">Start a New Conversation</h2>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      Ask about parenting, development milestones, sleep, nutrition, or daily routines.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/20 text-brand-blue">
                          <Icon name={uiIcons.bot} className="h-4 w-4" alt="" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[75%] ${
                          message.role === 'user'
                            ? 'bg-brand-blue text-white shadow-lg shadow-md'
                            : 'border border-border bg-surface text-text-primary'
                        }`}
                      >
                        <div
                          className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
                            message.role === 'user' ? 'text-white/60' : 'text-text-tertiary'
                          }`}
                        >
                          {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <div
                          className={`prose prose-sm max-w-none ${
                            message.role === 'user'
                              ? 'text-white prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white prose-li:marker:text-white'
                              : 'prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-li:marker:text-brand-blue prose-p:text-text-secondary'
                          }`}
                        >
                          {message.content ? (
                            <ReactMarkdown
                              components={{
                                ul: (props) => <ul className="mb-4 list-disc space-y-2 pl-5" {...props} />,
                                ol: (props) => <ol className="mb-4 list-decimal space-y-2 pl-5" {...props} />,
                                li: (props) => <li className="leading-relaxed" {...props} />,
                                p: (props) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
                                h1: (props) => <h1 className="mb-3 mt-5 text-lg font-semibold first:mt-0" {...props} />,
                                h2: (props) => <h2 className="mb-2 mt-4 text-base font-semibold" {...props} />,
                                h3: (props) => <h3 className="mb-2 mt-3 text-sm font-semibold" {...props} />,
                                strong: (props) => <strong className="font-semibold" {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary"></span>
                                <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: '0.2s' }}></span>
                                <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: '0.4s' }}></span>
                              </div>
                              <span className="text-sm text-text-secondary">Thinking...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-warm text-text-secondary">
                          <Icon name={uiIcons.user} className="h-4 w-4" alt="" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface p-4 md:p-5">
              <div className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full resize-none rounded-2xl border border-border bg-surface-light px-4 py-3 pr-16 text-sm transition placeholder:text-text-tertiary focus:border-brand-blue/50 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-focus"
                    style={{ minHeight: '54px', maxHeight: '210px' }}
                    disabled={loading}
                  />
                  {loading && (
                    <button
                      onClick={stopGeneration}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-error/10 px-2.5 py-1.5 text-xs font-semibold text-error600 transition hover:bg-red-100"
                    >
                      <Icon name={uiIcons.stopSquare} className="h-3.5 w-3.5" alt="" />
                      Stop
                    </button>
                  )}
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="btn-duo-blue inline-flex h-[54px] items-center gap-2 !min-h-[54px] !rounded-2xl !px-5 !text-sm !font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Icon name={uiIcons.loader} className="h-5 w-5 animate-spin" alt="" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Icon name={uiIcons.send} className="h-[18px] w-[18px]" alt="" />
                      Send
                    </>
                  )}
                </button>
                <button
                  onClick={clearConversation}
                  type="button"
                  className="inline-flex h-[54px] items-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-text-secondary transition hover:bg-surface-light"
                >
                  <Icon name={uiIcons.trash} className="h-4 w-4" alt="" />
                  Clear
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-text-secondary">
                Press <span className="font-semibold">Enter</span> to send • <span className="font-semibold">Shift + Enter</span> for a new line
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
