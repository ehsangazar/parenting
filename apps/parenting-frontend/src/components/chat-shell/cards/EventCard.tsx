import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { CardActionsRow } from './CardActions.js';
import type { CardActionHandlers, EventCardData, CardAction } from './types.js';

const EVENT_TYPE_TONE: Record<string, string> = {
  appointment: 'bg-brand-pink/10 text-brand-pink-fg border-brand-pink/30',
  milestone: 'bg-secondary-50 text-secondary-fg border-secondary-100',
  activity: 'bg-primary-50 text-primary-fg border-primary-200',
  reminder: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30',
  other: 'bg-surface-light text-text-secondary border-border',
};

function formatWhen(startsAt: string, endsAt?: string, allDay?: boolean): string {
  try {
    const start = new Date(startsAt);
    const datePart = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (allDay) return `${datePart} · all day`;
    const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (endsAt) {
      const endTime = new Date(endsAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${datePart} · ${startTime} – ${endTime}`;
    }
    return `${datePart} · ${startTime}`;
  } catch {
    return startsAt;
  }
}

type Props = {
  data: EventCardData;
  actions?: CardAction[];
  handlers: CardActionHandlers;
};

export function EventCard({ data, actions, handlers }: Props) {
  const tone = EVENT_TYPE_TONE[data.eventType] ?? EVENT_TYPE_TONE.other;
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
          <Icon name={uiIcons.calendar} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-bold ${tone}`}
            >
              {data.eventType}
            </span>
            {data.childName && (
              <span className="text-[12px] font-semibold text-text-tertiary">
                · {data.childName}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[15px] font-bold text-text-primary leading-tight">
            {data.title}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-text-secondary">
            <Icon name={uiIcons.clock} className="h-3.5 w-3.5 object-contain opacity-70" alt="" />
            {formatWhen(data.startsAt, data.endsAt, data.allDay)}
          </div>
          {data.location && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-secondary">
              <Icon name={uiIcons.mapPin} className="h-3.5 w-3.5 object-contain opacity-70" alt="" />
              {data.location}
            </div>
          )}
        </div>
      </div>
      {actions && actions.length > 0 && (
        <CardActionsRow actions={actions} handlers={handlers} />
      )}
    </div>
  );
}
