import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useAuth } from '../../state/auth.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { calendarApi, familiesApi } from '../../lib/appApi.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { Drawer } from '../../components/Drawer.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type EventType = 'appointment' | 'milestone' | 'activity' | 'reminder' | 'other';
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  eventType: EventType;
  startDate: string;
  endDate?: string | null;
  allDay?: boolean;
  location?: string | null;
  child?: { id: string; name: string } | null;
  repeatRule?: { type?: string; interval?: number; endDate?: string } | null;
};

type ChildOption = { id: string; name: string };

const EVENT_TYPES: EventType[] = ['appointment', 'milestone', 'activity', 'reminder', 'other'];
const REPEAT_TYPES: RepeatType[] = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'];

const EVENT_TYPE_TONE: Record<EventType, string> = {
  appointment: 'bg-brand-blue/15 text-brand-blue',
  milestone: 'bg-brand-yellow/20 text-brand-yellow-fg',
  activity: 'bg-brand-green/15 text-brand-green',
  reminder: 'bg-brand-pink/15 text-brand-pink',
  other: 'bg-surface-light text-text-secondary',
};

function formatStart(iso: string, locale: string, allDay?: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const l = locale === 'fa' ? 'fa-IR' : locale || 'en-GB';
  if (allDay) {
    return d.toLocaleDateString(l, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleString(l, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isPast(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineToIso(date: string, time: string, allDay: boolean): string | null {
  if (!date) return null;
  const t = allDay ? '00:00' : (time || '09:00');
  const local = new Date(`${date}T${t}`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

type FormState = {
  childId: string;
  title: string;
  eventType: EventType;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  repeatType: RepeatType;
  repeatEndDate: string;
};

function blankForm(defaultChildId: string): FormState {
  return {
    childId: defaultChildId,
    title: '',
    eventType: 'appointment',
    date: toDateInput(new Date().toISOString()),
    time: '09:00',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    description: '',
    repeatType: 'none',
    repeatEndDate: '',
  };
}

function eventToForm(event: CalendarEvent, fallbackChildId: string): FormState {
  const repeatType = (event.repeatRule?.type as RepeatType) ?? 'none';
  return {
    childId: event.child?.id ?? fallbackChildId,
    title: event.title,
    eventType: event.eventType,
    date: toDateInput(event.startDate),
    time: toTimeInput(event.startDate),
    endDate: toDateInput(event.endDate ?? null),
    endTime: toTimeInput(event.endDate ?? null),
    allDay: Boolean(event.allDay),
    location: event.location ?? '',
    description: event.description ?? '',
    repeatType,
    repeatEndDate: toDateInput(event.repeatRule?.endDate ?? null),
  };
}

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-text-secondary">
    {children}
  </label>
);

const baseField =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue/40';

type EventFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  event: CalendarEvent | null;
  children: ChildOption[];
  onSaved: () => void;
};

type DrawerTab = 'ai' | 'form';
type ParsedDraft = Awaited<ReturnType<typeof calendarApi.parseEvent>>['draft'];

const AI_CREATE_EXAMPLES = [
  'Doctor appointment for Eli next Tuesday at 3pm at the clinic',
  'Swim class every Saturday at 10am, repeats weekly until June',
  "Sam's birthday party Sat afternoon, all day reminder",
];

const EventFormDrawer = ({ open, onClose, mode, event, children: childOptions, onSaved }: EventFormDrawerProps) => {
  const { t, i18n } = useTranslation();
  const { activeFamily } = useAppContext();
  const defaultChildId = childOptions[0]?.id ?? '';
  const [form, setForm] = useState<FormState>(() => blankForm(defaultChildId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<DrawerTab>('ai');
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(mode === 'edit' && event ? eventToForm(event, defaultChildId) : blankForm(defaultChildId));
    setTab('ai');
    setAiText('');
    setAiNote(null);
  }, [open, mode, event, defaultChildId]);

  const childName = useMemo(() => {
    if (mode !== 'edit' || !event) return '';
    return event.child?.name ?? '';
  }, [mode, event]);

  const eventSummary = useMemo(() => {
    if (mode !== 'edit' || !event) return null;
    const when = formatStart(event.startDate, i18n.language, event.allDay);
    return { when, child: childName };
  }, [mode, event, i18n.language, childName]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildPayloadFrom = (state: FormState) => {
    const startDate = combineToIso(state.date, state.time, state.allDay);
    if (!startDate) return { error: t('calendar.form.errInvalidStart', 'Please pick a valid start date.') };
    if (!state.title.trim()) return { error: t('calendar.form.errTitle', 'Please add a title.') };
    if (!state.childId) return { error: t('calendar.form.errChild', 'Please select a child.') };

    let endDate: string | undefined;
    if (state.endDate) {
      const iso = combineToIso(state.endDate, state.endTime || state.time, state.allDay);
      if (!iso) return { error: t('calendar.form.errInvalidEnd', 'End date is invalid.') };
      endDate = iso;
    }

    const payload: Record<string, unknown> = {
      childId: state.childId,
      title: state.title.trim(),
      eventType: state.eventType,
      startDate,
      allDay: state.allDay,
    };
    if (endDate) payload.endDate = endDate;
    if (state.location.trim()) payload.location = state.location.trim();
    if (state.description.trim()) payload.description = state.description.trim();

    if (state.repeatType !== 'none') {
      const repeatRule: Record<string, unknown> = { type: state.repeatType, interval: 1 };
      if (state.repeatEndDate) {
        const iso = combineToIso(state.repeatEndDate, '23:59', true);
        if (iso) repeatRule.endDate = iso;
      }
      payload.repeatRule = repeatRule;
    } else if (mode === 'edit') {
      payload.repeatRule = { type: 'none', interval: 1 };
    }

    return { payload };
  };

  const persist = async (state: FormState) => {
    if (!activeFamily) return false;
    const built = buildPayloadFrom(state);
    if ('error' in built) {
      toast.error(built.error);
      return false;
    }
    if (mode === 'edit' && event) {
      await calendarApi.updateEvent(activeFamily.id, event.id, built.payload);
      toast.success(t('calendar.toast.updated', 'Event updated.'));
    } else {
      await calendarApi.createEvent(activeFamily.id, built.payload);
      toast.success(t('calendar.toast.created', 'Event created.'));
    }
    return true;
  };

  const mergeDraftIntoForm = (state: FormState, draft: ParsedDraft): FormState => {
    const next = { ...state };
    if (draft.childId) next.childId = draft.childId;
    if (draft.title) next.title = draft.title;
    if (draft.eventType) next.eventType = draft.eventType;
    if (draft.allDay !== null) next.allDay = draft.allDay;
    if (draft.startDate) {
      next.date = toDateInput(draft.startDate);
      next.time = toTimeInput(draft.startDate) || state.time;
    }
    if (draft.endDate) {
      next.endDate = toDateInput(draft.endDate);
      next.endTime = toTimeInput(draft.endDate);
    }
    if (draft.location !== null) next.location = draft.location ?? '';
    if (draft.description !== null) next.description = draft.description ?? '';
    if (draft.repeatRule) {
      next.repeatType = draft.repeatRule.type as RepeatType;
      next.repeatEndDate = draft.repeatRule.endDate
        ? toDateInput(draft.repeatRule.endDate)
        : '';
    }
    return next;
  };

  const handleAiApply = async () => {
    if (!activeFamily || !aiText.trim()) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const existingEvent =
        mode === 'edit' && event
          ? {
              childId: event.child?.id ?? null,
              title: event.title,
              eventType: event.eventType,
              startDate: event.startDate,
              endDate: event.endDate ?? null,
              allDay: Boolean(event.allDay),
              location: event.location ?? null,
              description: event.description ?? null,
              repeatRule: event.repeatRule ?? null,
            }
          : null;
      const { draft } = await calendarApi.parseEvent(activeFamily.id, {
        text: aiText.trim(),
        now: new Date().toISOString(),
        existingEvent,
      });

      const merged = mergeDraftIntoForm(form, draft);
      setForm(merged);
      setAiNote(draft.notes);

      const ok = await persist(merged);
      if (ok) {
        onSaved();
        onClose();
      } else {
        // Validation failed (e.g. no child resolved). Fall through to the
        // form so the user can fix it manually.
        setTab('form');
      }
    } catch {
      toast.error(t('calendar.ai.failed', 'Could not apply that. Try the form.'));
    } finally {
      setAiBusy(false);
    }
  };

  const handleSave = async () => {
    if (!activeFamily) return;
    setSaving(true);
    try {
      const ok = await persist(form);
      if (ok) {
        onSaved();
        onClose();
      }
    } catch {
      toast.error(t('calendar.toast.saveFailed', 'Could not save event.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeFamily || !event) return;
    const ok = window.confirm(
      t('calendar.confirmDelete', 'Delete this event? This cannot be undone.'),
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await calendarApi.deleteEvent(activeFamily.id, event.id);
      toast.success(t('calendar.toast.deleted', 'Event deleted.'));
      onSaved();
      onClose();
    } catch {
      toast.error(t('calendar.toast.deleteFailed', 'Could not delete event.'));
    } finally {
      setDeleting(false);
    }
  };

  const title =
    mode === 'edit'
      ? t('calendar.form.editTitle', 'Edit event')
      : t('calendar.form.newTitle', 'New event');

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div role="tablist" aria-label={t('calendar.form.tabs', 'Event input mode')} className="flex gap-1 rounded-xl bg-surface-light p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            onClick={() => setTab('ai')}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors',
              tab === 'ai' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon name={uiIcons.sparkles} className="h-4 w-4 object-contain" alt="" />
            {t('calendar.form.tabAi', 'Ask AI')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'form'}
            onClick={() => setTab('form')}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors',
              tab === 'form' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon name={uiIcons.edit} className="h-4 w-4 object-contain" alt="" />
            {t('calendar.form.tabForm', 'Form')}
          </button>
        </div>

        {tab === 'ai' && (
          <div className="space-y-3">
            {mode === 'edit' && eventSummary && event && (
              <div className="rounded-2xl border border-border bg-surface-light px-4 py-3">
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">
                  {t('calendar.form.currentEvent', 'Editing')}
                </p>
                <p className="mt-1 text-[14px] font-bold text-text-primary">{event.title}</p>
                <p className="text-[12px] text-text-secondary">
                  {eventSummary.when}
                  {eventSummary.child ? ` • ${eventSummary.child}` : ''}
                </p>
                {event.location && (
                  <p className="text-[12px] text-text-secondary">{event.location}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="evt-ai-text">
                {mode === 'edit'
                  ? t('calendar.form.aiEditLabel', 'Describe the change')
                  : t('calendar.form.aiCreateLabel', 'Describe the event')}
              </Label>
              <textarea
                id="evt-ai-text"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={4}
                placeholder={
                  mode === 'edit'
                    ? t('calendar.form.aiEditPlaceholder', 'Move to Friday at 4pm, change location to the clinic...')
                    : t('calendar.form.aiCreatePlaceholder', 'Doctor visit for Eli next Tuesday at 3pm...')
                }
                className={baseField}
              />
            </div>

            {mode === 'create' && (
              <div className="space-y-1">
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">
                  {t('calendar.form.aiExamples', 'Try saying')}
                </p>
                <ul className="space-y-1">
                  {AI_CREATE_EXAMPLES.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        onClick={() => setAiText(ex)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-surface-light"
                      >
                        "{ex}"
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiNote && (
              <p className="rounded-xl bg-brand-blue/10 px-3 py-2 text-[12px] text-text-primary">
                {aiNote}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTab('form')}
                className="text-[13px] font-bold text-text-secondary hover:text-text-primary"
              >
                {t('calendar.form.useForm', 'Use the form instead')}
              </button>
              <button
                type="button"
                onClick={handleAiApply}
                disabled={aiBusy || !aiText.trim() || !activeFamily}
                className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50"
              >
                {aiBusy
                  ? t('calendar.form.aiApplying', 'Applying...')
                  : mode === 'edit'
                    ? t('calendar.form.aiUpdate', 'Update event')
                    : t('calendar.form.aiCreate', 'Create event')}
              </button>
            </div>
          </div>
        )}

        {tab === 'form' && (
          <>
        <div>
          <Label htmlFor="evt-title">{t('calendar.form.title', 'Title')}</Label>
          <input
            id="evt-title"
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={t('calendar.form.titlePlaceholder', 'Doctor visit, swim class...')}
            className={baseField}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evt-child">{t('calendar.form.child', 'Child')}</Label>
            <select
              id="evt-child"
              value={form.childId}
              onChange={(e) => update('childId', e.target.value)}
              className={baseField}
            >
              {childOptions.length === 0 ? (
                <option value="">{t('calendar.form.noChildren', 'Add a child first')}</option>
              ) : (
                childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <Label htmlFor="evt-type">{t('calendar.form.type', 'Type')}</Label>
            <select
              id="evt-type"
              value={form.eventType}
              onChange={(e) => update('eventType', e.target.value as EventType)}
              className={baseField}
            >
              {EVENT_TYPES.map((typ) => (
                <option key={typ} value={typ}>
                  {t(`calendar.type.${typ}`, typ)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-[14px] text-text-primary">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => update('allDay', e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          {t('calendar.form.allDay', 'All day')}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evt-date">{t('calendar.form.startDate', 'Start date')}</Label>
            <input
              id="evt-date"
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              className={baseField}
            />
          </div>
          {!form.allDay && (
            <div>
              <Label htmlFor="evt-time">{t('calendar.form.startTime', 'Start time')}</Label>
              <input
                id="evt-time"
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                className={baseField}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evt-end-date">{t('calendar.form.endDate', 'End date (optional)')}</Label>
            <input
              id="evt-end-date"
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
              className={baseField}
            />
          </div>
          {!form.allDay && form.endDate && (
            <div>
              <Label htmlFor="evt-end-time">{t('calendar.form.endTime', 'End time')}</Label>
              <input
                id="evt-end-time"
                type="time"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className={baseField}
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="evt-location">{t('calendar.form.location', 'Location (optional)')}</Label>
          <input
            id="evt-location"
            type="text"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder={t('calendar.form.locationPlaceholder', 'Clinic, park, home...')}
            className={baseField}
          />
        </div>

        <div>
          <Label htmlFor="evt-desc">{t('calendar.form.description', 'Notes (optional)')}</Label>
          <textarea
            id="evt-desc"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className={baseField}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evt-repeat">{t('calendar.form.repeat', 'Repeats')}</Label>
            <select
              id="evt-repeat"
              value={form.repeatType}
              onChange={(e) => update('repeatType', e.target.value as RepeatType)}
              className={baseField}
            >
              {REPEAT_TYPES.map((r) => (
                <option key={r} value={r}>
                  {t(`calendar.repeat.${r}`, r)}
                </option>
              ))}
            </select>
          </div>
          {form.repeatType !== 'none' && (
            <div>
              <Label htmlFor="evt-repeat-end">{t('calendar.form.repeatUntil', 'Repeat until')}</Label>
              <input
                id="evt-repeat-end"
                type="date"
                value={form.repeatEndDate}
                onChange={(e) => update('repeatEndDate', e.target.value)}
                className={baseField}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="rounded-xl border border-red-500/40 px-3 py-2 text-[14px] font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl border border-border px-3 py-2 text-[14px] font-bold text-text-secondary hover:bg-surface-light disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50"
            >
              {saving
                ? t('common.saving', 'Saving...')
                : mode === 'edit'
                  ? t('common.save', 'Save')
                  : t('calendar.form.create', 'Create')}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </Drawer>
  );
};

type EventRowProps = {
  event: CalendarEvent;
  locale: string;
  onSelect: (event: CalendarEvent) => void;
};

const EventRow = ({ event, locale, onSelect }: EventRowProps) => {
  const { t } = useTranslation();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(event)}
        className={clsx(
          'flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-brand-blue/30 hover:bg-surface-light',
          isPast(event.startDate) && 'opacity-70',
        )}
      >
        <span
          className={clsx(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
            EVENT_TYPE_TONE[event.eventType] ?? EVENT_TYPE_TONE.other,
          )}
        >
          <Icon name={appAssetIcons.calendar as IconName} className="h-5 w-5 object-contain" alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[15px] font-bold text-text-primary">{event.title}</p>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {t(`calendar.type.${event.eventType}`, event.eventType)}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            {formatStart(event.startDate, locale, event.allDay)}
            {event.child?.name ? ` · ${event.child.name}` : ''}
            {event.location ? ` · ${event.location}` : ''}
          </p>
          {event.description && (
            <p className="mt-1 text-[13px] text-text-secondary leading-snug">{event.description}</p>
          )}
        </div>
        <Icon
          name={uiIcons.chevronRight}
          className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-50"
          alt=""
        />
      </button>
    </li>
  );
};

export const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const { activeFamily } = useAppContext();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [childOptions, setChildOptions] = useState<ChildOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [webcalUrl, setWebcalUrl] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const openSubscribe = useCallback(async () => {
    if (!activeFamily) return;
    setSubscribeOpen(true);
    if (feedUrl) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const res = await calendarApi.createFeedToken(activeFamily.id);
      setFeedUrl(res.url);
      setWebcalUrl(res.webcalUrl);
    } catch {
      setFeedError(t('calendar.subscribe.error', 'Could not generate subscription link.'));
    } finally {
      setFeedLoading(false);
    }
  }, [activeFamily, feedUrl, t]);

  const copyFeedUrl = useCallback(async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success(t('calendar.subscribe.copied', 'Link copied'));
    } catch {
      toast.error(t('calendar.subscribe.copyFailed', 'Could not copy. Select and copy manually.'));
    }
  }, [feedUrl, t]);

  const loadEvents = useCallback(async () => {
    if (!activeFamily || !token) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: { events?: CalendarEvent[] } = await calendarApi.listEvents(activeFamily.id);
      setEvents(res.events ?? []);
    } catch {
      setError(t('calendar.loadFailed', 'Could not load events.'));
    } finally {
      setLoading(false);
    }
  }, [activeFamily, token, t]);

  const loadChildren = useCallback(async () => {
    if (!activeFamily || !token) {
      setChildOptions([]);
      return;
    }
    try {
      const res: { children?: ChildOption[] } = await familiesApi.listChildren(activeFamily.id);
      setChildOptions((res.children ?? []).map((c) => ({ id: c.id, name: c.name })));
    } catch {
      setChildOptions([]);
    }
  }, [activeFamily, token]);

  useEffect(() => {
    loadEvents();
    loadChildren();
  }, [loadEvents, loadChildren]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    return {
      upcoming: sorted.filter((e) => !isPast(e.startDate)),
      past: sorted.filter((e) => isPast(e.startDate)).reverse(),
    };
  }, [events]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setDrawerOpen(true);
  };

  if (!token) {
    return (
      <PageContainer>
        <div className="rounded-2xl bg-surface-light p-6 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('calendar.signInPrompt', 'Sign in to see your family calendar.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?next=/calendar')}
            className="mt-3 rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110"
          >
            {t('home.nav.signIn', 'Sign in')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-extrabold text-text-primary">
            {t('calendar.title', 'Calendar')}
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            {t('calendar.subtitle', 'Tap an event to edit. Or ask the assistant.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSubscribe}
            disabled={!activeFamily}
            aria-label={t('calendar.subscribe.button', 'Subscribe')}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-bold text-text-primary hover:bg-surface-light disabled:opacity-50"
          >
            <Icon name={uiIcons.share} className="h-4 w-4 object-contain" alt="" />
            {t('calendar.subscribe.button', 'Subscribe')}
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={childOptions.length === 0}
            aria-label={t('calendar.addEvent', 'Add event')}
            className="flex items-center gap-2 rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-bold text-white hover:brightness-110 disabled:opacity-50"
          >
            <Icon name={uiIcons.plus} className="h-4 w-4 object-contain" alt="" />
            {t('calendar.addEvent', 'Add event')}
          </button>
        </div>
      </header>

      {loading && (
        <p className="rounded-2xl bg-surface-light px-4 py-3 text-[13px] text-text-secondary">
          {t('common.loading', 'Loading...')}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('calendar.empty.title', 'No events yet')}
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            {childOptions.length === 0
              ? t('calendar.empty.noChild', 'Add a child to your family first.')
              : t(
                  'calendar.empty.body',
                  'Tap "Add event" to schedule one, or ask the assistant.',
                )}
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-text-secondary">
            {t('calendar.upcoming', 'Upcoming')}
          </h2>
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} locale={i18n.language} onSelect={openEdit} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-text-secondary">
            {t('calendar.past', 'Past')}
          </h2>
          <ul className="space-y-2">
            {past.map((e) => (
              <EventRow key={e.id} event={e} locale={i18n.language} onSelect={openEdit} />
            ))}
          </ul>
        </section>
      )}

      <EventFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={editing ? 'edit' : 'create'}
        event={editing}
        children={childOptions}
        onSaved={loadEvents}
      />

      <Drawer
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        title={t('calendar.subscribe.title', 'Subscribe to calendar')}
      >
        <div className="flex flex-col gap-4 p-6">
          <p className="text-[13px] text-text-secondary leading-snug">
            {t(
              'calendar.subscribe.intro',
              'Paste this link into Google Calendar, Apple Calendar, or Outlook to subscribe. Updates appear automatically (refresh schedule is set by the calendar app, typically a few hours).',
            )}
          </p>

          {feedLoading && (
            <p className="rounded-2xl bg-surface-light px-4 py-3 text-[13px] text-text-secondary">
              {t('common.loading', 'Loading...')}
            </p>
          )}
          {feedError && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-500">
              {feedError}
            </p>
          )}

          {feedUrl && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-text-secondary">
                  {t('calendar.subscribe.urlLabel', 'Subscription URL')}
                </span>
                <textarea
                  readOnly
                  value={feedUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface-light px-3 py-2 text-[12px] font-mono text-text-primary"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyFeedUrl}
                  className="flex items-center gap-2 rounded-xl bg-brand-blue px-3 py-2 text-[13px] font-bold text-white hover:brightness-110"
                >
                  <Icon name={uiIcons.clipboard} className="h-4 w-4 object-contain" alt="" />
                  {t('calendar.subscribe.copy', 'Copy link')}
                </button>
                {webcalUrl && (
                  <a
                    href={webcalUrl}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-bold text-text-primary hover:bg-surface-light"
                  >
                    <Icon name={uiIcons.calendar} className="h-4 w-4 object-contain" alt="" />
                    {t('calendar.subscribe.openInCalendar', 'Open in Apple Calendar')}
                  </a>
                )}
                <a
                  href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-bold text-text-primary hover:bg-surface-light"
                >
                  <Icon name={uiIcons.externalLink} className="h-4 w-4 object-contain" alt="" />
                  {t('calendar.subscribe.openInGoogle', 'Add to Google Calendar')}
                </a>
              </div>

              <div className="rounded-2xl bg-brand-yellow/10 px-4 py-3 text-[12px] text-text-secondary leading-snug">
                {t(
                  'calendar.subscribe.warning',
                  'Anyone with this link can view your family calendar. Treat it like a password.',
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </PageContainer>
  );
};
