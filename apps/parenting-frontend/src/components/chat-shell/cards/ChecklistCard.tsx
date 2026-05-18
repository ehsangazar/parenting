import { useEffect, useState } from 'react';
import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { CardActionsRow } from './CardActions.js';
import type { CardActionHandlers, ChecklistCardData, CardAction } from './types.js';

type Props = {
  id: string;
  data: ChecklistCardData;
  actions?: CardAction[];
  handlers: CardActionHandlers;
};

function storageKey(cardId: string) {
  return `chat-checklist:${cardId}`;
}

function readChecked(cardId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(cardId));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ChecklistCard({ id, data, actions, handlers }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecked(id));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(checked));
    } catch {
      // localStorage unavailable; non-fatal.
    }
  }, [id, checked]);

  const toggle = (itemId: string) => {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const doneCount = data.items.filter((i) => checked[i.id]).length;
  const allDone = doneCount === data.items.length && data.items.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue/15">
          <Icon name={uiIcons.clipboardList} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text-primary leading-tight">
            {data.title}
          </div>
          {data.subtitle && (
            <div className="mt-0.5 text-[12px] text-text-secondary">{data.subtitle}</div>
          )}
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            {doneCount}/{data.items.length} done {allDone && '✓'}
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.items.map((item) => {
          const isOn = !!checked[item.id];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`group flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                  isOn
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-border bg-surface-light hover:border-brand-blue/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isOn
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border-dark bg-surface'
                  }`}
                >
                  {isOn && (
                    <Icon
                      name={uiIcons.check}
                      className="h-3 w-3 object-contain brightness-0 invert"
                      alt=""
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[14px] leading-snug ${
                      isOn
                        ? 'text-text-secondary line-through'
                        : 'text-text-primary font-medium'
                    }`}
                  >
                    {item.label}
                  </div>
                  {item.hint && !isOn && (
                    <div className="mt-0.5 text-[12px] text-text-tertiary">{item.hint}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {actions && actions.length > 0 && (
        <CardActionsRow actions={actions} handlers={handlers} />
      )}
    </div>
  );
}
