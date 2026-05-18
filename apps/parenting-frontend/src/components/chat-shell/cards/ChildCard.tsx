import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { CardActionsRow } from './CardActions.js';
import type { CardActionHandlers, ChildCardData, CardAction } from './types.js';

type Props = {
  data: ChildCardData;
  actions?: CardAction[];
  handlers: CardActionHandlers;
};

export function ChildCard({ data, actions, handlers }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-2xl">
          {data.emoji ?? <Icon name={uiIcons.baby} className="h-6 w-6 object-contain" alt="" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text-primary leading-tight">{data.name}</div>
          <div className="mt-0.5 text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
            {data.ageLabel}
          </div>
        </div>
      </div>
      {actions && actions.length > 0 && (
        <CardActionsRow actions={actions} handlers={handlers} />
      )}
    </div>
  );
}
