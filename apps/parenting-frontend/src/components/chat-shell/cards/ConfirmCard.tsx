import { useEffect, useState } from 'react';
import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import type { CardActionHandlers, ConfirmCardData } from './types.js';

type Props = {
  id: string;
  data: ConfirmCardData;
  handlers: CardActionHandlers;
};

function storageKey(cardId: string) {
  return `chat-confirm:${cardId}`;
}

type ResolvedState = 'pending' | 'confirmed' | 'cancelled';

export function ConfirmCard({ id, data, handlers }: Props) {
  const [state, setState] = useState<ResolvedState>('pending');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(id));
      if (raw === 'confirmed' || raw === 'cancelled') setState(raw);
    } catch {
      // localStorage unavailable; non-fatal.
    }
  }, [id]);

  const resolve = (next: ResolvedState) => {
    setState(next);
    try {
      localStorage.setItem(storageKey(id), next);
    } catch {
      // localStorage unavailable; non-fatal.
    }
  };

  const danger = !!data.danger;
  const isResolved = state !== 'pending';
  const tone = danger
    ? 'border-rose-200 bg-rose-50/60'
    : 'border-amber-200 bg-amber-50/60';
  const iconWrap = danger ? 'bg-rose-100' : 'bg-amber-100';

  return (
    <div className={`rounded-2xl border p-3.5 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
          <Icon name={uiIcons.alertTriangle} className="h-5 w-5 object-contain" alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-text-primary leading-tight">{data.title}</div>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">{data.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isResolved}
          onClick={() => {
            if (isResolved) return;
            resolve('confirmed');
            handlers.onSend(data.confirmMessage);
          }}
          className={`inline-flex h-9 min-h-0 items-center gap-1.5 rounded-full border border-transparent px-3.5 text-[13px] font-bold transition-colors ${
            danger
              ? 'bg-rose-500 text-white hover:brightness-110'
              : 'bg-brand-blue text-white hover:brightness-110'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {state === 'confirmed' ? `${data.confirmLabel} ✓` : data.confirmLabel}
        </button>
        <button
          type="button"
          disabled={isResolved}
          onClick={() => {
            if (isResolved) return;
            resolve('cancelled');
          }}
          className="inline-flex h-9 min-h-0 items-center rounded-full border border-border bg-surface px-3.5 text-[13px] font-bold text-text-secondary hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'cancelled' ? `${data.cancelLabel ?? 'Cancel'} ✓` : data.cancelLabel ?? 'Cancel'}
        </button>
      </div>
    </div>
  );
}
