import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import {
  CalendarBlank,
  Robot,
  ArrowClockwise,
  Lightbulb,
  ChatCircle,
  Plus,
  CaretRight,
  GraduationCap,
  BookOpen,
  Play,
  CircleNotch,
  Clock,
  AppleLogo,
  DeviceMobile,
  ChartLineUp,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { calendarApi, familiesApi, learningApi, aiApi } from '../../lib/appApi.js';
import {
  getFirstActionableModuleId,
  sortModulesForCourse,
  type OrderedModuleLike,
} from '../../lib/learningCourseOrder.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { useAuth } from '../../state/auth.js';
import { PageContainer } from '../../components/app/PageContainer.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function getGreeting(name: string, t: TFunction) {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greetingMorning', { name });
  if (h < 17) return t('dashboard.greetingAfternoon', { name });
  return t('dashboard.greetingEvening', { name });
}

function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h < 6) return '🌙';
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  return '✨';
}

function formatTime(dateStr: string, locale: string) {
  const loc = locale === 'fa' ? 'fa-IR' : 'en-GB';
  return new Date(dateStr).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
}

/** Split API text into briefing + optional tip (Markdown ## headings or legacy labels). */
function parseDailyPulse(pulse: string): { briefing: string; tip: string | null } {
  const t = pulse.replace(/\r\n/g, '\n').trim();
  const tipMatch = t.match(/\n##\s*today'?s?\s*tip\s*\n/i);
  if (tipMatch && tipMatch.index != null) {
    const head = t.slice(0, tipMatch.index).trim();
    const tip = t.slice(tipMatch.index + tipMatch[0].length).trim();
    const briefing = head.replace(/^##\s*briefing\s*\n/i, '').trim() || head;
    return { briefing, tip: tip || null };
  }
  const stripped = t.replace(/^##\s*briefing\s*\n/i, '').trim();
  if (stripped !== t) {
    return { briefing: stripped, tip: null };
  }
  const bl = /briefing\s*:\s*/i.exec(t);
  const tl = /today'?s?\s*tip\s*:\s*/i.exec(t);
  if (bl && tl && tl.index > bl.index) {
    return {
      briefing: t.slice(bl.index + bl[0].length, tl.index).trim(),
      tip: t.slice(tl.index + tl[0].length).trim() || null,
    };
  }
  return { briefing: t, tip: null };
}

function shouldCollapseBriefing(briefing: string) {
  const blocks = briefing.split('\n\n').filter(Boolean);
  return briefing.length > 320 || blocks.length > 2;
}

function PulseMarkdownBlocks({ text, blockKey, textColor = 'text-text-secondary' }: { text: string; blockKey: string; textColor?: string }) {
  return (
    <>
      {text.split('\n\n').map((block, i) => {
        const key = `${blockKey}-${i}`;
        if (block.startsWith('# ')) {
          return <h1 key={key} className="text-xl font-bold text-text-primary mb-2 mt-0 first:mt-0">{block.replace('# ', '')}</h1>;
        }
        if (block.startsWith('## ')) {
          return <h2 key={key} className="text-base font-semibold text-text-primary mt-4 mb-2 pb-1.5 border-b border-border first:mt-0">{block.replace('## ', '')}</h2>;
        }
        if (block.startsWith('### ')) {
          return <h3 key={key} className="text-xs font-semibold text-text-secondary uppercase tracking-wider mt-4 mb-1.5">{block.replace('### ', '')}</h3>;
        }
        if (block.startsWith('> ')) {
          return (
            <div key={key} className="my-3 rounded-xl border border-primary-200/40 bg-primary-50/30 border-l-4 border-l-primary-400 px-4 py-3 italic text-text-primary text-[15px] leading-[1.6]">
              {block.replace('> ', '')}
            </div>
          );
        }
        return (
          <p key={key} className={`text-[15px] leading-[1.65] mb-3 last:mb-0 ${textColor}`}>
            {block}
          </p>
        );
      })}
    </>
  );
}

// ── Widget shell ───────────────────────────────────────────────────────────
function WidgetCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-surface border border-border shadow-sm transition-all duration-300 hover:shadow-md hover:border-border-medium ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function WidgetHeader({
  title,
  iconSlot,
  onViewAll,
  viewAllLabel,
}: {
  title: string;
  iconSlot: ReactNode;
  onViewAll?: () => void;
  viewAllLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border">
      <div className="flex items-center gap-2.5">
        <span className="flex shrink-0 items-center">{iconSlot}</span>
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      {onViewAll && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewAll(); }}
          className="flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-primary-400 transition-colors"
        >
          {viewAllLabel}
          <CaretRight size={16} weight="bold" className="text-text-tertiary shrink-0" aria-hidden />
        </button>
      )}
    </div>
  );
}

function getDailyPulseSubtitle(t: TFunction) {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.pulseBriefingMorning');
  if (h < 17) return t('dashboard.pulseBriefingAfternoon');
  return t('dashboard.pulseBriefingEvening');
}

function DailyPulseWidget({ pulse, loading, error, refreshing, onRefresh, onOpenChat, className = '' }: {
  pulse: string | null;
  loading: boolean;
  error: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenChat?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const parsed = pulse ? parseDailyPulse(pulse) : null;
  const showActions = Boolean(pulse && !loading && !error);
  const [expanded, setExpanded] = useState(false);
  const briefingNeedsCollapse = parsed ? shouldCollapseBriefing(parsed.briefing) : false;
  const previewBriefing = useMemo(() => {
    if (!parsed) return '';
    const blocks = parsed.briefing.split('\n\n').filter(Boolean);
    return blocks.slice(0, 2).join('\n\n');
  }, [parsed]);

  return (
    <WidgetCard className={`flex flex-col ${className}`}>
      <div className="relative overflow-hidden border-b border-border bg-surface-light px-5 py-4">
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Robot size={22} weight="fill" className="shrink-0 text-primary-600" aria-hidden />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-text-primary">{t('dashboard.pulseTitle')}</span>
              <p className="text-xs text-text-secondary leading-snug mt-0.5">{getDailyPulseSubtitle(t)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading || refreshing}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-surface-light/80 text-text-secondary transition-colors hover:border-primary-200 hover:text-primary-300 disabled:opacity-40"
                aria-label={t('dashboard.refreshPulseAria')}
              >
                <ArrowClockwise
                  size={18}
                  weight="bold"
                  className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[min(380px,60vh)]">
          {loading ? (
            <div className="space-y-3 pt-0.5">
              <div className="h-3 w-24 animate-pulse rounded-md bg-primary-100/80" />
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-4 animate-pulse rounded bg-surface-light/80 ${i === 3 ? 'w-1/2' : i === 1 ? 'w-3/4' : 'w-full'}`}
                />
              ))}
              <div className="mt-5 h-14 animate-pulse rounded-xl bg-secondary-50/50 border border-border" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-error/30 bg-error/10 p-4">
              <p className="text-sm text-error font-medium leading-snug">
                {t('dashboard.pulseRefreshError')}
              </p>
              <p className="mt-2 text-xs text-text-secondary">{t('dashboard.pulseRefreshErrorHint')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-light"
                  >
                    {t('dashboard.tryAgain')}
                  </button>
                )}
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    {t('dashboard.openAIExpert')}
                  </button>
                )}
              </div>
            </div>
          ) : pulse && parsed ? (
            <div className="max-w-none">
              <div className="text-[15px] leading-[1.65] text-text-secondary">
                <PulseMarkdownBlocks
                  text={briefingNeedsCollapse && !expanded ? previewBriefing : parsed.briefing}
                  blockKey="brief"
                />
              </div>
              {briefingNeedsCollapse && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  {expanded ? t('dashboard.briefingShowLess') : t('dashboard.briefingReadMore')}
                </button>
              )}
              {parsed.tip ? (
                <div className="mt-5 rounded-xl border border-secondary-400/30 bg-secondary-50/20 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={18} weight="fill" className="shrink-0 text-secondary-400" aria-hidden />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">{t('dashboard.todaysTip')}</span>
                  </div>
                  <div className="font-medium">
                    <PulseMarkdownBlocks text={parsed.tip} blockKey="tip" textColor="text-text-secondary" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-light/80 p-5 border border-border text-center">
              <Robot size={28} weight="duotone" className="mx-auto mb-3 text-primary-400" aria-hidden />
              <p className="text-sm font-medium text-text-secondary">{t('dashboard.pulseEmptyTitle')}</p>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed px-1">
                {t('dashboard.pulseEmptyBody')}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    <ChatCircle size={16} weight="fill" className="text-white shrink-0" aria-hidden />
                    {t('dashboard.chatWithAIExpert')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {showActions && (onOpenChat || onRefresh) ? (
          <div className="shrink-0 border-t border-border px-5 py-2.5 flex items-center justify-between gap-2 bg-surface-light/40">
            <span className="text-xs text-text-secondary truncate">{t('dashboard.pulseFooterHint')}</span>
            {onOpenChat ? (
              <button
                type="button"
                onClick={onOpenChat}
                className="shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                {t('dashboard.goDeeper')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
}

// ── Calendar: today only (compact) ───────────────────────────────────────────
function CalendarTodayWidget({ events, loading, onNavigate, onAddEvent, className = '' }: {
  events: { id: string; title: string; startDate: string; location?: string }[];
  loading: boolean;
  onNavigate: () => void;
  onAddEvent?: () => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const todayDate = now.toDateString();
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const todayEvents = sortedEvents.filter((e) => new Date(e.startDate).toDateString() === todayDate);
  const addHandler = onAddEvent ?? onNavigate;

  return (
    <WidgetCard className={`min-h-[200px] ${className}`}>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <CalendarBlank size={20} weight="fill" className="shrink-0 text-brand-blue" aria-hidden />
          <span className="text-sm font-semibold text-text-primary">{t('dashboard.calendarToday')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addHandler}
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue/20 px-2.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/30 transition-colors"
          >
            <Plus size={16} weight="bold" className="shrink-0" aria-hidden />
            {t('dashboard.calendarAdd')}
          </button>
          <button
            type="button"
            onClick={onNavigate}
            className="flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-brand-blue transition-colors"
          >
            {t('dashboard.calendarFull')}
            <CaretRight size={14} weight="bold" className="shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 flex-col px-5 pb-5 pt-3">
        <p className="mb-3 text-xs text-text-tertiary">
          {now.toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-surface-light rounded-xl" />
            ))}
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-light/50 px-4 py-6">
            <p className="text-sm text-text-secondary mb-3">{t('dashboard.nothingScheduledToday')}</p>
            <button
              type="button"
              onClick={addHandler}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue transition-colors"
            >
              <Plus size={18} weight="bold" className="shrink-0" aria-hidden />
              {t('dashboard.calendarAddEvent')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {todayEvents.slice(0, 5).map((event, idx) => {
              const eventDate = new Date(event.startDate);
              const isPast = eventDate < now;
              const tints = [
                'border-l-brand-blue bg-surface-light/90',
                'border-l-brand-purple bg-surface-light/90',
                'border-l-secondary-400 bg-surface-light/90',
                'border-l-primary-400 bg-surface-light/90',
              ];
              const colorClass = tints[idx % tints.length];
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={onNavigate}
                  className={`flex w-full items-center gap-3 rounded-xl border border-border border-l-4 p-3 text-left transition-all hover:shadow-sm ${colorClass} ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="flex min-w-[40px] flex-col items-center justify-center py-0.5">
                    <span className="text-xs font-bold uppercase text-text-tertiary leading-none">
                      {formatTime(event.startDate, i18n.language)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{event.title}</p>
                    {event.location && (
                      <p className="truncate text-xs text-text-secondary mt-0.5">{event.location}</p>
                    )}
                  </div>
                  <CaretRight size={18} weight="bold" className="shrink-0 text-text-tertiary opacity-70" aria-hidden />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

// ── AI Assistant: suggested questions only ───────────────────────────────────
function AIAssistantWidget({ familyChildren, onNavigate, className = '' }: {
  familyChildren: unknown[];
  onNavigate: (question?: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const rawChild = (familyChildren[0] as { name?: string } | undefined)?.name;
  const childName = rawChild ?? t('dashboard.yourChildFallback');

  const suggestedQuestions = [
    { icon: Clock, text: t('dashboard.suggestedSleepRegression') },
    { icon: AppleLogo, text: t('dashboard.suggestedPickyEating') },
    { icon: DeviceMobile, text: t('dashboard.suggestedScreenTime') },
    { icon: ChartLineUp, text: t('dashboard.suggestedMilestones') },
  ] as const;

  return (
    <WidgetCard className={`min-h-0 ${className}`}>
      <WidgetHeader
        title={t('dashboard.aiExpertTitle')}
        iconSlot={<Robot size={20} weight="fill" className="text-primary-600" aria-hidden />}
        onViewAll={() => onNavigate()}
        viewAllLabel={t('dashboard.widgetViewAll')}
      />

      <div className="flex min-h-0 flex-1 flex-col p-5 bg-surface-light/30">
        <p className="mb-3 text-sm text-text-secondary">
          {t('dashboard.askAboutChildDev', { childName })}
        </p>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-text-tertiary">{t('dashboard.tryAsking')}</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {suggestedQuestions.map((q) => {
            const QIcon = q.icon;
            return (
              <button
                key={q.text}
                type="button"
                onClick={() => onNavigate(q.text)}
                className="flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-2 text-left text-xs font-semibold leading-tight text-text-secondary shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-300"
              >
                <QIcon size={18} weight="fill" className="shrink-0 text-primary-500" aria-hidden />
                <span className="min-w-0">{q.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </WidgetCard>
  );
}

// ── Academy Widget ─────────────────────────────────────────────────────────
const PHASE_STYLES: Record<string, { color: string; bg: string }> = {
  'The Great Paradigm Shift': { color: 'text-rose-700', bg: 'bg-rose-500/15' },
  'Building the Ecosystem': { color: 'text-emerald-700', bg: 'bg-emerald-500/15' },
  'Mechanics of Interaction': { color: 'text-sky-700', bg: 'bg-sky-500/15' },
  'Agency and Adaptive Growth': { color: 'text-amber-700', bg: 'bg-amber-500/15' },
  'Advanced Application': { color: 'text-violet-700', bg: 'bg-violet-500/15' },
  'Mastery and Integration': { color: 'text-indigo-700', bg: 'bg-indigo-500/15' },
};

type AcademyHighlight = {
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  phaseTitle: string;
  moduleLessonTotal: number;
  moduleLessonDone: number;
  courseLessonTotal: number;
  courseLessonDone: number;
  coursePct: number;
  modulePct: number;
};

function AcademyWidget({ highlight, loading, onNavigate, className = '' }: {
  highlight: AcademyHighlight | null | undefined;
  loading: boolean;
  onNavigate: (moduleId?: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const phaseTitle = highlight?.phaseTitle ?? t('dashboard.phaseFallback');
  const catStyle = PHASE_STYLES[phaseTitle] ?? { color: 'text-primary-fg', bg: 'bg-primary-100/20' };

  return (
    <WidgetCard className={`min-h-[280px] ${className}`}>
      <WidgetHeader
        title={t('dashboard.academyWidgetTitle')}
        iconSlot={<GraduationCap size={20} weight="fill" className="text-secondary-400" aria-hidden />}
        onViewAll={() => onNavigate()}
        viewAllLabel={t('dashboard.widgetViewAll')}
      />

      <div className="flex flex-1 flex-col px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-surface-light" />
            <div className="h-9 animate-pulse rounded-xl bg-surface-light" />
          </div>
        ) : highlight ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface-light/60 p-5">
              <p className="mb-2 line-clamp-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {highlight.courseTitle}
              </p>
              <span
                className={`mb-3 inline-block w-fit rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-widest ${catStyle.bg} ${catStyle.color}`}
              >
                {phaseTitle}
              </span>
              <h4 className="mb-4 line-clamp-2 text-base font-bold leading-snug text-text-primary">
                {highlight.moduleTitle}
              </h4>

              <div className="mt-auto space-y-3.5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-text-secondary">
                    <span>{t('dashboard.courseLabel')}</span>
                    <span className="tabular-nums text-text-secondary">
                      {t('dashboard.lessonsProgressDetailed', {
                        done: highlight.courseLessonDone,
                        total: highlight.courseLessonTotal,
                        pct: highlight.coursePct,
                      })}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-quest-track">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-700"
                      style={{ width: `${highlight.coursePct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-text-secondary">
                    <span>{t('dashboard.thisModuleLabel')}</span>
                    <span className="tabular-nums text-text-secondary">
                      {t('dashboard.moduleProgressDetailed', {
                        done: highlight.moduleLessonDone,
                        total: highlight.moduleLessonTotal,
                        pct: highlight.modulePct,
                      })}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-quest-track">
                    <div
                      className="h-full rounded-full bg-primary-400/90 transition-all duration-700"
                      style={{ width: `${highlight.modulePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => onNavigate(highlight.moduleId)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white transition-all hover:bg-primary-700 shadow-lg shadow-primary-600/25"
              animate={{ boxShadow: ['0 8px 24px rgba(61,220,151,0.2)', '0 8px 32px rgba(61,220,151,0.35)', '0 8px 24px rgba(61,220,151,0.2)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Play size={20} weight="fill" className="text-white shrink-0" aria-hidden />
              {t('dashboard.continueLessonCta')}
            </motion.button>
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center text-center">
            <BookOpen size={32} weight="duotone" className="mb-2 text-brand-yellow/50" aria-hidden />
            <p className="text-xs font-semibold text-text-secondary">{t('dashboard.academyEmptyTitle')}</p>
            <p className="mt-1 max-w-[200px] text-xs text-text-tertiary">
              {t('dashboard.academyEmptyBody')}
            </p>
            <button
              type="button"
              onClick={() => onNavigate()}
              className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
            >
              {t('dashboard.openAcademy')}
            </button>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

const dashboardListVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const dashboardRowVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const dashboardItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const { user } = useAuth();
  const { activeFamily, refreshFamilies, loadingFamilies } = useAppContext();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [academyCourses, setAcademyCourses] = useState<Array<{ id: string; title: string; order: number }>>(
    [],
  );
  const [academyModules, setAcademyModules] = useState<any[] | undefined>(undefined);
  const [pulse, setPulse] = useState<string | null>(null);
  const [loadingPulse, setLoadingPulse] = useState(true);
  const [pulseRefreshing, setPulseRefreshing] = useState(false);
  const [pulseError, setPulseError] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [familyName, setFamilyName] = useState('');

  const academyHighlight = useMemo((): AcademyHighlight | null | undefined => {
    if (academyModules === undefined) return undefined;
    type M = OrderedModuleLike & {
      title: string;
      phase?: { order?: number; title?: string; course?: { id: string; title?: string } };
    };
    const modules = academyModules as M[];
    const sortedCourses = [...academyCourses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let courseId: string | null = null;
    let courseTitle = t('dashboard.fallbackCourseName');
    if (sortedCourses[0]) {
      courseId = sortedCourses[0].id;
      courseTitle = sortedCourses[0].title;
    } else {
      const anyMod = modules[0];
      if (anyMod?.phase?.course?.id) {
        courseId = anyMod.phase.course.id;
        courseTitle = anyMod.phase.course.title ?? courseTitle;
      }
    }
    if (!courseId || modules.length === 0) return null;

    const mid = getFirstActionableModuleId(modules, courseId);
    if (!mid) return null;
    const mod = modules.find((m) => m.id === mid);
    if (!mod) return null;

    const courseMods = sortModulesForCourse(modules, courseId);
    const courseLessonTotal = courseMods.reduce((s, m) => s + (m._count?.lessons ?? 0), 0);
    const courseLessonDone = courseMods.reduce((s, m) => s + (m.completedLessons ?? 0), 0);
    const mt = mod._count?.lessons ?? 0;
    const md = mod.completedLessons ?? 0;

    return {
      courseTitle,
      moduleId: mod.id,
      moduleTitle: mod.title,
      phaseTitle: mod.phase?.title ?? t('dashboard.phaseFallback'),
      moduleLessonTotal: mt,
      moduleLessonDone: md,
      courseLessonTotal,
      courseLessonDone,
      coursePct: courseLessonTotal > 0 ? Math.round((courseLessonDone / courseLessonTotal) * 100) : 0,
      modulePct: mt > 0 ? Math.round((md / mt) * 100) : 0,
    };
  }, [academyCourses, academyModules, t]);

  const rawDisplayName = user?.profile?.name?.trim() || user?.email?.split('@')[0] || 'there';
  const firstName = rawDisplayName.split(/\s+/)[0] || 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const greeting = getGreeting(displayName, t);

  const refetchPulse = useCallback(async () => {
    if (!activeFamily) return;
    setPulseRefreshing(true);
    setPulseError(false);
    try {
      const data = await aiApi.getDailyPulse(i18n.language);
      setPulse(data?.pulse ?? null);
      setPulseError(false);
    } catch {
      setPulseError(true);
    } finally {
      setPulseRefreshing(false);
    }
  }, [activeFamily]);

  useEffect(() => {
    if (!activeFamily) return;
    setLoadingData(true);
    Promise.all([
      calendarApi.listEvents(activeFamily.id).catch(() => ({ events: [] })),
      familiesApi.listChildren(activeFamily.id).catch(() => ({ children: [] })),
      learningApi.getCourses().catch(() => ({ courses: [] })),
      learningApi.getModules().catch(() => ({ modules: [] })),
      aiApi
        .getDailyPulse(i18n.language)
        .then((data) => ({ ok: true as const, pulse: data?.pulse ?? null }))
        .catch(() => ({ ok: false as const, pulse: null as string | null })),
    ]).then(([eventsRes, childrenRes, coursesRes, modulesRes, pulseRes]) => {
      setUpcomingEvents(eventsRes.events ?? []);
      setChildren(childrenRes.children ?? []);
      setAcademyCourses(coursesRes.courses ?? []);
      setAcademyModules(modulesRes.modules ?? []);
      setPulse(pulseRes.pulse);
      setPulseError(!pulseRes.ok);
    }).finally(() => {
      setLoadingData(false);
      setLoadingPulse(false);
    });
  }, [activeFamily?.id]);

  if (loadingFamilies) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
          <CircleNotch size={40} weight="bold" className="animate-spin text-primary-700" aria-label={t('common.loading')} />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="font-display text-2xl font-semibold text-text-primary">{t('dashboard.createFamilyHeading')}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t('dashboard.createFamilyBody')}</p>
        <div className="mt-5 flex gap-2">
          <input value={familyName} onChange={(e) => setFamilyName(e.target.value)}
            placeholder={t('dashboard.familyNamePlaceholder')}
            className="flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
          <button onClick={async () => {
            if (!familyName.trim()) return;
            await familiesApi.create(familyName.trim());
            setFamilyName('');
            await refreshFamilies();
          }} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            {t('dashboard.createFamilyCta')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer verticalSpacing="normal">
      <div className="mb-6 flex min-w-0 gap-3 sm:gap-4">
        <span className="shrink-0 select-none text-3xl leading-none sm:text-4xl md:text-5xl" aria-hidden>
          {getGreetingEmoji()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-snug text-balance text-text-primary sm:text-3xl md:text-4xl">
            {greeting}
          </h1>
          <p className="mt-2 max-w-prose text-pretty text-sm font-medium text-text-secondary sm:text-base">
            {t('dashboard.familyToday')}
          </p>
        </div>
      </div>

      <motion.div
        className="flex flex-col gap-6"
        initial="hidden"
        animate="show"
        variants={dashboardListVariants}
      >
        <motion.div variants={dashboardItemVariants}>
          <DailyPulseWidget
            pulse={pulse}
            loading={loadingPulse}
            error={pulseError}
            refreshing={pulseRefreshing}
            onRefresh={refetchPulse}
            onOpenChat={() =>
              navigate(toApp('/app/chat'), {
                state: {
                  prefillQuestion: t('dashboard.pulsePrefill'),
                },
              })
            }
          />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          variants={dashboardRowVariants}
        >
          <motion.div variants={dashboardItemVariants} className="flex min-h-0 flex-col">
            <AcademyWidget
              className="h-full min-h-[280px]"
              highlight={academyHighlight}
              loading={academyModules === undefined}
              onNavigate={(id) => (id ? navigate(toApp(`/app/learning/${id}`)) : navigate(toApp('/app/learning')))}
            />
          </motion.div>
          <motion.div variants={dashboardItemVariants} className="flex min-h-0 flex-col">
            <CalendarTodayWidget
              events={upcomingEvents}
              loading={loadingData}
              onNavigate={() => navigate(toApp('/app/calendar'))}
            />
          </motion.div>
        </motion.div>

        <motion.div variants={dashboardItemVariants}>
          <AIAssistantWidget
            familyChildren={children}
            onNavigate={(q) => navigate(toApp('/app/chat'), { state: { prefillQuestion: q } })}
          />
        </motion.div>
      </motion.div>
    </PageContainer>
  );
};
