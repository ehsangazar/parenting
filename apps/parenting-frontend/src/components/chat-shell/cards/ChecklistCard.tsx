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
  const [submitted, setSubmitted] = useState(false);

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

  const doneItems = data.items.filter((i) => checked[i.id]);
  const skippedItems = data.items.filter((i) => !checked[i.id]);
  const doneCount = doneItems.length;
  const allDone = doneCount === data.items.length && data.items.length > 0;
  const anyDone = doneCount > 0;

  const submitLabel = allDone
    ? "I'm all done, what's next?"
    : anyDone
    ? `I tried ${doneCount} of ${data.items.length} steps`
    : 'Mark as complete';

  const formatList = (items: typeof data.items) =>
    items.map((i) => `"${i.label}"`).join(', ');

  const submitMessage = allDone
    ? `I completed every step of the "${data.title}" checklist. Don't render a new checklist; tell me one thing to try next and ask one short question to refine it.`
    : anyDone
    ? `Re: the "${data.title}" checklist you already rendered. I managed: ${formatList(doneItems)}. I skipped: ${formatList(skippedItems)}. Don't render a new checklist. In plain text, suggest a small tweak for each skipped step (one short bullet each) and ask which to try first.`
    : `Re: the "${data.title}" checklist you already rendered. I haven't tried any steps yet. Don't render a new checklist; ask me what's blocking me from starting.`;

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    handlers.onSend(submitMessage);
  };

  const handleReset = () => {
    setChecked({});
    setSubmitted(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
          <Icon name={uiIcons.clipboardList} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text-primary leading-tight">
            {data.title}
          </div>
          {data.subtitle && (
            <div className="mt-0.5 text-[12px] text-text-secondary">{data.subtitle}</div>
          )}
          <div className="mt-1 text-[12px] font-semibold text-text-tertiary">
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
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-border bg-surface-light hover:border-primary-400'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isOn
                      ? 'border-primary-500 bg-primary-500 text-white'
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
      {allDone && !submitted && (
        <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] font-semibold text-primary-700">
          All steps done. Tap below and we'll wrap up.
        </div>
      )}
      {submitted && (
        <div className="mt-3 rounded-xl border border-border bg-surface-light px-3 py-2 text-[12px] text-text-secondary">
          Sent to chat. Tap reset to run this checklist again.
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className="inline-flex h-9 min-h-0 items-center gap-1.5 rounded-full border border-transparent bg-brand-blue px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-accent-blueHover disabled:opacity-50"
        >
          {submitted ? 'Sent' : submitLabel}
        </button>
        {(anyDone || submitted) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 min-h-0 items-center gap-1.5 rounded-full border border-border bg-transparent px-3.5 text-[13px] font-bold text-text-secondary transition-colors hover:bg-surface-light"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
