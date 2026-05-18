import type { CardAction, CardActionHandlers } from './types.js';

type Props = {
  actions: CardAction[];
  handlers: CardActionHandlers;
  disabled?: boolean;
};

const TONE_CLASSES: Record<Required<CardAction>['tone'], string> = {
  primary:
    'bg-brand-blue text-white border-transparent hover:brightness-110 disabled:opacity-50',
  danger:
    'bg-rose-500 text-white border-transparent hover:brightness-110 disabled:opacity-50',
  ghost:
    'bg-transparent text-text-secondary border-border hover:bg-surface-light disabled:opacity-50',
};

export function CardActionsRow({ actions, handlers, disabled }: Props) {
  if (!actions.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((a, i) => {
        const tone = a.tone ?? 'primary';
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (a.kind === 'send') handlers.onSend(a.message);
              else handlers.onNavigate(a.to);
            }}
            className={`inline-flex h-9 min-h-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors ${TONE_CLASSES[tone]}`}
          >
            {a.label}
            {a.kind === 'navigate' && <span aria-hidden>→</span>}
          </button>
        );
      })}
    </div>
  );
}
