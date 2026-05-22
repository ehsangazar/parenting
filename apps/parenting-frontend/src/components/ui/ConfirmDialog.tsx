import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export type ConfirmDialogVariant = 'default' | 'danger';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const resolvedConfirmLabel =
    confirmLabel ?? t('common.confirm', 'Confirm');
  const resolvedCancelLabel =
    cancelLabel ?? t('common.cancel', 'Cancel');

  const confirmClass =
    variant === 'danger'
      ? 'rounded-xl bg-red-500 px-4 py-2 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50'
      : 'rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 bg-black/40"
        aria-label={resolvedCancelLabel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border-light bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-[16px] font-bold text-text-primary"
        >
          {title}
        </h2>
        {message && (
          <div className="mt-2 text-[14px] text-text-secondary">{message}</div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border px-3 py-2 text-[14px] font-bold text-text-secondary hover:bg-surface-light disabled:opacity-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={confirmClass}
          >
            {busy
              ? t('common.working', 'Working...')
              : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
