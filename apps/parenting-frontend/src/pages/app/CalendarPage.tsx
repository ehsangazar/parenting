import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { calendarApi, familiesApi } from '../../lib/appApi.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { SideDrawer } from '../../components/app/SideDrawer.js';
import { toast } from 'sonner';
import { useNotificationStore } from '../../state/notification.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';

// ── Constants ──────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour in the grid
const START_HOUR = 7;   // first visible hour
const END_HOUR = 21;    // last visible hour
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
// DAYS is now computed dynamically inside the component using Intl (locale-aware)

const CHILD_COLORS = [
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
];

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  eventType: string;
  childId: string;
  assignedTo?: string;
  allDay: boolean;
  startDate: string;
  endDate: string;
}

interface Child {
  id: string;
  name: string;
}

const EVENT_TYPE_ICON_NAMES: Record<string, IconName> = {
  appointment: uiIcons.clock,
  milestone: uiIcons.trophy,
  activity: uiIcons.sparkles,
  reminder: uiIcons.bell,
  other: uiIcons.info,
};

// Assign color index per childId (stable across renders)
const colorMap: Record<string, number> = {};
let colorIndex = 0;
function childColor(childId: string | null | undefined) {
  if (!childId) return CHILD_COLORS[CHILD_COLORS.length - 1];
  if (!(childId in colorMap)) {
    colorMap[childId] = colorIndex % CHILD_COLORS.length;
    colorIndex++;
  }
  return CHILD_COLORS[colorMap[childId]];
}

// ── Week helpers ───────────────────────────────────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const offset = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function weekdayMonFirst(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function formatDateRange(weekStart: Date, locale: string): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const s = weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const e = end.toLocaleDateString(locale, opts);
  return `${s} - ${e}`;
}

// Position an event within the time grid
function eventPosition(startDate: Date) {
  const hours = startDate.getHours() + startDate.getMinutes() / 60;
  const top = (hours - START_HOUR) * HOUR_HEIGHT;
  return Math.max(0, top);
}

function eventHeight(startDate: Date, endDate: Date | null): number {
  if (!endDate) return HOUR_HEIGHT * 0.75; // default 45-min block
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Math.max(HOUR_HEIGHT * 0.5, Math.min(durationHours * HOUR_HEIGHT, HOUR_HEIGHT * 8));
}

// Format Date for datetime-local input (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Event Drawer (SidePanel) ────────────────────────────────────────────────
function EventDrawer({
  childProfiles,
  familyMembers,
  event,
  onClose,
  onSave,
  onDelete,
}: {
  childProfiles: Child[];
  familyMembers: any[];
  event?: CalendarEvent | null;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [eventType, setEventType] = useState<string>(event?.eventType ?? 'activity');
  const [childId, setChildId] = useState(event?.childId ?? childProfiles[0]?.id ?? '');
  const [assignedTo, setAssignedTo] = useState(event?.assignedTo ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(() => {
    if (event?.startDate) return toDatetimeLocal(new Date(event.startDate));
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return toDatetimeLocal(d);
  });
  const [endDate, setEndDate] = useState(() => {
    if (event?.endDate) return toDatetimeLocal(new Date(event.endDate));
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return toDatetimeLocal(d);
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !startDate) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      eventType,
      childId,
      assignedTo: assignedTo || undefined,
      allDay,
      startDate: new Date(startDate).toISOString(),
      endDate: !allDay && endDate ? new Date(endDate).toISOString() : undefined,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    setDeleting(true);
    await onDelete(event.id);
    setDeleting(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for transition
  };

  return (
    <SideDrawer
      isVisible={isVisible}
      onClose={handleClose}
      maxWidthClassName="max-w-lg"
      bodyClassName="p-6 space-y-8"
      header={(
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-text-primary">{event ? t('calendarPage.editEvent') : t('calendarPage.newEvent')}</h3>
            <p className="text-sm text-text-secondary">{t('calendarPage.manageActivity')}</p>
          </div>
          <button onClick={handleClose} className="rounded-xl p-2 text-text-tertiary hover:bg-surface-light hover:text-text-secondary transition-colors">
            <Icon name={uiIcons.close} className="h-6 w-6" alt="" />
          </button>
        </div>
      )}
      footer={(
        <div className="px-6 py-6 border-t border-border bg-surface flex items-center justify-between gap-4 sticky bottom-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          {event ? (
            <button onClick={handleDelete} disabled={deleting || saving}
              className="group flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
                <Icon name={uiIcons.trash} className="h-5 w-5" alt="" />
              </div>
              {deleting ? t('calendarPage.deleting') : t('calendarPage.delete')}
            </button>
          ) : <div />}

          <div className="flex gap-4">
            <button onClick={handleClose} className="px-6 py-3 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !title.trim() || !startDate}
              className="btn-duo-green flex items-center justify-center gap-2 !min-h-12 !rounded-2xl !px-8 !py-3.5 !text-sm disabled:opacity-40 active:scale-[0.98]">
              {saving ? t('calendarPage.saving') : event ? t('calendarPage.saveChanges') : t('calendarPage.createEvent')}
            </button>
          </div>
        </div>
      )}
    >
      {/* Section: Basic Info */}
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.titleLabel')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('calendarPage.whatHappening')}
            autoFocus
            className="w-full rounded-2xl border-2 border-border bg-surface-light px-4 py-3.5 text-base font-medium focus:border-primary-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.eventType')}</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-surface-light px-4 py-3 text-sm font-semibold focus:border-primary-500 focus:bg-surface focus:outline-none transition-all">
              <option value="activity">{t('calendarPage.typeActivity')}</option>
              <option value="appointment">{t('calendarPage.typeAppointment')}</option>
              <option value="milestone">{t('calendarPage.typeMilestone')}</option>
              <option value="reminder">{t('calendarPage.typeReminder')}</option>
              <option value="other">{t('calendarPage.typeOther')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.child')}</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-surface-light px-4 py-3 text-sm font-semibold focus:border-primary-500 focus:bg-surface focus:outline-none transition-all">
              {childProfiles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Time & Duration */}
      <div className="rounded-3xl border-2 border-border bg-surface-light/40 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name={uiIcons.clock} className="h-5 w-5 text-primary-500" alt="" />
            <span className="text-sm font-bold text-text-secondary">{t('calendarPage.allDayEvent')}</span>
          </div>
          <button
            onClick={() => setAllDay(!allDay)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${allDay ? 'bg-primary-600' : 'bg-surface-light'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-surface transition-transform ${allDay ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">{t('calendarPage.starts')}</label>
            <input type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? startDate.split('T')[0] : startDate}
              onChange={(e) => setStartDate(e.target.value + (allDay ? 'T00:00' : ''))}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-100" />
          </div>
          {!allDay && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">{t('calendarPage.ends')}</label>
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
          )}
        </div>
      </div>

      {/* Section: Details */}
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-light text-text-tertiary shadow-sm"><Icon name={uiIcons.mapPin} className="h-5 w-5" alt="" /></div>
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.location')}</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('calendarPage.whereIsIt')}
              className="w-full rounded-2xl border border-border bg-surface-light px-4 py-3 text-sm focus:border-primary-500 focus:bg-surface focus:outline-none transition-all shadow-sm" />
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-light text-text-tertiary shadow-sm"><Icon name={uiIcons.user} className="h-5 w-5" alt="" /></div>
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.assignedTo')}</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface-light px-4 py-3 text-sm font-semibold focus:border-primary-500 focus:bg-surface focus:outline-none transition-all shadow-sm">
              <option value="">{t('calendarPage.unassigned')}</option>
              {familyMembers.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name || m.user.email}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-light text-text-tertiary shadow-sm"><Icon name={uiIcons.fileText} className="h-5 w-5" alt="" /></div>
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-bold text-text-tertiary uppercase tracking-widest">{t('calendarPage.description')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('calendarPage.addSomeNotes')} rows={4}
              className="w-full rounded-2xl border border-border bg-surface-light px-4 py-3 text-sm focus:border-primary-500 focus:bg-surface focus:outline-none transition-all resize-none shadow-sm" />
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-surface-light/30 overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="h-8 w-40 rounded-xl bg-surface-light" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-surface-light" />
            <div className="h-9 w-9 rounded-lg bg-surface-light" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-32 rounded-xl bg-surface-light" />
          <div className="h-10 w-32 rounded-xl bg-primary-100/50" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Gutter Skeleton */}
        <div className="w-14 shrink-0 border-r border-border pt-16">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mb-14 pr-2 flex justify-end">
              <div className="h-3 w-8 rounded bg-surface-light" />
            </div>
          ))}
        </div>

        {/* Grid Skeleton */}
        <div className="flex-1 overflow-hidden">
          {/* Day Headers */}
          <div className="flex border-b border-border h-16">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-border last:border-r-0 p-3">
                <div className="h-3 w-12 rounded bg-surface-light mb-2" />
                <div className="h-5 w-8 rounded bg-surface-light" />
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          <div className="relative h-full pt-4">
            {/* Dummy Hour Lines */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border-b border-border h-[80px]" />
            ))}
            
            {/* Shimmering Event Blocks */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="relative flex-1 p-2">
                  {col === 1 && (
                    <div className="mt-20 h-24 w-full rounded-2xl bg-surface-light/60" />
                  )}
                  {col === 3 && (
                    <div className="mt-40 h-16 w-full rounded-2xl bg-primary-100/40" />
                  )}
                  {col === 5 && (
                    <div className="mt-10 h-32 w-full rounded-2xl bg-surface-light/60" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────
export const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { activeFamily } = useAppContext();

  // Locale-aware weekday short names, Mon-first (Jan 1 2024 is a Monday)
  const DAYS = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)),
      ),
    [i18n.language],
  );
  const location = useLocation();
  const navigateRouter = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [mobileDayIdx, setMobileDayIdx] = useState(() => weekdayMonFirst(new Date()));
  const [activeChildId, setActiveChildId] = useState<string | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ dayIdx: number; top: number; height: number } | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8:00 on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!activeFamily) {
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }
    setLoading(true);
    try {
      const [eventsRes, childrenRes, membersRes] = await Promise.all([
        calendarApi.listEvents(activeFamily.id).catch(() => ({ events: [] })),
        familiesApi.listChildren(activeFamily.id).catch(() => ({ children: [] })),
        familiesApi.listMembers(activeFamily.id).catch(() => ({ members: [] })),
      ]);
      // Assign colors to children
      (childrenRes.children ?? []).forEach((c: any) => childColor(c.id));
      setEvents(eventsRes.events ?? []);
      setChildren(childrenRes.children ?? []);
      setFamilyMembers(membersRes.members ?? []);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeFamily]);

  useEffect(() => {
    setIsInitialLoad(true);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const shouldOpenAddEvent = (location.state as { openAddEvent?: boolean } | null)?.openAddEvent;
    if (!shouldOpenAddEvent) return;

    setSelectedEvent(null);
    setShowAddModal(true);
    navigateRouter(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigateRouter]);

  // Week days (Mon–Sun)
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter events to this week + selected child
  const weekEvents = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    return events.filter((e) => {
      const d = new Date(e.startDate);
      const inWeek = d >= weekStart && d < weekEnd;
      const matchesChild = activeChildId === 'all' || e.childId === activeChildId;
      return inWeek && matchesChild;
    });
  }, [events, weekStart, activeChildId]);

  // Separate all-day events and timed events
  const { allDayEventsByDay, timedEventsByDay } = useMemo(() => {
    const allDay: Record<number, any[]> = {};
    const timed: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) {
      allDay[i] = [];
      timed[i] = [];
    }

    weekEvents.forEach((e) => {
      const d = new Date(e.startDate);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0
      if (e.allDay) {
        allDay[dayIdx].push(e);
      } else {
        timed[dayIdx].push(e);
      }
    });

    return { allDayEventsByDay: allDay, timedEventsByDay: timed };
  }, [weekEvents]);

  const navigate = (dir: -1 | 1) => setWeekStart((w) => addDays(w, dir * 7));

  const navigateMobileDay = (dir: -1 | 1) => {
    setMobileDayIdx((prev) => {
      const next = prev + dir;
      if (next < 0) {
        setWeekStart((w) => addDays(w, -7));
        return 6;
      }
      if (next > 6) {
        setWeekStart((w) => addDays(w, 7));
        return 0;
      }
      return next;
    });
  };

  const goToToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setMobileDayIdx(weekdayMonFirst(now));
  };

  const handleDragStart = (e: React.DragEvent, event: any) => {
    setDraggingEvent(event);
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to the visual change so it doesn't affect the drag image
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingEvent(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggingEvent) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Snapping logic for ghost
    const totalHours = y / HOUR_HEIGHT;
    const hour = Math.floor(totalHours + START_HOUR);
    const minute = Math.floor((totalHours % 1) * 60);
    const roundedMinute = Math.round(minute / 15) * 15;
    
    const snappedTop = (hour - START_HOUR) * HOUR_HEIGHT + (roundedMinute / 60) * HOUR_HEIGHT;
    const durationMs = new Date(draggingEvent.endDate).getTime() - new Date(draggingEvent.startDate).getTime();
    const height = (durationMs / (1000 * 60 * 60)) * HOUR_HEIGHT;

    setDragOverPos({ dayIdx, top: snappedTop, height });
  };

  const handleDrop = async (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    if (!draggingEvent || !activeFamily) return;

    const { top } = dragOverPos || {};
    setDragOverPos(null);

    // Calculate new start date based on the final snapped position
    const totalHours = (top ?? 0) / HOUR_HEIGHT + START_HOUR;
    const hour = Math.floor(totalHours);
    const minute = Math.round((totalHours % 1) * 60);
    
    const newStartDate = new Date(weekDays[dayIdx]);
    newStartDate.setHours(hour, minute, 0, 0);

    const durationMs = new Date(draggingEvent.endDate).getTime() - new Date(draggingEvent.startDate).getTime();
    const newEndDate = new Date(newStartDate.getTime() + durationMs);

    // Optimistic Update
    const previousEvents = [...events];
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === draggingEvent.id
          ? { ...ev, startDate: newStartDate.toISOString(), endDate: newEndDate.toISOString() }
          : ev
      )
    );

    try {
      setUpdatingEventId(draggingEvent.id);
      await calendarApi.updateEvent(activeFamily.id, draggingEvent.id, {
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
      });
      // Refresh to ensure everything is in sync with server (ids, etc)
      await loadData();
    } catch (err) {
      // Rollback
      setEvents(previousEvents);
    } finally {
      setDraggingEvent(null);
      setUpdatingEventId(null);
    }
  };

  const dateNavigation = (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold text-text-secondary whitespace-nowrap">
        <Icon name={uiIcons.calendarRange} className="h-3.5 w-3.5 shrink-0" alt="" />
        {formatDateRange(weekStart, i18n.language)}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-lg border border-border bg-surface p-0 text-text-secondary transition-colors hover:bg-surface-light" aria-label={t('page.calendarPrevWeek')}>
          <Icon name={uiIcons.chevronLeft} className="h-4 w-4 shrink-0" alt="" aria-hidden />
        </button>
        <button
          onClick={goToToday}
          className="rounded-lg border border-border bg-surface px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold text-text-secondary transition-colors hover:bg-surface-light whitespace-nowrap"
        >
          {t('calendar.today')}
        </button>
        <button onClick={() => navigate(1)} className="flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-lg border border-border bg-surface p-0 text-text-secondary transition-colors hover:bg-surface-light" aria-label={t('page.calendarNextWeek')}>
          <Icon name={uiIcons.chevronRight} className="h-4 w-4 shrink-0" alt="" aria-hidden />
        </button>
      </div>
    </div>
  );

  if (isInitialLoad && loading) {
    return <CalendarSkeleton />;
  }

  return (
    <PageContainer verticalSpacing="normal" contentSpacing="none">
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('page.calendarSubtitle')}
        iconName={appAssetIcons.calendar}
        className="!mb-1"
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:scale-[1.02] hover:bg-primary-700 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <Icon name={uiIcons.plus} className="h-4 w-4 sm:h-5 sm:w-5" alt="" /> {t('page.calendarAddEventCta')}
        </button>
      </PageHeader>

      {/* Child filter pills (left) + Date navigation (right) - same line on all sizes */}
      <div className="flex flex-row items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {children.length > 0 ? (
            <>
              <button onClick={() => setActiveChildId('all')}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeChildId === 'all'
                    ? 'bg-background text-white shadow-sm'
                    : 'bg-surface border border-border text-text-secondary hover:border-border-dark'
                }`}>
                {t('common.all')}
              </button>
              {children.map((child) => {
                const c = childColor(child.id);
                return (
                  <button key={child.id} onClick={() => setActiveChildId(child.id)}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors whitespace-nowrap ${
                      activeChildId === child.id
                        ? `${c.bg} ${c.text} border ${c.border}`
                        : 'bg-surface border border-border text-text-secondary hover:border-border-dark'
                    }`}>
                    {child.name}
                  </button>
                );
              })}
            </>
          ) : (
            <span className="text-sm text-text-secondary">{t('page.calendarNoChildrenYet')}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {dateNavigation}
        </div>
      </div>

      {/* Mobile: single-day navigator */}
      <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 shadow-sm sm:hidden">
        <button
          onClick={() => navigateMobileDay(-1)}
          className="flex h-10 w-10 min-h-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 p-0 text-primary-700 shadow-sm transition active:scale-95"
          aria-label={t('page.calendarPrevDay')}
        >
          <Icon name={uiIcons.chevronLeft} className="h-5 w-5 flex-none text-primary-700" alt="" aria-hidden />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {DAYS[mobileDayIdx]}
          </p>
          <p className="text-sm font-bold text-text-primary">
            {weekDays[mobileDayIdx].toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => navigateMobileDay(1)}
          className="flex h-10 w-10 min-h-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 p-0 text-primary-700 shadow-sm transition active:scale-95"
          aria-label={t('page.calendarNextDay')}
        >
          <Icon name={uiIcons.chevronRight} className="h-5 w-5 flex-none text-primary-700" alt="" aria-hidden />
        </button>
      </div>

      {/* ── Calendar grid ── */}
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading && !isInitialLoad && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-surface-light/90 px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-sm">
            <Icon name={uiIcons.loader} className="h-3 w-3 animate-spin" alt="" />
            Updating...
          </div>
        )}
        {/* Day header row */}
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex">
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 border-r border-border" />
            {/* Day columns */}
            {weekDays.map((day, i) => {
              const isToday = day.getTime() === today.getTime();
              const allDayEvts = allDayEventsByDay[i] ?? [];
              return (
                <div
                  key={i}
                  className={`${i === mobileDayIdx ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col items-center border-r border-border py-2 last:border-r-0 sm:flex ${isToday ? 'bg-primary-50' : ''}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{DAYS[i]}</span>
                  <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold ${
                    isToday ? 'bg-primary-600 text-white' : 'text-text-primary'
                  }`}>
                    {day.getDate()}
                  </span>
                  
                  {/* All-day events in header */}
                  <div className="mt-2 w-full min-w-0 space-y-1 px-1">
                    {allDayEvts.map(event => {
                      const colors = childColor(event.childId);
                      const isUpdating = updatingEventId === event.id;
                      return (
                        <div key={event.id} 
                          onClick={() => setSelectedEvent(event)}
                          className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer hover:brightness-95 ${colors.bg} ${colors.border} ${colors.text} ${isUpdating ? 'animate-pulse opacity-70' : ''}`}>
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
            {/* Time labels gutter */}
            <div className="w-14 flex-shrink-0 border-r border-border">
              {HOURS.map((h) => (
                <div key={h} className="border-b border-border text-right pr-2" style={{ height: HOUR_HEIGHT }}>
                  <span className="text-[11px] font-medium text-text-tertiary leading-none" style={{ position: 'relative', top: '-6px' }}>
                    {h}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const isToday = day.getTime() === today.getTime();
              const dayEvts = timedEventsByDay[dayIdx] ?? [];

              return (
                <div
                  key={dayIdx}
                  className={`${dayIdx === mobileDayIdx ? 'block' : 'hidden'} relative flex-1 border-r border-border last:border-r-0 sm:block ${isToday ? 'bg-primary-50/40' : ''}`}
                  style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}
                  onDragOver={(e) => handleDragOver(e, dayIdx)}
                  onDragLeave={() => setDragOverPos(null)}
                  onDrop={(e) => handleDrop(e, dayIdx)}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div key={h} className="border-b border-border" style={{ height: HOUR_HEIGHT }} />
                  ))}

                  {/* Ghost Event (Preview) */}
                  {dragOverPos?.dayIdx === dayIdx && (
                    <div
                      className="absolute left-0.5 right-0.5 pointer-events-none rounded-lg border-2 border-dashed border-primary-300 bg-primary-100/30 transition-all duration-75 z-0"
                      style={{ top: `${dragOverPos.top}px`, height: `${dragOverPos.height}px` }}
                    />
                  )}

                  {/* Events */}
                  {dayEvts.map((event: any) => {
                    const start = new Date(event.startDate);
                    const end = event.endDate ? new Date(event.endDate) : null;
                    const top = eventPosition(start);
                    const height = eventHeight(start, end);
                    const child = children.find((c) => c.id === event.childId);
                    const colors = childColor(event.childId);
                    const timeLabel = start.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
                    const eventIconName = EVENT_TYPE_ICON_NAMES[event.eventType] ?? uiIcons.info;
                    const isUpdating = updatingEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedEvent(event)}
                        className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg border px-2 py-1 ${colors.bg} ${colors.border} cursor-grab active:cursor-grabbing hover:brightness-95 transition-all shadow-sm group ${isUpdating ? 'animate-pulse opacity-60' : ''}`}
                        style={{ top: `${top}px`, height: `${height}px`, zIndex: 1 }}
                      >
                        <div className="flex items-start gap-1">
                          <Icon name={eventIconName} className={`mt-0.5 h-3 w-3 shrink-0 ${colors.text} opacity-60`} alt="" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold leading-tight" style={{ color: 'inherit' }}>
                              {event.title}
                            </p>
                            <p className={`truncate text-[10px] leading-tight ${colors.text} opacity-70`}>
                              {timeLabel}{child ? ` · ${child.name}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Event Drawer ── */}
      {(showAddModal || selectedEvent) && (
        <EventDrawer
          childProfiles={children}
          familyMembers={familyMembers}
          event={selectedEvent}
          onClose={() => {
            setShowAddModal(false);
            setSelectedEvent(null);
          }}
          onSave={async (payload: any) => {
            if (!activeFamily) return;
            if (selectedEvent) {
              await calendarApi.updateEvent(activeFamily.id, selectedEvent.id, payload);
            } else {
              await calendarApi.createEvent(activeFamily.id, payload);
            }
            setShowAddModal(false);
            setSelectedEvent(null);
            await loadData();
            
            useNotificationStore.getState().addNotification({
              type: 'info',
              title: selectedEvent ? t('calendarPage.eventUpdated') : t('calendarPage.eventCreated'),
              message: `Calendar event "${payload.title}" has been scheduled.`,
            });

            toast.success(selectedEvent ? t('calendarPage.eventUpdated') : t('calendarPage.eventCreated'));
          }}
          onDelete={async (id: string) => {
            if (!activeFamily) return;
            await calendarApi.deleteEvent(activeFamily.id, id);
            setSelectedEvent(null);
            await loadData();
          }}
        />
      )}
      </PageContainer>
    );
  };
